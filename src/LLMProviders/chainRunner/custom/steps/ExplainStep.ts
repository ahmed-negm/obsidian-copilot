import { StepRunner } from "../base/StepRunner";
import { BaseState } from "../models/State";
import { getActiveNote, getPromptTemplate, stripObsidianProperties } from "../utils";

export class ExplainStep extends StepRunner<BaseState> {
  async getSystemPrompt() {
    const basePrompt = await super.getSystemPrompt();
    const extraSystemPrompt = await getPromptTemplate("ExplainStep");
    return basePrompt + "\n\n" + extraSystemPrompt;
  }

  async getUserPrompt() {
    const toExplain = this.state.args || stripObsidianProperties(await getActiveNote());
    return "Explain the following text: " + toExplain;
  }

  async processResponse(response: string) {
    return { response, isSuccessful: true };
  }
}
