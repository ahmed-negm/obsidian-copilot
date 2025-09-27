export interface HadithNarrator {
  name: string;
  potentialPeople: {
    fullName: string;
    knownName: string;
    quizNames: string[];
  }[];
  indexInAllNarrators?: number;
}

export interface NarratorInfo {
  name: string;
  bio?: string;
  death?: string;
  rating?: string;
  [key: string]: any;
}
