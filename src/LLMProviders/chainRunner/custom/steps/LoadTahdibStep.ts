import { StepRunner } from "../base/StepRunner";
import { TraceNarratorsWorkflowState } from "../models/state";
import { getPromptTemplate, toArabicDigits } from "../utils";
import { getShamelaContent } from "../utils";

export class LoadTahdibStep extends StepRunner<TraceNarratorsWorkflowState> {
  getContextIntroMessage() {
    return "جاري البحث عن من رووا عنه ...";
  }

  async getUserPrompt() {
    const indexInAllNarrators =
      this.state.hadithNarrators[this.state.hadithNarratorIndex].indexInAllNarrators!;

    const currentNarrator = this.state.allNarrators[indexInAllNarrators];
    const nextNarrator = this.state.allNarrators[indexInAllNarrators + 1];

    const shamelaContent = await getShamelaContent(
      currentNarrator.shamelaIndex,
      nextNarrator.shamelaIndex
    );

    const promptTemplate = await getPromptTemplate("TraceHadithChainRunner04");
    const prompt = promptTemplate
      .replaceAll("{{narrator_name}}", currentNarrator.name)
      .replaceAll("{{bio}}", shamelaContent);

    return prompt;
  }

  async processResponse(response: string) {
    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      this.state.tahdibNarrators = JSON.parse(codeBlockMatch[1]);

      if (this.state.tahdibNarrators.length > 0) {
        // Format the output message
        const output = `
عدد من رووا عن **${this.state.hadithNarrators[this.state.hadithNarratorIndex].potentialPeople[0].knownName}** في صحيح البخاري هو **${toArabicDigits(this.state.tahdibNarrators.length)}**`;

        return {
          response: output,
          isSuccessful: true,
        };
      }
    }

    return {
      response,
      isSuccessful: false,
    };
  }
}
