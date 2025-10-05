import { ExtractNarratorsFromHadithStep } from "../steps/ExtractNarratorsFromHadithStep";
import { Notice } from "obsidian";
import { TraceNarratorsWorkflowRunnerBase } from "./TraceNarratorsWorkflowRunnerBase";
import { GenerateFigureNoteStep } from "../steps/GenerateFigureNoteStep";
import { FindNarratorInTahdibIndexStep } from "../steps/FindNarratorInTahdibIndexStep";
import { FindTeacherStudentStep } from "../steps/FindTeacherStudentStep";

export class TraceNarratorsWorkflowRunnerV2 extends TraceNarratorsWorkflowRunnerBase {
  protected registerSteps() {
    const step1 = new ExtractNarratorsFromHadithStep(this.state, {
      // onComplete: this.showQuiz.bind(this),
    });

    const step2 = new FindNarratorInTahdibIndexStep(this.state, {
      onComplete: async () => {
        if (this.state.hadithNarratorIndex === this.state.hadithNarrators.length - 1) {
          this.currentStepIndex = 4;
          // await this.createNewNotes(); TODO: Link Hadith
          new Notice("✅ اكتمل التحقق من جميع الرواة.", 0);
        } else {
          const narratorIndex =
            this.state.hadithNarrators[this.state.hadithNarratorIndex].indexInAllNarrators;
          if (narratorIndex) {
            const filePath = `NewFigures/${this.state.allNarrators[narratorIndex].name}.md`;
            const noteExists = app.vault.getAbstractFileByPath(filePath);
            if (noteExists) {
              // Skip figure note generation if note already exists
              this.currentStepIndex = this.currentStepIndex + 1;
            }
          }
        }

        return Promise.resolve();
      },
    });

    const step3 = new GenerateFigureNoteStep(this.state);

    const step4 = new FindTeacherStudentStep(this.state, {
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
