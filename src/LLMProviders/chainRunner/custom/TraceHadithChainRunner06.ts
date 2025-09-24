import ChainManager from "@/LLMProviders/chainManager";
import { BaseSimpleChainRunner, SystemMessage } from "./BaseSimpleChainRunner";
import { TraceHadithChainRunner03Input } from "./TraceHadithChainRunner03";
import { getTemplate, toArabicDigits } from "./utils";

type TraceHadithChainRunner06Input = TraceHadithChainRunner03Input;

export class TraceHadithChainRunner06 extends BaseSimpleChainRunner {
  constructor(
    chainManager: ChainManager,
    private input: TraceHadithChainRunner06Input
  ) {
    super(chainManager);
  }

  async formatInput(_messages: SystemMessage[]) {
    await this.createNewNotes();
    return [{ role: "user", content: "Hello" }];
  }

  async formatOutput(response: string) {
    return "تم الانتهاء من تتبع جميع الرواة! 🎉";
  }

  includeChatHistory() {
    return false;
  }

  async createNewNotes() {
    for (const hadithNarrator of this.input.hadithNarrators) {
      if (hadithNarrator.indexInAllNarrators !== undefined) {
        const narrator = this.input.allNarrators[hadithNarrator.indexInAllNarrators];
        const fileName = `test-figures/${narrator.name.replace(/[/\\?%*:|"<>]/g, "-")}.md`;
        const noteExists = app.vault.getAbstractFileByPath(fileName);
        if (noteExists) {
          continue; // Skip if note already exists
        }

        const noteContent = (await getTemplate("Mohadith"))
          .replaceAll("{{NAME}}", narrator.name)
          .replaceAll("{{KNOWN_NAME}}", hadithNarrator.potentialPeople[0].knownName)
          .replaceAll("{{PART}}", toArabicDigits(narrator.part))
          .replaceAll("{{PAGE}}", toArabicDigits(narrator.page))
          .replaceAll("{{SHAMELA_INDEX}}", narrator.shamelaIndex.toString())
          .replaceAll("{{DATE}}", new Date().toISOString().slice(0, 10));

        await app.vault.create(fileName, noteContent).catch((err) => {
          console.error("Error creating note:", err);
        });
      }
    }
  }
}
