import { logError } from "@/logger";
import { getPromptTemplate } from "../utils";
import { TEMPLATES } from "../constants";

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
    try {
      return await getPromptTemplate(TEMPLATES.SYSTEM);
    } catch (error) {
      logError("Error loading system prompt", error);
      return "You are a helpful assistant.";
    }
  }

  async run(response: string): Promise<ProcessResponseResult> {
    try {
      const result = await this.processResponse(response);
      if (result.isSuccessful && this.options?.onComplete) {
        await this.options.onComplete();
      }
      return result;
    } catch (error) {
      logError("Error running step", error);
      return {
        response: "An error occurred while processing this step.",
        isSuccessful: false,
      };
    }
  }

  getContextIntroMessage(): string {
    return "";
  }

  abstract getUserPrompt(): Promise<string>;

  protected abstract processResponse(response: string): Promise<ProcessResponseResult>;
}
