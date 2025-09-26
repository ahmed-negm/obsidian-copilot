import { SystemMessage } from "../../BaseSimpleChainRunner";
import { StepRunner } from "../../base/StepRunner";
import { HadithWorkflowState } from "../models/WorkflowState";
import { getPromptTemplate } from "../../utils/promptUtils";
import { toArabicDigits } from "../../utils/formatUtils";

/**
 * Step to verify narrators and find matches in the database
 */
export class VerifyNarratorsStep implements StepRunner<HadithWorkflowState> {
  /**
   * Format the input for the LLM
   * @param messages The messages to format
   * @param state The current workflow state
   * @returns The formatted messages
   */
  async formatInput(
    messages: SystemMessage[],
    state: HadithWorkflowState
  ): Promise<SystemMessage[]> {
    // Use current narrator index from state
    const narratorIndex = state.hadithNarratorIndex || 0;
    const narratorToFind = state.hadithNarrators[narratorIndex].potentialPeople[0].fullName;

    // Find all narrator info that matches the first 3 letters of the name
    const matchingNarrators = state.allNarrators
      .filter((n) => n.name?.startsWith(narratorToFind.slice(0, 3)))
      .map((n) => ({
        id: n.islamWebIndex ?? 0,
        name: n.name ?? "",
      }));

    const promptTemplate = await getPromptTemplate("TraceHadithChainRunner03");
    const prompt = promptTemplate
      .replaceAll("{{name_to_search}}", narratorToFind)
      .replaceAll("{{JSON}}", JSON.stringify(matchingNarrators, null, 2));

    return [messages[0], { role: "user", content: prompt }];
  }

  /**
   * Process the LLM response
   * @param response The LLM response
   * @param state The current workflow state
   * @returns The result of the step
   */
  async run(
    response: string,
    state: HadithWorkflowState
  ): Promise<{
    output: string;
    nextState: HadithWorkflowState;
    isComplete: boolean;
  }> {
    // Get current narrator index
    const narratorIndex = state.hadithNarratorIndex || 0;

    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      const result = JSON.parse(codeBlockMatch[1]) as {
        id: number;
        name: string;
        confidence: string;
      }[];

      if (result.length > 0) {
        // Get the first high-confidence match or the first match
        const first = result.find((r) => r.confidence === "High") ?? result[0];

        if (first) {
          // Find the narrator in allNarrators
          const allNarratorIndex = state.allNarrators.findIndex(
            (n) => n.islamWebIndex === first.id
          );

          if (allNarratorIndex !== -1) {
            // Narrator found
            const foundNarrator = state.allNarrators[allNarratorIndex];

            // Check if this is the last narrator
            const isLastNarrator = narratorIndex >= state.hadithNarrators.length - 1;

            // Update state
            const hadithNarrators = [...state.hadithNarrators];
            hadithNarrators[narratorIndex] = {
              ...hadithNarrators[narratorIndex],
              indexInAllNarrators: allNarratorIndex,
            };

            // Create new state with updated hadithNarrators and allNarratorIndex
            const newState: HadithWorkflowState = {
              ...state,
              hadithNarrators,
              allNarratorIndex: allNarratorIndex,
              // If this is the last narrator, we'll skip to FinalizeNotesStep
              skipToFinalStep: isLastNarrator,
            };

            // Format the output message
            const output =
              `
تم العثور على **${foundNarrator.name}** في تهذيب الكمال [المجلد ${toArabicDigits(foundNarrator.part)} - الصفحة ${toArabicDigits(foundNarrator.page)}](https://shamela.ws/book/3722/${foundNarrator.shamelaIndex})
` + (!isLastNarrator ? "جاري البحث عن من رووا عنه ..." : "\n\nجاري إنشاء الملفات ...");

            return {
              output,
              nextState: newState,
              isComplete: true,
            };
          }
        }
      }
    }

    // If no match was found or parsing failed
    return {
      output: response,
      nextState: state,
      isComplete: true, // Still move to next step even if matching failed
    };
  }
}
