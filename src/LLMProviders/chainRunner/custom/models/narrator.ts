export interface HadithNarrator {
  name: string;
  expectedFullName: string;
  expectedKnownName: string;
  quizChoices: string[];
  indexInAllNarrators?: number;
}

export interface NarratorInfo {
  name: string;
  bio?: string;
  death?: string;
  rating?: string;
  [key: string]: any;
}

export interface TahdibNarrator {
  name: string;
  symbols: string;
}
