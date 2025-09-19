import ChainManager from "@/LLMProviders/chainManager";
import { BaseSimpleChainRunner, SystemMessage } from "./BaseSimpleChainRunner";
import { Narrator } from "./TraceHadithChainRunner01";

export class TraceHadithChainRunner02 extends BaseSimpleChainRunner {
  constructor(
    chainManager: ChainManager,
    private narrators: Narrator[]
  ) {
    super(chainManager);
  }

  async formatInput(_messages: SystemMessage[]): Promise<SystemMessage[]> {
    return [{ role: "user", content: "Hello" }];
  }

  formatOutput(_response: string): string {
    return `
يبدو أن **${this.narrators[0].name}** هو **${this.narrators[0].potentialFullNames[0]}**.
جاري البحث عنه في تهذيب الكمال ...
`;
  }
}
