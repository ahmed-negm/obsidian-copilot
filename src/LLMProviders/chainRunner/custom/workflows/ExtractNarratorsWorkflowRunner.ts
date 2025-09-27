import { WorkflowRunner } from "./../base/WorkflowRunner";
import ChainManager from "@/LLMProviders/chainManager";
import { ExtractNarratorsState } from "../models/State";
import { ExtractNarratorsStep } from "../steps/ExtractNarratorsStep";
import { toArabicDigits, toEnglishDigits } from "../utils";

export class ExtractNarratorsWorkflowRunner extends WorkflowRunner<ExtractNarratorsState> {
  constructor(chainManager: ChainManager, args: string) {
    super(chainManager, { args, hadithNarrators: [] });
  }

  protected registerSteps() {
    if (this.state.args) {
      const range = this.state.args.split("-");
      if (range.length === 2) {
        const start = parseInt(toEnglishDigits(range[0]));
        const end = parseInt(toEnglishDigits(range[1]));
        if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
          const steps: ExtractNarratorsStep[] = [];
          for (let i = start; i <= end; i++) {
            steps.push(new ExtractNarratorsStep({ ...this.state, args: toArabicDigits(i) }));
          }
          return steps;
        }
      }
    }
    return [new ExtractNarratorsStep({ ...this.state, args: toArabicDigits(this.state.args) })];
  }
}
