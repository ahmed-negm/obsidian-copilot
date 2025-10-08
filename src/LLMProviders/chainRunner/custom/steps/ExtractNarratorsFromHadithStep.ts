import { logError } from "@/logger";
import { StepRunner, ProcessResponseResult } from "../base/StepRunner";
import { HadithNarrator } from "../models/narrator";
import { TraceNarratorsWorkflowState } from "../models/state";
import { readVaultFile, getPromptTemplate, toArabicDigits } from "../utils";
import { BOOKS, formatMessage } from "../utils/formatUtils";
import { PATHS, TEMPLATES, FILE_EXTENSIONS, UI_MESSAGES } from "../constants";
import { Notice } from "obsidian";

/**
 * Interface for narrator with potential matches
 */
interface HadithNarratorWithPotential extends HadithNarrator {
  potentialPeople?: {
    fullName: string;
    knownName: string;
    quizNames: string[];
  }[];
}

/**
 * Step to extract narrators from a hadith text
 * Parses the hadith, sends it to the AI, and processes the response to extract narrator information
 */
export class ExtractNarratorsFromHadithStep extends StepRunner<TraceNarratorsWorkflowState> {
  /** Link to the hadith for display in the results */
  private hadithLink = "";

  /**
   * Returns a context introduction for the step (optional override)
   * @returns Empty string as no intro is needed for this step
   */
  getContextIntroMessage(): string {
    return "";
  }

  /**
   * Reads the hadith text and constructs a prompt to extract narrators
   * If a hadith number is provided, it loads that specific hadith
   * Otherwise, it uses the active note
   *
   * @returns Prompt with the hadith text for narrator extraction
   */
  async getUserPrompt(): Promise<string> {
    try {
      await this.loadHadithPath();

      // Ensure we have a valid file path
      if (!this.state.filePath) {
        throw new Error("No file path available");
      }

      // Load the hadith text and prepare the prompt
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
   * Loads the appropriate hadith file path based on arguments or active file
   * Updates the state with the file path and sets the hadith link
   */
  private async loadHadithPath(): Promise<void> {
    const hadithNumber = this.state.args;

    if (hadithNumber) {
      // If hadith number is provided, construct path to that specific hadith
      this.state.filePath = `${PATHS.BUKHARI_HADITH}/${BOOKS[0].name}-${toArabicDigits(hadithNumber)}${FILE_EXTENSIONS.MARKDOWN}`;
      this.hadithLink = `[[${BOOKS[0].name}-${hadithNumber}]]`;
    } else {
      // Otherwise use the active file
      const activeFile = app.workspace.getActiveFile();
      this.state.filePath = activeFile?.path || "";
      this.hadithLink = activeFile ? `[[${activeFile.name}]]` : "";
    }
  }

  /**
   * Processes the AI response to extract narrator information
   * Parses JSON from code blocks, validates narrator data, and formats results
   *
   * @param response - The AI's response containing narrator data in JSON format
   * @returns Processed narrator list or error message
   */
  async processResponse(response: string): Promise<ProcessResponseResult> {
    try {
      // Extract JSON from code block
      const narrators = this.extractNarratorsFromResponse(response);

      if (!narrators || !Array.isArray(narrators) || narrators.length === 0) {
        return {
          response: "No narrators found in the hadith text.",
          isSuccessful: false,
        };
      }

      // Process each narrator
      const narratorList: string[] = [];
      for (const narrator of narrators) {
        // Validate narrator data
        if (!this.isValidNarratorData(narrator)) {
          return {
            response: `${UI_MESSAGES.NARRATOR_IDENTIFICATION_FAILED} **${narrator.name}**.\n\n${response}`,
            isSuccessful: false,
          };
        }

        // Transfer data from potentialPeople to the main narrator object
        this.processNarratorData(narrator);
        narratorList.push(`- **${narrator.name}**: ${narrator.expectedKnownName}`);
      }

      // Update state and format results
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

  /**
   * Extracts narrator data from JSON code block in the response
   *
   * @param response - The AI response text
   * @returns Array of narrator objects or null if extraction fails
   */
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

  /**
   * Checks if narrator data contains required information
   *
   * @param narrator - The narrator object to validate
   * @returns Whether the narrator data is valid
   */
  private isValidNarratorData(narrator: HadithNarratorWithPotential): boolean {
    return !!(
      narrator.potentialPeople &&
      narrator.potentialPeople.length === 1 &&
      narrator.potentialPeople[0].fullName &&
      narrator.potentialPeople[0].knownName
    );
  }

  /**
   * Processes narrator data by copying fields from potentialPeople to the main object
   *
   * @param narrator - The narrator object to process
   */
  private processNarratorData(narrator: HadithNarratorWithPotential): void {
    if (!narrator.potentialPeople || narrator.potentialPeople.length !== 1) return;

    narrator.expectedFullName = narrator.potentialPeople[0].fullName;
    narrator.expectedKnownName = narrator.potentialPeople[0].knownName;
    narrator.quizChoices = narrator.potentialPeople[0].quizNames;
    delete narrator.potentialPeople;
  }

  /**
   * Formats the narrator list for display
   *
   * @param narratorList - List of narrator entries
   * @returns Formatted result with narrator chain
   */
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
