import ChainManager from "@/LLMProviders/chainManager";
import { ChainRunner } from "../BaseChainRunner";
import { BaseSimpleChainRunner } from "./BaseSimpleChainRunner";
import { HadithWorkflowRunner } from "./hadith/HadithWorkflowRunner";

/**
 * Manager for creating and configuring chain runners
 */
export class CustomChainRunnerManager {
  /**
   * Get the appropriate chain runner based on the original message
   * @param chainManager The chain manager instance
   * @param originalMessage The original user message
   * @returns The appropriate chain runner
   */
  static getRunner(chainManager: ChainManager, originalMessage: string): ChainRunner {
    // Handle new workflow architecture first
    if (originalMessage.startsWith(HadithWorkflowRunner.trigger)) {
      // Use the new workflow-based architecture for hadith tracing
      return new HadithWorkflowRunner(chainManager);
    }

    return new BaseSimpleChainRunner(chainManager);
  }
}
