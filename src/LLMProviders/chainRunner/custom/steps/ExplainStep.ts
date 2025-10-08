import { logError } from "@/logger";
import { StepRunner, ProcessResponseResult } from "../base/StepRunner";
import { BaseState } from "../models/state";
import { getActiveNote, getPromptTemplate } from "../utils";
import { TEMPLATES } from "../constants";

/**
 * Step that explains text content through AI analysis
 * This step can either explain the content provided in args or the active note
 */
export class ExplainStep extends StepRunner<BaseState> {
  /**
   * Gets the system prompt for the AI, combining the base prompt with explanation-specific instructions
   *
   * @returns Combined system prompt with explain-specific instructions
   */
  async getSystemPrompt(): Promise<string> {
    try {
      const basePrompt = await super.getSystemPrompt();
      const extraSystemPrompt = await getPromptTemplate(TEMPLATES.EXPLAIN_STEP);
      return `${basePrompt}\n\n${extraSystemPrompt}`;
    } catch (error) {
      logError("Error loading explain system prompt", error);
      return super.getSystemPrompt();
    }
  }

  /**
   * Generates the user prompt with the text to be explained
   * If args are provided, uses that as the text to explain
   * If no args, uses the active note content
   *
   * @returns Formatted prompt with the text to explain and optional context
   */
  async getUserPrompt(): Promise<string> {
    try {
      const noteContent = await getActiveNote();
      let toExplain = "";
      let reference = "";

      // Determine what to explain based on args or active note
      if (this.state.args) {
        toExplain = this.state.args;
        // If the args text appears in the note, include the full note as reference
        if (noteContent && noteContent.includes(this.state.args)) {
          reference = noteContent;
        }
      } else {
        toExplain = noteContent || "No text available to explain.";
      }

      // Build the prompt with optional reference context
      return `Explain the following text:\n\n${toExplain}${
        reference ? `\n\nHere is the full context for reference:\n\n${reference}` : ""
      }`;
    } catch (error) {
      logError("Error creating explain user prompt", error);
      return "Please explain this text (error occurred while preparing the prompt).";
    }
  }

  /**
   * Processes the AI response - for this simple step, just passes through the response
   *
   * @param response - The AI response
   * @returns The processed response and success status
   */
  async processResponse(response: string): Promise<ProcessResponseResult> {
    return { response, isSuccessful: true };
  }
}
