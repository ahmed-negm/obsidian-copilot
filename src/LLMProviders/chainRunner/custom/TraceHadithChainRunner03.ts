import ChainManager from "@/LLMProviders/chainManager";
import { BaseSimpleChainRunner, SystemMessage } from "./BaseSimpleChainRunner";
import { Narrator } from "./TraceHadithChainRunner01";

export class TraceHadithChainRunner03 extends BaseSimpleChainRunner {
  constructor(
    chainManager: ChainManager,
    private narrators: Narrator[],
    private currentIndex: number = 0
  ) {
    super(chainManager);
  }

  async formatInput(_messages: SystemMessage[]): Promise<SystemMessage[]> {
    return [{ role: "user", content: "Hello" }];
  }

  formatOutput(_response: string): string {
    return "";
  }

  includeChatHistory(): boolean {
    return false;
  }
}
