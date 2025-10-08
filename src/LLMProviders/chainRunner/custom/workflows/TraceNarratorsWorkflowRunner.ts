import { WorkflowRunner } from "../base/WorkflowRunner";
import { logError, logWarn } from "@/logger";
import ChainManager from "@/LLMProviders/chainManager";
import { TraceNarratorsWorkflowState } from "../models/state";
import { readVaultFile, setScore, updateVaultFile } from "../utils";
import { ChoiceSuggestModal } from "../ui/ChoiceSuggestModal";
import { Notice } from "obsidian";
import { ExtractNarratorsFromHadithStep } from "../steps/ExtractNarratorsFromHadithStep";
import { FindNarratorInTahdibIndexStep } from "../steps/FindNarratorInTahdibIndexStep";
import { FindTeacherStudentStep } from "../steps/FindTeacherStudentStep";
import { GenerateFigureNoteStep } from "../steps/GenerateFigureNoteStep";
import { StepRunner } from "../base/StepRunner";
import { UI_MESSAGES, PATHS } from "../constants";

/**
 * Workflow runner for tracing narrators in hadith chains
 *
 * This complex workflow performs a full analysis of hadith narration chains:
 * 1. Extracts narrators from hadith text
 * 2. Identifies each narrator in the Tahdhib database
 * 3. Generates biographical notes for each narrator
 * 4. Analyzes teacher-student relationships between narrators
 * 5. Enhances the original hadith with links to narrator profiles
 * 6. Provides interactive quizzes to test knowledge
 */
export class TraceNarratorsWorkflowRunner extends WorkflowRunner<TraceNarratorsWorkflowState> {
  /**
   * Create a new TraceNarratorsWorkflowRunner instance
   *
   * @param chainManager - The chain manager instance
   * @param args - Arguments for the workflow (hadith number)
   */
  constructor(chainManager: ChainManager, args: string) {
    // Initialize with default state
    super(chainManager, {
      args,
      hadithNarrators: [],
      allNarrators: [],
      tahdibNarrators: [],
      hadithNarratorIndex: 0,
      filePath: "",
    });

    // Load narrators data
    this.loadNarratorsData().catch((error) => {
      logError("Failed to load narrators data", error);
      new Notice("Failed to load narrators database");
    });
  }

  /**
   * Register and configure the steps for the Trace Narrators workflow
   * Creates a multi-step pipeline with dynamic flow control between steps
   *
   * @returns Array of step runners for this workflow
   */
  protected registerSteps(): StepRunner<TraceNarratorsWorkflowState>[] {
    try {
      return [
        this.createExtractNarratorsStep(),
        this.createFindNarratorStep(),
        this.createGenerateFigureNoteStep(),
        this.createTeacherStudentStep(),
      ];
    } catch (error) {
      logError("Error registering steps for trace narrators workflow", error);
      return [];
    }
  }

  /**
   * Creates the extract narrators step
   *
   * @returns Configured ExtractNarratorsFromHadithStep
   */
  private createExtractNarratorsStep(): ExtractNarratorsFromHadithStep {
    return new ExtractNarratorsFromHadithStep(this.state);
  }

  /**
   * Creates the find narrator in index step
   *
   * @returns Configured FindNarratorInTahdibIndexStep
   */
  private createFindNarratorStep(): FindNarratorInTahdibIndexStep {
    return new FindNarratorInTahdibIndexStep(this.state);
  }

  /**
   * Creates the generate figure note step
   * This step creates biographical notes for narrators
   *
   * @returns Configured GenerateFigureNoteStep with completion handler
   */
  private createGenerateFigureNoteStep(): GenerateFigureNoteStep {
    return new GenerateFigureNoteStep(this.state, {
      onComplete: async () => {
        try {
          this.handleFigureNoteCompletion();
        } catch (error) {
          logError("Error in generate figure note completion", error);
        }
        return Promise.resolve();
      },
    });
  }

