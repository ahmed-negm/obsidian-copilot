import ChainManager from "@/LLMProviders/chainManager";
import { BaseSimpleChainRunner, SystemMessage } from "./BaseSimpleChainRunner";
import { TraceHadithChainRunner03Input } from "./TraceHadithChainRunner03";
import { getShamelaContent } from "./shamelaHelper";
import { getPromptTemplate, toArabicDigits } from "./utils";
import { TraceHadithChainRunner05 } from "./TraceHadithChainRunner05";

export interface TraceHadithChainRunner04Input extends TraceHadithChainRunner03Input {
  allNarratorIndex: number;
}

export interface TahdibNarrator {
  name: string;
  symbols: string;
}

export class TraceHadithChainRunner04 extends BaseSimpleChainRunner {
  private tahdibNarrators: TahdibNarrator[];

  constructor(
    chainManager: ChainManager,
    private input: TraceHadithChainRunner04Input
  ) {
    super(chainManager);
  }

  async formatInput(messages: SystemMessage[]) {
    const shamelaContent = await getShamelaContent(
      this.input.allNarrators[this.input.allNarratorIndex].shamelaIndex,
      this.input.allNarrators[this.input.allNarratorIndex + 1].shamelaIndex
    );
    const promptTemplate = await getPromptTemplate("TraceHadithChainRunner04");
    const prompt = promptTemplate
      .replaceAll("{{narrator_name}}", this.input.allNarrators[this.input.allNarratorIndex].name)
      .replaceAll("{{bio}}", shamelaContent);

    return [
      messages[0],
      {
        role: "user",
        content: prompt,
      },
    ];
  }

  async formatOutput(response: string) {
    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      this.tahdibNarrators = JSON.parse(codeBlockMatch[1]);
      if (this.tahdibNarrators.length > 0) {
        this.succeeded = true;
        return `
عدد من رووا عن **${this.input.hadithNarrators[this.input.hadithNarratorIndex].potentialPeople[0].knownName}** في صحيح البخاري هو **${toArabicDigits(this.tahdibNarrators.length)}**
جاري البحث عن **${this.input.hadithNarrators[this.input.hadithNarratorIndex + 1].potentialPeople[0].knownName}** بينهم ...
`;
      }
    }
    return response;
  }

  includeChatHistory() {
    return false;
  }

  nextStep() {
    return new TraceHadithChainRunner05(this.chainManager, {
      ...this.input,
      tahdibNarrators: this.tahdibNarrators,
    });
  }
}
