import { WorkflowRunner } from "../base/WorkflowRunner";
import { logError, logWarn } from "@/logger";
import ChainManager from "@/LLMProviders/chainManager";
import { TraceNarratorsWorkflowState } from "../models/state";
import { readVaultFile, setScore, updateVaultFile } from "../utils";
import { ChoiceSuggestModal } from "../ui/ChoiceSuggestModal";
import { Notice } from "obsidian";
import { ExtractNarratorsFromHadithStep } from "../steps/ExtractNarratorsFromHadithStep";
import { FindNarratorInTahdibIndexStep } from "../steps/FindNarratorInTahdibIndexStep";
import { FindTeacherStudentStep } from "../steps/FindTeacherStudentStep";
import { GenerateFigureNoteStep } from "../steps/GenerateFigureNoteStep";
import { StepRunner } from "../base/StepRunner";
import { UI_MESSAGES, PATHS } from "../constants";

export class TraceNarratorsWorkflowRunner extends WorkflowRunner<TraceNarratorsWorkflowState> {
  constructor(chainManager: ChainManager, args: string) {
    super(chainManager, {
      args,
      hadithNarrators: [],
      allNarrators: [],
      hadithNarratorIndex: 0,
      filePath: "",
    });
    this.loadNarratorsData().catch((error) => {
      logError("Failed to load narrators data", error);
      new Notice("Failed to load narrators database");
    });
  }

  protected registerSteps(): StepRunner<TraceNarratorsWorkflowState>[] {
    try {
      return [
        this.createExtractNarratorsStep(),
        this.createFindNarratorStep(),
        this.createGenerateFigureNoteStep(),
        this.createTeacherStudentStep(),
      ];
    } catch (error) {
      logError("Error registering steps for trace narrators workflow", error);
      return [];
    }
  }

  private createExtractNarratorsStep(): ExtractNarratorsFromHadithStep {
    return new ExtractNarratorsFromHadithStep(this.state);
  }

  private createFindNarratorStep(): FindNarratorInTahdibIndexStep {
    return new FindNarratorInTahdibIndexStep(this.state);
  }

  private createGenerateFigureNoteStep(): GenerateFigureNoteStep {
    return new GenerateFigureNoteStep(this.state, {
      onComplete: async () => {
        try {
          this.handleFigureNoteCompletion();
        } catch (error) {
          logError("Error in generate figure note completion", error);
        }
        return Promise.resolve();
      },
    });
  }

  private createTeacherStudentStep(): FindTeacherStudentStep {
    return new FindTeacherStudentStep(this.state, {
      onComplete: async () => {
        try {
          await this.handleTeacherStudentCompletion();
        } catch (error) {
          logError("Error in find teacher-student completion", error);
        }
        return Promise.resolve();
      },
    });
  }

  private handleFigureNoteCompletion(): void {
    const nextNarratorIndex =
      this.state.hadithNarrators[this.state.hadithNarratorIndex + 1]?.indexInAllNarrators;

    if (
      !nextNarratorIndex &&
      this.state.hadithNarratorIndex < this.state.hadithNarrators.length - 1
    ) {
      this.state.hadithNarratorIndex++;
      this.currentStepIndex -= 2;
    } else {
      this.state.hadithNarratorIndex = 0;
    }
  }

  private async handleTeacherStudentCompletion(): Promise<void> {
    this.state.hadithNarratorIndex++;

    if (this.state.hadithNarratorIndex < this.state.hadithNarrators.length - 1) {
      this.currentStepIndex -= 1;
    } else if (this.state.hadithNarratorIndex === this.state.hadithNarrators.length - 1) {
      this.currentStepIndex = 5; // Set to an index beyond the steps to end the workflow
      await this.linkHadithToNarrators();
      new Notice(UI_MESSAGES.WORKFLOW_COMPLETE, 0);
    }
  }

  protected async loadNarratorsData(): Promise<void> {
    try {
      const jsonString = await readVaultFile(PATHS.TAHDHIB_INDEX);
      this.state.allNarrators = JSON.parse(jsonString);

      if (!Array.isArray(this.state.allNarrators) || this.state.allNarrators.length === 0) {
        throw new Error("Invalid narrators data format");
      }
    } catch (error) {
      logError("Failed to load narrators data", error);
      throw new Error("Failed to load narrators database");
    }
  }

