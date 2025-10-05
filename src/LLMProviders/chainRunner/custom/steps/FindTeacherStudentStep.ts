import { StepRunner } from "../base/StepRunner";
import { TraceNarratorsWorkflowState } from "../models/state";
import { getPromptTemplate, readVaultFile, findStudents } from "../utils";

export class FindTeacherStudentStep extends StepRunner<TraceNarratorsWorkflowState> {
  narratorsToSearch: {
    id: number;
    name: string;
  }[] = [];

  getContextIntroMessage() {
    return (
      `جاري البحث عن **${this.state.hadithNarrators[this.state.hadithNarratorIndex + 1].expectedKnownName}** فيمن رووا عن **${this.state.hadithNarrators[this.state.hadithNarratorIndex].expectedKnownName}** في  ` +
      "صحيح البخاري"
    );
  }

  async getUserPrompt() {
    const currentNarrator =
      this.state.allNarrators[
        this.state.hadithNarrators[this.state.hadithNarratorIndex].indexInAllNarrators!
      ];

    const narratorBio = await readVaultFile(`NewFigures/${currentNarrator.name}.md`);

    const students = findStudents(narratorBio, "البخاري");

    // Prepare narrators to search in
    this.narratorsToSearch =
      students.map((narrator, index) => ({
        id: index,
        name: narrator,
      })) || [];

    const promptTemplate = await getPromptTemplate("FindNarratorInList");
    const prompt = promptTemplate
      .replaceAll(
        "{{name_to_search}}",
        this.state.hadithNarrators[this.state.hadithNarratorIndex + 1].expectedFullName
      )
      .replaceAll("{{JSON}}", JSON.stringify(this.narratorsToSearch, null, 2));

    return prompt;
  }

  async processResponse(response: string) {
    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      const result = (
        JSON.parse(codeBlockMatch[1]) as {
          id: number;
          name: string;
          confidence: string;
        }[]
      ).filter((r) => r.confidence === "High");

      if (result.length === 1) {
        const student = this.narratorsToSearch[result[0].id];

        if (student) {
          const output =
            `✅ تم العثور على **${student.name}** فيمن رووا عن **${this.state.hadithNarrators[this.state.hadithNarratorIndex].expectedKnownName}** في  ` +
            "صحيح البخاري";

          return {
            response: output,
            isSuccessful: true,
          };
        }
      }
    }

    return {
      response: response,
      isSuccessful: false,
    };
  }
}
