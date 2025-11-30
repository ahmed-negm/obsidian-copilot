import { WorkflowRunner } from "../base/WorkflowRunner";
import ChainManager from "@/LLMProviders/chainManager";
import { BaseState, TraceNarratorsWorkflowState } from "../models/state";
import { ExtractQuranStep } from "../steps/ExtractQuranStep";
import { getRange, toArabicDigits } from "../utils";

export class ExtractQuranRunner extends WorkflowRunner<BaseState> {
  constructor(chainManager: ChainManager, args: string) {
    super(chainManager, new TraceNarratorsWorkflowState(args));
  }

  protected registerSteps() {
    const rangeSteps = this.createRangeStepsIfApplicable();
    if (rangeSteps && rangeSteps.length > 0) {
      return rangeSteps;
    }

    this.state.args = this.state.args ? toArabicDigits(this.state.args) : undefined;

    return [new ExtractQuranStep(this.state)];
  }

  private createRangeStepsIfApplicable() {
    const range = getRange(this.state.args);
    if (!range) {
      return [];
    }

    const steps: ExtractQuranStep[] = [];
    for (let i = range.start; i <= range.end; i++) {
      console.log(`Creating step for Quran verse ${i}`, { args: toArabicDigits(i) });
      steps.push(new ExtractQuranStep({ args: toArabicDigits(i) }));
    }

    return steps;
  }
}
