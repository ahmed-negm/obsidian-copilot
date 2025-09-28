import { StepRunner } from "../base/StepRunner";
import { TraceNarratorsWorkflowState } from "../models/state";
import { getPromptTemplate, toArabicDigits } from "../utils";

export class VerifyNarratorsStep extends StepRunner<TraceNarratorsWorkflowState> {
  getContextIntroMessage() {
    return this.state.hadithNarratorIndex === 0
      ? "سنبدأ الآن في تتبع الرواة من الأعلى واحداً يلو الآخر ..."
      : "لننتقل إلى الراوي التالي في السلسلة...";
  }

  async getUserPrompt() {
    const narratorToFind =
      this.state.hadithNarrators[this.state.hadithNarratorIndex].potentialPeople[0].fullName;

    // Find all narrator info that matches the first 3 letters of the name
    const matchingNarrators = this.state.allNarrators
      .filter((n) => n.name?.startsWith(narratorToFind.slice(0, 3)))
      .map((n) => ({
        id: n.islamWebIndex ?? 0,
        name: n.name ?? "",
      }));

    const promptTemplate = await getPromptTemplate("FindSymbolsStep");
    const prompt = promptTemplate
      .replaceAll("{{name_to_search}}", narratorToFind)
      .replaceAll("{{JSON}}", JSON.stringify(matchingNarrators, null, 2));

    return prompt;
  }

  async processResponse(response: string) {
    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      const result = JSON.parse(codeBlockMatch[1]) as {
        id: number;
        name: string;
        confidence: string;
      }[];

      if (result.length > 0) {
        // Get the first high-confidence match or the first match
        const first = result.find((r) => r.confidence === "High") ?? result[0];
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
}
