import { StepRunner } from "../base/StepRunner";
import {
  BOOKS,
  MSG_FOUND_STUDENT,
  MSG_NARRATOR_NOT_FOUND,
  MSG_STUDENT_TEACHER_LOOKUP,
  PATHS,
} from "../constants";
import { TraceNarratorsWorkflowState } from "../models/state";
import { NarratorInfo } from "../models/narrator";
import {
  getPromptTemplate,
  readVaultFile,
  findStudents,
  updateStudents,
  updateVaultFile,
  extractJsonCodeBlock,
  populateTemplate,
  getAIKnowledge,
} from "../utils";
import { HIGH_CONFIDENCE, LLMNarratorResponse } from "./FindNarratorInTahdibIndexStep";

interface TeacherStudentContext {
  currentNarrator: NarratorInfo;
  nextNarrator: NarratorInfo;
  teacherName: string;
  studentName: string;
  studentFullName: string;
  studentsToSearch: Array<{ id: number; name: string }>;
}

export class FindTeacherStudentStep extends StepRunner<TraceNarratorsWorkflowState> {
  private searchContext: TeacherStudentContext;

  getContextIntroMessage() {
    if (!this.state.nextNarrator) {
      return "";
    }

    return populateTemplate(MSG_STUDENT_TEACHER_LOOKUP, {
      student: this.state.nextNarrator.expectedKnownName,
      teacher: this.state.currentNarrator.expectedKnownName,
    });
  }

  async getUserPrompt() {
    this.searchContext = await this.buildTeacherStudentContext();

    // No prompt needed if student already exists in teacher's student list
    if (this.searchContext.studentsToSearch.length === 0) {
      return "";
    }

    return this.generateStudentSearchPrompt();
  }

  async processResponse(response: string) {
    if (response === "") {
      return this.handleStudentAlreadyExists();
    }

    return this.handleStudentSelection(response);
  }

  private async buildTeacherStudentContext(): Promise<TeacherStudentContext> {
    if (
      !this.state.currentNarrator?.indexInAllNarrators ||
      !this.state.nextNarrator?.indexInAllNarrators
    ) {
      throw new Error("Narrator indices not found in all narrators");
    }

    const narratorBio = await readVaultFile(
      `${PATHS.FIGURES}/${this.state.currentNarratorInfo.name}.md`
    );
    const existingStudents = findStudents(narratorBio, BOOKS[0].name);

    const studentsToSearch = existingStudents.includes(this.state.nextNarratorInfo.name)
      ? []
      : existingStudents.map((student: string, index: number) => ({
          id: index,
          name: student,
        }));

    return {
      currentNarrator: this.state.currentNarratorInfo,
      nextNarrator: this.state.nextNarratorInfo,
      teacherName: this.state.currentNarrator.expectedKnownName,
      studentName: this.state.nextNarrator.expectedKnownName,
      studentFullName: this.state.nextNarrator.expectedFullName,
      studentsToSearch,
    };
  }

  private async generateStudentSearchPrompt(): Promise<string> {
    const promptTemplate = await getPromptTemplate("FindNarratorInList");

    return populateTemplate(promptTemplate, {
      name_to_search: this.searchContext.studentFullName,
      JSON: JSON.stringify(this.searchContext.studentsToSearch, null, 2),
      KNOWLEDGE: await getAIKnowledge(BOOKS[0].name),
    });
  }

  private handleStudentAlreadyExists() {
    return {
      response: populateTemplate(MSG_FOUND_STUDENT, {
        student: this.searchContext.studentName,
        teacher: this.searchContext.teacherName,
      }),
      isSuccessful: true,
    };
  }

  private async handleStudentSelection(response: string) {
    const notFoundResponse = {
      response:
        populateTemplate(MSG_NARRATOR_NOT_FOUND, { narrator: this.searchContext.studentName }) +
        this.getContextInfo() +
        `\n\nResponse:${response}`,
      isSuccessful: false,
    };

    const selectedStudent = this.extractSelectedStudentFromResponse(response);
    if (!selectedStudent) {
      return notFoundResponse;
    }

    const studentFromList = this.searchContext.studentsToSearch[selectedStudent.id];
    if (!studentFromList) {
      return notFoundResponse;
    }

    await this.updateTeacherBiography(studentFromList.name);

    return {
      response: populateTemplate(MSG_FOUND_STUDENT, {
        student: studentFromList.name,
        teacher: this.searchContext.teacherName,
      }),
      isSuccessful: true,
    };
  }

  private getContextInfo() {
    const context = {
      name_to_search: this.searchContext.studentFullName,
      JSON: this.searchContext.studentsToSearch,
    };
    return `\n\nContext: \`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\``;
  }

  private extractSelectedStudentFromResponse(response: string) {
    const parsed = extractJsonCodeBlock<LLMNarratorResponse[]>(response);

    if (!parsed || !Array.isArray(parsed)) {
      return null;
    }

    return parsed.find((result) => result.confidence === HIGH_CONFIDENCE) || null;
  }

  private async updateTeacherBiography(selectedStudentName: string): Promise<void> {
    const filePath = `${PATHS.FIGURES}/${this.searchContext.currentNarrator.name}.md`;
    const narratorBio = await readVaultFile(filePath);
    const updatedBio = updateStudents(
      narratorBio,
      selectedStudentName,
      this.searchContext.nextNarrator.name
    );

    await updateVaultFile(filePath, updatedBio);
  }
}
