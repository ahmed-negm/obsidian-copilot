import { StepRunner } from "../base/StepRunner";
import {
  MSG_FOUND_NARRATOR,
  MSG_NARRATOR_NOT_FOUND,
  MSG_SEARCHING_NARRATORS,
  MSG_SEARCHING_NEXT_NARRATOR,
} from "../constants";
import { NarratorInfo } from "../models/narrator";
import { TraceNarratorsWorkflowState } from "../models/state";
import {
  getPromptTemplate,
  toArabicDigits,
  extractJsonCodeBlock,
  populateTemplate,
} from "../utils";

/**
 * Step to find a narrator in the Tahdib index, with progressive filtering and prompt generation.
 * Improves readability and maintainability by extracting logic and clarifying responsibilities.
 */
export class FindNarratorInTahdibIndexStep extends StepRunner<TraceNarratorsWorkflowState> {
  private matchingNarrators: NarratorInfo[] = [];
  private narratorToFind: string = "";

  /**
   * Returns the context intro message based on the current narrator index.
   */
  getContextIntroMessage(): string {
    return this.state.hadithNarratorIndex === 0
      ? MSG_SEARCHING_NARRATORS
      : MSG_SEARCHING_NEXT_NARRATOR;
  }

  /**
   * Finds matching narrators using progressive prefix filtering.
   * @param nameToFind The name to search for.
   * @returns Array of matching NarratorInfo objects.
   */
  private findMatchingNarrators(nameToFind: string): NarratorInfo[] {
    const { allNarrators } = this.state;
    const prefixLengths = [20, 10, 3];
    for (const len of prefixLengths) {
      const matches = allNarrators.filter((n) => n.name?.startsWith(nameToFind.slice(0, len)));
      if (matches.length > 0) return matches;
    }
    return [];
  }

  /**
   * Generates the user prompt for narrator selection if needed.
   */
  async getUserPrompt(): Promise<string> {
    this.narratorToFind =
      this.state.hadithNarrators[this.state.hadithNarratorIndex].expectedFullName;
    this.matchingNarrators = this.findMatchingNarrators(this.narratorToFind);

    if (this.matchingNarrators.length === 0 || this.matchingNarrators.length === 1) {
      return "";
    }

    const promptTemplate = await getPromptTemplate("FindNarratorInList");
    const narratorsJson = JSON.stringify(
      this.matchingNarrators.map((n) => ({ id: n.index, name: n.name })),
      null,
      2
    );
    return populateTemplate(promptTemplate, {
      name_to_search: this.narratorToFind,
      JSON: narratorsJson,
    });
  }

  /**
   * Processes the LLM response to select the correct narrator or handle not found cases.
   */
  async processResponse(response: string): Promise<{ response: string; isSuccessful: boolean }> {
    if (this.matchingNarrators.length > 1) {
      const parsed =
        extractJsonCodeBlock<{ id: number; name: string; confidence: string }[]>(response);
      if (parsed) {
        const highConfidence = parsed.find((r) => r.confidence === "High");
        if (highConfidence && typeof highConfidence.id === "number" && highConfidence.id !== -1) {
          const foundNarrator = this.state.allNarrators[highConfidence.id];
          if (!foundNarrator.id) {
            return {
              response: this.narratorFoundMessage(foundNarrator) + " ولكن بدون رقم",
              isSuccessful: false,
            };
          }
          this.state.hadithNarrators[this.state.hadithNarratorIndex].indexInAllNarrators =
            highConfidence.id;
          return {
            response: this.narratorFoundMessage(foundNarrator),
            isSuccessful: true,
          };
        }
      }
    } else if (this.matchingNarrators.length === 1) {
      this.state.hadithNarrators[this.state.hadithNarratorIndex].indexInAllNarrators =
        this.matchingNarrators[0].index;
      return {
        response: this.narratorFoundMessage(this.matchingNarrators[0]),
        isSuccessful: true,
      };
    }
    return {
      response: this.narratorNotFoundMessage() + "\n\n" + response,
      isSuccessful: false,
    };
  }

  /**
   * Returns a formatted message for narrator not found.
   */
  private narratorNotFoundMessage(): string {
    return populateTemplate(MSG_NARRATOR_NOT_FOUND, { narrator: this.narratorToFind });
  }

  /**
   * Returns a formatted message for narrator found.
   */
  private narratorFoundMessage(narrator: NarratorInfo): string {
    return populateTemplate(MSG_FOUND_NARRATOR, {
      narrator: narrator.name,
      part: toArabicDigits(narrator.part),
      page: toArabicDigits(narrator.page),
      shamelaIndex: narrator.shamelaIndex,
    });
  }
}
