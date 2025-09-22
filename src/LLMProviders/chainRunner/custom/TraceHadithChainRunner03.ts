import ChainManager from "@/LLMProviders/chainManager";
import { BaseSimpleChainRunner, SystemMessage } from "./BaseSimpleChainRunner";
import { getPromptTemplate, toArabicDigits } from "./utils";
import { TraceHadithChainRunner04 } from "./TraceHadithChainRunner04";
import { TraceHadithChainRunner02Input } from "./TraceHadithChainRunner02";

export interface TraceHadithChainRunner03Input extends TraceHadithChainRunner02Input {
  hadithNarratorIndex: number;
}

export class TraceHadithChainRunner03 extends BaseSimpleChainRunner {
  private allNarratorIndex: number = -1;

  constructor(
    chainManager: ChainManager,
    private input: TraceHadithChainRunner03Input
  ) {
    super(chainManager);
  }

  async formatInput(messages: SystemMessage[]) {
    const narratorToFind =
      this.input.hadithNarrators[this.input.hadithNarratorIndex].potentialPeople[0].fullName;

    // Find all narrator info that matches the first 3 letters of the name
    const matchingNarrators = this.input.allNarrators
      .filter((n) => n.name?.startsWith(narratorToFind.slice(0, 3)))
      .map((n) => ({
        id: n.islamWebIndex ?? 0,
        name: n.name ?? "",
      }));

    const promptTemplate = await getPromptTemplate("TraceHadithChainRunner03");
    const prompt = promptTemplate
      .replaceAll("{{name_to_search}}", narratorToFind)
      .replaceAll("{{JSON}}", JSON.stringify(matchingNarrators, null, 2));

    return [messages[0], { role: "user", content: prompt }];
  }

  async formatOutput(response: string) {
    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      const result = JSON.parse(codeBlockMatch[1]) as {
        id: number;
        name: string;
        confidence: string;
      }[];
      if (result.length > 0) {
        const first = result.find((r) => r.confidence === "High");
        if (first) {
          this.allNarratorIndex = this.input.allNarrators.findIndex(
            (n) => n.islamWebIndex === first.id
          );
          if (this.allNarratorIndex !== -1) {
            const foundNarrator = this.input.allNarrators[this.allNarratorIndex];
            this.succeeded = this.input.hadithNarratorIndex < this.input.hadithNarrators.length - 1;
            return (
              `
تم العثور على **${this.input.hadithNarrators[this.input.hadithNarratorIndex].potentialPeople[0].knownName}** في تهذيب الكمال [المجلد ${toArabicDigits(foundNarrator.part)} - الصفحة ${toArabicDigits(foundNarrator.page)}](https://shamela.ws/book/3722/${foundNarrator.shamelaIndex})
` + (this.succeeded ? "جاري البحث عن من رووا عنه ..." : "\n\n🎉 تم الانتهاء من تتبع جميع الرواة!")
            );
          }
          return response;
        }
      }
    }

    return response;
  }

  includeChatHistory() {
    return false;
  }

  nextStep() {
    return new TraceHadithChainRunner04(this.chainManager, {
      ...this.input,
      allNarratorIndex: this.allNarratorIndex,
    });
  }
}
