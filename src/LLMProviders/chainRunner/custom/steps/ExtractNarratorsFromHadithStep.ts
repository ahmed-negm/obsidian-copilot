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
  /** The wikilink to the hadith file */
  private hadithLink: string;

  /**
   * Get the user prompt for this step
   * Reads the hadith text and constructs a prompt to extract narrators
   *
   * @returns Promise resolving to the user prompt
   */
  async getUserPrompt(): Promise<string> {
    try {
      const hadithNumber = this.state.args;

      // Set the file path based on arguments or active file
      if (hadithNumber) {
        this.state.filePath = `${PATHS.BUKHARI_HADITH}/البخاري-${toArabicDigits(hadithNumber)}${FILE_EXTENSIONS.MARKDOWN}`;
        this.hadithLink = `[[البخاري-${hadithNumber}]]`;
      } else {
        const activeFile = app.workspace.getActiveFile();
        this.state.filePath = activeFile?.path || "";
        this.hadithLink = activeFile ? `[[${activeFile.name}]]` : "";
      }

      if (!this.state.filePath) {
        throw new Error("No file path available");
      }

      // Read hadith text from file
      const hadithText = await readVaultFile(this.state.filePath);

      // Get prompt template and replace placeholder
      const prompt = await getPromptTemplate(TEMPLATES.EXTRACT_NARRATORS);
      return prompt.replace("{{HADITH_TEXT}}", hadithText);
    } catch (error) {
      logError("Error preparing extract narrators prompt", error);
      new Notice("Failed to prepare hadith extraction");
      return "Please provide a valid hadith text to analyze.";
    }
  }

  /**
   * Process the AI response to extract narrator information
   *
   * @param response - The AI response containing narrator data
   * @returns Processed result with narrator information
   */
  async processResponse(response: string): Promise<ProcessResponseResult> {
    try {
      // Extract JSON data from code block
      const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (!codeBlockMatch) {
        return {
          response: "Failed to extract narrator data from response. Please try again.",
          isSuccessful: false,
        };
      }

      // Define extended type for processing
      type HadithNarratorWithPotential = HadithNarrator & {
        potentialPeople?: {
          fullName: string;
          knownName: string;
          quizNames: string[];
        }[];
      };

      // Parse narrator data
      const hadithNarrators = JSON.parse(codeBlockMatch[1]) as HadithNarratorWithPotential[];
      if (!hadithNarrators || !Array.isArray(hadithNarrators) || hadithNarrators.length === 0) {
        return {
          response: "No narrators found in the hadith text.",
          isSuccessful: false,
        };
      }

      // Process each narrator
      const narratorList: string[] = [];
      for (const narrator of hadithNarrators) {
        // Check if narrator identification is conclusive
        if (!narrator.potentialPeople || narrator.potentialPeople.length !== 1) {
          return {
            response:
              `${UI_MESSAGES.NARRATOR_IDENTIFICATION_FAILED} **${narrator.name}**.` +
              "\n\n" +
              response,
            isSuccessful: false,
          };
        }

        // Store narrator information
        narrator.expectedFullName = narrator.potentialPeople[0].fullName;
        narrator.expectedKnownName = narrator.potentialPeople[0].knownName;
        narrator.quizChoices = narrator.potentialPeople[0].quizNames;
        delete narrator.potentialPeople;

        narratorList.push(`- **${narrator.name}**: ${narrator.expectedKnownName}`);
      }

      // Update state with narrators (in reverse order for chain analysis)
      this.state.hadithNarrators = hadithNarrators.reverse();

      // Format the response
      const bulletList = narratorList.join("\n");
      const result = `
سند الحديث ${this.hadithLink} هو:

${bulletList}
`;

      return {
        response: result,
        isSuccessful: true,
      };
    } catch (error) {
      logError("Error processing narrator extraction response", error);
      return {
        response: "An error occurred while processing the narrator information: " + error.message,
        isSuccessful: false,
      };
    }
  }
}
