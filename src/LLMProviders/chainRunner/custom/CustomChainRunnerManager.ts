import ChainManager from "@/LLMProviders/chainManager";
import { ChainRunner } from "../BaseChainRunner";
import { ExplainChainRunner } from "./ExplainChainRunner";
import { BaseSimpleChainRunner } from "./BaseSimpleChainRunner";
import { ListNarratorsChainRunner } from "./ListNarratorsChainRunner";
import { TraceHadithChainRunner01 } from "./TraceHadithChainRunner01";

export class CustomChainRunnerManager {
  static getRunner(chainManager: ChainManager, originalMessage: string): ChainRunner {
    if (originalMessage.startsWith(ExplainChainRunner.trigger)) {
      return new ExplainChainRunner(chainManager);
    }

    if (originalMessage.startsWith(ListNarratorsChainRunner.trigger)) {
      return new ListNarratorsChainRunner(chainManager);
    }

    if (originalMessage.startsWith(TraceHadithChainRunner01.trigger)) {
      return new TraceHadithChainRunner01(chainManager);
    }

    return new BaseSimpleChainRunner(chainManager);
  }
}
