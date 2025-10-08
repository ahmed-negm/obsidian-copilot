import { StepRunner } from "../base/StepRunner";
import { TraceNarratorsWorkflowState } from "../models/state";
import { getPromptTemplate, extractJsonCodeBlock } from "../utils";

export class FindSymbolsStep extends StepRunner<TraceNarratorsWorkflowState> {
  getContextIntroMessage() {
    return `جاري البحث عن **${this.state.hadithNarrators[this.state.hadithNarratorIndex + 1].expectedKnownName}** بينهم ...`;
  }

  async getUserPrompt(): Promise<string> {
    const narratorToFind =
      this.state.hadithNarrators[this.state.hadithNarratorIndex + 1].expectedFullName;
    // Prepare narrators to search in
    const narratorsToSearch =
      this.state.tahdibNarrators?.map((narrator, index) => ({
        id: index,
        name: narrator.name,
      })) || [];
    const promptTemplate = await getPromptTemplate("FindSymbolsStep");
    const prompt = promptTemplate
      .replaceAll("{{name_to_search}}", narratorToFind)
      .replaceAll("{{JSON}}", JSON.stringify(narratorsToSearch, null, 2));
    return prompt;
  }

  async processResponse(response: string) {
    const parsed =
      extractJsonCodeBlock<{ id: number; name: string; confidence: string }[]>(response);
    if (parsed && parsed.length > 0) {
      const first = parsed[0];
      if (first && this.state.tahdibNarrators) {
        const foundNarrator = this.state.tahdibNarrators[first.id];
        // Extract symbols, excluding `خ` which is for Bukhari
        const symbols = foundNarrator.symbols
          .replace(/^[()]|[()]$/g, "")
          .split(" ")
          .filter((s) => s !== "خ");
        const tahdibBooks = this.getTahdibBooks(symbols);
        // Format the output message
        const output =
          `✅ تم العثور على **${foundNarrator.name}** فيمن رووا عن **${this.state.hadithNarrators[this.state.hadithNarratorIndex].expectedKnownName}** في  ` +
          "صحيح البخاري" +
          tahdibBooks;
        return {
          response: output,
          isSuccessful: true,
        };
      }
    }

    return {
      response,
      isSuccessful: false,
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
