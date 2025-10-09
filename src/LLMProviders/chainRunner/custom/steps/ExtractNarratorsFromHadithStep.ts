import { logError } from "@/logger";
import { StepRunner, ProcessResponseResult } from "../base/StepRunner";
import { HadithNarrator } from "../models/narrator";
import { TraceNarratorsWorkflowState } from "../models/state";
import { readVaultFile, getPromptTemplate, toArabicDigits } from "../utils";
import { BOOKS, formatMessage } from "../utils/formatUtils";
import { PATHS, FILE_EXTENSIONS, UI_MESSAGES } from "../constants";
import { Notice } from "obsidian";

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
    try {
      await this.loadHadithPath();
      if (!this.state.filePath) {
        throw new Error("No file path available");
      }
      const hadithText = await readVaultFile(this.state.filePath);
      const prompt = await getPromptTemplate("ExtractNarrators");
      return prompt.replace("{{HADITH_TEXT}}", hadithText);
    } catch (error) {
      logError("Error preparing extract narrators prompt", error);
      new Notice("Failed to prepare hadith extraction");
      return "Please provide a valid hadith text to analyze.";
    }
  }

  private async loadHadithPath(): Promise<void> {
    const hadithNumber = this.state.args;
    if (hadithNumber) {
      this.state.filePath = `${PATHS.BUKHARI_HADITH}/${BOOKS[0].name}-${toArabicDigits(hadithNumber)}${FILE_EXTENSIONS.MARKDOWN}`;
      this.hadithLink = `[[${BOOKS[0].name}-${hadithNumber}]]`;
    } else {
      const activeFile = app.workspace.getActiveFile();
      this.state.filePath = activeFile?.path || "";
      this.hadithLink = activeFile ? `[[${activeFile.name}]]` : "";
    }
  }

  async processResponse(response: string): Promise<ProcessResponseResult> {
    try {
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
    } catch (error) {
      logError("Error processing narrator extraction response", error);
      return {
        response: `An error occurred while processing the narrator information: ${error.message}`,
        isSuccessful: false,
      };
    }
  }

  private extractNarratorsFromResponse(response: string): HadithNarratorWithPotential[] | null {
    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (!codeBlockMatch) {
      return null;
    }
    try {
      return JSON.parse(codeBlockMatch[1]) as HadithNarratorWithPotential[];
    } catch {
      return null;
    }
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
