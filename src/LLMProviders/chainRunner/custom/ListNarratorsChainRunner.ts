import { BaseSimpleChainRunner, SystemMessage } from "./BaseSimpleChainRunner";
import { getActiveNote, stripObsidianProperties } from "./utils";

export class ListNarratorsChainRunner extends BaseSimpleChainRunner {
  static trigger = "استخرج الرواة";

  async formatInput(messages: SystemMessage[]): Promise<SystemMessage[]> {
    const activeNote = await getActiveNote();

    const userMessage = messages.last()!;
    messages[messages.length - 1] = {
      ...userMessage,
      content:
        getPrompt() + "Here is the Hadith text:\n\n '" + stripObsidianProperties(activeNote) + "'",
    };
    return messages;
  }
}

const getPrompt = () => `
تتبع رواة الحديث
- Do NOT include any introduction or conclusion. Only provide a structured list.
- For each narrator, provide:
  1. Full name (including kunyah if available).
  2. Lifespan (birth and death years in Hijri).
  3. Place of origin or residence.
- Use bullet points for clarity.
- Ensure accuracy by cross-referencing multiple reliable Islamic sources (e.g., [Shamela](https://shamela.ws/), [Islamweb](https://www.islamweb.net/)).
- If information is unavailable for certain narrators, state "Information not available" for those fields.
- Maintain a formal and academic tone throughout.
- Ensure clarity, conciseness, and academic rigor in your explanation.

`;
