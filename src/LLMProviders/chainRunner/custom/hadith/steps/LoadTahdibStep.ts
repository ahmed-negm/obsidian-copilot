import * as cheerio from "cheerio";
import { SystemMessage } from "../../BaseSimpleChainRunner";
import { StepRunner } from "../../base/StepRunner";
import { HadithWorkflowState } from "../models/WorkflowState";
import { TahdibNarrator } from "../models/TahdibNarrator";
import { getPromptTemplate } from "../../utils/promptUtils";
import { toArabicDigits } from "../../utils/formatUtils";

/**
 * Step to load and process Tahdhib al-Kamal content
 */
export class LoadTahdibStep implements StepRunner<HadithWorkflowState> {
  /**
   * Format the input for the LLM
   * @param messages The messages to format
   * @param state The current workflow state
   * @returns The formatted messages
   */
  async formatInput(
    messages: SystemMessage[],
    state: HadithWorkflowState
  ): Promise<SystemMessage[]> {
    // Skip this step if we're skipping to the final step
    if (state.skipToFinalStep) {
      return messages;
    }

    // Get the Shamela content for the current narrator
    const currentNarrator = state.allNarrators[state.allNarratorIndex!];
    const nextNarrator = state.allNarrators[state.allNarratorIndex! + 1];

    const shamelaContent = await this.getShamelaContent(
      currentNarrator.shamelaIndex,
      nextNarrator.shamelaIndex
    );

    const promptTemplate = await getPromptTemplate("TraceHadithChainRunner04");
    const prompt = promptTemplate
      .replaceAll("{{narrator_name}}", currentNarrator.name)
      .replaceAll("{{bio}}", shamelaContent);

    return [
      messages[0],
      {
        role: "user",
        content: prompt,
      },
    ];
  }

  /**
   * Process the LLM response
   * @param response The LLM response
   * @param state The current workflow state
   * @returns The result of the step
   */
  async run(
    response: string,
    state: HadithWorkflowState
  ): Promise<{
    output: string;
    nextState: HadithWorkflowState;
    isComplete: boolean;
  }> {
    // Skip this step if we're skipping to the final step
    if (state.skipToFinalStep) {
      return {
        output: response,
        nextState: state,
        isComplete: true,
      };
    }

    // Get current narrator index and make sure it's used
    const narratorIndex = state.hadithNarratorIndex || 0;

    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      const tahdibNarrators = JSON.parse(codeBlockMatch[1]) as TahdibNarrator[];

      if (tahdibNarrators.length > 0) {
        // Create new state with tahdibNarrators
        const newState: HadithWorkflowState = {
          ...state,
          tahdibNarrators,
        };

        // Format the output message
        const output = `
عدد من رووا عن **${state.hadithNarrators[narratorIndex].potentialPeople[0].knownName}** في صحيح البخاري هو **${toArabicDigits(tahdibNarrators.length)}**
جاري البحث عن **${state.hadithNarrators[narratorIndex + 1].potentialPeople[0].knownName}** بينهم ...
`;

        return {
          output,
          nextState: newState,
          isComplete: true,
        };
      }
    }

    // If no narrators were found or parsing failed
    return {
      output: response,
      nextState: state,
      isComplete: true, // Still move to next step even if parsing failed
    };
  }

  /**
   * Get Shamela content from web
   * @param startIndex Start index in Shamela
   * @param endIndex End index in Shamela
   * @returns Promise with the content as markdown
   */
  private async getShamelaContent(startIndex: number, endIndex: number): Promise<string> {
    let markdown = "";

    for (let index = startIndex; index <= endIndex; index++) {
      const url = `https://shamela.ws/book/3722/${index}`;
      const html = await this.getHtmlContent(url);
      markdown += this.extractMarkdownFromHtml(html);
    }

    return markdown;
  }

  /**
   * Fetch HTML content from a URL
   * @param url The URL to fetch
   * @returns Promise with the HTML content
   */
  private async getHtmlContent(url: string): Promise<string> {
    const response = await fetch(url);
    return await response.text();
  }

  /**
   * Extract markdown from Shamela HTML
   * @param html The HTML content
   * @returns The extracted markdown
   */
  private extractMarkdownFromHtml(html: string): string {
    const data = cheerio.load(html);

    let markdown = "";

    // Convert each <p> block, excluding .hamesh
    data(".nass p").each((_: any, el: any) => {
      const $el = data(el);
      if ($el.hasClass("hamesh")) return; // Exclude hamesh

      // Remove anchor and button from text
      $el.find(".anchor, .btn_tag").remove();
      let text = $el.text().trim();

      // Bold for .c5
      $el.find(".c5").each((_: any, span: any) => {
        const spanText = data(span).text();
        text = text.replace(spanText, `**${spanText}**`);
      });

      // Superscript for .c2 (for numbers)
      $el.find(".c2").each((_: any, span: any) => {
        const spanText = data(span).text();
        text = text.replace(spanText, `(${spanText})`);
      });

      // Replace repeated brackets with a single bracket
      text = text
        .replace(/\(\(+/g, "(")
        .replace(/\)+/g, ")")
        .replace(/\[\[+/g, "[")
        .replace(/\]+/g, "]")
        .replace(/\{\{+/g, "{")
        .replace(/\}+/g, "}")
        .replace(/\u06dd+/g, ""); // Remove Arabic end of ayah if repeated

      // For Arabic parentheses (U+FD3E, U+FD3F)
      text = text.replace(/[\uFD3E]{2,}/g, "\uFD3E").replace(/[\uFD3F]{2,}/g, "\uFD3F");
      markdown += `${text}\n\n`;
    });

    return markdown.trim();
  }
}
