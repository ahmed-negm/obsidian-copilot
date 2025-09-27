import { getPromptTemplate } from "../utils";

export abstract class StepRunner<T> {
  constructor(protected state: T) {}

  getSystemPrompt(): Promise<string> {
    return getPromptTemplate("SystemPrompt");
  }

  abstract getUserPrompt(): Promise<string>;

  abstract processResponse(response: string): Promise<{ response: string; isSuccessful: boolean }>;
}
