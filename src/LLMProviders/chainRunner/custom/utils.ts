// src/getSelection.ts

import { logError } from "@/logger";
import { MarkdownView } from "obsidian";

export type HadithNarrator = {
  name: string;
  potentialPeople: { fullName: string; knownName: string }[];
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
  try {
    const normalizedPath = filePath.replace(/\\/g, "/");
    const content = await app.vault.adapter.read(normalizedPath);
    return content;
  } catch (error) {
    logError("Failed to read vault file", { filePath, error });
    throw error;
  }
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
