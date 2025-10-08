import { WorkflowRunner } from "./../base/WorkflowRunner";
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
 * This workflow analyzes hadith narrators, finds their information in the Tahdhib database,
 * generates profile notes, and creates links between narrators
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
      console.error("Failed to load narrators data", error);
      new Notice("Failed to load narrators database");
    });
  }

  /**
   * Register and configure the steps for the Trace Narrators workflow
   *
   * @returns Array of step runners for this workflow
   */
  protected registerSteps(): StepRunner<TraceNarratorsWorkflowState>[] {
    // Step 1: Extract narrators from hadith text
    const extractNarratorsStep = new ExtractNarratorsFromHadithStep(this.state);

    // Step 2: Find narrators in the Tahdhib index
    const findNarratorStep = new FindNarratorInTahdibIndexStep(this.state);

    // Step 3: Generate figure note for the narrator
    const generateFigureNoteStep = new GenerateFigureNoteStep(this.state, {
      onComplete: async () => {
        try {
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
        } catch (error) {
          console.error("Error in generate figure note completion", error);
        }
        return Promise.resolve();
      },
    });

    // Step 4: Find teacher-student relationships
    const findTeacherStudentStep = new FindTeacherStudentStep(this.state, {
      onComplete: async () => {
        try {
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
        } catch (error) {
          console.error("Error in find teacher-student completion", error);
        }
        return Promise.resolve();
      },
    });

    return [extractNarratorsStep, findNarratorStep, generateFigureNoteStep, findTeacherStudentStep];
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
      console.error("Failed to load narrators data", error);
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
      console.error("Error showing quiz", error);
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
      console.error("Error showing chain quiz", error);
      new Notice("Failed to show chain quiz");
    }
  }

  /**
   * Link narrator names in the hadith text to their respective notes
   * This converts plain text narrator names to wikilinks
   */
  protected async linkHadithToNarrators(): Promise<void> {
    try {
      if (!this.state.filePath) {
        throw new Error("No file path available");
      }

      // Read the hadith file content
      let fileContent = await readVaultFile(this.state.filePath);

      // Replace each narrator name with a wikilink to their note
      for (const hadithNarrator of this.state.hadithNarrators) {
        // Validate narrator data
        if (hadithNarrator.indexInAllNarrators === undefined) {
          console.warn(`Missing index for narrator: ${hadithNarrator.name}`);
          continue;
        }

        // Get the full narrator info from the database
        const narrator = this.state.allNarrators[hadithNarrator.indexInAllNarrators];
        if (!narrator) {
          console.warn(`Cannot find narrator at index ${hadithNarrator.indexInAllNarrators}`);
          continue;
        }

        // Create wikilink with alias: [[full name|mention name]]
        const linkToNote = `[[${narrator.name}|${hadithNarrator.name}]]`;

        // Replace all occurrences of the narrator name with the wikilink
        // Using a regex with word boundaries to avoid partial replacements
        const regex = new RegExp(`\\b${hadithNarrator.name}\\b`, "g");
        fileContent = fileContent.replace(regex, linkToNote);
      }

      // Update the file with the new content containing wikilinks
      await updateVaultFile(this.state.filePath, fileContent);
      new Notice("Successfully linked narrators in hadith text");
    } catch (error) {
      console.error("Error linking hadith to narrators", error);
      new Notice("Failed to link narrators in hadith text");
    }
  }
}
