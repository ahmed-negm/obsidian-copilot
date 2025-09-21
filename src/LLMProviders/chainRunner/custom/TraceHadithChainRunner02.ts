import ChainManager from "@/LLMProviders/chainManager";
import { BaseSimpleChainRunner, SystemMessage } from "./BaseSimpleChainRunner";
import { TraceHadithChainRunner03 } from "./TraceHadithChainRunner03";
import { HadithNarrator, NarratorInfo, readVaultFile } from "./utils";

export interface TraceHadithChainRunner02Input {
  allNarrators: NarratorInfo[];
  hadithNarrators: HadithNarrator[];
}

export class TraceHadithChainRunner02 extends BaseSimpleChainRunner {
  constructor(
    chainManager: ChainManager,
    private input: TraceHadithChainRunner02Input
  ) {
    super(chainManager);
  }

  async formatInput(_messages: SystemMessage[]) {
    const jsonString = await readVaultFile("_extras/Data/Tahdhib.json");
    this.input.allNarrators = JSON.parse(jsonString);
    return [{ role: "user", content: "Hello" }];
  }

  async formatOutput(_response: string) {
    this.succeeded = true;
    return `
يبدو أن **${this.input.hadithNarrators[0].name}** هو **${this.input.hadithNarrators[0].potentialFullNames[0]}**.
جاري البحث عنه في تهذيب الكمال ...
`;
  }

  includeChatHistory() {
    return false;
  }

  nextStep() {
    return new TraceHadithChainRunner03(this.chainManager, {
      ...this.input,
      hadithNarratorIndex: 0,
    });
  }
}
