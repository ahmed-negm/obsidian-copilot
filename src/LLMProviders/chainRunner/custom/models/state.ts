import { logError } from "@/logger";
import { HadithNarrator, NarratorInfo } from "./narrator";

export class BaseState {
  constructor(public args?: string) {}
}

interface Chain {
  narrators: HadithNarrator[];
  narratorIndex: number;
}

export class TraceNarratorsWorkflowState extends BaseState {
  filePath: string = "";
  allNarrators: NarratorInfo[] = [];

  private chains: Chain[] = [];
  private chainIndex: number = 0;

  resetForNewHadith() {
    this.resetChainIndex();
    this.resetNarratorIndex();
    this.chains = [];
  }

  get currentChain() {
    return this.chains[this.chainIndex];
  }

  get narratorNames() {
    return this.chains.map((c) =>
      c.narrators.map((n) => ({ name: this.allNarrators[n.indexInAllNarrators!].name }))
    );
  }

  get chainsCount() {
    return this.chains.length;
  }

  get narratorIndex() {
    return this.currentChain?.narratorIndex ?? 0;
  }

  get narratorsCount() {
    return this.currentChain?.narrators.length ?? 0;
  }

  get currentNarrator() {
    return this.currentChain?.narrators[this.narratorIndex];
  }

  get currentNarratorInfo() {
    if (!this.currentNarrator?.indexInAllNarrators) {
      logError("Current narrator indexInAllNarrators is undefined", this.currentChain);
      throw new Error("Current narrator indexInAllNarrators is undefined");
    }
    return this.allNarrators[this.currentNarrator?.indexInAllNarrators ?? -1];
  }

  get nextNarratorInfo() {
    return this.allNarrators[this.nextNarrator?.indexInAllNarrators ?? -1];
  }

  get nextNarrator() {
    return this.currentChain?.narrators[this.narratorIndex + 1];
  }
  get hasNextNarrator() {
    return this.narratorIndex < this.narratorsCount - 1;
  }

  get currentChainNarrators() {
    return this.currentChain?.narrators ?? [];
  }

  get hasNextChain() {
    return this.chainIndex < this.chains.length - 1;
  }

  addChain(narrators: HadithNarrator[]) {
    this.chains.push({ narrators, narratorIndex: 0 });
  }

  moveToNextChain() {
    if (this.chainIndex < this.chains.length - 1) {
      this.chainIndex++;
      this.resetNarratorIndex();
    }
  }

  moveToNextNarrator() {
    if (this.narratorIndex < this.narratorsCount - 1) {
      this.currentChain.narratorIndex++;
    }
  }

  resetChainIndex() {
    this.chainIndex = 0;
  }
  resetNarratorIndex() {
    this.currentChain.narratorIndex = 0;
  }
}
