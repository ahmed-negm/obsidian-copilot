import { getPromptTemplate } from "../utils";

export interface StepRunnerOptions {
  onComplete?: () => Promise<void>;
}

export type ProcessResponseResult = {
  response: string;
  isSuccessful: boolean;
};

export abstract class StepRunner<T> {
  constructor(
    protected state: T,
    protected options?: StepRunnerOptions
  ) {}

  async getSystemPrompt(): Promise<string> {
    return getPromptTemplate("SystemPrompt");
  }

  async run(response: string): Promise<ProcessResponseResult> {
    const result = await this.processResponse(response);
    if (result.isSuccessful && this.options?.onComplete) {
      await this.options.onComplete();
    }
    return result;
  }

  getContextIntroMessage(): string {
    return "";
  }

  abstract getUserPrompt(): Promise<string>;

  protected abstract processResponse(response: string): Promise<ProcessResponseResult>;
}
