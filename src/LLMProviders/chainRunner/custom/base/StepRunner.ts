import { getPromptTemplate } from "../utils";

export interface StepRunnerOptions {
  preRender?: () => Promise<void>;
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

  getSystemPrompt(): Promise<string> {
    return getPromptTemplate("SystemPrompt");
  }

  async run(response: string): Promise<ProcessResponseResult> {
    const result = await this.processResponse(response);
    if (this.options?.preRender) {
      await this.options.preRender();
    }
    return result;
  }

  getContextIntroMessage() {
    return "";
  }

  abstract getUserPrompt(): Promise<string>;

  protected abstract processResponse(response: string): Promise<ProcessResponseResult>;
}
