import { WorkflowRunner } from "./../base/WorkflowRunner";
import ChainManager from "@/LLMProviders/chainManager";
import { TraceNarratorsWorkflowState } from "../models/state";
import { readVaultFile, setScore, updateVaultFile } from "../utils";
import { ChoiceSuggestModal } from "../ui/ChoiceSuggestModal";

export abstract class TraceNarratorsWorkflowRunnerBase extends WorkflowRunner<TraceNarratorsWorkflowState> {
  constructor(chainManager: ChainManager, args: string) {
    super(chainManager, {
      args,
      hadithNarrators: [],
      allNarrators: [],
      tahdibNarrators: [],
      hadithNarratorIndex: 0,
      filePath: "",
    });
    this.loadNarratorsData();
  }

  protected async loadNarratorsData(): Promise<void> {
    const jsonString = await readVaultFile("_extras/Data/Tahdhib.json");
    this.state.allNarrators = JSON.parse(jsonString);
  }

  protected async showQuiz(): Promise<void> {
    await this.showNarratorQuiz();
    this.showChainQuiz();
  }

  protected async showNarratorQuiz() {
    for (const narrator of this.state.hadithNarrators.slice().reverse()) {
      if (narrator.name.split(" ").length > 2) {
        continue;
      }

      const choices = [
        narrator.expectedKnownName,
        narrator.quizChoices[0],
        narrator.quizChoices[1],
      ].sort(() => Math.random() - 0.5);

      const choice = await ChoiceSuggestModal.open(
        app,
        `من هو ${narrator.name}؟`,
        choices,
        "bottom",
        false
      );

      const isCorrect = choice === narrator.expectedKnownName;

      await setScore(isCorrect, narrator.expectedKnownName);
    }
  }

  protected async showChainQuiz(): Promise<void> {
    await ChoiceSuggestModal.open(
      app,
      "الآن، سنختبر معرفتك بسلسلة الرواة. اختر الشخص الذي يلي كل راوٍ في السلسلة.",
      ["ابدأ الاختبار"],
      "bottom",
      false
    );
    const hadithNarrators = this.state.hadithNarrators.slice().reverse();
    for (let i = 0; i < hadithNarrators.length - 1; i++) {
      const hadithNarrator = hadithNarrators[i].expectedKnownName;
      const nextHadithNarrator = hadithNarrators[i + 1].expectedKnownName;

      // Generate choices
      const choices = [
        ...hadithNarrators
          .filter(
            (narrator) =>
              narrator.expectedKnownName !== hadithNarrator &&
              narrator.expectedKnownName !== nextHadithNarrator
          )
          .slice(0, 2)
          .map((narrator) => narrator.expectedKnownName),
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

  protected async linkHadithToNarrators() {
    let fileContent = await readVaultFile(this.state.filePath);

    for (const hadithNarrator of this.state.hadithNarrators) {
      if (hadithNarrator.indexInAllNarrators === undefined) {
        throw new Error("indexInAllNarrators is undefined");
      }
      const narrator = this.state.allNarrators[hadithNarrator.indexInAllNarrators];
      const linkToNote = `[[${narrator.name}|${hadithNarrator.name}]]`;
      fileContent = fileContent.replace(hadithNarrator.name, linkToNote);
    }

    await updateVaultFile(this.state.filePath, fileContent);
  }
}
