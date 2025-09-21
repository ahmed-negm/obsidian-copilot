import { BaseSimpleChainRunner, SystemMessage } from "./BaseSimpleChainRunner";
import { getActiveNote, getPromptTemplate, stripObsidianProperties } from "./utils";

export class ListNarratorsChainRunner extends BaseSimpleChainRunner {
  static trigger = "استخرج الرواة";

  async formatInput(messages: SystemMessage[]): Promise<SystemMessage[]> {
    const activeNote = await getActiveNote();

    const prompt = await getPromptTemplate("ListNarratorsChainRunner");

    const userMessage = messages.last()!;
    messages[messages.length - 1] = {
      ...userMessage,
      content: `${prompt}\n\nHere is the Hadith text:\n\n '${stripObsidianProperties(activeNote)}'`,
    };
    return messages;
  }
}
