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
  ExtractedNarratorData,
  getAIKnowledge,
} from "../utils";
import {
  PATHS,
  MSG_NARRATOR_FILE_EXISTS,
  MSG_NARRATOR_FILE_CREATED,
  MSG_NARRATOR_FILE_NOT_FOUND_CREATING,
  BOOKS,
} from "../constants";

export class GenerateFigureNoteStep extends StepRunner<TraceNarratorsWorkflowState> {
  getContextIntroMessage() {
    const { noteExists } = this.getNarratorNoteStatus();

    return noteExists ? "" : MSG_NARRATOR_FILE_NOT_FOUND_CREATING;
  }

  async getUserPrompt() {
    const { noteExists, narrator } = this.getNarratorNoteStatus();
    if (noteExists) {
      return "";
    }

    const tahdibFilePath = this.buildTahdibFilePath(narrator);
    const tahdibContent = await readFileFromExternalVault(tahdibFilePath);

    return this.buildPromptFromTemplate(narrator.name, tahdibContent);
  }

  private getNarratorNoteStatus() {
    const filePath = `${PATHS.FIGURES}/${this.state.currentNarratorInfo.name}.md`;
    const noteExists = !!app.vault.getAbstractFileByPath(filePath);
    return { noteExists, narrator: this.state.currentNarratorInfo };
  }

  private buildTahdibFilePath(narrator: any) {
    const vaultPath = (app.vault.adapter as FileSystemAdapter).getBasePath();
    return `${vaultPath}/${PATHS.TAHDHIB_VAULT}${toArabicDigits(narrator.id!)}-${narrator.name}.md`;
  }

  private async buildPromptFromTemplate(narratorName: string, tahdibContent: string) {
    const promptTemplate = await getPromptTemplate("ExtractNarratedFromTahdib");
    return populateTemplate(promptTemplate, {
      narrator_name: narratorName,
      bio: tahdibContent,
      KNOWLEDGE: await getAIKnowledge(BOOKS[0].name),
    });
  }

  async processResponse(response: string) {
    if (response === "") {
      return {
        response: MSG_NARRATOR_FILE_EXISTS,
        isSuccessful: true,
      };
    }

    const extractedData = extractJsonCodeBlock<ExtractedNarratorData>(response);
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

  private async createNarratorNote(extractedData: ExtractedNarratorData) {
    const { teachers, students } = extractedData;
    const teachersMarkdown = generateMarkdownTable(teachers.filter((n) => n.symbols));
    const studentsMarkdown = generateMarkdownTable(students.filter((n) => n.symbols));

    const expectedKnownName = this.state.currentNarrator.expectedKnownName;

    await createFigureNote(
      this.state.currentNarratorInfo,
      expectedKnownName,
      teachersMarkdown,
      studentsMarkdown
    );
  }
}
