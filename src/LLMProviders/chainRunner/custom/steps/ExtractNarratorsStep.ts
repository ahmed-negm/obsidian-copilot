import { StepRunner } from "../base/StepRunner";
import { HadithNarrator } from "../models/narrator";
import { TraceNarratorsWorkflowState } from "../models/state";
import { readVaultFile, getActiveNote, getPromptTemplate } from "../utils";

export class ExtractNarratorsStep extends StepRunner<TraceNarratorsWorkflowState> {
  private hadithLink: string;

  async getUserPrompt() {
    const hadithNumber = this.state.args;
    const hadithText = hadithNumber
      ? await readVaultFile(`Sunnah/صحيح البخاري/البخاري-${hadithNumber}.md`)
      : await getActiveNote();

    this.hadithLink = hadithNumber
      ? `[[البخاري-${hadithNumber}]]`
      : `[[${app.workspace.getActiveFile()?.name || ""}]]`;

    const prompt = await getPromptTemplate("ExtractNarratorsStep");

    return `${prompt}\n\nHere is the Hadith text:\n\n '${hadithText}'`;
  }

  async processResponse(response: string) {
    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (!codeBlockMatch) {
      return {
        response,
        isSuccessful: false,
      };
    }

    const hadithNarrators = JSON.parse(codeBlockMatch[1]) as HadithNarrator[];

    const narratorList = hadithNarrators.map((narrator: HadithNarrator) => {
      return `- **${narrator.name}**: ${narrator.potentialPeople.map((p) => p.knownName).join(" أو ")}`;
    });

    this.state.hadithNarrators = hadithNarrators.reverse();

    const bulletList = narratorList.join("\n");

    const result = `
سند الحديث ${this.hadithLink} هو:

${bulletList}
`;

    return {
      response: result,
      isSuccessful: true,
    };
  }
}
