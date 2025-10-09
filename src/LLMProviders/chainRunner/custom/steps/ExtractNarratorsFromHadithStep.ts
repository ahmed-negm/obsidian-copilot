import { StepRunner, ProcessResponseResult } from "../base/StepRunner";
import { HadithNarrator } from "../models/narrator";
import { TraceNarratorsWorkflowState } from "../models/state";
import { readVaultFile, getPromptTemplate, toArabicDigits } from "../utils";
import { BOOKS, formatMessage } from "../utils/formatUtils";
import { PATHS, UI_MESSAGES } from "../constants";

interface HadithNarratorWithPotential extends HadithNarrator {
  potentialPeople?: {
    fullName: string;
    knownName: string;
    quizNames: string[];
  }[];
}

export class ExtractNarratorsFromHadithStep extends StepRunner<TraceNarratorsWorkflowState> {
  private hadithLink = "";

  getContextIntroMessage(): string {
    return "";
  }

  async getUserPrompt(): Promise<string> {
    await this.loadHadithPath();
    if (!this.state.filePath) {
      throw new Error("No file path available");
    }
    const hadithText = await readVaultFile(this.state.filePath);
    const prompt = await getPromptTemplate("ExtractNarrators");
    return prompt.replace("{{HADITH_TEXT}}", hadithText);
  }

  private async loadHadithPath(): Promise<void> {
    const hadithNumber = this.state.args;
    if (hadithNumber) {
      this.state.filePath = `${PATHS.BUKHARI_HADITH}/${BOOKS[0].name}-${toArabicDigits(hadithNumber)}.md`;
      this.hadithLink = `[[${BOOKS[0].name}-${hadithNumber}]]`;
    } else {
      const activeFile = app.workspace.getActiveFile();
      this.state.filePath = activeFile?.path || "";
      this.hadithLink = activeFile ? `[[${activeFile.name}]]` : "";
    }
  }

  async processResponse(response: string): Promise<ProcessResponseResult> {
    const narrators = this.extractNarratorsFromResponse(response);
    if (!narrators || !Array.isArray(narrators) || narrators.length === 0) {
      return {
        response: "No narrators found in the hadith text.",
        isSuccessful: false,
      };
    }
    const narratorList: string[] = [];
    for (const narrator of narrators) {
      if (!this.isValidNarratorData(narrator)) {
        return {
          response: `${UI_MESSAGES.NARRATOR_IDENTIFICATION_FAILED} **${narrator.name}**.\n\n${response}`,
          isSuccessful: false,
        };
      }
      this.processNarratorData(narrator);
      narratorList.push(`- **${narrator.name}**: ${narrator.expectedKnownName}`);
    }
    this.state.hadithNarrators = narrators.reverse();
    return this.formatNarratorResult(narratorList);
  }

  private extractNarratorsFromResponse(response: string): HadithNarratorWithPotential[] | null {
    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (!codeBlockMatch) {
      return null;
    }
    return JSON.parse(codeBlockMatch[1]) as HadithNarratorWithPotential[];
  }

  private isValidNarratorData(narrator: HadithNarratorWithPotential): boolean {
    return !!(
      narrator.potentialPeople &&
      narrator.potentialPeople.length === 1 &&
      narrator.potentialPeople[0].fullName &&
      narrator.potentialPeople[0].knownName
    );
  }

  private processNarratorData(narrator: HadithNarratorWithPotential): void {
    if (!narrator.potentialPeople || narrator.potentialPeople.length !== 1) return;
    narrator.expectedFullName = narrator.potentialPeople[0].fullName;
    narrator.expectedKnownName = narrator.potentialPeople[0].knownName;
    narrator.quizChoices = narrator.potentialPeople[0].quizNames;
    delete narrator.potentialPeople;
  }

  private formatNarratorResult(narratorList: string[]): ProcessResponseResult {
    const bulletList = narratorList.join("\n");
    const result = formatMessage("\nسند الحديث {hadithLink} هو:\n\n{narrators}\n", {
      hadithLink: this.hadithLink,
      narrators: bulletList,
    });
    return {
      response: result,
      isSuccessful: true,
    };
  }
}
