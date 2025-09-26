import ChainManager from "@/LLMProviders/chainManager";
import { BaseSimpleChainRunner, SystemMessage } from "./BaseSimpleChainRunner";
import { TraceHadithChainRunner03Input } from "./TraceHadithChainRunner03";
import { getTemplate, setScore, toArabicDigits } from "./utils";
import { Notice } from "obsidian";
import { ChoiceSuggestModal } from "./ChoiceSuggestModal";

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

  async formatOutput(_response: string) {
    const message = "تم الانتهاء من تتبع جميع الرواة! 🎉";

    new Notice(message);

    this.setupQuiz();

    return message;
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

  async setupQuiz() {
    for (let i = 0; i < this.input.hadithNarrators.length - 1; i++) {
      const hadithNarrator = this.input.hadithNarrators[i].potentialPeople[0].knownName;
      const nextHadithNarrator = this.input.hadithNarrators[i + 1].potentialPeople[0].knownName;

      const choices = [
        ...this.input.hadithNarrators
          .filter(
            (n) =>
              n.potentialPeople[0].knownName !== hadithNarrator &&
              n.potentialPeople[0].knownName !== nextHadithNarrator
          )
          .slice(0, 2)
          .map((n) => n.potentialPeople[0].knownName),
        nextHadithNarrator,
      ].sort(() => Math.random() - 0.5);

      const choice = await new ChoiceSuggestModal(
        app,
        `روى ${hadithNarrator} هذا الحديث عن:`,
        choices
      ).openAndWait();

      await setScore(choice === nextHadithNarrator);
    }
  }
}
