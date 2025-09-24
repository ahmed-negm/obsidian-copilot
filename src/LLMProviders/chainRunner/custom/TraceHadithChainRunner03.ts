import ChainManager from "@/LLMProviders/chainManager";
import { BaseSimpleChainRunner, SystemMessage } from "./BaseSimpleChainRunner";
import { getPromptTemplate, HadithNarrator, NarratorInfo, toArabicDigits } from "./utils";
import { TraceHadithChainRunner04 } from "./TraceHadithChainRunner04";
import { TraceHadithChainRunner06 } from "./TraceHadithChainRunner06";

export interface TraceHadithChainRunner03Input {
  allNarrators: NarratorInfo[];
  hadithNarrators: HadithNarrator[];
  hadithNarratorIndex: number;
}

export class TraceHadithChainRunner03 extends BaseSimpleChainRunner {
  private allNarratorIndex: number = -1;
  private finished: boolean = false;

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
        const first = result.find((r) => r.confidence === "High") ?? result[0];
        if (first) {
          this.allNarratorIndex = this.input.allNarrators.findIndex(
            (n) => n.islamWebIndex === first.id
          );
          if (this.allNarratorIndex !== -1) {
            const foundNarrator = this.input.allNarrators[this.allNarratorIndex];
            this.finished = this.input.hadithNarratorIndex >= this.input.hadithNarrators.length - 1;
            this.input.hadithNarrators[this.input.hadithNarratorIndex].indexInAllNarrators =
              this.allNarratorIndex;
            this.succeeded = true;
            return (
              `
تم العثور على **${foundNarrator.name}** في تهذيب الكمال [المجلد ${toArabicDigits(foundNarrator.part)} - الصفحة ${toArabicDigits(foundNarrator.page)}](https://shamela.ws/book/3722/${foundNarrator.shamelaIndex})
` + (!this.finished ? "جاري البحث عن من رووا عنه ..." : "\n\nجاري إنشاء الملفات ...")
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
    return this.finished
      ? new TraceHadithChainRunner06(this.chainManager, this.input)
      : new TraceHadithChainRunner04(this.chainManager, {
          ...this.input,
          allNarratorIndex: this.allNarratorIndex,
        });
  }
}
