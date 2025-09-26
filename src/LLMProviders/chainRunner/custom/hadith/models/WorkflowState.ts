import { HadithNarrator, NarratorInfo } from "./HadithNarrator";
import { TahdibNarrator } from "./TahdibNarrator";

/**
 * Interface representing the state for the hadith workflow
 */
export interface HadithWorkflowState {
  /**
   * List of narrators extracted from the hadith
   */
  hadithNarrators: HadithNarrator[];

  /**
   * List of all narrators from the Tahdhib database
   */
  allNarrators: NarratorInfo[];

  /**
   * The Obsidian link to the hadith
   */
  hadithLink: string;

  /**
   * The current index in the hadith narrators array being processed
   */
  hadithNarratorIndex?: number;

  /**
   * Whether to execute the next step after the current step completes
   */
  executeNextStep?: boolean;

  /**
   * Whether to reverse the hadith narrators list for display
   */
  reverseHadithNarrators?: boolean;

  /**
   * Index of the narrator in the allNarrators array
   */
  allNarratorIndex?: number;

  /**
   * Whether to skip to the final step
   */
  skipToFinalStep?: boolean;

  /**
   * List of narrators from Tahdhib
   */
  tahdibNarrators?: TahdibNarrator[];
}
