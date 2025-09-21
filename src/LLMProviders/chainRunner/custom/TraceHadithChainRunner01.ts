import { BaseSimpleChainRunner, SystemMessage } from "./BaseSimpleChainRunner";
import { TraceHadithChainRunner02 } from "./TraceHadithChainRunner02";
import {
  getActiveNote,
  getPromptTemplate,
  HadithNarrator,
  NarratorInfo,
  readVaultFile,
  stripObsidianProperties,
} from "./utils";

export class TraceHadithChainRunner01 extends BaseSimpleChainRunner {
  static trigger = "تتبع الرواة";
  private hadithNarrators: HadithNarrator[] = [];
  private allNarrators: NarratorInfo[] = [];

  async formatInput(messages: SystemMessage[]) {
    const activeNote = await getActiveNote();
    const prompt = await getPromptTemplate("TraceHadithChainRunner01");

    const userMessage = messages.last()!;
    messages[messages.length - 1] = {
      ...userMessage,
      content: `${prompt}\n\nHere is the Hadith text:\n\n '${stripObsidianProperties(activeNote)}'`,
    };
    return messages;
  }

  async formatOutput(response: string) {
    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      this.hadithNarrators = JSON.parse(codeBlockMatch[1]) as HadithNarrator[];

      const jsonString = await readVaultFile("_extras/Data/Tahdhib.json");
      this.allNarrators = JSON.parse(jsonString);

      const bulletList = this.hadithNarrators
        .reverse()
        .map((narrator: HadithNarrator) => {
          return `- **${narrator.name}**`;
        })
        .join("\n");

      this.succeeded = true;

      return `
سند الحديث من الآعلى

${bulletList}

سنبدأ الآن في التحقق من الرواة واحداً يلو الآخر ...
`;
    }

    return response;
  }

  includeChatHistory() {
    return false;
  }

  nextStep() {
    return new TraceHadithChainRunner02(this.chainManager, {
      allNarrators: this.allNarrators,
      hadithNarrators: this.hadithNarrators,
    });
  }
}
