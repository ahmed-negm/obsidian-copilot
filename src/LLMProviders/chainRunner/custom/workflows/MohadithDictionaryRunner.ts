import { BaseSimpleChainRunner } from "../base/BaseSimpleChainRunner";
import { readVaultFile } from "../utils";
import { PATHS } from "../constants";
import { extractNarrators } from "../utils/hadithUtils";
import { App, FuzzySuggestModal, TFile } from "obsidian";

class MohadithFileModal extends FuzzySuggestModal<TFile> {
  private resolvePromise!: (value: TFile | null) => void;
  private selectedItem: TFile | null = null;

  constructor(
    app: App,
    private mohadithFiles: TFile[]
  ) {
    super(app);
    this.setPlaceholder("اختر راويا");
  }

  getItems(): TFile[] {
    return this.mohadithFiles;
  }

  getItemText(file: TFile): string {
    return file.basename;
  }

  onChooseItem(file: TFile, _evt: MouseEvent | KeyboardEvent): void {
    this.selectedItem = file;
  }

  onClose(): void {
    // Use setTimeout to ensure onChooseItem completes first
    setTimeout(() => {
      this.resolvePromise(this.selectedItem);
    }, 0);
    super.onClose();
  }

  pick(): Promise<TFile | null> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }
}

export class MohadithDictionaryRunner extends BaseSimpleChainRunner {
  private selectedFile: string | undefined;

  async getUserPrompt(_userMessage: string): Promise<string> {
    const allFiles = app.vault.getMarkdownFiles();
    const mohadithFiles = allFiles.filter((file) => file.path.startsWith(PATHS.FIGURES));

    const modal = new MohadithFileModal(app, mohadithFiles);
    const selectedFile = await modal.pick();

    this.selectedFile = selectedFile?.basename;

    return "";
  }

  async processResponse(_response: string): Promise<string> {
    if (!this.selectedFile) {
      return "";
    }

    const allFiles = app.vault.getMarkdownFiles();
    const bukhariFiles = allFiles.filter((file) => file.path.startsWith(PATHS.BUKHARI));

    const teachersMap = new Map<string, string[]>();
    const studentsMap = new Map<string, string[]>();
    for (const file of bukhariFiles) {
      const content = await readVaultFile(file.path);
      const hadithNarrators = extractNarrators(content);
      const index = hadithNarrators.indexOf(this.selectedFile!);
      if (index !== -1) {
        if (index > 0) {
          const teacher = hadithNarrators[index - 1];
          if (!studentsMap.has(teacher)) {
            studentsMap.set(teacher, []);
          }
          studentsMap.get(teacher)!.push(file.path);
        }
        if (index < hadithNarrators.length - 1) {
          const student = hadithNarrators[index + 1];
          if (!teachersMap.has(student)) {
            teachersMap.set(student, []);
          }
          teachersMap.get(student)!.push(file.path);
        }
      }
    }

    // sort teachers and students alphabetically
    const sortedTeachersMap = new Map(
      Array.from(teachersMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    );
    const sortedStudentsMap = new Map(
      Array.from(studentsMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    );

    // Generate markdown format
    let markdown = "";

    // Add teachers section (رَوَى عَن)
    if (sortedTeachersMap.size > 0) {
      markdown += `### رَوَى عَن:\n`;
      for (const [teacher, files] of sortedTeachersMap.entries()) {
        const fileLinks = files
          .map((filePath) => {
            const fileName = filePath.replace(/^.*\//, "").replace(/\.md$/, "");
            return `[[${fileName}]]`;
          })
          .join(" و ");
        markdown += `- **${teacher}** في ${fileLinks}\n`;
      }
      markdown += "\n";
    }

    // Add students section (رَوَى عَنه)
    if (sortedStudentsMap.size > 0) {
      markdown += `### رَوَى عَنه:\n`;
      for (const [student, files] of sortedStudentsMap.entries()) {
        const fileLinks = files
          .map((filePath) => {
            const fileName = filePath.replace(/^.*\//, "").replace(/\.md$/, "");
            return `[[${fileName}]]`;
          })
          .join(" و ");
        markdown += `- **${student}** في ${fileLinks}\n`;
      }
    }

    // Create or overwrite note in PATHS.TEMP with the markdown content
    const fileName = `${PATHS.TEMP}/${this.selectedFile}.md`;
    let file = app.vault.getAbstractFileByPath(fileName);

    if (file instanceof TFile) {
      // File exists, modify it
      await app.vault.modify(file, markdown);
    } else {
      // File doesn't exist, create it
      file = await app.vault.create(fileName, markdown);
    }

    // Open the file in a new leaf and focus on it
    const leaf = app.workspace.getLeaf(true);
    await leaf.openFile(file as TFile, { state: { mode: "preview" } });

    return "";
  }
}
