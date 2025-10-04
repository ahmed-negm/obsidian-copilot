import { StepRunner } from "../base/StepRunner";
import { NarratorInfo } from "../models/narrator";
import { TraceNarratorsWorkflowState } from "../models/state";
import { getPromptTemplate, toArabicDigits } from "../utils";

export class VerifyNarratorsStep extends StepRunner<TraceNarratorsWorkflowState> {
  private matchingNarrators: NarratorInfo[] = [];
  private narratorToFind: string = "";

  getContextIntroMessage() {
    return this.state.hadithNarratorIndex === 0
      ? "سنبدأ الآن في تتبع الرواة من الأعلى واحداً يلو الآخر ..."
      : "لننتقل إلى الراوي التالي في السلسلة...";
  }

  async getUserPrompt() {
    this.narratorToFind =
      this.state.hadithNarrators[this.state.hadithNarratorIndex].potentialPeople[0].fullName;

    // Find all narrator info that matches the first 10 letters of the name
    this.matchingNarrators = this.state.allNarrators.filter((n) =>
      n.name?.startsWith(this.narratorToFind.slice(0, 10))
    );

    if (this.matchingNarrators.length === 0) {
      // If no matches found, try matching the first 3 letters
      this.matchingNarrators = this.state.allNarrators.filter((n) =>
        n.name?.startsWith(this.narratorToFind.slice(0, 3))
      );
    }

    if (this.matchingNarrators.length === 0) {
      // If still no matches found, return a prompt indicating no matches
      return this.narratorNotFoundMessage();
    }

    const promptTemplate = await getPromptTemplate("FindSymbolsStep");
    const prompt = promptTemplate.replaceAll("{{name_to_search}}", this.narratorToFind).replaceAll(
      "{{JSON}}",
      JSON.stringify(
        this.matchingNarrators.map((n) => ({
          id: n.islamWebIndex ?? 0,
          name: n.name ?? "",
        })),
        null,
        2
      )
    );

    return prompt;
  }

  async processResponse(response: string) {
    if (this.matchingNarrators.length === 0) {
      return {
        response: this.narratorNotFoundMessage() + "\n\n" + response,
        isSuccessful: false,
      };
    }

    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      const result = (
        JSON.parse(codeBlockMatch[1]) as {
          id: number;
          name: string;
          confidence: string;
        }[]
      ).filter((r) => r.confidence === "High");

      if (result.length === 1) {
        // Get the first high-confidence match or the first match
        const first = result[0];
        if (first) {
          const allNarratorIndex = this.state.allNarrators.findIndex(
            (n) => n.islamWebIndex === first.id
          );

          if (allNarratorIndex !== -1) {
            const foundNarrator = this.state.allNarrators[allNarratorIndex];

            // Update state
            this.state.hadithNarrators[this.state.hadithNarratorIndex].indexInAllNarrators =
              allNarratorIndex;

            const output = `
تم العثور على **${foundNarrator.name}** في تهذيب الكمال [المجلد ${toArabicDigits(foundNarrator.part)} - الصفحة ${toArabicDigits(foundNarrator.page)}](https://shamela.ws/book/3722/${foundNarrator.shamelaIndex})`;

            return {
              response: output,
              isSuccessful: true,
            };
          }
        }
      }
    }

    return {
      response,
      isSuccessful: false,
    };
  }

  private narratorNotFoundMessage() {
    return `لم يتم العثور على الراوي "${this.narratorToFind}" في تهذيب الكمال. الرجاء التحقق من صحة الاسم .`;
  }
}
