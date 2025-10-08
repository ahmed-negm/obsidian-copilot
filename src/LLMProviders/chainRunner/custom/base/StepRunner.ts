import { getPromptTemplate } from "../utils";
import { TEMPLATES } from "../constants";

/**
 * Options for configuring a StepRunner
 */
export interface StepRunnerOptions {
  /**
   * Optional callback that runs when the step completes successfully
   */
  onComplete?: () => Promise<void>;
}

/**
 * Result of processing an AI response in a step
 */
export type ProcessResponseResult = {
  /**
   * The processed response to display to the user
   */
  response: string;

  /**
   * Whether the step was successful
   * If false, the workflow will terminate after this step
   */
  isSuccessful: boolean;
};

/**
 * Abstract base class for workflow step runners
 * Each step in a workflow is responsible for:
 * 1. Generating the user prompt for the AI
 * 2. Processing the AI's response
 * 3. Updating the workflow state
 *
 * @template T The type of the workflow state
 */
export abstract class StepRunner<T> {
  /**
   * Create a new step runner
   *
   * @param state - The shared workflow state object
   * @param options - Configuration options for the step
   */
  constructor(
    protected state: T,
    protected options?: StepRunnerOptions
  ) {}

  /**
   * Get the system prompt for the AI
   * Default implementation uses the standard system prompt
   *
   * @returns Promise resolving to the system prompt
   */
  async getSystemPrompt(): Promise<string> {
    try {
      return await getPromptTemplate(TEMPLATES.SYSTEM);
    } catch (error) {
      console.error("Error loading system prompt", error);
      return "You are a helpful assistant.";
    }
  }

  /**
   * Run the step with the given AI response
   *
   * @param response - The AI response to process
   * @returns Promise resolving to the processed result
   */
  async run(response: string): Promise<ProcessResponseResult> {
    try {
      const result = await this.processResponse(response);

      // Execute onComplete callback if the step was successful
      if (result.isSuccessful && this.options?.onComplete) {
        await this.options.onComplete();
      }

      return result;
    } catch (error) {
      console.error("Error running step", error);
      return {
        response: "An error occurred while processing this step.",
        isSuccessful: false,
      };
    }
  }

  /**
   * Get an introductory message to provide context for this step
   * Override this to provide helpful context to the user
   *
   * @returns Context introduction message, empty string by default
   */
  getContextIntroMessage(): string {
    return "";
  }

  /**
   * Generate the user prompt to send to the AI for this step
   * Must be implemented by each step
   *
   * @returns Promise resolving to the user prompt
   */
  abstract getUserPrompt(): Promise<string>;

  /**
   * Process the AI response for this step
   * Must be implemented by each step
   *
   * @param response - The AI response to process
   * @returns Promise resolving to the processed result
   */
  protected abstract processResponse(response: string): Promise<ProcessResponseResult>;
}
