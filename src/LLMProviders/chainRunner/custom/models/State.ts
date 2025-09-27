import { HadithNarrator, NarratorInfo } from "./HadithNarrator";

export interface BaseState {
  args: string;
}

export interface TraceNarratorsWorkflowState extends BaseState {
  hadithNarrators: HadithNarrator[];
  allNarrators: NarratorInfo[];
  hadithNarratorIndex?: number;
}
