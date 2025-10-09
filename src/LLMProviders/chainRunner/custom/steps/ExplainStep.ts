import { StepRunner, ProcessResponseResult } from "../base/StepRunner";
import { BaseState } from "../models/state";
import { getActiveNote, getPromptTemplate } from "../utils";

export class ExplainStep extends StepRunner<BaseState> {
  async getSystemPrompt(): Promise<string> {
    const basePrompt = await super.getSystemPrompt();
    const extraSystemPrompt = await getPromptTemplate("ExplainStep");
    return `${basePrompt}\n\n${extraSystemPrompt}`;
  }

  async getUserPrompt(): Promise<string> {
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
  }

  async processResponse(response: string): Promise<ProcessResponseResult> {
    return { response, isSuccessful: true };
  }
}
