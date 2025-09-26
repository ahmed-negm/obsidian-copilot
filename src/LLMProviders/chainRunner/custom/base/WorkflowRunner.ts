import { BaseSimpleChainRunner, SystemMessage } from "../BaseSimpleChainRunner";
import { StepRunner } from "./StepRunner";
import { ChainRunner } from "../../../chainRunner";

/**
 * Base class for workflow-based chain runners
 * Manages a sequence of steps and their state transitions
 */
export abstract class WorkflowRunner<T> extends BaseSimpleChainRunner {
  protected state: T;
  protected steps: StepRunner<T>[];
  protected currentStepIndex: number = 0;

  /**
   * Create a new workflow runner
   * @param chainManager The chain manager instance
   * @param initialState Initial workflow state
   */
  constructor(chainManager: any, initialState: T) {
    super(chainManager);
    this.state = initialState;
    this.steps = this.registerSteps();
  }

  /**
   * Register all steps for this workflow
   * Must be implemented by subclasses
   * @returns Array of step runners
   */
  protected abstract registerSteps(): StepRunner<T>[];

  /**
   * Format the input messages for the current step
   * @param messages Array of system messages
   * @returns Promise resolving to the formatted messages
   */
  async formatInput(messages: SystemMessage[]): Promise<SystemMessage[]> {
    if (this.currentStepIndex >= this.steps.length) {
      return messages;
    }

    const currentStep = this.steps[this.currentStepIndex];
    return currentStep.formatInput(messages, this.state);
  }

  /**
   * Process the LLM response for the current step
   * @param response The LLM response string
   * @returns Promise resolving to the formatted output
   */
  async formatOutput(response: string): Promise<string> {
    if (this.currentStepIndex >= this.steps.length) {
      return response;
    }

    const currentStep = this.steps[this.currentStepIndex];
    const result = await currentStep.run(response, this.state);

    this.state = result.nextState;
    this.succeeded = true;

    if (result.isComplete) {
      this.currentStepIndex++;
    }

    return result.output;
  }

  /**
   * Determine the next step in the workflow
   * @returns Promise resolving to the next chain runner or null if complete
   */
  async nextStep(): Promise<ChainRunner | null> {
    if (this.currentStepIndex >= this.steps.length) {
      return null;
    }

    return this;
  }

  /**
   * Whether to include chat history in the prompt
   * @returns false by default to avoid context pollution
   */
  includeChatHistory(): boolean {
    return false;
  }
}
