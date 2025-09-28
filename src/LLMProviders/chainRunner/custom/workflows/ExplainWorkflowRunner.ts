import { WorkflowRunner } from "./../base/WorkflowRunner";
import { ExplainStep } from "../steps/ExplainStep";
import ChainManager from "@/LLMProviders/chainManager";
import { BaseState } from "../models/state";

export class ExplainWorkflowRunner extends WorkflowRunner<BaseState> {
  constructor(chainManager: ChainManager, args: string) {
    super(chainManager, { args });
  }

  protected registerSteps() {
    return [new ExplainStep(this.state)];
  }
}
