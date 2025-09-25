import { BaseSimpleChainRunner, SystemMessage } from "./BaseSimpleChainRunner";
import { TraceHadithChainRunner03 } from "./TraceHadithChainRunner03";
import {
  getActiveNote,
  getPromptTemplate,
  HadithNarrator,
  NarratorInfo,
  readVaultFile,
  stripObsidianProperties,
  toArabicDigits,
  updateVaultFile,
} from "./utils";
import { ChoiceSuggestModal } from "./ChoiceSuggestModal";
import { Notice } from "obsidian";

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

      for (const narrator of this.hadithNarrators) {
        if (narrator.name.split(" ").length > 2) {
          continue;
        }

        const potentialPerson = narrator.potentialPeople[0];
        // Create and shuffle the choices array
        const choices = [
          potentialPerson.knownName,
          potentialPerson.quizNames[0],
          potentialPerson.quizNames[1],
        ].sort(() => Math.random() - 0.5); // Simple shuffle using sort with random comparator

        const choice = await new ChoiceSuggestModal(
          app,
          `من هو ${narrator.name}؟`,
          choices
        ).openAndWait();

        const isCorrect = choice === potentialPerson.knownName;
        const score = await this.updateScore(isCorrect);
        new Notice(
          (isCorrect ? "إجابة صحيحة ✅٠" : "إجابة خاطئة ❌٠") +
            "\n\n" +
            `الدقة : ${toArabicDigits(score.toFixed(0))}% إجماليًا`
        );
      }

      const jsonString = await readVaultFile("_extras/Data/Tahdhib.json");
      this.allNarrators = JSON.parse(jsonString);

      const bulletList = this.hadithNarrators
        .reverse()
        .map((narrator: HadithNarrator) => {
          return `- **${narrator.name}**: (${narrator.potentialPeople.first()?.knownName})`;
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

  private async updateScore(isCorrect: boolean) {
    const scoreFile = "_extras/Data/Score.json";
    const jsonString = await readVaultFile(scoreFile);
    const { correct, total } = JSON.parse(jsonString) as { correct: number; total: number };
    await updateVaultFile(
      scoreFile,
      JSON.stringify(
        {
          correct: isCorrect ? correct + 1 : correct,
          total: total + 1,
        },
        null,
        2
      )
    );

    return ((isCorrect ? correct + 1 : correct) / (total + 1)) * 100;
  }

  includeChatHistory() {
    return false;
  }

  nextStep() {
    return new TraceHadithChainRunner03(this.chainManager, {
      allNarrators: this.allNarrators,
      hadithNarrators: this.hadithNarrators,
      hadithNarratorIndex: 0,
    });
  }
}
