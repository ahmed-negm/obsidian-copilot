import ChainManager from "@/LLMProviders/chainManager";
import { BaseSimpleChainRunner, SystemMessage } from "./BaseSimpleChainRunner";
import { TraceHadithChainRunner03Input } from "./TraceHadithChainRunner03";

export interface TraceHadithChainRunner04Input extends TraceHadithChainRunner03Input {
  allNarratorIndex: number;
}

export class TraceHadithChainRunner04 extends BaseSimpleChainRunner {
  constructor(
    chainManager: ChainManager,
    private input: TraceHadithChainRunner04Input
  ) {
    super(chainManager);
  }

  async formatInput(messages: SystemMessage[]) {
    return [
      { role: "user", content: `What do you think about number ${this.input.allNarratorIndex}?` },
    ];
  }

  async formatOutput(response: string) {
    return response;
  }

  includeChatHistory() {
    return false;
  }
}
