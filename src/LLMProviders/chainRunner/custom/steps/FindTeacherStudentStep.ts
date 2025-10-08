import { StepRunner } from "../base/StepRunner";
import { TraceNarratorsWorkflowState } from "../models/state";
import {
  getPromptTemplate,
  readVaultFile,
  findStudents,
  updateStudents,
  updateVaultFile,
  extractJsonCodeBlock,
} from "../utils";
import {
  BOOKS,
  MSG_FOUND_NARRATOR,
  MSG_FOUND_NARRATOR_SELF,
  formatMessage,
} from "../utils/formatUtils";

export class FindTeacherStudentStep extends StepRunner<TraceNarratorsWorkflowState> {
  private narratorsToSearch: { id: number; name: string }[] = [];

  getContextIntroMessage(): string {
    const nextNarrator = this.state.hadithNarrators[this.state.hadithNarratorIndex + 1];
    return nextNarrator
      ? `جاري البحث عن **${nextNarrator.expectedKnownName}** فيمن رووا عن **${this.state.hadithNarrators[this.state.hadithNarratorIndex].expectedKnownName}** في  صحيح البخاري`
      : "";
  }

  async getUserPrompt(): Promise<string> {
    const currentNarrator =
      this.state.allNarrators[
        this.state.hadithNarrators[this.state.hadithNarratorIndex].indexInAllNarrators!
      ];
    const nextNarrator =
      this.state.allNarrators[
        this.state.hadithNarrators[this.state.hadithNarratorIndex + 1].indexInAllNarrators!
      ];
    const narratorBio = await readVaultFile(`NewFigures/${currentNarrator.name}.md`);
    const students = findStudents(narratorBio, BOOKS[0].name);
    if (students.includes(nextNarrator.name)) {
      return "";
    }
    this.narratorsToSearch =
      (students as string[]).map((student: string, index: number) => ({
        id: index,
        name: student,
      })) || [];
    const promptTemplate = await getPromptTemplate("FindNarratorInList");
    return promptTemplate
      .replaceAll(
        "{{name_to_search}}",
        this.state.hadithNarrators[this.state.hadithNarratorIndex + 1].expectedFullName
      )
      .replaceAll("{{JSON}}", JSON.stringify(this.narratorsToSearch, null, 2));
  }

  async processResponse(response: string) {
    if (response === "") {
      return {
        response: formatMessage(MSG_FOUND_NARRATOR_SELF, {
          narrator:
            this.state.hadithNarrators[this.state.hadithNarratorIndex + 1].expectedKnownName,
          teacher: this.state.hadithNarrators[this.state.hadithNarratorIndex].expectedKnownName,
        }),
        isSuccessful: true,
      };
    }
    const parsed =
      extractJsonCodeBlock<{ id: number; name: string; confidence: string }[]>(response);
    if (parsed) {
      const result = parsed.filter((r) => r.confidence === "High");
      if (result.length === 1) {
        const student = this.narratorsToSearch[result[0].id];
        if (student) {
          const hadithNarrator = this.state.hadithNarrators[this.state.hadithNarratorIndex];
          const currentNarrator = this.state.allNarrators[hadithNarrator.indexInAllNarrators!];
          const nextNarrator =
            this.state.allNarrators[
              this.state.hadithNarrators[this.state.hadithNarratorIndex + 1].indexInAllNarrators!
            ];
          const filePath = `NewFigures/${currentNarrator.name}.md`;
          const narratorBio = await readVaultFile(filePath);
          const updateBio = updateStudents(narratorBio, student.name, nextNarrator.name);
          await updateVaultFile(filePath, updateBio);
          return {
            response: formatMessage(MSG_FOUND_NARRATOR, {
              student: student.name,
              teacher: hadithNarrator.expectedKnownName,
            }),
            isSuccessful: true,
          };
        }
      }
    }
    return {
      response,
      isSuccessful: false,
    };
  }
}
