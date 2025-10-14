import { StepRunner } from "../base/StepRunner";
import { HadithNarrator } from "../models/narrator";
import { TraceNarratorsWorkflowState } from "../models/state";
import {
  readVaultFile,
  getPromptTemplate,
  toArabicDigits,
  populateTemplate,
  extractJsonCodeBlock,
  getAIKnowledge,
  stripObsidianProperties,
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

export class ExtractIsnadFromHadithStep extends StepRunner<TraceNarratorsWorkflowState> {
  private hadithLink = "";

  async getUserPrompt() {
    await this.retrieveHadithFilePath();
    if (!this.state.filePath) {
      throw new Error("No file path available");
    }
    const hadithText = await readVaultFile(this.state.filePath);
    const prompt = await getPromptTemplate("ExtractIsnadFromHadith");
    return populateTemplate(prompt, {
      HADITH_TEXT: stripObsidianProperties(hadithText),
      KNOWLEDGE: await getAIKnowledge(BOOKS[0].name),
    });
  }

  async processResponse(response: string) {
    const failedResponse = {
      response: MSG_NO_NARRATORS_FOUND + `\n\n${response}`,
      isSuccessful: false,
    };

    const chains = extractJsonCodeBlock<HadithNarrator[][]>(response);
    if (!this.isNonEmptyArray(chains)) {
      return failedResponse;
    }

    let output = "";
    for (const chain of chains!) {
      if (!this.isNonEmptyArray(chain)) {
        return failedResponse;
      }

      const narratorList: string[] = [];
      for (const narrator of chain) {
        if (!this.isValidNarratorData(narrator)) {
          return {
            response: `${NARRATOR_IDENTIFICATION_FAILED} **${narrator.name}**.\n\n${response}`,
            isSuccessful: false,
          };
        }
        this.processNarratorData(narrator);
        narratorList.push(`- **${narrator.name}**: ${narrator.expectedKnownName}`);
      }

      this.state.addChain(chain.reverse());

      output += this.formatNarratorResult(narratorList);
    }

    return {
      response: output,
      isSuccessful: true,
    };
  }

  private isNonEmptyArray(list: unknown | null) {
    return list && Array.isArray(list) && list.length > 0;
  }

  private async retrieveHadithFilePath() {
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

  private isValidNarratorData(narrator: HadithNarratorWithPossibleMatches) {
    return !!(
      narrator.potentialPeople &&
      narrator.potentialPeople.length === 1 &&
      narrator.potentialPeople[0].fullName &&
      narrator.potentialPeople[0].knownName
    );
  }

  private processNarratorData(narrator: HadithNarratorWithPossibleMatches) {
    if (!narrator.potentialPeople || narrator.potentialPeople.length !== 1) {
      return;
    }
    narrator.expectedFullName = narrator.potentialPeople[0].fullName;
    narrator.expectedKnownName = narrator.potentialPeople[0].knownName;
    narrator.quizChoices = narrator.potentialPeople[0].quizNames;
    delete narrator.potentialPeople;
  }

  private formatNarratorResult(narratorList: string[]) {
    const bulletList = narratorList.join("\n");
    const result = populateTemplate(MSG_CHAIN_IS, {
      hadithLink: this.hadithLink,
      narrators: bulletList,
    });
    return result;
  }
}
