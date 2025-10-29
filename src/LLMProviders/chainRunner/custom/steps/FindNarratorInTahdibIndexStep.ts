import { StepRunner } from "../base/StepRunner";
import {
  BOOKS,
  MSG_FOUND_NARRATOR,
  MSG_NARRATOR_NOT_FOUND_IN_TAHDIB,
  MSG_SEARCHING_NARRATORS,
  MSG_SEARCHING_NEXT_NARRATOR,
  PATHS,
} from "../constants";
import { NarratorInfo } from "../models/narrator";
import { TraceNarratorsWorkflowState } from "../models/state";
import {
  getPromptTemplate,
  toArabicDigits,
  extractJsonCodeBlock,
  populateTemplate,
  getSignedUrl,
  getAIKnowledge,
  readVaultFile,
  updateVaultFile,
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

const tahdhibCachePath = PATHS.DATA + `/TahdhibCache.json`;

export class FindNarratorInTahdibIndexStep extends StepRunner<TraceNarratorsWorkflowState> {
  private searchContext: NarratorSearchContext;

  getContextIntroMessage() {
    return this.state.narratorIndex === 0 ? MSG_SEARCHING_NARRATORS : MSG_SEARCHING_NEXT_NARRATOR;
  }

  async getUserPrompt() {
    this.searchContext = await this.buildNarratorSearchContext();

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

    return this.handleMultipleMatches(response);
  }

  private async buildNarratorSearchContext(): Promise<NarratorSearchContext> {
    const narratorToFind = this.state.currentNarrator.expectedFullName;
    let cachedNarratorName = await this.findMatchingNarratorInManualCache(narratorToFind);
    if (!cachedNarratorName) {
      const cachedNarratorId = await this.findMatchingNarratorInAutomaticCache(narratorToFind);
      cachedNarratorName = this.state.allNarrators.find(
        (narrator) => narrator.id === cachedNarratorId
      )?.name;
    }

    let cachedNarrator: NarratorInfo | undefined = undefined;
    if (cachedNarratorName) {
      cachedNarrator = this.state.allNarrators.find(
        (narrator) => narrator.name === cachedNarratorName
      );

      if (!cachedNarrator) {
        throw new Error(`Cached narrator "${cachedNarratorName}" not found in allNarrators`);
      }
    }

    const matchingNarrators = cachedNarrator
      ? [cachedNarrator]
      : this.findMatchingNarrators(narratorToFind);

    return {
      narratorToFind,
      matchingNarrators,
      currentNarratorIndex: this.state.narratorIndex,
    };
  }

  // Avoid caching narrators with IDs between 3400 and 4000 as they are duplicate entries
  async findMatchingNarratorInAutomaticCache(fullName: string) {
    const json = await readVaultFile(tahdhibCachePath);
    const cacheEntries = JSON.parse(json) as { id: number; fullName: string }[];

    const found = cacheEntries.find((line) => fullName === line.fullName);
    return found && (found.id < 3400 || found.id > 4000) ? found.id : undefined;
  }

  async updateAutomaticCache(id: number, fullName: string) {
    if (id >= 3400 && id <= 4000) {
      // Skip caching for duplicate entries
      return;
    }

    const json = await readVaultFile(tahdhibCachePath);
    const cacheEntries = JSON.parse(json) as { id: number; fullName: string }[];

    const found = cacheEntries.find((line) => fullName === line.fullName);
    if (!found) {
      cacheEntries.push({ id, fullName });
      cacheEntries.sort((a, b) => a.id - b.id);
      const updatedJson = JSON.stringify(cacheEntries, null, 2);
      await updateVaultFile(tahdhibCachePath, updatedJson);
    }
  }

  async findMatchingNarratorInManualCache(narratorToFind: string) {
    const cacheContent = await readVaultFile(
      PATHS.AI_KNOWLEDGE + `/الأسماء المختلفة في تهذيب الكمال.md`
    );
    const cacheEntries = cacheContent.split("\n").map((line) => ({
      fullName: line.split("|")[1]?.trim(),
      tahdhibName: line
        .split("|")[2]
        ?.trim()
        ?.replace(/^\[+|\]+$/g, ""),
    }));

    const found = cacheEntries.find((line) => narratorToFind.startsWith(line.fullName));
    return found ? found.tahdhibName : undefined;
  }

  private findMatchingNarrators(nameToFind: string) {
    for (const prefixLength of SEARCH_PREFIX_LENGTHS) {
      const prefix = nameToFind.slice(0, prefixLength);
      const matches = this.state.allNarrators.filter((narrator) =>
        narrator.name?.startsWith(prefix)
      );

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
      KNOWLEDGE: await getAIKnowledge(BOOKS[0].name),
    });
  }

  private handleNarratorNotFound(response: string, narratorToFind: string) {
    const notFoundMessage = populateTemplate(MSG_NARRATOR_NOT_FOUND_IN_TAHDIB, {
      narrator: narratorToFind,
      search_link: `https://www.google.com/search?q=${encodeURIComponent(narratorToFind + " تهذيب الكمال")}`,
    });

    return {
      response: `${notFoundMessage}\n\n${this.getContextInfo()}\n\n${response}`,
      isSuccessful: false,
    };
  }

  private getContextInfo() {
    const narratorLinks = this.searchContext.matchingNarrators
      .map(
        (narrator) =>
          ` [${narrator.name}](obsidian://open?vault=Tahdhib-al-Kamal&file=Figures/${getSignedUrl(toArabicDigits(narrator.id!) + "-" + narrator.name)})`
      )
      .join("\n- ");
    return `المطابقات المحتملة للراوي:\n- ${narratorLinks}`;
  }

  private handleSingleMatch(narrator: NarratorInfo) {
    this.updateStateWithNarrator(narrator.index);
    return {
      response: this.formatNarratorFoundMessage(narrator),
      isSuccessful: true,
    };
  }

  private async handleMultipleMatches(response: string) {
    const selectedNarrator = this.extractSelectedNarratorFromResponse(response);

    if (!selectedNarrator) {
      return this.handleNarratorNotFound(response, this.searchContext.narratorToFind);
    }

    const foundNarrator = this.state.allNarrators[selectedNarrator.id];
    if (!foundNarrator) {
      return this.handleNarratorNotFound(response, this.searchContext.narratorToFind);
    }

    // Check if narrator has required ID
    if (!foundNarrator.id) {
      return {
        response: `${this.formatNarratorFoundMessage(foundNarrator)} ${NO_ID_SUFFIX}\n\n${this.getContextInfo()}\n\n${response}`,
        isSuccessful: false,
      };
    }

    this.updateStateWithNarrator(selectedNarrator.id);
    await this.updateAutomaticCache(foundNarrator.id, this.searchContext.narratorToFind);
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
    this.state.currentNarrator.indexInAllNarrators = narratorIndex;
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
