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
  MSG_MULTIPLE_CHAINS_ARE,
  MSG_NO_NARRATORS_FOUND,
  MSG_SINGLE_CHAIN_IS,
  MSG_NARRATOR_IDENTIFICATION_FAILED,
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

    const chains = extractJsonCodeBlock<HadithNarrator[][]>(response)!;
    if (!this.isNonEmptyArray(chains)) {
      return failedResponse;
    }

    let output =
      chains.length > 1
        ? populateTemplate(MSG_MULTIPLE_CHAINS_ARE, {
            hadithLink: this.hadithLink,
            isnad_count: toArabicDigits(chains.length),
          }) + "\n\n"
        : "";

    for (let i = 0; i < chains.length; i++) {
      const chain = chains[i];

      if (!this.isNonEmptyArray(chain)) {
        return failedResponse;
      }

      const narratorList: string[] = [];
      for (const narrator of chain) {
        if (!this.isValidNarratorData(narrator)) {
          return {
            response: `${MSG_NARRATOR_IDENTIFICATION_FAILED} **${narrator.name}**.\n\n${response}`,
            isSuccessful: false,
          };
        }
        this.processNarratorData(narrator);
        const KNOWN_NAME = "الاسم المعرّف";
        const FULL_NAME = "الاسم الكامل";
        narratorList.push(
          `**${narrator.name}**:\n- ${KNOWN_NAME}: ${narrator.expectedKnownName}\n- ${FULL_NAME}: ${narrator.expectedFullName}`
        );
      }

      this.state.addChain(chain.reverse());

      output +=
        chains.length === 1
          ? this.formatSingleIsnadEntry(narratorList)
          : this.formatMultipleIsnadEntry(narratorList, i + 1);
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

  private formatSingleIsnadEntry(narratorList: string[]) {
    const bulletList = narratorList.join("\n");
    const result = populateTemplate(MSG_CHAIN_IS, {
      hadithLink: this.hadithLink,
      narrators: bulletList,
    });
    return result;
  }

  private formatMultipleIsnadEntry(narratorList: string[], index: number) {
    const bulletList = narratorList.join("\n");
    const result = populateTemplate(MSG_SINGLE_CHAIN_IS, {
      isnad_index: toArabicDigits(index),
      narrators: bulletList,
    });
    return result + "\n\n";
  }
}
