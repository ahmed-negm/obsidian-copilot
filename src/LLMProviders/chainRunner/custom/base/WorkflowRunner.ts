import { logError } from "@/logger";
import ChainManager from "@/LLMProviders/chainManager";
import { BaseSimpleChainRunner } from "./BaseSimpleChainRunner";
import { StepRunner } from "./StepRunner";
import { Notice } from "obsidian";

export abstract class WorkflowRunner<T> extends BaseSimpleChainRunner {
  protected steps: StepRunner<T>[];
  protected currentStepIndex: number = 0;

  constructor(
    chainManager: ChainManager,
    protected state: T
  ) {
    super(chainManager);
    try {
      this.steps = this.registerSteps();
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

  protected abstract registerSteps(): StepRunner<T>[];

  get currentStep(): StepRunner<T> {
    if (!this.steps || this.currentStepIndex >= this.steps.length) {
      throw new Error("No current step available");
    }
    return this.steps[this.currentStepIndex];
  }

  get nextStep(): StepRunner<T> | null {
    if (this.currentStepIndex + 1 >= this.steps.length) {
      return null;
    }
    return this.steps[this.currentStepIndex + 1];
  }

  async getSystemPrompt(): Promise<string> {
    try {
      return await this.currentStep.getSystemPrompt();
    } catch (error) {
      logError("Error getting system prompt", error);
      return "You are a helpful assistant.";
    }
  }

  async getUserPrompt(_userMessage: string): Promise<string> {
    try {
      return await this.currentStep.getUserPrompt();
    } catch (error) {
      logError("Error getting user prompt", error);
      return "Please help me with this task.";
    }
  }

  async processResponse(response: string): Promise<string> {
    try {
      const result = await this.currentStep.run(response);
      this.isRunnerSuccessful = result.isSuccessful;
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

  nextRunner(): WorkflowRunner<T> | null {
    this.currentStepIndex++;
    if (this.currentStepIndex >= this.steps.length) {
      return null;
    }
    return this;
  }

  includeChatHistory(): boolean {
    return false;
  }
}
