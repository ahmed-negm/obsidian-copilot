import { WorkflowRunner } from "./../base/WorkflowRunner";
import ChainManager from "@/LLMProviders/chainManager";
import { ExtractNarratorsStep } from "../steps/ExtractNarratorsStep";
import { TraceNarratorsWorkflowState } from "../models/State";
import { readVaultFile } from "../utils";

export class TraceNarratorsWorkflowRunner extends WorkflowRunner<TraceNarratorsWorkflowState> {
  constructor(chainManager: ChainManager) {
    super(chainManager, { args: "", hadithNarrators: [], allNarrators: [] });
    this.loadNarratorsData();
  }

  protected registerSteps() {
    return [new ExtractNarratorsStep(this.state)];
  }

  private async loadNarratorsData(): Promise<void> {
    const jsonString = await readVaultFile("_extras/Data/Tahdhib.json");
    this.state.allNarrators = JSON.parse(jsonString);
  }
}
