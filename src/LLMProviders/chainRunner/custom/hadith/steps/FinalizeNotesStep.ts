import { SystemMessage } from "../../BaseSimpleChainRunner";
import { StepRunner } from "../../base/StepRunner";
import { HadithWorkflowState } from "../models/WorkflowState";
import { getTemplate } from "../../utils/promptUtils";
import { toArabicDigits } from "../../utils/formatUtils";
import { setScore } from "../../utils/scoreUtils";
import { ChoiceSuggestModal } from "../../ui/ChoiceSuggestModal";
import { Notice } from "obsidian";

/**
 * Final step to create notes and run quiz
 */
export class FinalizeNotesStep implements StepRunner<HadithWorkflowState> {
  /**
   * Format the input for the LLM
   * @param messages The messages to format
   * @param state The current workflow state
   * @returns The formatted messages
   */
  async formatInput(
    messages: SystemMessage[],
    state: HadithWorkflowState
  ): Promise<SystemMessage[]> {
    // Create notes for narrators
    await this.createNewNotes(state);

    // We don't need to send any message to the LLM for this step
    return [{ role: "user", content: "Hello" }];
  }

  /**
   * Process the LLM response
   * @param response The LLM response
   * @param state The current workflow state
   * @returns The result of the step
   */
  async run(
    response: string,
    state: HadithWorkflowState
  ): Promise<{
    output: string;
    nextState: HadithWorkflowState;
    isComplete: boolean;
  }> {
    const message = "تم الانتهاء من تتبع جميع الرواة! 🎉";

    // Show notification
    new Notice(message);

    // Run quiz
    await this.setupQuiz(state);

    return {
      output: message,
      nextState: state,
      isComplete: true,
    };
  }

  /**
   * Create new notes for narrators
   * @param state The current workflow state
   */
  private async createNewNotes(state: HadithWorkflowState): Promise<void> {
    for (const hadithNarrator of state.hadithNarrators) {
      if (hadithNarrator.indexInAllNarrators !== undefined) {
        const narrator = state.allNarrators[hadithNarrator.indexInAllNarrators];
        const fileName = narrator.name.replace(/[/\\?%*:|"<>]/g, "-");
        const filePath = `Figures/${fileName}.md`;
        const noteExists = app.vault.getAbstractFileByPath(filePath);

        if (!noteExists) {
          const noteContent = (await getTemplate("Mohadith"))
            .replaceAll("{{NAME}}", narrator.name)
            .replaceAll("{{KNOWN_NAME}}", hadithNarrator.potentialPeople[0].knownName)
            .replaceAll("{{PART}}", toArabicDigits(narrator.part))
            .replaceAll("{{PAGE}}", toArabicDigits(narrator.page))
            .replaceAll("{{SHAMELA_INDEX}}", narrator.shamelaIndex.toString())
            .replaceAll("{{TAHDHIB_ID}}", narrator.id?.toString() ?? "")
            .replaceAll("{{DATE}}", new Date().toISOString().slice(0, 10));

          await app.vault.create(filePath, noteContent).catch((err) => {
            console.error("Error creating note:", err);
          });
        }

        // Update links in the active file
        const activeFile = app.workspace.getActiveFile();
        if (activeFile) {
          const fileContent = await app.vault.read(activeFile);
          const linkToNote = `[[${fileName}|${hadithNarrator.name}]]`;
          const updatedContent = fileContent.replace(hadithNarrator.name, linkToNote);
          await app.vault.modify(activeFile, updatedContent);
        }
      }
    }
  }

  /**
   * Set up quiz for narrators
   * @param state The current workflow state
   */
  private async setupQuiz(state: HadithWorkflowState): Promise<void> {
    for (let i = 0; i < state.hadithNarrators.length - 1; i++) {
      const hadithNarrator = state.hadithNarrators[i].potentialPeople[0].knownName;
      const nextHadithNarrator = state.hadithNarrators[i + 1].potentialPeople[0].knownName;

      // Generate choices
      const choices = [
        ...state.hadithNarrators
          .filter(
            (n) =>
              n.potentialPeople[0].knownName !== hadithNarrator &&
              n.potentialPeople[0].knownName !== nextHadithNarrator
          )
          .slice(0, 2)
          .map((n) => n.potentialPeople[0].knownName),
        nextHadithNarrator,
      ].sort(() => Math.random() - 0.5);

      // Show quiz modal
      const choice = await new ChoiceSuggestModal(
        app,
        `روى ${hadithNarrator} هذا الحديث عن:`,
        choices
      ).openAndWait();

      // Update score
      await setScore(choice === nextHadithNarrator);
    }
  }
}
