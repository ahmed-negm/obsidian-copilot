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
        const fileName = narrator.name.replace(/[/\\?%*:|"<>]/g, "-");
        const filePath = `Figures/${fileName}.md`;
        const noteExists = app.vault.getAbstractFileByPath(filePath);
        if (!noteExists) {
          const noteContent = (await getTemplate("Mohadith"))
            .replaceAll("{{NAME}}", narrator.name)
            .replaceAll("{{KNOWN_NAME}}", hadithNarrator.potentialPeople[0].knownName)
            .replaceAll("{{PART}}", toArabicDigits(narrator.part))
            .replaceAll("{{PAGE}}", toArabicDigits(narrator.page))
            .replaceAll("{{SHAMELA_INDEX}}", narrator.shamelaIndex.toString())
            .replaceAll("{{TAHDHIB_ID}}", narrator.id?.toString() ?? "")
            .replaceAll("{{DATE}}", new Date().toISOString().slice(0, 10));

          await app.vault.create(filePath, noteContent).catch((err) => {
            console.error("Error creating note:", err);
          });
        }

        const activeFile = app.workspace.getActiveFile();
        if (activeFile) {
          const fileContent = await app.vault.read(activeFile);
          const linkToNote = `[[${fileName}|${hadithNarrator.name}]]`;
          const updatedContent = fileContent.replace(hadithNarrator.name, linkToNote);
          await app.vault.modify(activeFile, updatedContent);
        }
      }
    }
  }
}