  /**
   * Creates the find teacher-student step
   * This step analyzes relationships between consecutive narrators
   *
   * @returns Configured FindTeacherStudentStep with completion handler
   */
  private createTeacherStudentStep(): FindTeacherStudentStep {
    return new FindTeacherStudentStep(this.state, {
      onComplete: async () => {
        try {
          await this.handleTeacherStudentCompletion();
        } catch (error) {
          logError("Error in find teacher-student completion", error);
        }
        return Promise.resolve();
      },
    });
  }

  /**
   * Handles completion of the generate figure note step
   * Determines workflow navigation based on narrator status
   */
  private handleFigureNoteCompletion(): void {
    const nextNarratorIndex =
      this.state.hadithNarrators[this.state.hadithNarratorIndex + 1]?.indexInAllNarrators;

    // If the next narrator isn't found in the database but there are more narrators
    if (
      !nextNarratorIndex &&
      this.state.hadithNarratorIndex < this.state.hadithNarrators.length - 1
    ) {
      // Move to next narrator but go back to the index search step
      this.state.hadithNarratorIndex++;
      this.currentStepIndex -= 2;
    } else {
      // Reset narrator index to prepare for teacher-student relationships
      this.state.hadithNarratorIndex = 0;
    }
  }

  /**
   * Handles completion of the teacher-student step
   * Manages workflow progression and finalization
   */
  private async handleTeacherStudentCompletion(): Promise<void> {
    // Move to the next narrator
    this.state.hadithNarratorIndex++;

    if (this.state.hadithNarratorIndex < this.state.hadithNarrators.length - 1) {
      // If there are more narrators, go back to the teacher-student step
      this.currentStepIndex -= 1;
    } else if (this.state.hadithNarratorIndex === this.state.hadithNarrators.length - 1) {
      // If this was the last narrator, finalize the workflow
      this.currentStepIndex = 5; // Set to an index beyond the steps to end the workflow
      await this.linkHadithToNarrators();
      new Notice(UI_MESSAGES.WORKFLOW_COMPLETE, 0);
    }
  }

  /**
   * Load narrator data from the Tahdhib index file
   */
  protected async loadNarratorsData(): Promise<void> {
    try {
      const jsonString = await readVaultFile(PATHS.TAHDHIB_INDEX);
      this.state.allNarrators = JSON.parse(jsonString);

      if (!Array.isArray(this.state.allNarrators) || this.state.allNarrators.length === 0) {
        throw new Error("Invalid narrators data format");
      }
    } catch (error) {
      logError("Failed to load narrators data", error);
      throw new Error("Failed to load narrators database");
    }
  }

  /**
   * Show quizzes to test knowledge of narrators
   */
  protected async showQuiz(): Promise<void> {
    try {
      await this.showNarratorQuiz();
      await this.showChainQuiz();
    } catch (error) {
      logError("Error showing quiz", error);
      new Notice("Failed to show quiz");
    }
  }

  /**
   * Show a quiz about narrator identities
   */
  protected async showNarratorQuiz(): Promise<void> {
    // Create a copy of the narrators array in reverse order
    const narrators = this.state.hadithNarrators.slice().reverse();

    for (const narrator of narrators) {
      // Skip narrators with complex names (more than 2 words)
      if (narrator.name.split(" ").length > 2) {
        continue;
      }

      // Create shuffled choices for the quiz
      const choices = [
        narrator.expectedKnownName,
        narrator.quizChoices[0],
        narrator.quizChoices[1],
      ].sort(() => Math.random() - 0.5);

      // Show quiz modal
      const choice = await ChoiceSuggestModal.open(
        app,
        `من هو ${narrator.name}؟`,
        choices,
        "bottom",
        false
      );

      // Update score based on user's answer
      const isCorrect = choice === narrator.expectedKnownName;
      await setScore(isCorrect, narrator.expectedKnownName);
    }
  }

