import { BaseSimpleChainRunner, SystemMessage } from "./BaseSimpleChainRunner";
import { getActiveNote, getSelectedText, stripObsidianProperties } from "./utils";

export class ExplainChainRunner extends BaseSimpleChainRunner {
  static trigger = "أشرح";

  getSystemPrompt(): string {
    return (
      super.getSystemPrompt() +
      `
- Provide the explanation in **exactly 5 bullet points**, each limited to 1-2 lines.
- Do NOT include any introduction
- Each point should cover:
  1. A brief linguistic analysis of the term.
  2. Notable scholarly views with reference to classical or reliable sources (e.g., [Shamela](https://shamela.ws/), [Islamweb](https://www.islamweb.net/)) (without listing sources).
  3. A concise concluding summary.
- Do not copy directly from sources; instead, **summarize authentically**.
- Ensure clarity, conciseness, and academic rigor in your explanation.
    `
    );
  }

  async formatInput(messages: SystemMessage[]): Promise<SystemMessage[]> {
    const userMessage = messages.last()!;

    let toExplain = userMessage?.content?.replace(ExplainChainRunner.trigger, "").trim();
    if (!toExplain) {
      const selectedText = getSelectedText();
      if (selectedText) {
        toExplain = selectedText;
      } else {
        const activeNote = await getActiveNote();
        toExplain = stripObsidianProperties(activeNote);
      }
    }

    messages[messages.length - 1] = {
      ...userMessage,
      content: "Explain the following text: " + toExplain,
    };
    return messages;
  }
}
