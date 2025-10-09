import ChainManager from "@/LLMProviders/chainManager";
import { ChainRunner } from "../BaseChainRunner";
import { BaseSimpleChainRunner } from "./base/BaseSimpleChainRunner";
import { commands } from "./commands";

export class CustomChainRunnerManager {
  static getRunner(chainManager: ChainManager, originalMessage: string): ChainRunner {
    for (const command of commands) {
      if (originalMessage.startsWith(command.command)) {
        const args = originalMessage.slice(command.command.length).trim();
        return new command.workflow(chainManager, args);
      }
    }

    return new BaseSimpleChainRunner(chainManager);
  }
}
