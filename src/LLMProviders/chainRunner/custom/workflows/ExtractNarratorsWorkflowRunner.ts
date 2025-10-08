import { logError } from "@/logger";
import { WorkflowRunner } from "../base/WorkflowRunner";
import ChainManager from "@/LLMProviders/chainManager";
import { TraceNarratorsWorkflowState } from "../models/state";
import { ExtractNarratorsFromHadithStep } from "../steps/ExtractNarratorsFromHadithStep";
import { toArabicDigits, toEnglishDigits } from "../utils";
import { StepRunner } from "../base/StepRunner";

/**
 * Workflow runner for extracting narrators from hadith texts
 * Supports both single hadith and range-based extraction
 */
export class ExtractNarratorsWorkflowRunner extends WorkflowRunner<TraceNarratorsWorkflowState> {
  /**
   * Creates a new workflow runner for narrator extraction
   *
   * @param chainManager - The chain manager instance
   * @param args - Hadith number or range (e.g., "1" or "1-5")
   */
  constructor(chainManager: ChainManager, args: string) {
    super(chainManager, {
      args,
      hadithNarrators: [],
      allNarrators: [],
      tahdibNarrators: [],
      hadithNarratorIndex: 0,
      filePath: "",
    });
  }

  /**
   * Register steps based on input arguments
   * If a range is provided (e.g., "1-5"), creates multiple extraction steps
   * Otherwise, creates a single extraction step
   *
   * @returns Array of narrator extraction steps
   */
  protected registerSteps(): StepRunner<TraceNarratorsWorkflowState>[] {
    try {
      // Check if args specify a range of hadiths
      const rangeSteps = this.createRangeStepsIfApplicable();
      if (rangeSteps && rangeSteps.length > 0) {
        return rangeSteps;
      }

      // Default to single hadith extraction
      return [
        new ExtractNarratorsFromHadithStep({
          ...this.state,
          args: toArabicDigits(this.state.args),
        }),
      ];
    } catch (error) {
      logError("Error registering steps for extract narrators workflow", error);
      return [];
    }
  }

  /**
   * Creates steps for a range of hadith numbers if args match range pattern
   *
   * @returns Array of steps for the range or null if not a valid range
   */
  private createRangeStepsIfApplicable(): StepRunner<TraceNarratorsWorkflowState>[] | null {
    if (!this.state.args) return null;

    const range = this.state.args.split("-");
    if (range.length !== 2) return null;

    const start = parseInt(toEnglishDigits(range[0]));
    const end = parseInt(toEnglishDigits(range[1]));

    // Validate range values
    if (isNaN(start) || isNaN(end) || start <= 0 || end < start) {
      return null;
    }

    // Create a step for each hadith in the range
    const steps: ExtractNarratorsFromHadithStep[] = [];
    for (let i = start; i <= end; i++) {
      steps.push(
        new ExtractNarratorsFromHadithStep({
          ...this.state,
          args: toArabicDigits(i),
        })
      );
    }
    return steps;
  }
}
