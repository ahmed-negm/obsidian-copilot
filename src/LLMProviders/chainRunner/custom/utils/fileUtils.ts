import { MarkdownView } from "obsidian";

/**
 * Get the content of the active note in Obsidian
 * @returns Promise resolving to the content of the active note
 */
export async function getActiveNote(): Promise<string> {
  const activeFile = app.workspace.getActiveFile();
  let fileContent = "";
  if (activeFile) {
    fileContent = await app.vault.read(activeFile);
  }
  return fileContent;
}

/**
 * Get the selected text in the active view
 * @returns The selected text or an empty string if no selection
 */
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

/**
 * Remove Obsidian front matter from content
 * @param content The content to process
 * @returns The content without front matter
 */
export function stripObsidianProperties(content: string): string {
  return content.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

/**
 * Read a file from the vault
 * @param filePath Path to the file
 * @returns Promise resolving to the file content
 */
export async function readVaultFile(filePath: string): Promise<string> {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const content = await app.vault.adapter.read(normalizedPath);
  return content;
}

/**
 * Update a file in the vault
 * @param filePath Path to the file
 * @param content New content to write
 * @returns Promise resolving when the file is updated
 */
export async function updateVaultFile(filePath: string, content: string): Promise<void> {
  const normalizedPath = filePath.replace(/\\/g, "/");
  await app.vault.adapter.write(normalizedPath, content);
}
