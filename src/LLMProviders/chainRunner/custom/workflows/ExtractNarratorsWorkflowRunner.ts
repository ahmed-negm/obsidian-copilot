import { logError } from "@/logger";
import { WorkflowRunner } from "../base/WorkflowRunner";
import ChainManager from "@/LLMProviders/chainManager";
import { TraceNarratorsWorkflowState } from "../models/state";
import { ExtractNarratorsFromHadithStep } from "../steps/ExtractNarratorsFromHadithStep";
import { toArabicDigits, toEnglishDigits } from "../utils";
import { StepRunner } from "../base/StepRunner";

export class ExtractNarratorsWorkflowRunner extends WorkflowRunner<TraceNarratorsWorkflowState> {
  constructor(chainManager: ChainManager, args: string) {
    super(chainManager, {
      args,
      hadithNarrators: [],
      allNarrators: [],
      tahdibNarrators: [],
      hadithNarratorIndex: 0,
      filePath: "",
    });
  }

  protected registerSteps(): StepRunner<TraceNarratorsWorkflowState>[] {
    try {
      const rangeSteps = this.createRangeStepsIfApplicable();
      if (rangeSteps && rangeSteps.length > 0) {
        return rangeSteps;
      }
      return [
        new ExtractNarratorsFromHadithStep({
          ...this.state,
          args: toArabicDigits(this.state.args),
        }),
      ];
    } catch (error) {
      logError("Error registering steps for extract narrators workflow", error);
      return [];
    }
  }

  private createRangeStepsIfApplicable(): StepRunner<TraceNarratorsWorkflowState>[] | null {
    if (!this.state.args) return null;
    const range = this.state.args.split("-");
    if (range.length !== 2) return null;
    const start = parseInt(toEnglishDigits(range[0]));
    const end = parseInt(toEnglishDigits(range[1]));
    if (isNaN(start) || isNaN(end) || start <= 0 || end < start) {
      return null;
    }
    const steps: ExtractNarratorsFromHadithStep[] = [];
    for (let i = start; i <= end; i++) {
      steps.push(
        new ExtractNarratorsFromHadithStep({
          ...this.state,
          args: toArabicDigits(i),
        })
      );
    }
    return steps;
  }
}
