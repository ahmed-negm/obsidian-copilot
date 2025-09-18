import { BaseSimpleChainRunner, SystemMessage } from "./BaseSimpleChainRunner";

export class ExplainChainRunner extends BaseSimpleChainRunner {
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

  formatInput(messages: SystemMessage[]): SystemMessage[] {
    const userMessage = messages.last()!;
    messages[messages.length - 1] = {
      ...userMessage,
      content:
        "Explain the following word/sentence: " + userMessage?.content?.replace("@أشرح", "").trim(),
    };
    return messages;
  }
}
