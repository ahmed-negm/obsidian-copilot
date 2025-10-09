import { HadithNarrator, NarratorInfo } from "./narrator";

export interface BaseState {
  args: string;
}

export interface TraceNarratorsWorkflowState extends BaseState {
  filePath: string;
  hadithNarrators: HadithNarrator[];
  allNarrators: NarratorInfo[];
  hadithNarratorIndex: number;
}
