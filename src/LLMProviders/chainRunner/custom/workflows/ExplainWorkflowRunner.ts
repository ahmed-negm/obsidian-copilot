import { WorkflowRunner } from "../base/WorkflowRunner";
import { ExplainStep } from "../steps/ExplainStep";
import ChainManager from "@/LLMProviders/chainManager";
import { BaseState } from "../models/state";
import { StepRunner } from "../base/StepRunner";
import { logError } from "@/logger";

export class ExplainWorkflowRunner extends WorkflowRunner<BaseState> {
  constructor(chainManager: ChainManager, args: string) {
    super(chainManager, { args });
  }

  protected registerSteps(): StepRunner<BaseState>[] {
    try {
      return [new ExplainStep(this.state)];
    } catch (error) {
      logError("Error registering steps for explain workflow", error);
      return [];
    }
  }
}
