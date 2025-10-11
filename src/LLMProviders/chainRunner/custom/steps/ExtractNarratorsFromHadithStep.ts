import { StepRunner, ProcessResponseResult } from "../base/StepRunner";
import { HadithNarrator } from "../models/narrator";
import { TraceNarratorsWorkflowState } from "../models/state";
import {
  readVaultFile,
  getPromptTemplate,
  toArabicDigits,
  populateTemplate,
  extractJsonCodeBlock,
} from "../utils";
import {
  BOOKS,
  MSG_CHAIN_IS,
  MSG_NO_NARRATORS_FOUND,
  NARRATOR_IDENTIFICATION_FAILED,
  PATHS,
} from "../constants";

interface HadithNarratorWithPossibleMatches extends HadithNarrator {
  potentialPeople?: {
    fullName: string;
    knownName: string;
    quizNames: string[];
  }[];
}

export class ExtractNarratorsFromHadithStep extends StepRunner<TraceNarratorsWorkflowState> {
  private hadithLink = "";

  async getUserPrompt() {
    await this.retrieveHadithFilePath();
    if (!this.state.filePath) {
      throw new Error("No file path available");
    }
    const hadithText = await readVaultFile(this.state.filePath);
    const prompt = await getPromptTemplate("ExtractNarrators");
    return populateTemplate(prompt, { HADITH_TEXT: hadithText });
  }

  async processResponse(response: string) {
    const narrators = extractJsonCodeBlock<HadithNarratorWithPossibleMatches[]>(response);
    if (!narrators || !Array.isArray(narrators) || narrators.length === 0) {
      return {
        response: MSG_NO_NARRATORS_FOUND + `\n\n${response}`,
        isSuccessful: false,
      };
    }
    const narratorList: string[] = [];
    for (const narrator of narrators) {
      if (!this.isValidNarratorData(narrator)) {
        return {
          response: `${NARRATOR_IDENTIFICATION_FAILED} **${narrator.name}**.\n\n${response}`,
          isSuccessful: false,
        };
      }
      this.processNarratorData(narrator);
      narratorList.push(`- **${narrator.name}**: ${narrator.expectedKnownName}`);
    }
    this.state.hadithNarrators = narrators.reverse();
    return this.formatNarratorResult(narratorList);
  }

  private async retrieveHadithFilePath(): Promise<void> {
    const hadithNumber = this.state.args;
    if (hadithNumber) {
      this.state.filePath = `${PATHS.BUKHARI}/${BOOKS[0].name}-${toArabicDigits(hadithNumber)}.md`;
      this.hadithLink = `[[${BOOKS[0].name}-${hadithNumber}]]`;
    } else {
      const activeFile = app.workspace.getActiveFile();
      this.state.filePath = activeFile?.path || "";
      this.hadithLink = activeFile ? `[[${activeFile.name}]]` : "";
    }
  }

  private isValidNarratorData(narrator: HadithNarratorWithPossibleMatches): boolean {
    return !!(
      narrator.potentialPeople &&
      narrator.potentialPeople.length === 1 &&
      narrator.potentialPeople[0].fullName &&
      narrator.potentialPeople[0].knownName
    );
  }

  private processNarratorData(narrator: HadithNarratorWithPossibleMatches): void {
    if (!narrator.potentialPeople || narrator.potentialPeople.length !== 1) {
      return;
    }
    narrator.expectedFullName = narrator.potentialPeople[0].fullName;
    narrator.expectedKnownName = narrator.potentialPeople[0].knownName;
    narrator.quizChoices = narrator.potentialPeople[0].quizNames;
    delete narrator.potentialPeople;
  }

  private formatNarratorResult(narratorList: string[]): ProcessResponseResult {
    const bulletList = narratorList.join("\n");
    const result = populateTemplate(MSG_CHAIN_IS, {
      hadithLink: this.hadithLink,
      narrators: bulletList,
    });
    return {
      response: result,
      isSuccessful: true,
    };
  }
}
