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
  getAIKnowledge,
  TahdibNarrator,
  fileExists,
} from "../utils";
import {
  PATHS,
  MSG_NARRATOR_FILE_EXISTS,
  MSG_NARRATOR_FILE_CREATED,
  MSG_NARRATOR_FILE_NOT_FOUND_CREATING,
  BOOKS,
} from "../constants";

export interface ExtractedNarratorData {
  teachers: TahdibNarrator[];
  students: TahdibNarrator[];
}

export class GenerateFigureNoteStep extends StepRunner<TraceNarratorsWorkflowState> {
  getContextIntroMessage() {
    return this.noteExists() ? "" : MSG_NARRATOR_FILE_NOT_FOUND_CREATING;
  }

  async getUserPrompt() {
    if (this.noteExists()) {
      return "";
    }

    const tahdibProcessedFilePath = this.generateTahdibProcessedFigurePath(
      this.state.currentNarratorInfo
    );
    if (fileExists(tahdibProcessedFilePath)) {
      const processedContent = await readFileFromExternalVault(tahdibProcessedFilePath);
      await app.vault.create(
        `${PATHS.FIGURES}/${this.state.currentNarratorInfo.name}.md`,
        processedContent
      );
      return "";
    }
    const tahdibFilePath = this.generateTahdibFigurePath(this.state.currentNarratorInfo);
    const tahdibContent = await readFileFromExternalVault(tahdibFilePath);

    return this.buildPromptFromTemplate(this.state.currentNarratorInfo.name, tahdibContent);
  }

  private noteExists() {
    const filePath = `${PATHS.FIGURES}/${this.state.currentNarratorInfo.name}.md`;
    return !!app.vault.getAbstractFileByPath(filePath);
  }

  private generateTahdibFigurePath(narrator: any) {
    const vaultPath = (app.vault.adapter as FileSystemAdapter).getBasePath();
    return `${vaultPath}/${PATHS.TAHDHIB_VAULT}/Figures/${toArabicDigits(narrator.id!)}-${narrator.name}.md`;
  }

  private generateTahdibProcessedFigurePath(narrator: any) {
    const vaultPath = (app.vault.adapter as FileSystemAdapter).getBasePath();
    return `${vaultPath}/${PATHS.TAHDHIB_VAULT}/ProcessedFigures/${narrator.name}.md`;
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
    if (extractedData && extractedData.teachers && extractedData.students) {
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
