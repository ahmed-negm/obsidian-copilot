import { logError } from "@/logger";
import ChainManager from "@/LLMProviders/chainManager";
import { BaseSimpleChainRunner } from "./BaseSimpleChainRunner";
import { StepRunner } from "./StepRunner";
import { Notice } from "obsidian";

/**
 * Abstract base class for workflow-based chain runners
 * A workflow consists of multiple sequential steps that process AI interactions
 *
 * @template T The type of the workflow state shared across steps
 */
export abstract class WorkflowRunner<T> extends BaseSimpleChainRunner {
  /** Array of step runners that make up this workflow */
  protected steps: StepRunner<T>[];

  /** Index of the current step in execution */
  protected currentStepIndex: number = 0;

  /**
   * Create a new workflow runner
   *
   * @param chainManager - The chain manager instance
   * @param state - The shared workflow state object
   */
  constructor(
    chainManager: ChainManager,
    protected state: T
  ) {
    super(chainManager);

    // Initialize steps
    try {
      this.steps = this.registerSteps();

      // Validate steps
      if (!this.steps || this.steps.length === 0) {
        logError("No steps registered for workflow");
        this.steps = [];
      }
    } catch (error) {
      logError("Error initializing workflow steps", error);
      new Notice("Failed to initialize workflow steps");
      this.steps = [];
    }
  }

  /**
   * Register and configure the steps for this workflow
   * Must be implemented by each workflow
   *
   * @returns Array of step runners
   */
  protected abstract registerSteps(): StepRunner<T>[];

  /**
   * Get the currently active step
   *
   * @returns The current step runner
   * @throws Error if there is no current step
   */
  get currentStep(): StepRunner<T> {
    if (!this.steps || this.currentStepIndex >= this.steps.length) {
      throw new Error("No current step available");
    }
    return this.steps[this.currentStepIndex];
  }

  /**
   * Get the next step in the workflow, if any
   *
   * @returns The next step runner or null if at the end
   */
  get nextStep(): StepRunner<T> | null {
    if (this.currentStepIndex + 1 >= this.steps.length) {
      return null;
    }
    return this.steps[this.currentStepIndex + 1];
  }

  /**
   * Get the system prompt for the current step
   *
   * @returns Promise resolving to the system prompt
   */
  async getSystemPrompt(): Promise<string> {
    try {
      return await this.currentStep.getSystemPrompt();
    } catch (error) {
      logError("Error getting system prompt", error);
      return "You are a helpful assistant.";
    }
  }

  /**
   * Get the user prompt for the current step
   *
   * @param _userMessage - The original user message (usually ignored in workflows)
   * @returns Promise resolving to the user prompt
   */
  async getUserPrompt(_userMessage: string): Promise<string> {
    try {
      return await this.currentStep.getUserPrompt();
    } catch (error) {
      logError("Error getting user prompt", error);
      return "Please help me with this task.";
    }
  }

  /**
   * Process the AI response for the current step
   *
   * @param response - The AI response to process
   * @returns Promise resolving to the processed response
   */
  async processResponse(response: string): Promise<string> {
    try {
      const result = await this.currentStep.run(response);
      this.isRunnerSuccessful = result.isSuccessful;

      // Add the next step's intro message if available and step was successful
      const nextStepIntroMessage = this.nextStep?.getContextIntroMessage();
      return (
        result.response +
        (nextStepIntroMessage && result.isSuccessful ? `\n\n${nextStepIntroMessage}` : "")
      );
    } catch (error) {
      logError("Error processing response", error);
      this.isRunnerSuccessful = false;
      return "An error occurred while processing the response.";
    }
  }

  /**
   * Move to the next step in the workflow
   *
   * @returns This workflow runner if there are more steps, null otherwise
   */
  nextRunner(): WorkflowRunner<T> | null {
    this.currentStepIndex++;
    if (this.currentStepIndex >= this.steps.length) {
      return null;
    }
    return this;
  }

  /**
   * Whether to include chat history in the prompts
   * Workflows typically don't need chat history as they're self-contained
   *
   * @returns false by default for workflows
   */
  includeChatHistory(): boolean {
    return false;
  }
}
