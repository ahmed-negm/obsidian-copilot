import { Notice } from "obsidian";
import { StepRunner } from "../base/StepRunner";
import { TraceNarratorsWorkflowState } from "../models/State";
import { getTemplate, toArabicDigits, setScore } from "../utils";
import { ChoiceSuggestModal } from "../ui/ChoiceSuggestModal";

export class FinalizeNotesStep extends StepRunner<TraceNarratorsWorkflowState> {
  async getUserPrompt() {
    await this.createNewNotes(this.state);
    return "Hello";
  }

  async processResponse(_response: string) {
    const message = "تم الانتهاء من تتبع جميع الرواة! 🎉";

    new Notice(message);

    await this.setupQuiz(this.state);

    return {
      response: message,
      isSuccessful: true,
    };
  }

  private async createNewNotes(state: TraceNarratorsWorkflowState): Promise<void> {
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

  private async setupQuiz(state: TraceNarratorsWorkflowState): Promise<void> {
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
