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

export class ExtractNarratedFromTahdibStep extends StepRunner<TraceNarratorsWorkflowState> {
  getContextIntroMessage() {
    return "جاري البحث عن من رووا عنه ...";
  }

  async getUserPrompt() {
    const indexInAllNarrators =
      this.state.hadithNarrators[this.state.hadithNarratorIndex].indexInAllNarrators!;
    const narrator = this.state.allNarrators[indexInAllNarrators];

    const vaultPath = (app.vault.adapter as FileSystemAdapter).getBasePath();
    const tahdibFilePath = `${vaultPath}/../Tahdhib-al-Kamal/Figures/${toArabicDigits(narrator.id!)}-${narrator.name}.md`;
    const tahdibContent = await readFileFromExternalVault(tahdibFilePath);

    const promptTemplate = await getPromptTemplate("ExtractNarratedFromTahdibStep");
    const prompt = promptTemplate
      .replaceAll("{{narrator_name}}", narrator.name)
      .replaceAll("{{bio}}", tahdibContent);

    return prompt;
  }

  async processResponse(response: string) {
    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      const { narratedFrom, narratedTo } = JSON.parse(codeBlockMatch[1]) as {
        narratedFrom: TahdibNarrator[];
        narratedTo: TahdibNarrator[];
      };

      const narratedFromMarkdown = generateMarkdownTable(narratedFrom);
      const narratedToMarkdown = generateMarkdownTable(narratedTo);

      await createFigureNote(
        this.state.allNarrators[
          this.state.hadithNarrators[this.state.hadithNarratorIndex].indexInAllNarrators!
        ],
        this.state.hadithNarrators[this.state.hadithNarratorIndex].expectedKnownName,
        narratedFromMarkdown,
        narratedToMarkdown
      );
    }

    return {
      response,
      isSuccessful: false,
    };
  }
}
