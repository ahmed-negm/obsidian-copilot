import { logError } from "@/logger";
import { StepRunner, ProcessResponseResult } from "../base/StepRunner";
import { TraceNarratorsWorkflowState } from "../models/state";
import { getPromptTemplate, extractJsonCodeBlock } from "../utils";
import { BOOKS, MSG_FOUND_NARRATOR, formatMessage } from "../utils/formatUtils";
import { TEMPLATES } from "../constants";

/**
 * Symbol-to-book mapping type
 */
interface TahdibSymbol {
  symbol: string;
  book: string;
}

/**
 * Narrator match result from AI
 */
interface NarratorMatch {
  id: number;
  name: string;
  confidence: string;
}

/**
 * Step to find symbols associated with hadith narrators
 * This step maps narrators to their symbols in the Tahdhib database
 * and identifies the books that reference them
 */
export class FindSymbolsStep extends StepRunner<TraceNarratorsWorkflowState> {
  /**
   * Provides context message for the user while this step is processing
   *
   * @returns Message about which narrator is being searched
   */
  getContextIntroMessage(): string {
    try {
      const nextNarrator = this.state.hadithNarrators[this.state.hadithNarratorIndex + 1];
      if (!nextNarrator || !nextNarrator.expectedKnownName) {
        return "جاري البحث عن الراوي...";
      }
      return `جاري البحث عن **${nextNarrator.expectedKnownName}** بينهم ...`;
    } catch (error) {
      logError("Error generating context message in FindSymbolsStep", error);
      return "جاري البحث عن الراوي...";
    }
  }

  /**
   * Generate a prompt to find a narrator by name in the Tahdhib database
   *
   * @returns Prompt with narrator name and list of potential matches
   */
  async getUserPrompt(): Promise<string> {
    try {
      const nextNarratorIndex = this.state.hadithNarratorIndex + 1;
      if (!this.state.hadithNarrators[nextNarratorIndex]) {
        throw new Error("No next narrator available to search");
      }

      const narratorToFind = this.state.hadithNarrators[nextNarratorIndex].expectedFullName;

      // Prepare list of potential narrators to search among
      const narratorsToSearch = this.prepareNarratorsToSearch();

      // Get and fill the prompt template
      const promptTemplate = await getPromptTemplate(
        TEMPLATES.FIND_SYMBOLS_STEP || "FindSymbolsStep"
      );
      return this.fillPromptTemplate(promptTemplate, narratorToFind, narratorsToSearch);
    } catch (error) {
      logError("Error preparing find symbols prompt", error);
      return "Error preparing the search prompt. Please try again.";
    }
  }

  /**
   * Process AI response to extract matching narrator and their symbols
   *
   * @param response - The AI response containing narrator match data
   * @returns Formatted output with narrator information and book symbols
   */
  async processResponse(response: string): Promise<ProcessResponseResult> {
    try {
      // Parse the JSON response from the AI
      const matches = extractJsonCodeBlock<NarratorMatch[]>(response);

      if (!this.isValidMatchResult(matches)) {
        return {
          response: "Could not find a matching narrator in the database.",
          isSuccessful: false,
        };
      }

      const match = matches![0];
      const foundNarrator = this.state.tahdibNarrators![match.id];

      // Process the symbols associated with this narrator
      const symbols = this.extractSymbols(foundNarrator.symbols);
      const tahdibBooks = this.getTahdibBooks(symbols);

      // Format the output message
      const output = this.formatNarratorOutput(foundNarrator.name, tahdibBooks);

      return {
        response: output,
        isSuccessful: true,
      };
    } catch (error) {
      logError("Error processing narrator symbol response", error);
      return {
        response: `Error processing narrator information: ${error.message}`,
        isSuccessful: false,
      };
    }
  }

  /**
   * Prepares the list of narrators to search through
   *
   * @returns Array of narrator objects with ID and name
   */
  private prepareNarratorsToSearch(): Array<{ id: number; name: string }> {
    return (
      this.state.tahdibNarrators?.map((narrator, index) => ({
        id: index,
        name: narrator.name,
      })) || []
    );
  }

  /**
   * Fills the prompt template with narrator name and JSON data
   *
   * @param template - The prompt template
   * @param narratorName - The narrator name to search for
   * @param narratorsData - The narrator data for searching
   * @returns The completed prompt
   */
  private fillPromptTemplate(
    template: string,
    narratorName: string,
    narratorsData: Array<{ id: number; name: string }>
  ): string {
    return template
      .replaceAll("{{name_to_search}}", narratorName)
      .replaceAll("{{JSON}}", JSON.stringify(narratorsData, null, 2));
  }

  /**
   * Checks if the match result is valid and contains usable data
   *
   * @param matches - The parsed matches from the AI response
   * @returns Whether the matches are valid
   */
  private isValidMatchResult(matches: NarratorMatch[] | null): boolean {
    if (!matches || matches.length === 0) return false;

    const first = matches[0];
    if (!first || !this.state.tahdibNarrators) return false;

    if (first.id < 0 || first.id >= this.state.tahdibNarrators.length) {
      return false;
    }

    return true;
  }

  /**
   * Extracts symbol codes from the raw symbols string
   *
   * @param symbolsString - Raw symbols string from the database
   * @returns Array of individual symbol codes
   */
  private extractSymbols(symbolsString: string): string[] {
    // Extract symbols, excluding `خ` which is for Bukhari
    return symbolsString
      .replace(/^[()]|[()]$/g, "") // Remove parentheses
      .split(" ") // Split into individual symbols
      .filter((s) => s !== BOOKS[0].symbol && s.trim() !== ""); // Filter out Bukhari symbol and empty strings
  }

  /**
   * Format the final output with narrator information and books
   *
   * @param narratorName - The found narrator's name
   * @param booksText - Text describing the books the narrator appears in
   * @returns Formatted output message
   */
  private formatNarratorOutput(narratorName: string, booksText: string): string {
    const currentNarratorName =
      this.state.hadithNarrators[this.state.hadithNarratorIndex].expectedKnownName;

    return (
      formatMessage(MSG_FOUND_NARRATOR, {
        student: narratorName,
        teacher: currentNarratorName,
      }) + booksText
    );
  }

  /**
   * Get book names from Tahdhib symbols
   *
   * @param symbols - Array of symbol codes
   * @returns Formatted string with book names
   */
  private getTahdibBooks(symbols: string[]): string {
    // Handle empty symbols case
    if (!symbols.length) {
      return " فقط ";
    }

    const unknownSymbols: string[] = [];
    let bookList = "";

    // Look up each symbol and build the book list
    for (const symbol of symbols) {
      const found = this.getTahdibSymbols().find((s) => s.symbol === symbol);
      if (found) {
        bookList += " " + "و" + found.book;
      } else {
        unknownSymbols.push(symbol);
      }
    }

    // Add warning for unknown symbols
    const unknownSymbolsWarning = unknownSymbols.length
      ? `\n\n⚠️ رموز غير معروفة: ${unknownSymbols.join(", ")}`
      : "";

    return bookList + unknownSymbolsWarning;
  }

  /**
   * Get the mapping of Tahdhib symbols to book names
   *
   * @returns Array of symbol-book mappings
   */
  private getTahdibSymbols(): TahdibSymbol[] {
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
