import { WorkflowRunner } from "../base/WorkflowRunner";
import { logError } from "@/logger";
import ChainManager from "@/LLMProviders/chainManager";
import { TraceNarratorsWorkflowState } from "../models/state";
import {
  readVaultFile,
  setScore,
  toArabicDigits,
  toEnglishDigits,
  updateVaultFile,
} from "../utils";
import { ChoiceSuggestModal } from "../ui/ChoiceSuggestModal";
import { Notice } from "obsidian";
import { ExtractIsnadFromHadithStep } from "../steps/ExtractIsnadFromHadithStep";
import { FindNarratorInTahdibIndexStep } from "../steps/FindNarratorInTahdibIndexStep";
import { FindStudentStep } from "../steps/FindStudentStep";
import { FindTeacherStep } from "../steps/FindTeacherStep";
import { GenerateFigureNoteStep } from "../steps/GenerateFigureNoteStep";
import { PATHS, MSG_START_CHAIN_QUIZ } from "../constants";
import { buildCanvasFromIsnads } from "../utils/canvasUtils";

export class TraceNarratorsWorkflowRunner extends WorkflowRunner<TraceNarratorsWorkflowState> {
  private range: { start: number; end: number } | null = null;
  private rangeIndex: number = 0;

  constructor(chainManager: ChainManager, args: string) {
    super(chainManager, new TraceNarratorsWorkflowState(args));
    this.range = this.getRange();
    if (this.range) {
      this.rangeIndex = this.range.start;
      this.state.args = toArabicDigits(this.rangeIndex);
    }
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
      this.createStudentStep(),
      this.createTeacherStep(), // Execute teacher step after student step to establish bidirectional relationships
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

  private createStudentStep() {
    return new FindStudentStep(this.state, {
      onComplete: async () => {
        await this.handleStudentCompletion();
        return Promise.resolve();
      },
    });
  }

  private createTeacherStep() {
    return new FindTeacherStep(this.state, {
      onComplete: async () => {
        await this.handleTeacherCompletion();
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

  private async handleStudentCompletion() {
    // After finding student relationship, proceed to find teacher relationship for the same narrator pair
    // The teacher step will handle narrator advancement and chain progression
  }

  private isLastNarratorInChain = false;

  private async handleTeacherCompletion() {
    // After completing both student and teacher relationships, advance to next narrator
    this.state.moveToNextNarrator();

    if (this.state.hasNextNarrator) {
      this.currentStepIndex -= 2; // Go back to student step for next narrator pair
    } else if (this.state.isLastNarratorInChain && !this.isLastNarratorInChain) {
      this.isLastNarratorInChain = true;
      this.currentStepIndex -= 1; // Go back to teacher step for the last narrator
    } else if (this.state.hasNextChain) {
      this.isLastNarratorInChain = false;
      this.state.moveToNextChain();
      this.currentStepIndex = 0; // Start from beginning for new chain
    } else {
      this.currentStepIndex = 100; // Set to an index beyond the steps to end the workflow
      if (!this.range) {
        await this.linkHadithToNarrators();
        if (this.state.chainsCount > 1) {
          const canvas = buildCanvasFromIsnads(this.state.narratorNames);
          const canvasFilePath = this.state.filePath.replace(/\.[^/.]+$/, "") + ".canvas";
          await app.vault.create(canvasFilePath, JSON.stringify(canvas, null, 2));
          new Notice(`Canvas created: ${canvasFilePath}`);
        }
        this.showQuiz();
      }
    }
  }

  protected onComplete(): void {
    if (this.range) {
      this.rangeIndex++;
      if (this.rangeIndex <= this.range.end) {
        this.state.args = toArabicDigits(this.rangeIndex);
        this.state.resetForNewHadith();
        this.currentStepIndex = -1;
        this.isRunnerSuccessful = true;
      }
    }
  }

  private async loadNarratorsData() {
    const jsonString = await readVaultFile(`${PATHS.DATA}/Tahdhib.json`);
    this.state.allNarrators = JSON.parse(jsonString);
  }

  private async showQuiz() {
    this.state.resetChainIndex();
    this.state.resetNarratorIndex();
    await ChoiceSuggestModal.open(app, MSG_START_CHAIN_QUIZ, ["ابدأ الاختبار"], "bottom", false);

    await this.showNarratorQuiz();
    await this.showChainQuiz();
  }

  private async showNarratorQuiz() {
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

  private async showChainQuiz() {
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

  private async linkHadithToNarrators() {
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

  private getRange() {
    if (!this.state.args) {
      return null;
    }

    const range = this.state.args.split("-");
    if (range.length !== 2) {
      return null;
    }

    const start = parseInt(toEnglishDigits(range[0]));
    const end = parseInt(toEnglishDigits(range[1]));

    if (isNaN(start) || isNaN(end) || start <= 0 || end < start) {
      return null;
    }
    return { start, end };
  }
}
