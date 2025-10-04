import { StepRunner } from "../base/StepRunner";
import { HadithNarrator } from "../models/narrator";
import { TraceNarratorsWorkflowState } from "../models/state";
import { readVaultFile, getPromptTemplate, toArabicDigits } from "../utils";

export class ExtractNarratorsStep extends StepRunner<TraceNarratorsWorkflowState> {
  private hadithLink: string;

  async getUserPrompt() {
    const hadithNumber = this.state.args;
    this.state.filePath = this.state.args
      ? `Sunnah/صحيح البخاري/البخاري-${toArabicDigits(hadithNumber)}.md`
      : app.workspace.getActiveFile()?.path || "";
    const hadithText = await readVaultFile(this.state.filePath);

    this.hadithLink = hadithNumber
      ? `[[البخاري-${hadithNumber}]]`
      : `[[${app.workspace.getActiveFile()?.name || ""}]]`;

    const prompt = await getPromptTemplate("ExtractNarratorsStep");

    return prompt.replace("{{HADITH_TEXT}}", hadithText);
  }

  async processResponse(response: string) {
    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (!codeBlockMatch) {
      return {
        response,
        isSuccessful: false,
      };
    }

    type HadithNarratorWithPotential = HadithNarrator & {
      potentialPeople?: {
        fullName: string;
        knownName: string;
        quizNames: string[];
      }[];
    };

    const hadithNarrators = JSON.parse(codeBlockMatch[1]) as HadithNarratorWithPotential[];

    const narratorList: string[] = [];
    for (const narrator of hadithNarrators) {
      if (narrator.potentialPeople?.length !== 1) {
        return {
          response:
            `لم أتمكن من تحديد راوٍ واحد بشكل قاطع للاسم **${narrator.name}**.` + "\n\n" + response,
          isSuccessful: false,
        };
      }
      narrator.expectedFullName = narrator.potentialPeople[0].fullName;
      narrator.expectedKnownName = narrator.potentialPeople[0].knownName;
      narrator.quizChoices = narrator.potentialPeople[0].quizNames;
      delete narrator.potentialPeople;

      narratorList.push(`- **${narrator.name}**: ${narrator.expectedKnownName}`);
    }

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
