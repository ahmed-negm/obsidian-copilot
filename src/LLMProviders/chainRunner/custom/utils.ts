// src/getSelection.ts

import { MarkdownView } from "obsidian";

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
