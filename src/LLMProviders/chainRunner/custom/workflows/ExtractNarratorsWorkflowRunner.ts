import { WorkflowRunner } from "./../base/WorkflowRunner";
import ChainManager from "@/LLMProviders/chainManager";
import { ExtractNarratorsState } from "../models/State";
import { ExtractNarratorsStep } from "../steps/ExtractNarratorsStep";

export class ExtractNarratorsWorkflowRunner extends WorkflowRunner<ExtractNarratorsState> {
  constructor(chainManager: ChainManager, args: string) {
    super(chainManager, { args, hadithNarrators: [] });
  }

  protected registerSteps() {
    return [new ExtractNarratorsStep(this.state)];
  }
}
