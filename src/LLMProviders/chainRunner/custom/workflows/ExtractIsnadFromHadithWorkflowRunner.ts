import { WorkflowRunner } from "../base/WorkflowRunner";
import ChainManager from "@/LLMProviders/chainManager";
import { TraceNarratorsWorkflowState } from "../models/state";
import { ExtractIsnadFromHadithStep } from "../steps/ExtractIsnadFromHadithStep";
import { getRange, toArabicDigits } from "../utils";

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
    const range = getRange(this.state.args);
    if (!range) {
      return [];
    }

    const steps: ExtractIsnadFromHadithStep[] = [];
    for (let i = range.start; i <= range.end; i++) {
      this.state.args = toArabicDigits(i);

      steps.push(new ExtractIsnadFromHadithStep(this.state));
    }

    return steps;
  }
}
