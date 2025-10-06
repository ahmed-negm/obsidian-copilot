import { FileSystemAdapter } from "obsidian";
import { StepRunner } from "../base/StepRunner";
import { TraceNarratorsWorkflowState } from "../models/state";
import {
  createFigureNote,
  generateMarkdownTable,
  getPromptTemplate,
  readFileFromExternalVault,
  toArabicDigits,
} from "../utils";
import { TahdibNarrator } from "../models/narrator";

export class GenerateFigureNoteStep extends StepRunner<TraceNarratorsWorkflowState> {
  getContextIntroMessage() {
    return "لم يتم العثور على الملف الخاص بهذا الراوي، جاري إنشاء الملف من بيانات تهذيب الكمال...";
  }

  async getUserPrompt() {
    const indexInAllNarrators =
      this.state.hadithNarrators[this.state.hadithNarratorIndex].indexInAllNarrators!;
    const narrator = this.state.allNarrators[indexInAllNarrators];

    const vaultPath = (app.vault.adapter as FileSystemAdapter).getBasePath();
    const tahdibFilePath = `${vaultPath}/../Books/Tahdhib-al-Kamal/Figures/${toArabicDigits(narrator.id!)}-${narrator.name}.md`;
    const tahdibContent = await readFileFromExternalVault(tahdibFilePath);

    const promptTemplate = await getPromptTemplate("ExtractNarratedFromTahdib");
    const prompt = promptTemplate
      .replaceAll("{{narrator_name}}", narrator.name)
      .replaceAll("{{bio}}", tahdibContent);

    return prompt;
  }

  async processResponse(response: string) {
    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      const { teachers, students } = JSON.parse(codeBlockMatch[1]) as {
        teachers: TahdibNarrator[];
        students: TahdibNarrator[];
      };

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
        response: "تم إنشاء ملف الراوي بنجاح.",
        isSuccessful: true,
      };
    }

    return {
      response,
      isSuccessful: false,
    };
  }
}
