import { HadithNarrator, NarratorInfo } from "./HadithNarrator";
import { TahdibNarrator } from "./TahdibNarrator";

export interface BaseState {
  args: string;
}

export interface ExtractNarratorsState extends BaseState {
  hadithNarrators: HadithNarrator[];
}

export interface TraceNarratorsWorkflowState extends ExtractNarratorsState {
  allNarrators: NarratorInfo[];
  hadithLink: string;
  hadithNarratorIndex?: number;
  executeNextStep?: boolean;
  reverseHadithNarrators?: boolean;
  allNarratorIndex?: number;
  skipToFinalStep?: boolean;
  tahdibNarrators?: TahdibNarrator[];
}
