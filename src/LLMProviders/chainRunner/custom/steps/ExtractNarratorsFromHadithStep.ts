import { logError } from "@/logger";
import { StepRunner, ProcessResponseResult } from "../base/StepRunner";
import { HadithNarrator } from "../models/narrator";
import { TraceNarratorsWorkflowState } from "../models/state";
import { readVaultFile, getPromptTemplate, toArabicDigits } from "../utils";
import { PATHS, TEMPLATES, FILE_EXTENSIONS, UI_MESSAGES } from "../constants";
import { Notice } from "obsidian";

/**
 * Step to extract narrators from a hadith text
 */
export class ExtractNarratorsFromHadithStep extends StepRunner<TraceNarratorsWorkflowState> {
  private hadithLink = "";

  /**
   * Returns a context introduction for the step (optional override)
   */
  getContextIntroMessage(): string {
    return "";
  }

  /**
   * Reads the hadith text and constructs a prompt to extract narrators
   */
  async getUserPrompt(): Promise<string> {
    try {
      const hadithNumber = this.state.args;
      if (hadithNumber) {
        this.state.filePath = `${PATHS.BUKHARI_HADITH}/البخاري-${toArabicDigits(hadithNumber)}${FILE_EXTENSIONS.MARKDOWN}`;
        this.hadithLink = `[[البخاري-${hadithNumber}]]`;
      } else {
        const activeFile = app.workspace.getActiveFile();
        this.state.filePath = activeFile?.path || "";
        this.hadithLink = activeFile ? `[[${activeFile.name}]]` : "";
      }
      if (!this.state.filePath) throw new Error("No file path available");
      const hadithText = await readVaultFile(this.state.filePath);
      const prompt = await getPromptTemplate(TEMPLATES.EXTRACT_NARRATORS);
      return prompt.replace("{{HADITH_TEXT}}", hadithText);
    } catch (error) {
      logError("Error preparing extract narrators prompt", error);
      new Notice("Failed to prepare hadith extraction");
      return "Please provide a valid hadith text to analyze.";
    }
  }

  /**
   * Processes the AI response to extract narrator information
   */
  async processResponse(response: string): Promise<ProcessResponseResult> {
    try {
      const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (!codeBlockMatch) {
        return {
          response: "Failed to extract narrator data from response. Please try again.",
          isSuccessful: false,
        };
      }
      type HadithNarratorWithPotential = HadithNarrator & {
        potentialPeople?: { fullName: string; knownName: string; quizNames: string[] }[];
      };
      const hadithNarrators = JSON.parse(codeBlockMatch[1]) as HadithNarratorWithPotential[];
      if (!hadithNarrators || !Array.isArray(hadithNarrators) || hadithNarrators.length === 0) {
        return { response: "No narrators found in the hadith text.", isSuccessful: false };
      }
      const narratorList: string[] = [];
      for (const narrator of hadithNarrators) {
        if (!narrator.potentialPeople || narrator.potentialPeople.length !== 1) {
          return {
            response:
              `${UI_MESSAGES.NARRATOR_IDENTIFICATION_FAILED} **${narrator.name}**.` +
              "\n\n" +
              response,
            isSuccessful: false,
          };
        }
        narrator.expectedFullName = narrator.potentialPeople[0].fullName;
        narrator.expectedKnownName = narrator.potentialPeople[0].knownName;
        narrator.quizChoices = narrator.potentialPeople[0].quizNames;
        delete narrator.potentialPeople;
        narratorList.push(`- **${narrator.name}**: ${narrator.expectedKnownName}`);
      }
      this.state.hadithNarrators = hadithNarrators.reverse();
      const bulletList = narratorList.join("\n");
      const result = `\nسند الحديث ${this.hadithLink} هو:\n\n${bulletList}\n`;
      return { response: result, isSuccessful: true };
    } catch (error) {
      logError("Error processing narrator extraction response", error);
      return {
        response: "An error occurred while processing the narrator information: " + error.message,
        isSuccessful: false,
      };
    }
  }
}
