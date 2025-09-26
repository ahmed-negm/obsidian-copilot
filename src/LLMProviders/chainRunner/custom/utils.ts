import { MarkdownView, Notice, requestUrl } from "obsidian";

export type HadithNarrator = {
  name: string;
  potentialPeople: { fullName: string; knownName: string; quizNames: string[] }[];
  indexInAllNarrators?: number;
};

export type NarratorInfo = {
  id: number | null;
  name: string;
  part: number;
  page: number;
  islamWebIndex: number;
  shamelaIndex: number;
};

export async function getActiveNote() {
  const activeFile = app.workspace.getActiveFile();
  let fileContent = "";
  if (activeFile) {
    fileContent = await app.vault.read(activeFile);
  }
  return fileContent;
}

export function getSelectedText(): string {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view) return "";

  // Case 1: Source mode or Live Preview (editor available)
  if (view.getMode() === "source" || view.getMode() === "preview") {
    const editor = view.editor;
    if (editor) {
      const selection = editor.getSelection();
      if (selection && selection.length > 0) {
        return selection;
      }
    }
  }

  // Case 2: Reading/View mode (DOM selection)
  if (view.getMode() === "preview") {
    const previewEl = view.containerEl.querySelector(".markdown-preview-view");
    if (previewEl) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (previewEl.contains(range.commonAncestorContainer)) {
          return selection.toString();
        }
      }
    }
  }

  return "";
}

export function stripObsidianProperties(content: string): string {
  return content.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

export async function readVaultFile(filePath: string): Promise<string> {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const content = await app.vault.adapter.read(normalizedPath);
  return content;
}

export async function updateVaultFile(filePath: string, content: string): Promise<void> {
  const normalizedPath = filePath.replace(/\\/g, "/");
  await app.vault.adapter.write(normalizedPath, content);
}

export function toArabicDigits(str: string | number): string {
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  return String(str).replace(/[0-9]/g, (d) => arabic[parseInt(d)]);
}

export async function getPromptTemplate(name: string) {
  return readVaultFile(`_extras/Prompt/${name}.md`);
}

export async function getTemplate(name: string) {
  return readVaultFile(`_extras/Templates/${name}.md`);
}

export async function setScore(isCorrect: boolean) {
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

  const score = ((isCorrect ? correct + 1 : correct) / (total + 1)) * 100;
  new Notice(
    (isCorrect ? "إجابة صحيحة ✅٠" : "إجابة خاطئة ❌٠") +
      "\n\n" +
      `الدقة : ${toArabicDigits(score.toFixed(0))}% إجماليًا`
  );

  return score;
}

export async function getHtmlContent(url: string): Promise<string> {
  console.log(`Starting to fetch URL: '${url}' ...`);
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const response = await requestUrl({
        url,
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Obsidian plugin)",
        },
      });
      console.log(`Finished fetching URL: '${url}'`);

      return response.text;
    } catch (err) {
      lastError = err;
      if (attempt < 5) {
        console.warn(`Attempt ${attempt} failed for URL: '${url}'. Retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }
  throw lastError;
}
