import { StepRunner } from "../base/StepRunner";
import { BOOKS, MSG_FOUND_STUDENT, MSG_STUDENT_TEACHER_LOOKUP, PATHS } from "../constants";
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
    const nextNarrator = this.getNextHadithNarrator();
    if (!nextNarrator) {
      return "";
    }

    const currentNarrator = this.getCurrentHadithNarrator();
    return populateTemplate(MSG_STUDENT_TEACHER_LOOKUP, {
      student: nextNarrator.expectedKnownName,
      teacher: currentNarrator.expectedKnownName,
    });
  }

  async getUserPrompt() {
    this.searchContext = await this.buildTeacherStudentContext();

    // No prompt needed if student already exists in teacher's student list
    if (this.searchContext.studentsToSearch.length === 0) {
      return "";
    }

    return this.generateStudentSearchPrompt(this.searchContext);
  }

  async processResponse(response: string) {
    if (response === "") {
      return this.handleStudentAlreadyExists();
    }

    return this.handleStudentSelection(response);
  }

  private getCurrentHadithNarrator() {
    return this.state.hadithNarrators[this.state.hadithNarratorIndex];
  }

  private getNextHadithNarrator() {
    return this.state.hadithNarrators[this.state.hadithNarratorIndex + 1];
  }

  private async buildTeacherStudentContext(): Promise<TeacherStudentContext> {
    const currentHadithNarrator = this.getCurrentHadithNarrator();
    const nextHadithNarrator = this.getNextHadithNarrator();

    if (!currentHadithNarrator?.indexInAllNarrators || !nextHadithNarrator?.indexInAllNarrators) {
      throw new Error("Narrator indices not found in all narrators");
    }

    const currentNarrator = this.state.allNarrators[currentHadithNarrator.indexInAllNarrators];
    const nextNarrator = this.state.allNarrators[nextHadithNarrator.indexInAllNarrators];

    const narratorBio = await readVaultFile(`${PATHS.FIGURES}/${currentNarrator.name}.md`);
    const existingStudents = findStudents(narratorBio, BOOKS[0].name);

    const studentsToSearch = existingStudents.includes(nextNarrator.name)
      ? []
      : existingStudents.map((student: string, index: number) => ({
          id: index,
          name: student,
        }));

    return {
      currentNarrator,
      nextNarrator,
      teacherName: currentHadithNarrator.expectedKnownName,
      studentName: nextHadithNarrator.expectedKnownName,
      studentFullName: nextHadithNarrator.expectedFullName,
      studentsToSearch,
    };
  }

  private async generateStudentSearchPrompt(context: TeacherStudentContext): Promise<string> {
    const promptTemplate = await getPromptTemplate("FindNarratorInList");

    return populateTemplate(promptTemplate, {
      name_to_search: context.studentFullName,
      JSON: JSON.stringify(context.studentsToSearch, null, 2),
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
    const selectedStudent = this.extractSelectedStudentFromResponse(response);

    if (!selectedStudent) {
      return {
        response,
        isSuccessful: false,
      };
    }

    const studentFromList = this.searchContext.studentsToSearch[selectedStudent.id];

    if (!studentFromList) {
      return {
        response,
        isSuccessful: false,
      };
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
