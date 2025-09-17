import ChainManager from "@/LLMProviders/chainManager";
import { ChainRunner } from "../BaseChainRunner";
import { ExplainChainRunner } from "./ExplainChainRunner";
import { BaseSimpleChainRunner } from "./BaseSimpleChainRunner";

export class CustomChainRunnerManager {
  static getRunner(chainManager: ChainManager, originalMessage: string): ChainRunner {
    if (originalMessage.startsWith("@Explain")) {
      return new ExplainChainRunner(chainManager);
    }

    return new BaseSimpleChainRunner(chainManager);
  }
}
