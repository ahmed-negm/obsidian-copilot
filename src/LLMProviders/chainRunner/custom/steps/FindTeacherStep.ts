import { StepRunner } from "../base/StepRunner";
import { MSG_FOUND_TEACHER, MSG_NOT_FOUND_TEACHER, MSG_TEACHER_LOOKUP } from "../constants";
import { TraceNarratorsWorkflowState } from "../models/state";
import {
  populateTemplate,
  buildNarratorRelationshipContext,
  generateRelationshipSearchPrompt,
  extractSelectedNarrator,
  updateNarratorRelationship,
  NarratorRelationshipContext,
} from "../utils";

/**
 * FindTeacherStep performs the reverse operation of FindStudentStep.
 * It searches for a teacher (previous narrator) in the current narrator's teacher list,
 * establishing the teaching relationship from the perspective of the student.
 */
export class FindTeacherStep extends StepRunner<TraceNarratorsWorkflowState> {
  private searchContext: NarratorRelationshipContext;

  getContextIntroMessage() {
    console.log(
      "$$ " +
        populateTemplate(MSG_TEACHER_LOOKUP, {
          teacher: this.state.previousNarrator?.expectedKnownName,
          student: this.state.currentNarrator.expectedKnownName,
        })
    );

    if (!this.state.previousNarrator) {
      return "";
    }

    return populateTemplate(MSG_TEACHER_LOOKUP, {
      teacher: this.state.previousNarrator.expectedKnownName,
      student: this.state.currentNarrator.expectedKnownName,
    });
  }

  async getUserPrompt() {
    // Skip teacher search for the first narrator in a chain (no previous narrator)
    if (!this.state.hasPreviousNarrator) {
      return "";
    }

    this.searchContext = await buildNarratorRelationshipContext(this.state, "teacher");

    console.log(">> Teacher getUserPrompt", { searchContext: this.searchContext });

    // No prompt needed if teacher already exists in student's teacher list
    if (this.searchContext.relationsToSearch.length === 0) {
      return "";
    }

    return generateRelationshipSearchPrompt(this.searchContext);
  }

  async processResponse(response: string) {
    console.log(">> Teacher processResponse", { response });
    // Handle case where there's no previous narrator (first narrator in chain)
    if (!this.state.hasPreviousNarrator) {
      return {
        response: "", // No message needed for skipped teacher search
        isSuccessful: true,
      };
    }

    if (response === "") {
      return this.handleTeacherAlreadyExists();
    }

    return this.handleTeacherSelection(response);
  }

  private handleTeacherAlreadyExists() {
    return {
      response: populateTemplate(MSG_FOUND_TEACHER, {
        teacher: this.searchContext.targetName,
        student: this.searchContext.currentName,
      }),
      isSuccessful: true,
    };
  }

  private async handleTeacherSelection(response: string) {
    const notFoundResponse = {
      response:
        populateTemplate(MSG_NOT_FOUND_TEACHER, {
          teacher: `${this.searchContext.targetName} (${this.searchContext.targetFullName})`,
          student: `[[${this.searchContext.currentNarrator.name}]]`,
        }) + `\n\n${response}`,
      isSuccessful: false,
    };

    const selectedTeacher = extractSelectedNarrator(response);
    if (!selectedTeacher) {
      return notFoundResponse;
    }

    const teacherFromList = this.searchContext.relationsToSearch[selectedTeacher.id];
    if (!teacherFromList) {
      return notFoundResponse;
    }

    console.log(">> handleTeacherSelection", {
      relationsToSearch: this.searchContext.relationsToSearch,
      selectedTeacher,
      teacherFromList,
    });

    await updateNarratorRelationship(this.searchContext, teacherFromList.name);

    return {
      response: populateTemplate(MSG_FOUND_TEACHER, {
        teacher: teacherFromList.name,
        student: this.searchContext.currentName,
      }),
      isSuccessful: true,
    };
  }
}
