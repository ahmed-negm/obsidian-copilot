import ChainManager from "@/LLMProviders/chainManager";
import { BaseSimpleChainRunner } from "./BaseSimpleChainRunner";
import { StepRunner } from "./StepRunner";

export abstract class WorkflowRunner<T> extends BaseSimpleChainRunner {
  protected steps: StepRunner<T>[];
  protected currentStepIndex: number = 0;

  protected abstract registerSteps(): StepRunner<T>[];

  constructor(
    chainManager: ChainManager,
    protected state: T
  ) {
    super(chainManager);
    this.steps = this.registerSteps();
  }

  async getSystemPrompt(): Promise<string> {
    return this.currentStep.getSystemPrompt();
  }

  async getUserPrompt(_userMessage: string): Promise<string> {
    try {
      return await this.currentStep.getUserPrompt();
    } catch (error) {
      this.isRunnerSuccessful = false;
      throw error;
    }
  }

  async processResponse(response: string): Promise<string> {
    if (this.isRunnerSuccessful === false) {
      return "";
    }

    try {
      const result = await this.currentStep.run(response);
      this.isRunnerSuccessful = result.isSuccessful;
      if (!result.isSuccessful) {
        this.onComplete();
      }

      let nextStepIntroMessage = "";
      if (this.nextStep) {
        nextStepIntroMessage = result.isSuccessful ? this.nextStep.getContextIntroMessage() : "";
      } else {
        nextStepIntroMessage = "--------";
        this.onComplete();
      }

      return result.response + (nextStepIntroMessage ? `\n\n${nextStepIntroMessage}` : "");
    } catch (error) {
      this.isRunnerSuccessful = false;
      throw error;
    }
  }

  protected onComplete(): void {}

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

  private get currentStep(): StepRunner<T> {
    if (!this.steps || this.currentStepIndex >= this.steps.length) {
      throw new Error("No current step available");
    }
    return this.steps[this.currentStepIndex];
  }

  private get nextStep(): StepRunner<T> | undefined {
    return this.steps[this.currentStepIndex + 1];
  }
}
