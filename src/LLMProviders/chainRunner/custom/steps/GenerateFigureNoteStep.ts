import { TahdibNarrator } from "../utils/formatUtils";
import { FileSystemAdapter } from "obsidian";
import { StepRunner } from "../base/StepRunner";
import { TraceNarratorsWorkflowState } from "../models/state";
import {
  createFigureNote,
  generateMarkdownTable,
  getPromptTemplate,
  readFileFromExternalVault,
  toArabicDigits,
  extractJsonCodeBlock,
  populateTemplate,
} from "../utils";
import {
  PATHS,
  MSG_NARRATOR_FILE_EXISTS,
  MSG_NARRATOR_FILE_CREATED,
  MSG_NARRATOR_FILE_NOT_FOUND_CREATING,
} from "../constants";

/**
 * Interface for the response structure expected from the LLM when extracting narrator information
 */
interface ExtractedNarratorData {
  teachers: TahdibNarrator[];
  students: TahdibNarrator[];
}

/**
 * Interface for narrator note status information
 */
interface NarratorNoteStatus {
  noteExists: boolean;
  narrator: any;
}

/**
 * Step responsible for generating figure notes for narrators from Tahdib al-Kamal data.
 * This step checks if a narrator note already exists, and if not, extracts biographical
 * information from external Tahdib files to create a new note.
 */
export class GenerateFigureNoteStep extends StepRunner<TraceNarratorsWorkflowState> {
  /**
   * Returns the intro message based on whether the narrator note already exists
   * @returns Empty string if note exists, creation message otherwise
   */
  getContextIntroMessage(): string {
    const { noteExists } = this.getNarratorNoteStatus();

    return noteExists ? "" : MSG_NARRATOR_FILE_NOT_FOUND_CREATING;
  }

  /**
   * Generates the user prompt for extracting narrator information from Tahdib al-Kamal
   * @returns Empty string if note exists, populated prompt template otherwise
   */
  async getUserPrompt(): Promise<string> {
    const { noteExists, narrator } = this.getNarratorNoteStatus();
    if (noteExists) {
      return "";
    }

    const tahdibFilePath = this.buildTahdibFilePath(narrator);
    const tahdibContent = await readFileFromExternalVault(tahdibFilePath);

    return this.buildPromptFromTemplate(narrator.name, tahdibContent);
  }

  /**
   * Gets the status of the narrator note and narrator information
   * @returns Object containing note existence status and narrator data
   */
  private getNarratorNoteStatus(): NarratorNoteStatus {
    const indexInAllNarrators =
      this.state.hadithNarrators[this.state.hadithNarratorIndex].indexInAllNarrators!;
    const narrator = this.state.allNarrators[indexInAllNarrators];

    const filePath = `${PATHS.FIGURES}/${narrator.name}.md`;
    const noteExists = !!app.vault.getAbstractFileByPath(filePath);
    return { noteExists, narrator };
  }

  /**
   * Builds the file path for the Tahdib al-Kamal figure file
   * @param narrator The narrator object containing id and name
   * @returns Complete file path to the Tahdib figure file
   */
  private buildTahdibFilePath(narrator: any): string {
    const vaultPath = (app.vault.adapter as FileSystemAdapter).getBasePath();
    return `${vaultPath}/${PATHS.TAHDHIB_FIGURES_DIR}${toArabicDigits(narrator.id!)}-${narrator.name}.md`;
  }

  /**
   * Builds the prompt from template by replacing placeholders
   * @param narratorName The name of the narrator
   * @param tahdibContent The biographical content from Tahdib al-Kamal
   * @returns Populated prompt template
   */
  private async buildPromptFromTemplate(
    narratorName: string,
    tahdibContent: string
  ): Promise<string> {
    const promptTemplate = await getPromptTemplate("ExtractNarratedFromTahdib");
    return populateTemplate(promptTemplate, {
      narrator_name: narratorName,
      bio: tahdibContent,
    });
  }

  /**
   * Processes the LLM response and creates the figure note if data is valid
   * @param response The response from the LLM containing extracted narrator data
   * @returns Result object with response message and success status
   */
  async processResponse(response: string): Promise<{ response: string; isSuccessful: boolean }> {
    if (response === "") {
      return {
        response: MSG_NARRATOR_FILE_EXISTS,
        isSuccessful: true,
      };
    }

    const extractedData = this.extractNarratorData(response);
    if (extractedData) {
      await this.createNarratorNote(extractedData);
      return {
        response: MSG_NARRATOR_FILE_CREATED,
        isSuccessful: true,
      };
    }

    return {
      response,
      isSuccessful: false,
    };
  }

  /**
   * Extracts narrator data from the LLM response
   * @param response The LLM response containing JSON data
   * @returns Extracted narrator data or null if parsing failed
   */
  private extractNarratorData(response: string): ExtractedNarratorData | null {
    return extractJsonCodeBlock<ExtractedNarratorData>(response);
  }

  /**
   * Creates the narrator note using the extracted data
   * @param extractedData The extracted teacher and student data
   */
  private async createNarratorNote(extractedData: ExtractedNarratorData): Promise<void> {
    const { teachers, students } = extractedData;
    const teachersMarkdown = generateMarkdownTable(teachers.filter((n) => n.symbols));
    const studentsMarkdown = generateMarkdownTable(students.filter((n) => n.symbols));

    const narrator =
      this.state.allNarrators[
        this.state.hadithNarrators[this.state.hadithNarratorIndex].indexInAllNarrators!
      ];
    const expectedKnownName =
      this.state.hadithNarrators[this.state.hadithNarratorIndex].expectedKnownName;

    await createFigureNote(narrator, expectedKnownName, teachersMarkdown, studentsMarkdown);
  }
}
