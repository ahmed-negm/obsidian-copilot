import { formatMessage } from "../utils/formatUtils";
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
} from "../utils";
import { TahdibNarrator } from "../models/narrator";

export class GenerateFigureNoteStep extends StepRunner<TraceNarratorsWorkflowState> {
  getContextIntroMessage() {
    const { noteExists } = this.getNarratorNoteStatus();

    return noteExists
      ? ""
      : "لم يتم العثور على الملف الخاص بهذا الراوي، جاري إنشاء الملف من بيانات تهذيب الكمال...";
  }

  async getUserPrompt(): Promise<string> {
    const { noteExists, narrator } = this.getNarratorNoteStatus();
    if (noteExists) {
      return "";
    }

    const vaultPath = (app.vault.adapter as FileSystemAdapter).getBasePath();
    const tahdibFilePath = `${vaultPath}/../Books/Tahdhib-al-Kamal/Figures/${toArabicDigits(narrator.id!)}-${narrator.name}.md`;
    const tahdibContent = await readFileFromExternalVault(tahdibFilePath);

    const promptTemplate = await getPromptTemplate("ExtractNarratedFromTahdib");
    const prompt = promptTemplate
      .replaceAll("{{narrator_name}}", narrator.name)
      .replaceAll("{{bio}}", tahdibContent);

    return prompt;
  }

  private getNarratorNoteStatus() {
    const indexInAllNarrators =
      this.state.hadithNarrators[this.state.hadithNarratorIndex].indexInAllNarrators!;
    const narrator = this.state.allNarrators[indexInAllNarrators];

    const filePath = `NewFigures/${narrator.name}.md`;
    const noteExists = app.vault.getAbstractFileByPath(filePath);
    return { noteExists, narrator };
  }

  async processResponse(response: string): Promise<{ response: string; isSuccessful: boolean }> {
    if (response === "") {
      return {
        response: "ملف الراوي موجود بالفعل، تخطي الإنشاء.",
        isSuccessful: true,
      };
    }

    const parsed = extractJsonCodeBlock<{ teachers: TahdibNarrator[]; students: TahdibNarrator[] }>(
      response
    );
    if (parsed) {
      const { teachers, students } = parsed;
      const teachersMarkdown = generateMarkdownTable(teachers.filter((n) => n.symbols));
      const studentsMarkdown = generateMarkdownTable(students.filter((n) => n.symbols));
      await createFigureNote(
        this.state.allNarrators[
          this.state.hadithNarrators[this.state.hadithNarratorIndex].indexInAllNarrators!
        ],
        this.state.hadithNarrators[this.state.hadithNarratorIndex].expectedKnownName,
        teachersMarkdown,
        studentsMarkdown
      );
      return {
        response: formatMessage("تم إنشاء ملف الراوي بنجاح.", {}),
        isSuccessful: true,
      };
    }

    return {
      response,
      isSuccessful: false,
    };
  }
}
