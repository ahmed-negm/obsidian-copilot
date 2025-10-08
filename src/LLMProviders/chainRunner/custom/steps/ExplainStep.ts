import { logError } from "@/logger";
import { StepRunner, ProcessResponseResult } from "../base/StepRunner";
import { BaseState } from "../models/state";
import { getActiveNote, getPromptTemplate } from "../utils";
import { TEMPLATES } from "../constants";

export class ExplainStep extends StepRunner<BaseState> {
  async getSystemPrompt(): Promise<string> {
    try {
      const basePrompt = await super.getSystemPrompt();
      const extraSystemPrompt = await getPromptTemplate(TEMPLATES.EXPLAIN_STEP);
      return `${basePrompt}\n\n${extraSystemPrompt}`;
    } catch (error) {
      logError("Error loading explain system prompt", error);
      return super.getSystemPrompt();
    }
  }

  async getUserPrompt(): Promise<string> {
    try {
      const noteContent = await getActiveNote();
      let toExplain = "";
      let reference = "";
      if (this.state.args) {
        toExplain = this.state.args;
        if (noteContent && noteContent.includes(this.state.args)) {
          reference = noteContent;
        }
      } else {
        toExplain = noteContent || "No text available to explain.";
      }
      return `Explain the following text:\n\n${toExplain}${
        reference ? `\n\nHere is the full context for reference:\n\n${reference}` : ""
      }`;
    } catch (error) {
      logError("Error creating explain user prompt", error);
      return "Please explain this text (error occurred while preparing the prompt).";
    }
  }

  async processResponse(response: string): Promise<ProcessResponseResult> {
    return { response, isSuccessful: true };
  }
}
