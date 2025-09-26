import { SystemMessage } from "../BaseSimpleChainRunner";

/**
 * Interface for a workflow step that can be executed within a WorkflowRunner
 */
export interface StepRunner<T> {
  /**
   * Format the input messages for this step
   * @param messages Array of system messages
   * @param state Current workflow state
   * @returns Promise resolving to the formatted messages
   */
  formatInput(messages: SystemMessage[], state: T): Promise<SystemMessage[]>;

  /**
   * Run the step with the current state and process LLM response
   * @param response The LLM response string
   * @param state Current workflow state
   * @returns Promise resolving to an object containing:
   *   - output: The formatted output string
   *   - nextState: The updated workflow state
   *   - isComplete: Whether the step is complete and workflow should advance
   */
  run(
    response: string,
    state: T
  ): Promise<{
    output: string;
    nextState: T;
    isComplete: boolean;
  }>;
}
