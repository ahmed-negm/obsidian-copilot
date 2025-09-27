import { StepRunner } from "../base/StepRunner";
import { TraceNarratorsWorkflowState } from "../models/State";
import { getPromptTemplate, toArabicDigits } from "../utils";

/**
 * Step to verify narrators and find matches in the database
 */
export class VerifyNarratorsStep extends StepRunner<TraceNarratorsWorkflowState> {
  async getUserPrompt() {
    // Use current narrator index from state
    const narratorIndex = this.state.hadithNarratorIndex || 0;
    const narratorToFind = this.state.hadithNarrators[narratorIndex].potentialPeople[0].fullName;

    // Find all narrator info that matches the first 3 letters of the name
    const matchingNarrators = this.state.allNarrators
      .filter((n) => n.name?.startsWith(narratorToFind.slice(0, 3)))
      .map((n) => ({
        id: n.islamWebIndex ?? 0,
        name: n.name ?? "",
      }));

    const promptTemplate = await getPromptTemplate("TraceHadithChainRunner03");
    const prompt = promptTemplate
      .replaceAll("{{name_to_search}}", narratorToFind)
      .replaceAll("{{JSON}}", JSON.stringify(matchingNarrators, null, 2));

    return prompt;
  }

  async processResponse(response: string) {
    // Get current narrator index
    const narratorIndex = this.state.hadithNarratorIndex || 0;

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
          const allNarratorIndex = this.state.allNarrators.findIndex(
            (n) => n.islamWebIndex === first.id
          );

          if (allNarratorIndex !== -1) {
            // Narrator found
            const foundNarrator = this.state.allNarrators[allNarratorIndex];

            // Check if this is the last narrator
            const isLastNarrator = narratorIndex >= this.state.hadithNarrators.length - 1;

            // Update state
            const hadithNarrators = [...this.state.hadithNarrators];
            hadithNarrators[narratorIndex] = {
              ...hadithNarrators[narratorIndex],
              indexInAllNarrators: allNarratorIndex,
            };

            this.state.hadithNarrators = hadithNarrators;
            this.state.allNarratorIndex = allNarratorIndex;
            this.state.skipToFinalStep = isLastNarrator;

            const output =
              `
تم العثور على **${foundNarrator.name}** في تهذيب الكمال [المجلد ${toArabicDigits(foundNarrator.part)} - الصفحة ${toArabicDigits(foundNarrator.page)}](https://shamela.ws/book/3722/${foundNarrator.shamelaIndex})
` + (!isLastNarrator ? "جاري البحث عن من رووا عنه ..." : "\n\nجاري إنشاء الملفات ...");

            return {
              response: output,
              isSuccessful: true,
            };
          }
        }
      }
    }

    // If no match was found or parsing failed
    return {
      response,
      isSuccessful: true, // Still move to next step even if matching failed
    };
  }
}
