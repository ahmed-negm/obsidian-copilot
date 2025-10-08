import { WorkflowRunner } from "../base/WorkflowRunner";
import { ExplainStep } from "../steps/ExplainStep";
import ChainManager from "@/LLMProviders/chainManager";
import { BaseState } from "../models/state";
import { StepRunner } from "../base/StepRunner";
import { logError } from "@/logger";

/**
 * Workflow runner that handles text explanation requests
 * This is a single-step workflow that processes the explain command
 */
export class ExplainWorkflowRunner extends WorkflowRunner<BaseState> {
  /**
   * Creates a new explain workflow runner
   *
   * @param chainManager - The chain manager instance
   * @param args - Text to explain (or empty to use active note)
   */
  constructor(chainManager: ChainManager, args: string) {
    super(chainManager, { args });
  }

  /**
   * Register the explanation step for this workflow
   *
   * @returns Array containing the ExplainStep
   */
  protected registerSteps(): StepRunner<BaseState>[] {
    try {
      return [new ExplainStep(this.state)];
    } catch (error) {
      logError("Error registering steps for explain workflow", error);
      return [];
    }
  }
}