  /**
   * Show a quiz about narrator chain relationships
   */
  protected async showChainQuiz(): Promise<void> {
    try {
      // Introduction to the chain quiz
      await ChoiceSuggestModal.open(
        app,
        "الآن، سنختبر معرفتك بسلسلة الرواة. اختر الشخص الذي يلي كل راوٍ في السلسلة.",
        ["ابدأ الاختبار"],
        "bottom",
        false
      );

      // Create a copy of the narrators array in reverse order (chronological)
      const hadithNarrators = this.state.hadithNarrators.slice().reverse();

      // Quiz on each narrator pair in the chain
      for (let i = 0; i < hadithNarrators.length - 1; i++) {
        const currentNarrator = hadithNarrators[i].expectedKnownName;
        const correctNextNarrator = hadithNarrators[i + 1].expectedKnownName;

        // Generate quiz choices (correct + distractors)
        const distractors = hadithNarrators
          .filter(
            (narrator) =>
              narrator.expectedKnownName !== currentNarrator &&
              narrator.expectedKnownName !== correctNextNarrator
          )
          .slice(0, 2)
          .map((narrator) => narrator.expectedKnownName);

        // Combine and shuffle choices
        const choices = [...distractors, correctNextNarrator].sort(() => Math.random() - 0.5);

        // Show quiz modal
        const choice = await ChoiceSuggestModal.open(
          app,
          `روى ${currentNarrator} هذا الحديث عن:`,
          choices,
          "bottom",
          true
        );

        // Update score based on user's answer
        await setScore(choice === correctNextNarrator, correctNextNarrator);
      }
    } catch (error) {
      logError("Error showing chain quiz", error);
      new Notice("Failed to show chain quiz");
    }
  }

  /**
   * Link narrator names in the hadith text to their respective notes
   * This converts plain text narrator names to wikilinks
   *
   * @returns Promise resolving when the linking process completes
   */
  protected async linkHadithToNarrators(): Promise<void> {
    try {
      if (!this.state.filePath) {
        throw new Error("No file path available");
      }

      // Read the hadith file content
      let fileContent = await readVaultFile(this.state.filePath);

      // Process each narrator and create wikilinks
      fileContent = await this.processNarratorsForLinking(fileContent);

      // Update the file with the new content containing wikilinks
      await updateVaultFile(this.state.filePath, fileContent);
      new Notice("Successfully linked narrators in hadith text");
    } catch (error) {
      logError("Error linking hadith to narrators", error);
      new Notice("Failed to link narrators in hadith text");
    }
  }

  /**
   * Process narrators and replace their mentions with wikilinks
   *
   * @param fileContent - Original file content
   * @returns Modified content with narrator wikilinks
   */
  private async processNarratorsForLinking(fileContent: string): Promise<string> {
    let updatedContent = fileContent;

    for (const hadithNarrator of this.state.hadithNarrators) {
      // Skip narrators without proper index information
      if (!this.isValidNarratorForLinking(hadithNarrator)) {
        continue;
      }

      // Get the full narrator info from the database
      const index = hadithNarrator.indexInAllNarrators as number;
      const narrator = this.state.allNarrators[index];
      if (!narrator) {
        logWarn(`Cannot find narrator at index ${index}`);
        continue;
      }

      // Create wikilink with alias: [[full name|mention name]]
      const linkToNote = `[[${narrator.name}|${hadithNarrator.name}]]`;

      // Replace all occurrences with proper word boundary checks
      updatedContent = this.replaceNarratorWithLink(
        updatedContent,
        hadithNarrator.name,
        linkToNote
      );
    }

    return updatedContent;
  }

  /**
   * Check if a narrator has valid index information for linking
   *
   * @param narrator - The narrator to validate
   * @returns Whether the narrator has valid index information
   */
  private isValidNarratorForLinking(narrator: any): boolean {
    if (narrator.indexInAllNarrators === undefined) {
      logWarn(`Missing index for narrator: ${narrator.name}`);
      return false;
    }
    return true;
  }

  /**
   * Replace narrator mentions with wikilinks, respecting word boundaries
   *
   * @param content - The content to process
   * @param narratorName - The narrator's name to find
   * @param wikilink - The wikilink to replace with
   * @returns Updated content with wikilinks
   */
  private replaceNarratorWithLink(content: string, narratorName: string, wikilink: string): string {
    // Using a regex with word boundaries to avoid partial replacements
    const regex = new RegExp(`\\b${narratorName}\\b`, "g");
    return content.replace(regex, wikilink);
  }
}
