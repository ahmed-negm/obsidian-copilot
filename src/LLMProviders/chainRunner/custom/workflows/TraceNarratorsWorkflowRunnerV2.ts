import { ExtractNarratorsStep } from "../steps/ExtractNarratorsStep";
import { VerifyNarratorsStep } from "../steps/VerifyNarratorsStep";
import { FindSymbolsStep } from "../steps/FindSymbolsStep";
import { Notice } from "obsidian";
import { TraceNarratorsWorkflowRunnerBase } from "./TraceNarratorsWorkflowRunnerBase";
import { ExtractNarratedFromTahdibStep } from "../steps/ExtractNarratedFromTahdibStep";

export class TraceNarratorsWorkflowRunnerV2 extends TraceNarratorsWorkflowRunnerBase {
  protected registerSteps() {
    const step1 = new ExtractNarratorsStep(this.state, {
      onComplete: this.showQuiz.bind(this),
    });

    const step2 = new VerifyNarratorsStep(this.state, {
      onComplete: async () => {
        if (this.state.hadithNarratorIndex === this.state.hadithNarrators.length - 1) {
          this.currentStepIndex = 4;
          await this.createNewNotes();
          new Notice("✅ اكتمل التحقق من جميع الرواة.", 0);
        }
        return Promise.resolve();
      },
    });

    const step3 = new ExtractNarratedFromTahdibStep(this.state);

    const step4 = new FindSymbolsStep(this.state, {
      onComplete: () => {
        this.state.hadithNarratorIndex++;
        if (this.state.hadithNarratorIndex < this.state.hadithNarrators.length) {
          this.currentStepIndex = 0;
        }
        return Promise.resolve();
      },
    });

    return [step1, step2, step3, step4];
  }
}
