import ChainManager from "@/LLMProviders/chainManager";
import { ChainRunner } from "../BaseChainRunner";
import { BaseSimpleChainRunner } from "./base/BaseSimpleChainRunner";
import { commands } from "./commands";
import { Notice } from "obsidian";

/**
 * Manages custom chain runners for specialized command workflows
 * Factory pattern to create the appropriate runner based on the user's message
 */
export class CustomChainRunnerManager {
  /**
   * Get the appropriate chain runner based on the message content
   *
   * @param chainManager - The chain manager instance
   * @param originalMessage - The original message from the user
   * @returns An instance of the appropriate chain runner
   */
  static getRunner(chainManager: ChainManager, originalMessage: string): ChainRunner {
    if (!originalMessage || !chainManager) {
      console.warn("Invalid inputs to CustomChainRunnerManager.getRunner");
      return new BaseSimpleChainRunner(chainManager);
    }

    try {
      // Check each command to see if the message starts with it
      for (const command of commands) {
        if (originalMessage.startsWith(command.command)) {
          // Extract arguments after the command
          const args = originalMessage.slice(command.command.length).trim();

          // Create and return the appropriate workflow runner with the arguments
          return new command.workflow(chainManager, args);
        }
      }

      // Default to the base runner if no special command is recognized
      return new BaseSimpleChainRunner(chainManager);
    } catch (error) {
      console.error("Error creating workflow runner:", error);
      new Notice("Failed to initialize workflow. Falling back to default mode.");
      return new BaseSimpleChainRunner(chainManager);
    }
  }
}
