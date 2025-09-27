import { WorkflowRunner } from "./../base/WorkflowRunner";
import { StepRunner } from "./../base/StepRunner";
import { ExplainStep } from "../steps/ExplainStep";
import ChainManager from "@/LLMProviders/chainManager";
import { BaseState } from "../models/State";

export class ExplainWorkflowRunner extends WorkflowRunner<BaseState> {
  constructor(chainManager: ChainManager, args: string) {
    super(chainManager, { args });
  }

  protected registerSteps(): StepRunner<BaseState>[] {
    return [new ExplainStep(this.state)];
  }
}
