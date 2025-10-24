import { StepRunner } from "../base/StepRunner";
import { MSG_FOUND_STUDENT, MSG_NOT_FOUND_STUDENT, MSG_STUDENT_LOOKUP } from "../constants";
import { TraceNarratorsWorkflowState } from "../models/state";
import {
  populateTemplate,
  buildNarratorRelationshipContext,
  generateRelationshipSearchPrompt,
  extractSelectedNarrator,
  updateNarratorRelationship,
  NarratorRelationshipContext,
} from "../utils";

export class FindStudentStep extends StepRunner<TraceNarratorsWorkflowState> {
  private searchContext: NarratorRelationshipContext;

  getContextIntroMessage() {
    console.log(
      "!! " +
        populateTemplate(MSG_STUDENT_LOOKUP, {
          student: this.state.nextNarrator?.expectedKnownName,
          teacher: this.state.currentNarrator.expectedKnownName,
        })
    );

    if (!this.state.nextNarrator) {
      return "";
    }

    return populateTemplate(MSG_STUDENT_LOOKUP, {
      student: this.state.nextNarrator.expectedKnownName,
      teacher: this.state.currentNarrator.expectedKnownName,
    });
  }

  async getUserPrompt() {
    this.searchContext = await buildNarratorRelationshipContext(this.state, "student");

    // No prompt needed if student already exists in teacher's student list
    if (this.searchContext.relationsToSearch.length === 0) {
      return "";
    }

    return generateRelationshipSearchPrompt(this.searchContext);
  }

  async processResponse(response: string) {
    if (response === "") {
      return this.handleStudentAlreadyExists();
    }

    return this.handleStudentSelection(response);
  }

  private handleStudentAlreadyExists() {
    return {
      response: populateTemplate(MSG_FOUND_STUDENT, {
        student: this.searchContext.targetName,
        teacher: this.searchContext.currentName,
      }),
      isSuccessful: true,
    };
  }

  private async handleStudentSelection(response: string) {
    const notFoundResponse = {
      response:
        populateTemplate(MSG_NOT_FOUND_STUDENT, {
          student: `${this.searchContext.targetName} (${this.searchContext.targetFullName})`,
          teacher: `[[${this.searchContext.currentNarrator.name}]]`,
        }) + `\n\n${response}`,
      isSuccessful: false,
    };

    const selectedStudent = extractSelectedNarrator(response);
    if (!selectedStudent) {
      return notFoundResponse;
    }

    const studentFromList = this.searchContext.relationsToSearch[selectedStudent.id];
    if (!studentFromList) {
      return notFoundResponse;
    }

    await updateNarratorRelationship(this.searchContext, studentFromList.name);

    return {
      response: populateTemplate(MSG_FOUND_STUDENT, {
        student: studentFromList.name,
        teacher: this.searchContext.currentName,
      }),
      isSuccessful: true,
    };
  }
}
