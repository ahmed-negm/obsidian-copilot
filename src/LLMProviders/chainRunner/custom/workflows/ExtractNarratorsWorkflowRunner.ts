import { WorkflowRunner } from "./../base/WorkflowRunner";
import ChainManager from "@/LLMProviders/chainManager";
import { TraceNarratorsWorkflowState } from "../models/state";
import { ExtractNarratorsFromHadithStep } from "../steps/ExtractNarratorsFromHadithStep";
import { toArabicDigits, toEnglishDigits } from "../utils";

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

  protected registerSteps() {
    if (this.state.args) {
      const range = this.state.args.split("-");
      if (range.length === 2) {
        const start = parseInt(toEnglishDigits(range[0]));
        const end = parseInt(toEnglishDigits(range[1]));
        if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
          const steps: ExtractNarratorsFromHadithStep[] = [];
          for (let i = start; i <= end; i++) {
            steps.push(
              new ExtractNarratorsFromHadithStep({ ...this.state, args: toArabicDigits(i) })
            );
          }
          return steps;
        }
      }
    }
    return [
      new ExtractNarratorsFromHadithStep({ ...this.state, args: toArabicDigits(this.state.args) }),
    ];
  }
}
