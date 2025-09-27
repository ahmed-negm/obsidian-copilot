import * as cheerio from "cheerio";
import { TahdibNarrator } from "../models/TahdibNarrator";
import { StepRunner } from "../base/StepRunner";
import { TraceNarratorsWorkflowState } from "../models/State";
import { getPromptTemplate, toArabicDigits } from "../utils";

export class LoadTahdibStep extends StepRunner<TraceNarratorsWorkflowState> {
  async getUserPrompt() {
    // Get the Shamela content for the current narrator
    const currentNarrator = this.state.allNarrators[this.state.allNarratorIndex!];
    const nextNarrator = this.state.allNarrators[this.state.allNarratorIndex! + 1];

    const shamelaContent = await this.getShamelaContent(
      currentNarrator.shamelaIndex,
      nextNarrator.shamelaIndex
    );

    const promptTemplate = await getPromptTemplate("TraceHadithChainRunner04");
    const prompt = promptTemplate
      .replaceAll("{{narrator_name}}", currentNarrator.name)
      .replaceAll("{{bio}}", shamelaContent);

    return prompt;
  }

  async processResponse(response: string) {
    // Get current narrator index and make sure it's used
    const narratorIndex = this.state.hadithNarratorIndex || 0;

    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      const tahdibNarrators = JSON.parse(codeBlockMatch[1]) as TahdibNarrator[];

      if (tahdibNarrators.length > 0) {
        this.state.tahdibNarrators = tahdibNarrators;

        // Format the output message
        const output = `
عدد من رووا عن **${this.state.hadithNarrators[narratorIndex].potentialPeople[0].knownName}** في صحيح البخاري هو **${toArabicDigits(tahdibNarrators.length)}**
جاري البحث عن **${this.state.hadithNarrators[narratorIndex + 1].potentialPeople[0].knownName}** بينهم ...
`;

        return {
          response: output,
          isSuccessful: true,
        };
      }
    }

    // If no narrators were found or parsing failed
    return {
      response,
      isSuccessful: true, // Still move to next step even if parsing failed
    };
  }

  private async getShamelaContent(startIndex: number, endIndex: number): Promise<string> {
    let markdown = "";

    for (let index = startIndex; index <= endIndex; index++) {
      const url = `https://shamela.ws/book/3722/${index}`;
      const html = await this.getHtmlContent(url);
      markdown += this.extractMarkdownFromHtml(html);
    }

    return markdown;
  }

  private async getHtmlContent(url: string): Promise<string> {
    const response = await fetch(url);
    return await response.text();
  }

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
