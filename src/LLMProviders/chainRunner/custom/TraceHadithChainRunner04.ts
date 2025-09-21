import ChainManager from "@/LLMProviders/chainManager";
import { BaseSimpleChainRunner, SystemMessage } from "./BaseSimpleChainRunner";
import { TraceHadithChainRunner03Input } from "./TraceHadithChainRunner03";
import { getShamelaContent } from "./shamelaHelper";

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
    const shamelaContent = await getShamelaContent(
      this.input.allNarrators[this.input.allNarratorIndex].shamelaIndex,
      this.input.allNarrators[this.input.allNarratorIndex + 1].shamelaIndex
    );
    return [
      messages[0],
      {
        role: "user",
        content: `Please summerize the following bio for ${this.input.allNarrators[this.input.allNarratorIndex].name} from تهذيب الكمال :\n\n${shamelaContent}`,
      },
    ];
  }

  async formatOutput(response: string) {
    return response;
  }

  includeChatHistory() {
    return false;
  }
}
