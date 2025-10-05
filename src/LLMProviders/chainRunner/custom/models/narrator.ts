export interface HadithNarrator {
  name: string;
  expectedFullName: string;
  expectedKnownName: string;
  quizChoices: string[];
  indexInAllNarrators?: number;
}

export interface NarratorInfo {
  id: number | null;
  name: string;
  part: number;
  page: number;
  islamWebIndex: number;
  shamelaIndex: number;
}

export interface TahdibNarrator {
  name: string;
  symbols: string;
}
