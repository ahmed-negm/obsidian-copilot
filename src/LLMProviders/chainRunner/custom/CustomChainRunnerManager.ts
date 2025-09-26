import ChainManager from "@/LLMProviders/chainManager";
import { ChainRunner } from "../BaseChainRunner";
import { ExplainChainRunner } from "./ExplainChainRunner";
import { BaseSimpleChainRunner } from "./BaseSimpleChainRunner";
import { ListNarratorsChainRunner } from "./ListNarratorsChainRunner";
import { TraceHadithChainRunner01 } from "./TraceHadithChainRunner01";
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

    // Legacy chain runners (keep for backward compatibility during migration)
    if (originalMessage.startsWith(ExplainChainRunner.trigger)) {
      return new ExplainChainRunner(chainManager);
    }

    if (originalMessage.startsWith(ListNarratorsChainRunner.trigger)) {
      return new TraceHadithChainRunner01(chainManager, false, false);
    }

    if (originalMessage.startsWith(TraceHadithChainRunner01.trigger)) {
      return new TraceHadithChainRunner01(chainManager);
    }

    return new BaseSimpleChainRunner(chainManager);
  }

  /**
   * Resume a workflow from saved state
   * @param chainManager The chain manager instance
   * @param workflowType The type of workflow to resume
   * @param state The saved state of the workflow
   * @returns The appropriate chain runner with restored state
   */
  static resumeWorkflow(chainManager: ChainManager, workflowType: string, state: any): ChainRunner {
    switch (workflowType) {
      case "hadith":
        return new HadithWorkflowRunner(chainManager, state);
      // Add cases for other workflow types as they are implemented
      default:
        return new BaseSimpleChainRunner(chainManager);
    }
  }
}
