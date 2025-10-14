import { WorkflowRunner } from "../base/WorkflowRunner";
import { logError } from "@/logger";
import ChainManager from "@/LLMProviders/chainManager";
import { TraceNarratorsWorkflowState } from "../models/state";
import { readVaultFile, setScore, updateVaultFile } from "../utils";
import { ChoiceSuggestModal } from "../ui/ChoiceSuggestModal";
import { Notice } from "obsidian";
import { ExtractIsnadFromHadithStep } from "../steps/ExtractIsnadFromHadithStep";
import { FindNarratorInTahdibIndexStep } from "../steps/FindNarratorInTahdibIndexStep";
import { FindTeacherStudentStep } from "../steps/FindTeacherStudentStep";
import { GenerateFigureNoteStep } from "../steps/GenerateFigureNoteStep";
import { PATHS, START_CHAIN_QUIZ, WORKFLOW_COMPLETE } from "../constants";

export class TraceNarratorsWorkflowRunner extends WorkflowRunner<TraceNarratorsWorkflowState> {
  constructor(chainManager: ChainManager, args: string) {
    super(chainManager, new TraceNarratorsWorkflowState(args));
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
    return new ExtractIsnadFromHadithStep(this.state);
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
    const nextNarratorIndex = this.state.nextNarrator?.indexInAllNarrators;

    if (!nextNarratorIndex && this.state.hasNextNarrator) {
      this.state.moveToNextNarrator();
      this.currentStepIndex -= 2;
    } else {
      this.state.resetNarratorIndex();
    }
  }

  private async handleTeacherStudentCompletion() {
    this.state.moveToNextNarrator();

    if (this.state.hasNextNarrator) {
      this.currentStepIndex -= 1;
    } else if (this.state.hasNextChain) {
      this.state.moveToNextChain();
      this.currentStepIndex = 0;
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
    this.state.resetChainIndex();
    this.state.resetNarratorIndex();
    await ChoiceSuggestModal.open(app, START_CHAIN_QUIZ, ["ابدأ الاختبار"], "bottom", false);

    await this.showNarratorQuiz();
    await this.showChainQuiz();
  }

  protected async showNarratorQuiz() {
    const narrators = this.state.currentChainNarrators.slice().reverse();

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
        true
      );

      const isCorrect = choice === narrator.expectedKnownName;
      await setScore(isCorrect, narrator.expectedKnownName);
    }
  }

  protected async showChainQuiz() {
    const hadithNarrators = this.state.currentChainNarrators.slice().reverse();

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

    const processedNarrators = new Set<string>();
    this.state.resetChainIndex();

    let hasNextChain = false;
    do {
      // Reset to the first narrator in the current chain
      this.state.resetNarratorIndex();

      // Process all narrators in the current chain
      let hasNextNarrator = false;
      do {
        const currentNarrator = this.state.currentNarrator.name;

        // Only process each narrator once
        if (!processedNarrators.has(currentNarrator)) {
          const linkToNote = `[[${this.state.currentNarratorInfo.name}|${currentNarrator}]]`;
          updatedContent = updatedContent.replaceAll(currentNarrator, linkToNote);
          processedNarrators.add(currentNarrator);
        }

        // Move to next narrator if available
        hasNextNarrator = this.state.hasNextNarrator;
        if (hasNextNarrator) {
          this.state.moveToNextNarrator();
        }
      } while (hasNextNarrator);

      // Move to next chain if available
      hasNextChain = this.state.hasNextChain;
      if (hasNextChain) {
        this.state.moveToNextChain();
      }
    } while (hasNextChain);

    return updatedContent;
  }
}
