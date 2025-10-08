import ChainManager from "@/LLMProviders/chainManager";
import { ChainRunner } from "../BaseChainRunner";
import { BaseSimpleChainRunner } from "./base/BaseSimpleChainRunner";
import { commands } from "./commands";
import { Notice } from "obsidian";

export class CustomChainRunnerManager {
  static getRunner(chainManager: ChainManager, originalMessage: string): ChainRunner {
    if (!originalMessage || !chainManager) {
      console.warn("Invalid inputs to CustomChainRunnerManager.getRunner");
      return new BaseSimpleChainRunner(chainManager);
    }

    try {
      for (const command of commands) {
        if (originalMessage.startsWith(command.command)) {
          const args = originalMessage.slice(command.command.length).trim();
          return new command.workflow(chainManager, args);
        }
      }
      return new BaseSimpleChainRunner(chainManager);
    } catch (error) {
      console.error("Error creating workflow runner:", error);
      new Notice("Failed to initialize workflow. Falling back to default mode.");
      return new BaseSimpleChainRunner(chainManager);
    }
  }
}
