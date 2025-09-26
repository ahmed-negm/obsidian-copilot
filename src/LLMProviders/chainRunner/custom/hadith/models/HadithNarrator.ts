/**
 * Interface representing a hadith narrator
 */
export interface HadithNarrator {
  /**
   * The name of the narrator as it appears in the hadith text
   */
  name: string;

  /**
   * Potential people that match this narrator
   */
  potentialPeople: {
    /**
     * Full name of the potential person
     */
    fullName: string;

    /**
     * The known name of the potential person
     */
    knownName: string;

    /**
     * Alternative names for quiz options
     */
    quizNames: string[];
  }[];

  /**
   * Index of the narrator in the allNarrators array
   */
  indexInAllNarrators?: number;
}

/**
 * Interface representing narrator information from Tahdhib database
 */
export interface NarratorInfo {
  /**
   * Full name of the narrator
   */
  name: string;

  /**
   * Biography information
   */
  bio?: string;

  /**
   * Death date if known
   */
  death?: string;

  /**
   * Reliability rating
   */
  rating?: string;

  /**
   * Additional metadata
   */
  [key: string]: any;
}
