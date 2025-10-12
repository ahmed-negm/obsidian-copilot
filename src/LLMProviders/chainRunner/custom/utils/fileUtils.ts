import { logError } from "@/logger";
import { MarkdownView, Notice } from "obsidian";

export async function getActiveNote(stripProperties: boolean = true): Promise<string> {
  try {
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
      return "";
    }

    const fileContent = await app.vault.read(activeFile);
    return stripProperties ? stripObsidianProperties(fileContent) : fileContent;
  } catch (error) {
    logError("Error reading active note", error);
    new Notice("Failed to read active note");
    return "";
  }
}

export function getSelectedText(): string {
  try {
    const view = app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return "";

    if (view.getMode() === "source" || view.getMode() === "preview") {
      const editor = view.editor;
      if (editor) {
        const selection = editor.getSelection();
        if (selection && selection.length > 0) {
          return selection;
        }
      }
    }

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
  } catch (error) {
    logError("Error getting selected text", error);
    return "";
  }
}

export function stripObsidianProperties(content: string): string {
  return content.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

export async function readVaultFile(filePath: string): Promise<string> {
  try {
    const normalizedPath = normalizePath(filePath);
    return await app.vault.adapter.read(normalizedPath);
  } catch (error) {
    logError(`Failed to read file: ${filePath}`, error);
    throw new Error(`Failed to read file: ${filePath}`);
  }
}

export async function updateVaultFile(filePath: string, content: string): Promise<void> {
  try {
    const normalizedPath = normalizePath(filePath);
    await app.vault.adapter.write(normalizedPath, content);
  } catch (error) {
    logError(`Failed to update file: ${filePath}`, error);
    throw new Error(`Failed to update file: ${filePath}`);
  }
}

export async function readFileFromExternalVault(fullPath: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs/promises");
    return await fs.readFile(fullPath, "utf-8");
  } catch (error) {
    logError(`Failed to read external file: ${fullPath}`, error);
    throw new Error("Filesystem access is not available or file could not be read");
  }
}
