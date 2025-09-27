import { HadithNarrator, NarratorInfo } from "./HadithNarrator";
import { TahdibNarrator } from "./TahdibNarrator";

export interface BaseState {
  args: string;
}

export interface TraceNarratorsWorkflowState extends BaseState {
  hadithNarrators: HadithNarrator[];
  allNarrators: NarratorInfo[];
  hadithNarratorIndex?: number;
  allNarratorIndex?: number;
  tahdibNarrators?: TahdibNarrator[];
}
