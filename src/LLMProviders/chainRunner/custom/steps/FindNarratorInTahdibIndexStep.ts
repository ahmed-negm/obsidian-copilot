import { StepRunner } from "../base/StepRunner";
import { NarratorInfo } from "../models/narrator";
import { TraceNarratorsWorkflowState } from "../models/state";
import { getPromptTemplate, toArabicDigits, extractJsonCodeBlock } from "../utils";

export class FindNarratorInTahdibIndexStep extends StepRunner<TraceNarratorsWorkflowState> {
  private matchingNarrators: NarratorInfo[] = [];
  private narratorToFind: string = "";

  getContextIntroMessage() {
    return this.state.hadithNarratorIndex === 0
      ? "سنبدأ الآن في البحث عن الرواة في تهذيب الكمال ..."
      : "لننتقل إلى الراوي التالي في السلسلة...";
  }

  async getUserPrompt() {
    this.narratorToFind =
      this.state.hadithNarrators[this.state.hadithNarratorIndex].expectedFullName;

    // Find all narrator info that matches the first 20 letters of the name
    this.matchingNarrators = this.state.allNarrators.filter((n) =>
      n.name?.startsWith(this.narratorToFind.slice(0, 20))
    );

    if (this.matchingNarrators.length === 0) {
      // If no matches found, try matching the first 10 letters
      this.matchingNarrators = this.state.allNarrators.filter((n) =>
        n.name?.startsWith(this.narratorToFind.slice(0, 10))
      );
    }

    if (this.matchingNarrators.length === 0) {
      // If no matches found, try matching the first 3 letters
      this.matchingNarrators = this.state.allNarrators.filter((n) =>
        n.name?.startsWith(this.narratorToFind.slice(0, 3))
      );
    }

    if (this.matchingNarrators.length === 0 || this.matchingNarrators.length === 1) {
      return "";
    }

    const promptTemplate = await getPromptTemplate("FindNarratorInList");
    const prompt = promptTemplate.replaceAll("{{name_to_search}}", this.narratorToFind).replaceAll(
      "{{JSON}}",
      JSON.stringify(
        this.matchingNarrators.map((n) => ({
          id: n.index,
          name: n.name,
        })),
        null,
        2
      )
    );

    return prompt;
  }

  async processResponse(response: string) {
    if (this.matchingNarrators.length > 1) {
      const parsed =
        extractJsonCodeBlock<{ id: number; name: string; confidence: string }[]>(response);
      if (parsed) {
        const result = parsed.filter((r) => r.confidence === "High");
        if (result.length >= 1) {
          const allNarratorIndex = result[0].id;
          if (allNarratorIndex) {
            if (allNarratorIndex !== -1) {
              const foundNarrator = this.state.allNarrators[allNarratorIndex];
              if (!foundNarrator.id) {
                return {
                  response: this.narratorFoundMessage(foundNarrator) + " ولكن بدون رقم",
                  isSuccessful: false,
                };
              }
              // Update state
              this.state.hadithNarrators[this.state.hadithNarratorIndex].indexInAllNarrators =
                allNarratorIndex;
              return {
                response: this.narratorFoundMessage(foundNarrator),
                isSuccessful: true,
              };
            }
          }
        }
      }
    } else if (this.matchingNarrators.length === 1) {
      // Update state
      this.state.hadithNarrators[this.state.hadithNarratorIndex].indexInAllNarrators =
        this.matchingNarrators[0].index;

      return {
        response: this.narratorFoundMessage(this.matchingNarrators[0]),
        isSuccessful: true,
      };
    }

    return {
      response: this.narratorNotFoundMessage() + "\n\n" + response,
      isSuccessful: false,
    };
  }

  private narratorNotFoundMessage() {
    return `لم يتم العثور على الراوي "${this.narratorToFind}" في تهذيب الكمال. الرجاء التحقق من صحة الاسم .`;
  }

  private narratorFoundMessage(narrator: NarratorInfo) {
    return `
تم العثور على **${narrator.name}** في تهذيب الكمال [المجلد ${toArabicDigits(narrator.part)} - الصفحة ${toArabicDigits(narrator.page)}](https://shamela.ws/book/3722/${narrator.shamelaIndex})`;
  }
}
