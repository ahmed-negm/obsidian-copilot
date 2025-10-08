import { logError } from "@/logger";
import { MarkdownView, Notice, TFile } from "obsidian";
import { NarratorInfo } from "../models/narrator";
import { getTemplate } from "./promptUtils";
import { toArabicDigits } from "./formatUtils";
import { PATHS, FILE_EXTENSIONS, TEMPLATES } from "../constants";
import { applyTemplateReplacements } from "./promptUtils";

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

function stripObsidianProperties(content: string): string {
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

export async function createFigureNote(
  narrator: NarratorInfo,
  knownName: string,
  teachers: string,
  students: string
): Promise<void> {
  try {
    const filePath = `${PATHS.NEW_FIGURES}/${narrator.name}${FILE_EXTENSIONS.MARKDOWN}`;

    // Check if file already exists
    const existingFile = app.vault.getAbstractFileByPath(filePath);
    if (existingFile instanceof TFile) {
      new Notice(`Note for ${narrator.name} already exists`);
      return;
    }

    const replacements = {
      NAME: narrator.name,
      KNOWN_NAME: knownName,
      PART: toArabicDigits(narrator.part),
      PAGE: toArabicDigits(narrator.page),
      SHAMELA_INDEX: narrator.shamelaIndex.toString(),
      TAHDHIB_ID: narrator.id?.toString() ?? "",
      DATE: new Date().toISOString().slice(0, 10),
      TEACHERS: teachers,
      STUDENTS: students,
    };

    const template = await getTemplate(TEMPLATES.MOHADITH);
    const noteContent = applyTemplateReplacements(template, replacements);

    await app.vault.create(filePath, noteContent);
    new Notice(`Created note for ${narrator.name}`);
  } catch (error) {
    logError(`Failed to create figure note for: ${narrator.name}`, error);
    new Notice(`Failed to create note for ${narrator.name}`);
    throw error;
  }
}
