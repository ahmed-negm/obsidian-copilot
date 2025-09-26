import { SystemMessage } from "../../BaseSimpleChainRunner";
import { StepRunner } from "../../base/StepRunner";
import { HadithWorkflowState } from "../models/WorkflowState";
import { getPromptTemplate } from "../../utils/promptUtils";

/**
 * Step to find symbols and match narrators in the chain
 */
export class FindSymbolsStep implements StepRunner<HadithWorkflowState> {
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
    // Skip this step if we're skipping to the final step
    if (state.skipToFinalStep) {
      return messages;
    }

    // Get current narrator index
    const narratorIndex = state.hadithNarratorIndex || 0;

    // Get the next narrator to find
    const narratorToFind = state.hadithNarrators[narratorIndex + 1].potentialPeople[0].fullName;

    // Prepare narrators to search in
    const narratorsToSearch =
      state.tahdibNarrators?.map((narrator, index) => ({
        id: index,
        name: narrator.name,
      })) || [];

    const promptTemplate = await getPromptTemplate("TraceHadithChainRunner03");
    const prompt = promptTemplate
      .replaceAll("{{name_to_search}}", narratorToFind)
      .replaceAll("{{JSON}}", JSON.stringify(narratorsToSearch, null, 2));

    return [{ role: "user", content: prompt }];
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
    // Skip this step if we're skipping to the final step
    if (state.skipToFinalStep) {
      return {
        output: response,
        nextState: state,
        isComplete: true,
      };
    }

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
        const first = result[0];
        if (first && state.tahdibNarrators) {
          const foundNarrator = state.tahdibNarrators[first.id];

          // Extract symbols, excluding خ which is for Bukhari
          const symbols = foundNarrator.symbols
            .replace(/^\(|\)$/g, "")
            .split(" ")
            .filter((s) => s !== "خ");

          const tahdibBooks = this.getTahdibBooks(symbols);

          // Format the output message
          const output =
            `✅ تم العثور على **${foundNarrator.name}** فيمن رووا عن **${state.hadithNarrators[narratorIndex].potentialPeople[0].knownName}** في  ` +
            "صحيح البخاري" +
            tahdibBooks;

          // Update narrator index
          const newNarratorIndex = narratorIndex + 1;

          // Check if we've processed all narrators
          const isComplete = newNarratorIndex >= state.hadithNarrators.length;

          // Create updated state
          const newState: HadithWorkflowState = {
            ...state,
            hadithNarratorIndex: newNarratorIndex,
          };

          return {
            output:
              output +
              (isComplete
                ? "\n\n\n\n🎉 تم الانتهاء من تتبع جميع الرواة!"
                : "\n\nجاري تتبع الراوي التالي في السند ..."),
            nextState: newState,
            isComplete: true,
          };
        }
      }
    }

    // If no match was found or parsing failed
    return {
      output: response,
      nextState: state,
      isComplete: true,
    };
  }

  /**
   * Get book names from Tahdhib symbols
   * @param symbols Array of symbols
   * @returns Formatted string with book names
   */
  private getTahdibBooks(symbols: string[]): string {
    const unknownSymbols: string[] = [];
    if (!symbols.length) {
      return " فقط ";
    }

    let txt = "";
    for (const symbol of symbols) {
      const found = this.getTahdibSymbols().find((s) => s.symbol === symbol);
      if (found) {
        txt += " " + "و" + found.book;
      } else {
        unknownSymbols.push(symbol);
      }
    }

    return (
      txt + (unknownSymbols.length ? `\n\n⚠️ رموز غير معروفة: ${unknownSymbols.join(", ")}` : "")
    );
  }

  /**
   * Get the mapping of Tahdhib symbols to book names
   * @returns Array of symbol-book mappings
   */
  private getTahdibSymbols() {
    return [
      { symbol: "خ", book: "صحيح البخاري" },
      { symbol: "ع", book: "باقي الكتب الستة" },
      { symbol: "خت", book: "صحيح البخاري تعليقًا" },
      { symbol: "ز", book: "كتاب القراءة خلف الإمام للبخاري" },
      { symbol: "ي", book: "كتاب رفع اليدين في الصلاة للبخاري" },
      { symbol: "بخ", book: "كتاب الأدم للبخاري" },
      { symbol: "عخ", book: "كتاب أفعال العباد للبخاري" },
      { symbol: "م", book: "صحيح مسلم" },
      { symbol: "مق", book: "مقدمة صحيح مسلم" },
      { symbol: "د", book: "سنن أبو داود" },
      { symbol: "مد", book: "كتاب المراسيل لأبو داود" },
      { symbol: "قد", book: "كتاب الرد على أهل القدر لأبو داود" },
      { symbol: "خد", book: "كتاب الناسخ والمنسوخ لأبو داود" },
      { symbol: "ف", book: "كتاب التفرد لأبو داود" },
      { symbol: "صد", book: "فضائل الأنصار لأبو داود" },
      { symbol: "ل", book: "كتاب المسائل لأبو داود" },
      { symbol: "كد", book: "مسند حديث مالك بن أنس لأبو داود" },
      { symbol: "ن", book: "سنن النسائي" },
      { symbol: "سي", book: "كتاب عمل يوم وليلة للنسائي" },
      { symbol: "ص", book: "كتاب خصائص أمير المؤمنين علي بن أبي طالب للنسائي" },
      { symbol: "عس", book: "مسند علي للنسائي" },
      { symbol: "كن", book: "مسند حديث مالك بن أنس للنسائي" },
      { symbol: "ق", book: "سنن ابن ماجة" },
      { symbol: "فق", book: "كتاب التفسير لابن ماجة القزويني" },
    ];
  }
}
