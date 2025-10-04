import ChainManager from "@/LLMProviders/chainManager";
import { BaseSimpleChainRunner } from "./BaseSimpleChainRunner";
import { StepRunner } from "./StepRunner";

export abstract class WorkflowRunner<T> extends BaseSimpleChainRunner {
  protected steps: StepRunner<T>[];
  protected currentStepIndex: number = 0;

  constructor(
    chainManager: ChainManager,
    protected state: T
  ) {
    super(chainManager);
    this.steps = this.registerSteps(this.state);
  }

  protected abstract registerSteps(state: T): StepRunner<T>[];

  get currentStep(): StepRunner<T> {
    return this.steps[this.currentStepIndex];
  }

  get nextStep(): StepRunner<T> | null {
    if (this.currentStepIndex + 1 >= this.steps.length) {
      return null;
    }
    return this.steps[this.currentStepIndex + 1];
  }

  async getSystemPrompt(): Promise<string> {
    return this.currentStep.getSystemPrompt();
  }

  async getUserPrompt(_userMessage: string): Promise<string> {
    return this.currentStep.getUserPrompt();
  }

  async processResponse(response: string): Promise<string> {
    const result = await this.currentStep.run(response);

    this.isRunnerSuccessful = result.isSuccessful;

    const nextStepIntroMessage = this.nextStep?.getContextIntroMessage();

    return (
      result.response +
      (nextStepIntroMessage && result.isSuccessful ? `\n\n${nextStepIntroMessage}` : "")
    );
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
