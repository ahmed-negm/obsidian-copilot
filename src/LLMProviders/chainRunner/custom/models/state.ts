import { HadithNarrator, NarratorInfo, TahdibNarrator } from "./narrator";

export interface BaseState {
  args: string;
}

export interface TraceNarratorsWorkflowState extends BaseState {
  filePath: string;
  hadithNarrators: HadithNarrator[];
  allNarrators: NarratorInfo[];
  tahdibNarrators: TahdibNarrator[];
  hadithNarratorIndex: number;
}
