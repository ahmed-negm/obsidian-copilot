import { StepRunner } from "../base/StepRunner";
import { BaseState } from "../models/state";
import { getActiveNote, getPromptTemplate, populateTemplate } from "../utils";

export class ExplainStep extends StepRunner<BaseState> {
  async getUserPrompt() {
    const noteContent = await getActiveNote();
    let toExplain = "";
    let reference = "";
    if (this.state.args) {
      toExplain = this.state.args;
      if (noteContent && noteContent.includes(this.state.args)) {
        reference = noteContent;
      }
    } else {
      toExplain = noteContent || "";
    }

    const promptTemplate = await getPromptTemplate("ExplainStep");
    return populateTemplate(promptTemplate, {
      TEXT: toExplain,
      REFERENCE: reference ? `\nHere is the full context for reference:\n${reference}\n` : "",
    });
  }

  async processResponse(response: string) {
    return { response, isSuccessful: true };
  }
}