  protected async showQuiz(): Promise<void> {
    try {
      await this.showNarratorQuiz();
      await this.showChainQuiz();
    } catch (error) {
      logError("Error showing quiz", error);
      new Notice("Failed to show quiz");
    }
  }

  protected async showNarratorQuiz(): Promise<void> {
    const narrators = this.state.hadithNarrators.slice().reverse();

    for (const narrator of narrators) {
      if (narrator.name.split(" ").length > 2) {
        continue;
      }

      const choices = [
        narrator.expectedKnownName,
        narrator.quizChoices[0],
        narrator.quizChoices[1],
      ].sort(() => Math.random() - 0.5);

      const choice = await ChoiceSuggestModal.open(
        app,
        `من هو ${narrator.name}؟`,
        choices,
        "bottom",
        false
      );

      const isCorrect = choice === narrator.expectedKnownName;
      await setScore(isCorrect, narrator.expectedKnownName);
    }
  }

  protected async showChainQuiz(): Promise<void> {
    try {
      await ChoiceSuggestModal.open(
        app,
        "الآن، سنختبر معرفتك بسلسلة الرواة. اختر الشخص الذي يلي كل راوٍ في السلسلة.",
        ["ابدأ الاختبار"],
        "bottom",
        false
      );

      const hadithNarrators = this.state.hadithNarrators.slice().reverse();

      for (let i = 0; i < hadithNarrators.length - 1; i++) {
        const currentNarrator = hadithNarrators[i].expectedKnownName;
        const correctNextNarrator = hadithNarrators[i + 1].expectedKnownName;

        const distractors = hadithNarrators
          .filter(
            (narrator) =>
              narrator.expectedKnownName !== currentNarrator &&
              narrator.expectedKnownName !== correctNextNarrator
          )
          .slice(0, 2)
          .map((narrator) => narrator.expectedKnownName);

        const choices = [...distractors, correctNextNarrator].sort(() => Math.random() - 0.5);

        const choice = await ChoiceSuggestModal.open(
          app,
          `روى ${currentNarrator} هذا الحديث عن:`,
          choices,
          "bottom",
          true
        );

        await setScore(choice === correctNextNarrator, correctNextNarrator);
      }
    } catch (error) {
      logError("Error showing chain quiz", error);
      new Notice("Failed to show chain quiz");
    }
  }

  protected async linkHadithToNarrators(): Promise<void> {
    try {
      if (!this.state.filePath) {
        throw new Error("No file path available");
      }

      let fileContent = await readVaultFile(this.state.filePath);

      fileContent = await this.processNarratorsForLinking(fileContent);

      await updateVaultFile(this.state.filePath, fileContent);
      new Notice("Successfully linked narrators in hadith text");
    } catch (error) {
      logError("Error linking hadith to narrators", error);
      new Notice("Failed to link narrators in hadith text");
    }
  }

  private async processNarratorsForLinking(fileContent: string): Promise<string> {
    let updatedContent = fileContent;

    for (const hadithNarrator of this.state.hadithNarrators) {
      if (!this.isValidNarratorForLinking(hadithNarrator)) {
        continue;
      }

      const index = hadithNarrator.indexInAllNarrators as number;
      const narrator = this.state.allNarrators[index];
      if (!narrator) {
        logWarn(`Cannot find narrator at index ${index}`);
        continue;
      }

      const linkToNote = `[[${narrator.name}|${hadithNarrator.name}]]`;

      updatedContent = this.replaceNarratorWithLink(
        updatedContent,
        hadithNarrator.name,
        linkToNote
      );
    }

    return updatedContent;
  }

  private isValidNarratorForLinking(narrator: any): boolean {
    if (narrator.indexInAllNarrators === undefined) {
      logWarn(`Missing index for narrator: ${narrator.name}`);
      return false;
    }
    return true;
  }

  private replaceNarratorWithLink(content: string, narratorName: string, wikilink: string): string {
    const regex = new RegExp(`\\b${narratorName}\\b`, "g");
    return content.replace(regex, wikilink);
  }
}
