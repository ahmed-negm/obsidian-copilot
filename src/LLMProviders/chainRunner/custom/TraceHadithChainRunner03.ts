import ChainManager from "@/LLMProviders/chainManager";
import { BaseSimpleChainRunner, SystemMessage } from "./BaseSimpleChainRunner";
import { Narrator } from "./TraceHadithChainRunner01";
import { readVaultFile, toArabicDigits } from "./utils";

export interface NarratorInfo {
  id: number | null;
  name: string;
  part: number;
  page: number;
  islamWebIndex: number;
  shamelaIndex: number;
}

export class TraceHadithChainRunner03 extends BaseSimpleChainRunner {
  private allNarrators: NarratorInfo[];

  constructor(
    chainManager: ChainManager,
    private hadithNarrators: Narrator[],
    private currentIndex: number = 0
  ) {
    super(chainManager);
  }

  async formatInput(messages: SystemMessage[]): Promise<SystemMessage[]> {
    const narratorToFind = this.hadithNarrators[this.currentIndex].potentialFullNames[0];

    const jsonString = await readVaultFile("_extras/Data/Tahdhib.json");
    this.allNarrators = JSON.parse(jsonString);

    // Find all narrator info that matches the first 3 letters of the name
    const matchingNarrators = this.allNarrators
      .filter((n) => n.name?.startsWith(narratorToFind.slice(0, 3)))
      .map((n) => ({
        id: n.islamWebIndex ?? 0,
        name: n.name ?? "",
      }));

    const prompt = (await readVaultFile("_extras/Prompt/TraceHadithChainRunner03.md"))
      .replaceAll("{{name_to_search}}", narratorToFind)
      .replaceAll("{{JSON}}", JSON.stringify(matchingNarrators, null, 2));

    return [messages[0], { role: "user", content: prompt }];
  }

  formatOutput(response: string): string {
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
          const foundNarrator = this.allNarrators.find((n) => n.islamWebIndex === first.id);
          if (foundNarrator) {
            return `
تم العثور على **${foundNarrator.name}** في تهذيب الكمال [المجلد ${toArabicDigits(foundNarrator.part)} - الصفحة ${toArabicDigits(foundNarrator.page)}](https://shamela.ws/book/3722/${foundNarrator.shamelaIndex})
جاري البحث عن من رووا عنه ...
`;
          }
          return response;
        }
      }
    }

    return response;
  }

  includeChatHistory(): boolean {
    return false;
  }
}
