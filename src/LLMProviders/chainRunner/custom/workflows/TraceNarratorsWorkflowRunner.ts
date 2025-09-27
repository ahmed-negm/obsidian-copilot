import { WorkflowRunner } from "./../base/WorkflowRunner";
import ChainManager from "@/LLMProviders/chainManager";
import { ExtractNarratorsStep } from "../steps/ExtractNarratorsStep";
import { TraceNarratorsWorkflowState } from "../models/State";
import { readVaultFile, setScore } from "../utils";
import { ChoiceSuggestModal } from "../ui/ChoiceSuggestModal";

export class TraceNarratorsWorkflowRunner extends WorkflowRunner<TraceNarratorsWorkflowState> {
  constructor(chainManager: ChainManager) {
    super(chainManager, { args: "", hadithNarrators: [], allNarrators: [] });
    this.loadNarratorsData();
  }

  protected registerSteps() {
    const step1 = new ExtractNarratorsStep(this.state, {
      preRender: this.showQuiz.bind(this),
    });
    return [step1];
  }

  private async loadNarratorsData(): Promise<void> {
    const jsonString = await readVaultFile("_extras/Data/Tahdhib.json");
    this.state.allNarrators = JSON.parse(jsonString);
  }

  private async showQuiz() {
    for (const narrator of this.state.hadithNarrators) {
      if (narrator.name.split(" ").length > 2) {
        continue;
      }

      const potentialPerson = narrator.potentialPeople[0];
      const choices = [
        potentialPerson.knownName,
        potentialPerson.quizNames[0],
        potentialPerson.quizNames[1],
      ].sort(() => Math.random() - 0.5);

      const choice = await new ChoiceSuggestModal(
        app,
        `من هو ${narrator.name}؟`,
        choices
      ).openAndWait();

      const isCorrect = choice === potentialPerson.knownName;

      await setScore(isCorrect);
    }
  }
}
