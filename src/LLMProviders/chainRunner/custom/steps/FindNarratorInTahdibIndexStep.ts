import { StepRunner } from "../base/StepRunner";
import { MSG_FOUND_NARRATOR, MSG_NARRATOR_NOT_FOUND } from "../constants";
import { NarratorInfo } from "../models/narrator";
import { TraceNarratorsWorkflowState } from "../models/state";
import {
  getPromptTemplate,
  toArabicDigits,
  extractJsonCodeBlock,
  populateTemplate,
} from "../utils";

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
    this.matchingNarrators = this.state.allNarrators.filter((n) =>
      n.name?.startsWith(this.narratorToFind.slice(0, 20))
    );
    if (this.matchingNarrators.length === 0) {
      this.matchingNarrators = this.state.allNarrators.filter((n) =>
        n.name?.startsWith(this.narratorToFind.slice(0, 10))
      );
    }
    if (this.matchingNarrators.length === 0) {
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
    return populateTemplate(MSG_NARRATOR_NOT_FOUND, { narrator: this.narratorToFind });
  }

  private narratorFoundMessage(narrator: NarratorInfo) {
    return populateTemplate(MSG_FOUND_NARRATOR, {
      narrator: narrator.name,
      part: toArabicDigits(narrator.part),
      page: toArabicDigits(narrator.page),
      shamelaIndex: narrator.shamelaIndex,
    });
  }
}
