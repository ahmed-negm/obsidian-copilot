import { StepRunner } from "../base/StepRunner";
import {
  MSG_FOUND_NARRATOR,
  MSG_NARRATOR_NOT_FOUND_IN_TAHDIB,
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
  getSignedUrl,
} from "../utils";

const SEARCH_PREFIX_LENGTHS = [20, 10, 3] as const;
export const HIGH_CONFIDENCE = "High";
const NO_ID_SUFFIX = " ولكن بدون رقم";

export interface LLMNarratorResponse {
  id: number;
  name: string;
  confidence: string;
}

interface NarratorSearchContext {
  narratorToFind: string;
  matchingNarrators: NarratorInfo[];
  currentNarratorIndex: number;
}

export class FindNarratorInTahdibIndexStep extends StepRunner<TraceNarratorsWorkflowState> {
  private searchContext: NarratorSearchContext;

  getContextIntroMessage() {
    return this.state.hadithNarratorIndex === 0
      ? MSG_SEARCHING_NARRATORS
      : MSG_SEARCHING_NEXT_NARRATOR;
  }

  async getUserPrompt() {
    this.searchContext = this.buildNarratorSearchContext();

    // No prompt needed if we have 0 or 1 matches (handled in processResponse)
    if (this.searchContext.matchingNarrators.length <= 1) {
      return "";
    }

    return this.generatePrompt(this.searchContext);
  }

  async processResponse(response: string) {
    if (this.searchContext.matchingNarrators.length === 0) {
      return this.handleNarratorNotFound(response, this.searchContext.narratorToFind);
    }

    if (this.searchContext.matchingNarrators.length === 1) {
      return this.handleSingleMatch(this.searchContext.matchingNarrators[0]);
    }

    return this.handleMultipleMatches(response, this.searchContext);
  }

  private buildNarratorSearchContext(): NarratorSearchContext {
    const currentNarrator = this.state.hadithNarrators[this.state.hadithNarratorIndex];
    const narratorToFind = currentNarrator.expectedFullName;
    const matchingNarrators = this.findMatchingNarrators(narratorToFind);

    return {
      narratorToFind,
      matchingNarrators,
      currentNarratorIndex: this.state.hadithNarratorIndex,
    };
  }

  private findMatchingNarrators(nameToFind: string) {
    const { allNarrators } = this.state;

    for (const prefixLength of SEARCH_PREFIX_LENGTHS) {
      const prefix = nameToFind.slice(0, prefixLength);
      const matches = allNarrators.filter((narrator) => narrator.name?.startsWith(prefix));

      if (matches.length > 0) {
        return matches;
      }
    }

    return [];
  }

  private async generatePrompt(context: NarratorSearchContext) {
    const promptTemplate = await getPromptTemplate("FindNarratorInList");
    const narratorsJson = JSON.stringify(
      context.matchingNarrators.map((narrator) => ({
        id: narrator.index,
        name: narrator.name,
      })),
      null,
      2
    );

    return populateTemplate(promptTemplate, {
      name_to_search: context.narratorToFind,
      JSON: narratorsJson,
    });
  }

  private handleNarratorNotFound(response: string, narratorToFind: string) {
    const notFoundMessage = populateTemplate(MSG_NARRATOR_NOT_FOUND_IN_TAHDIB, {
      narrator: narratorToFind,
    });

    return {
      response: `${notFoundMessage}${this.getContextInfo()}\n\nResponse:${response}`,
      isSuccessful: false,
    };
  }

  private getContextInfo() {
    return `\n\nContext: \`\`\`json\n${JSON.stringify(this.searchContext, null, 2)}\n\`\`\``;
  }

  private handleSingleMatch(narrator: NarratorInfo) {
    this.updateStateWithNarrator(narrator.index);

    return {
      response: this.formatNarratorFoundMessage(narrator),
      isSuccessful: true,
    };
  }

  private handleMultipleMatches(response: string, context: NarratorSearchContext) {
    const selectedNarrator = this.extractSelectedNarratorFromResponse(response);

    if (!selectedNarrator) {
      return this.handleNarratorNotFound(response, context.narratorToFind);
    }

    const foundNarrator = this.state.allNarrators[selectedNarrator.id];
    if (!foundNarrator) {
      return this.handleNarratorNotFound(response, context.narratorToFind);
    }

    // Check if narrator has required ID
    if (!foundNarrator.id) {
      return {
        response:
          this.formatNarratorFoundMessage(foundNarrator) + NO_ID_SUFFIX + this.getContextInfo(),
        isSuccessful: false,
      };
    }

    this.updateStateWithNarrator(selectedNarrator.id);
    return {
      response: this.formatNarratorFoundMessage(foundNarrator),
      isSuccessful: true,
    };
  }

  private extractSelectedNarratorFromResponse(response: string) {
    const parsed = extractJsonCodeBlock<LLMNarratorResponse[]>(response);

    if (!parsed || !Array.isArray(parsed)) {
      return null;
    }

    return parsed.find((result) => result.confidence === HIGH_CONFIDENCE) || null;
  }

  private updateStateWithNarrator(narratorIndex: number): void {
    this.state.hadithNarrators[this.state.hadithNarratorIndex].indexInAllNarrators = narratorIndex;
  }

  private formatNarratorFoundMessage(narrator: NarratorInfo) {
    return populateTemplate(MSG_FOUND_NARRATOR, {
      narrator: narrator.name,
      part: toArabicDigits(narrator.part),
      page: toArabicDigits(narrator.page),
      signed_name: getSignedUrl(toArabicDigits(narrator.id!) + "-" + narrator.name),
    });
  }
}
