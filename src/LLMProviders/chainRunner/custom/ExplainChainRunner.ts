import { BaseSimpleChainRunner, SystemMessage } from "./BaseSimpleChainRunner";
import {
  getActiveNote,
  getPromptTemplate,
  getSelectedText,
  stripObsidianProperties,
} from "./utils";

export class ExplainChainRunner extends BaseSimpleChainRunner {
  static trigger = "أشرح";

  async getSystemPrompt() {
    const basePrompt = await super.getSystemPrompt();
    const addedPrompt = await getPromptTemplate("ExplainChainRunner");
    return basePrompt + "\n\n" + addedPrompt;
  }

  async formatInput(messages: SystemMessage[]) {
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
