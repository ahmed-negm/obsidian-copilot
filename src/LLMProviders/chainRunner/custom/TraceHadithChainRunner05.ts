import ChainManager from "@/LLMProviders/chainManager";
import { BaseSimpleChainRunner, SystemMessage } from "./BaseSimpleChainRunner";
import { TahdibNarrator, TraceHadithChainRunner04Input } from "./TraceHadithChainRunner04";
import { getPromptTemplate } from "./utils";
import { TraceHadithChainRunner03 } from "./TraceHadithChainRunner03";

export interface TraceHadithChainRunner05Input extends TraceHadithChainRunner04Input {
  tahdibNarrators: TahdibNarrator[];
}

export class TraceHadithChainRunner05 extends BaseSimpleChainRunner {
  constructor(
    chainManager: ChainManager,
    private input: TraceHadithChainRunner05Input
  ) {
    super(chainManager);
  }

  async formatInput(messages: SystemMessage[]) {
    const narratorToFind =
      this.input.hadithNarrators[this.input.hadithNarratorIndex + 1].potentialPeople[0].fullName;
    const narratorsToSearch = this.input.tahdibNarrators.map((narrator, index) => ({
      id: index,
      name: narrator.name,
    }));

    const promptTemplate = await getPromptTemplate("TraceHadithChainRunner03");
    const prompt = promptTemplate
      .replaceAll("{{name_to_search}}", narratorToFind)
      .replaceAll("{{JSON}}", JSON.stringify(narratorsToSearch, null, 2));

    return [{ role: "user", content: prompt }];
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
        const first = result.first();
        if (first) {
          const foundNarrator = this.input.tahdibNarrators[first.id];

          const symbols = foundNarrator.symbols
            .replace(/^\(|\)$/g, "")
            .split(" ")
            .filter((s) => s !== "خ");

          const tahdibBooks = this.getTahdibBooks(symbols);

          const updatedResponse =
            `✅ تم العثور على **${foundNarrator.name}** فيمن رووا عن **${this.input.hadithNarrators[this.input.hadithNarratorIndex].potentialPeople[0].knownName}** في  ` +
            "صحيح البخاري" +
            tahdibBooks;

          this.input.hadithNarratorIndex += 1;

          this.succeeded = this.input.hadithNarratorIndex < this.input.hadithNarrators.length;

          return (
            updatedResponse +
            (this.succeeded
              ? `\n\nجاري تتبع الراوي التالي في السند ...`
              : "\n\n\n\n🎉 تم الانتهاء من تتبع جميع الرواة!")
          );
        }
      }
    }

    return response;
  }

  includeChatHistory() {
    return false;
  }

  async nextStep() {
    return new TraceHadithChainRunner03(this.chainManager, {
      allNarrators: this.input.allNarrators,
      hadithNarrators: this.input.hadithNarrators,
      hadithNarratorIndex: this.input.hadithNarratorIndex,
    });
  }

  getTahdibBooks(symbols: string[]) {
    const unknownSymbols: string[] = [];
    if (!symbols.length) {
      return " فقط ";
    }
    let txt = "";
    for (const symbol of symbols) {
      const found = getTahdibSymbols().find((s) => s.symbol === symbol);
      if (found) {
        txt += " " + "و" + found.book;
      } else {
        unknownSymbols.push(symbol);
      }
    }

    return (
      txt + (unknownSymbols.length ? `\n\n⚠️ رموز غير معروفة: ${unknownSymbols.join(", ")}` : "")
    );
  }
}

const getTahdibSymbols = () => [
  { symbol: "خ", book: "صحيح البخاري" },
  { symbol: "ع", book: "باقي الكتب الستة" },
  { symbol: "خت", book: "صحيح البخاري تعليقًا" },
  { symbol: "ز", book: "كتاب القراءة خلف الإمام للبخاري" },
  { symbol: "ي", book: "كتاب رفع اليدين في الصلاة للبخاري" },
  { symbol: "بخ", book: "كتاب الأدم للبخاري" },
  { symbol: "عخ", book: "كتاب أفعال العباد للبخاري" },
  { symbol: "م", book: "صحيح مسلم" },
  { symbol: "مق", book: "مقدمة صحيح مسلم" },
  { symbol: "د", book: "سنن أبو داود" },
  { symbol: "مد", book: "كتاب المراسيل لأبو داود" },
  { symbol: "قد", book: "كتاب الرد على أهل القدر لأبو داود" },
  { symbol: "خد", book: "كتاب الناسخ والمنسوخ لأبو داود" },
  { symbol: "ف", book: "كتاب التفرد لأبو داود" },
  { symbol: "صد", book: "فضائل الأنصار لأبو داود" },
  { symbol: "ل", book: "كتاب المسائل لأبو داود" },
  { symbol: "كد", book: "مسند حديث مالك بن أنس لأبو داود" },
  { symbol: "ن", book: "سنن النسائي" },
  { symbol: "سي", book: "كتاب عمل يوم وليلة للنسائي" },
  { symbol: "ص", book: "كتاب خصائص أمير المؤمنين علي بن أبي طالب للنسائي" },
  { symbol: "عس", book: "مسند علي للنسائي" },
  { symbol: "كن", book: "مسند حديث مالك بن أنس للنسائي" },
  { symbol: "ق", book: "سنن ابن ماجة" },
  { symbol: "فق", book: "كتاب التفسير لابن ماجة القزويني" },
];
