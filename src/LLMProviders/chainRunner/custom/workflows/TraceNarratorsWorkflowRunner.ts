import { WorkflowRunner } from "./../base/WorkflowRunner";
import ChainManager from "@/LLMProviders/chainManager";
import { ExtractNarratorsStep } from "../steps/ExtractNarratorsStep";
import { TraceNarratorsWorkflowState } from "../models/state";
import { getTemplate, readVaultFile, setScore, toArabicDigits } from "../utils";
import { ChoiceSuggestModal } from "../ui/ChoiceSuggestModal";
import { VerifyNarratorsStep } from "../steps/VerifyNarratorsStep";
import { LoadTahdibStep } from "../steps/LoadTahdibStep";
import { FindSymbolsStep } from "../steps/FindSymbolsStep";

export class TraceNarratorsWorkflowRunner extends WorkflowRunner<TraceNarratorsWorkflowState> {
  constructor(chainManager: ChainManager) {
    super(chainManager, {
      args: "",
      hadithNarrators: [],
      allNarrators: [],
      tahdibNarrators: [],
      hadithNarratorIndex: 0,
    });
    this.loadNarratorsData();
  }

  protected registerSteps() {
    const step1 = new ExtractNarratorsStep(this.state, {
      onComplete: this.showInitialQuiz.bind(this),
    });

    const step2 = new VerifyNarratorsStep(this.state, {
      onComplete: async () => {
        if (this.state.hadithNarratorIndex === this.state.hadithNarrators.length - 1) {
          this.currentStepIndex = 4;
          await this.createNewNotes();
          await this.showFinishQuiz();
        }
        return Promise.resolve();
      },
    });

    const step3 = new LoadTahdibStep(this.state);

    const step4 = new FindSymbolsStep(this.state, {
      onComplete: () => {
        this.state.hadithNarratorIndex++;
        if (this.state.hadithNarratorIndex < this.state.hadithNarrators.length) {
          this.currentStepIndex = 0;
        }
        return Promise.resolve();
      },
    });

    return [step1, step2, step3, step4];
  }

  private async loadNarratorsData(): Promise<void> {
    const jsonString = await readVaultFile("_extras/Data/Tahdhib.json");
    this.state.allNarrators = JSON.parse(jsonString);
  }

  private async showInitialQuiz() {
    for (const narrator of this.state.hadithNarrators.slice().reverse()) {
      if (narrator.name.split(" ").length > 2) {
        continue;
      }

      const potentialPerson = narrator.potentialPeople[0];
      const choices = [
        potentialPerson.knownName,
        potentialPerson.quizNames[0],
        potentialPerson.quizNames[1],
      ].sort(() => Math.random() - 0.5);

      const choice = await ChoiceSuggestModal.open(
        app,
        `من هو ${narrator.name}؟`,
        choices,
        "bottom",
        false
      );

      const isCorrect = choice === potentialPerson.knownName;

      await setScore(isCorrect, potentialPerson.knownName);
    }
  }

  private async createNewNotes() {
    for (const hadithNarrator of this.state.hadithNarrators) {
      if (hadithNarrator.indexInAllNarrators !== undefined) {
        const narrator = this.state.allNarrators[hadithNarrator.indexInAllNarrators];
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

  private async showFinishQuiz(): Promise<void> {
    const hadithNarrators = this.state.hadithNarrators.slice().reverse();
    for (let i = 0; i < hadithNarrators.length - 1; i++) {
      const hadithNarrator = hadithNarrators[i].potentialPeople[0].knownName;
      const nextHadithNarrator = hadithNarrators[i + 1].potentialPeople[0].knownName;

      // Generate choices
      const choices = [
        ...hadithNarrators
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
      const choice = await ChoiceSuggestModal.open(
        app,
        `روى ${hadithNarrator} هذا الحديث عن:`,
        choices,
        "bottom",
        true
      );

      // Update score
      await setScore(choice === nextHadithNarrator, nextHadithNarrator);
    }
  }
}
