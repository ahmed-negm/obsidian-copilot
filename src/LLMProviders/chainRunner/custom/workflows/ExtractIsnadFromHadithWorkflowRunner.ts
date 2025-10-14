import { WorkflowRunner } from "../base/WorkflowRunner";
import ChainManager from "@/LLMProviders/chainManager";
import { TraceNarratorsWorkflowState } from "../models/state";
import { ExtractIsnadFromHadithStep } from "../steps/ExtractIsnadFromHadithStep";
import { toArabicDigits, toEnglishDigits } from "../utils";

export class ExtractIsnadFromHadithWorkflowRunner extends WorkflowRunner<TraceNarratorsWorkflowState> {
  constructor(chainManager: ChainManager, args: string) {
    super(chainManager, new TraceNarratorsWorkflowState());
  }

  protected registerSteps() {
    const rangeSteps = this.createRangeStepsIfApplicable();
    if (rangeSteps && rangeSteps.length > 0) {
      return rangeSteps;
    }

    this.state.args = this.state.args ? toArabicDigits(this.state.args) : undefined;

    return [new ExtractIsnadFromHadithStep(this.state)];
  }

  private createRangeStepsIfApplicable() {
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

    const steps: ExtractIsnadFromHadithStep[] = [];
    for (let i = start; i <= end; i++) {
      this.state.args = toArabicDigits(i);

      steps.push(new ExtractIsnadFromHadithStep(this.state));
    }

    return steps;
  }
}
