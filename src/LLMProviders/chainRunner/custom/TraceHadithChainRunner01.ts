import { BaseSimpleChainRunner, SystemMessage } from "./BaseSimpleChainRunner";
import {
  getActiveNote,
  getPromptTemplate,
  HadithNarrator,
  NarratorInfo,
  readVaultFile,
  stripObsidianProperties,
  setScore,
} from "./utils";
import { ChoiceSuggestModal } from "./ui/ChoiceSuggestModal";

export class TraceHadithChainRunner01 extends BaseSimpleChainRunner {
  static trigger = "تتبع الرواة";
  private hadithNarrators: HadithNarrator[] = [];
  private allNarrators: NarratorInfo[] = [];
  private hadithLink: string = "";

  constructor(
    chainManager: any,
    private executeNextStep: boolean = true,
    private reverseHadithNarrators: boolean = true
  ) {
    super(chainManager);
  }

  async formatInput(messages: SystemMessage[]) {
    const userMessage = messages.last()!;
    const hadithNumber = userMessage?.content?.replace(TraceHadithChainRunner01.trigger, "").trim();

    const hadithText = hadithNumber
      ? await readVaultFile(`Sunnah/صحيح البخاري/البخاري-${hadithNumber}.md`)
      : await getActiveNote();
    this.hadithLink = hadithNumber
      ? `[[البخاري-${hadithNumber}]]`
      : `[[${app.workspace.getActiveFile()?.name || ""}]]`;
    const prompt = await getPromptTemplate("TraceHadithChainRunner01");

    messages[messages.length - 1] = {
      ...userMessage,
      content: `${prompt}\n\nHere is the Hadith text:\n\n '${stripObsidianProperties(hadithText)}'`,
    };
    return messages;
  }

  async formatOutput(response: string) {
    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      this.hadithNarrators = JSON.parse(codeBlockMatch[1]) as HadithNarrator[];

      if (this.executeNextStep) {
        for (const narrator of this.hadithNarrators) {
          if (narrator.name.split(" ").length > 2) {
            continue;
          }

          const potentialPerson = narrator.potentialPeople[0];
          const choices = [
            potentialPerson.knownName,
            potentialPerson.quizNames[0],
            potentialPerson.quizNames[1],
          ].sort(() => Math.random() - 0.5);

          const choice = await new ChoiceSuggestModal(
            app,
            `من هو ${narrator.name}؟`,
            choices
          ).openAndWait();

          await setScore(choice === potentialPerson.knownName);
        }
      }

      let narratorList = this.hadithNarrators.map((narrator: HadithNarrator) => {
        return `- **${narrator.name}**: ${narrator.potentialPeople.map((p) => p.knownName).join(" أو ")}`;
      });

      narratorList = this.reverseHadithNarrators ? narratorList.reverse() : narratorList;

      const bulletList = narratorList.join("\n");

      this.succeeded = true;

      let result = `
سند الحديث ${this.hadithLink} هو:

${bulletList}
`;

      if (this.executeNextStep) {
        result += `\n\nسنبدأ الآن في التحقق من الرواة واحداً يلو الآخر ...`;
      }

      return result;
    }

    return response;
  }

  includeChatHistory() {
    return false;
  }

  async nextStep() {
    if (this.executeNextStep) {
      const jsonString = await readVaultFile("_extras/Data/Tahdhib.json");
      this.allNarrators = JSON.parse(jsonString);
      // return new TraceHadithChainRunner03(this.chainManager, {
      //   allNarrators: this.allNarrators,
      //   hadithNarrators: this.hadithNarrators,
      //   hadithNarratorIndex: 0,
      // });
    }
    return null;
  }
}
