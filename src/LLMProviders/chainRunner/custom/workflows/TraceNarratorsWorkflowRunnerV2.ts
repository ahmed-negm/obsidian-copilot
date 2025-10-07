import { ExtractNarratorsFromHadithStep } from "../steps/ExtractNarratorsFromHadithStep";
import { Notice } from "obsidian";
import { TraceNarratorsWorkflowRunnerBase } from "./TraceNarratorsWorkflowRunnerBase";
import { GenerateFigureNoteStep } from "../steps/GenerateFigureNoteStep";
import { FindNarratorInTahdibIndexStep } from "../steps/FindNarratorInTahdibIndexStep";
import { FindTeacherStudentStep } from "../steps/FindTeacherStudentStep";

export class TraceNarratorsWorkflowRunnerV2 extends TraceNarratorsWorkflowRunnerBase {
  protected registerSteps() {
    const step1 = new ExtractNarratorsFromHadithStep(this.state);

    const step2 = new FindNarratorInTahdibIndexStep(this.state);

    const step3 = new GenerateFigureNoteStep(this.state, {
      onComplete: async () => {
        const nextNarratorIndex =
          this.state.hadithNarrators[this.state.hadithNarratorIndex + 1]?.indexInAllNarrators;
        if (
          !nextNarratorIndex &&
          this.state.hadithNarratorIndex < this.state.hadithNarrators.length - 1
        ) {
          this.state.hadithNarratorIndex++;
          this.currentStepIndex -= 2;
          return Promise.resolve();
        } else {
          this.state.hadithNarratorIndex = 0;
        }

        return Promise.resolve();
      },
    });

    const step4 = new FindTeacherStudentStep(this.state, {
      onComplete: async () => {
        this.state.hadithNarratorIndex++;
        if (this.state.hadithNarratorIndex < this.state.hadithNarrators.length - 1) {
          this.currentStepIndex -= 1;
        } else if (this.state.hadithNarratorIndex === this.state.hadithNarrators.length - 1) {
          this.currentStepIndex = 5;
          await this.linkHadithToNarrators();
          new Notice("✅ اكتمل التحقق من جميع الرواة.", 0);
        }
        return Promise.resolve();
      },
    });

    return [step1, step2, step3, step4];
  }

  private async verifyAllNarratorsCompleted() {}
}
