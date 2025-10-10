import { WorkflowRunner } from "../base/WorkflowRunner";
import { logError } from "@/logger";
import ChainManager from "@/LLMProviders/chainManager";
import { TraceNarratorsWorkflowState } from "../models/state";
import { readVaultFile, setScore, updateVaultFile } from "../utils";
import { ChoiceSuggestModal } from "../ui/ChoiceSuggestModal";
import { Notice } from "obsidian";
import { ExtractNarratorsFromHadithStep } from "../steps/ExtractNarratorsFromHadithStep";
import { FindNarratorInTahdibIndexStep } from "../steps/FindNarratorInTahdibIndexStep";
import { FindTeacherStudentStep } from "../steps/FindTeacherStudentStep";
import { GenerateFigureNoteStep } from "../steps/GenerateFigureNoteStep";
import { PATHS, START_CHAIN_QUIZ, WORKFLOW_COMPLETE } from "../constants";

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

  protected registerSteps() {
    return [
      this.createExtractNarratorsStep(),
      this.createFindNarratorStep(),
      this.createGenerateFigureNoteStep(),
      this.createTeacherStudentStep(),
    ];
  }

  private createExtractNarratorsStep() {
    return new ExtractNarratorsFromHadithStep(this.state);
  }

  private createFindNarratorStep() {
    return new FindNarratorInTahdibIndexStep(this.state);
  }

  private createGenerateFigureNoteStep() {
    return new GenerateFigureNoteStep(this.state, {
      onComplete: async () => {
        this.handleFigureNoteCompletion();
        return Promise.resolve();
      },
    });
  }

  private createTeacherStudentStep() {
    return new FindTeacherStudentStep(this.state, {
      onComplete: async () => {
        await this.handleTeacherStudentCompletion();
        return Promise.resolve();
      },
    });
  }

  private handleFigureNoteCompletion() {
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

  private async handleTeacherStudentCompletion() {
    this.state.hadithNarratorIndex++;

    if (this.state.hadithNarratorIndex < this.state.hadithNarrators.length - 1) {
      this.currentStepIndex -= 1;
    } else {
      this.currentStepIndex = 5; // Set to an index beyond the steps to end the workflow
      await this.linkHadithToNarrators();
      new Notice(WORKFLOW_COMPLETE, 0);
      this.showQuiz();
    }
  }

  protected async loadNarratorsData() {
    const jsonString = await readVaultFile(PATHS.TAHDHIB_INDEX);
    this.state.allNarrators = JSON.parse(jsonString);
  }

  protected async showQuiz() {
    await this.showNarratorQuiz();
    await this.showChainQuiz();
  }

  protected async showNarratorQuiz() {
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

  protected async showChainQuiz() {
    await ChoiceSuggestModal.open(app, START_CHAIN_QUIZ, ["ابدأ الاختبار"], "bottom", false);

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
  }

  protected async linkHadithToNarrators() {
    let fileContent = await readVaultFile(this.state.filePath);

    fileContent = await this.processNarratorsForLinking(fileContent);

    await updateVaultFile(this.state.filePath, fileContent);
  }

  private async processNarratorsForLinking(fileContent: string) {
    let updatedContent = fileContent;

    for (const hadithNarrator of this.state.hadithNarrators) {
      const index = hadithNarrator.indexInAllNarrators!;
      const narrator = this.state.allNarrators[index];
      const linkToNote = `[[${narrator.name}|${hadithNarrator.name}]]`;

      updatedContent = updatedContent.replace(hadithNarrator.name, linkToNote);
    }

    return updatedContent;
  }
}
