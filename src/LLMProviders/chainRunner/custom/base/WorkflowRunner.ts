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

  async getSystemPrompt() {
    const currentStep = this.steps[this.currentStepIndex];
    return currentStep.getSystemPrompt();
  }

  async getUserPrompt(_userMessage: string) {
    const currentStep = this.steps[this.currentStepIndex];
    return currentStep.getUserPrompt();
  }

  async processResponse(response: string): Promise<string> {
    const currentStep = this.steps[this.currentStepIndex];
    const result = await currentStep.run(response);

    this.isRunnerSuccessful = result.isSuccessful;

    return result.response;
  }

  nextRunner() {
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
