import { logError } from "@/logger";
import { TFile, Notice } from "obsidian";
import { BOOKS, PATHS } from "../constants";
import { NarratorInfo } from "../models/narrator";
import { getTemplate, populateTemplate } from "./templateUtils";
import { getSignedUrl, toArabicDigits } from "./variousUtils";

export type BookName = (typeof BOOKS)[number]["name"];

const OTHERS_COLUMN = "Others";
const STUDENTS_TITLE = "رَوَى عَنه:";
const TEACHERS_TITLE = "رَوَى عَن:";
const CHECKMARKS = ["✔", "✓", "✅"];
const HEADERS = ["الاسم", ...BOOKS.map((b) => b.name), OTHERS_COLUMN];

export interface TahdibNarrator {
  name: string;
  symbols: string;
}

export function generateMarkdownTable(narrators: TahdibNarrator[]): string {
  const headerRow = `| ${HEADERS.join(" | ")} |`;
  const separatorRow = `| ${HEADERS.map(() => "---").join(" | ")} |`;
  const rows = narrators.map(narratorToRow);
  return [headerRow, separatorRow, ...rows].join("\n");
}

function processSymbols(symbols: string): Record<string, string> {
  const result: Record<string, string> = {};
  HEADERS.forEach((h) => (result[h] = ""));

  if (!symbols) return result;

  const clean = symbols.replace(/[()]/g, "").trim();
  const chars = clean.split(" ");

  // If "ع" or "٤" is present, mark all columns with check mark
  if (chars.includes("ع") || chars.includes("٤")) {
    for (const h of HEADERS.slice(0, -1)) {
      result[h] = CHECKMARKS[0];
    }
    return result;
  }

  const used = new Set<string>();
  for (const { symbol, name } of BOOKS) {
    if (chars.includes(symbol)) {
      result[name] = "✔";
      used.add(symbol);
    }
  }

  const others = chars.filter((ch) => !used.has(ch) && ch !== "");
  result[OTHERS_COLUMN] = others.join(" ");
  return result;
}

function narratorToRow(narrator: TahdibNarrator): string {
  const marks = processSymbols(narrator.symbols);
  return `| ${narrator.name} | ${BOOKS.map((b) => marks[b.name]).join(" | ")} | ${marks[OTHERS_COLUMN]} |`;
}

function isCheck(cell: string | undefined): boolean {
  if (!cell) return false;
  return CHECKMARKS.some((mark) => cell.includes(mark));
}

function extractFirstTableLines(markdown: string, sectionTitle: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const headerLineIndex = lines.findIndex((l) => l.trim().startsWith(`## ${sectionTitle}`));
  if (headerLineIndex === -1) return [];

  // find first table line after the header
  let i = headerLineIndex + 1;
  // skip non-table lines until a '|' line appears
  while (i < lines.length && !lines[i].trim().startsWith("|")) i++;
  if (i >= lines.length) return [];

  // collect consecutive '|' lines (the first table only)
  const tableLines: string[] = [];
  for (; i < lines.length; i++) {
    if (lines[i].trim().startsWith("|")) tableLines.push(lines[i]);
    else break; // stop at first non-table line after table started
  }

  return tableLines;
}

function parseTableLines(tableLines: string[], book?: BookName): string[] {
  if (tableLines.length === 0) return [];

  // Expect header + separator + data...
  if (tableLines.length <= 2) return []; // no data rows

  const dataLines = tableLines.slice(2); // skip header and separator rows
  const nonNameCount = HEADERS.length - 1; // 7

  const narrators: string[] = [];

  // Find the column index for the given book
  let bookColIdx: number | undefined = undefined;
  if (book) {
    bookColIdx = HEADERS.indexOf(book);
    if (bookColIdx === -1) bookColIdx = undefined;
  }

  for (const raw of dataLines) {
    // split by '|' but preserve empty slots
    const parts = raw.split("|").map((p) => p.trim());
    // remove leading empty slot if line begins with '|'
    if (parts.length > 0 && parts[0] === "") parts.shift();
    // remove trailing empty slot if line ends with '|'
    if (parts.length > 0 && parts[parts.length - 1] === "") parts.pop();

    // If too many columns, the name likely contained '|' — reconstruct name by
    // taking everything except last `nonNameCount` columns as the name.
    let cols: string[] = [];
    if (parts.length > HEADERS.length) {
      const rest = parts.slice(-nonNameCount);
      const nameParts = parts.slice(0, parts.length - nonNameCount);
      const name = nameParts.join(" | ").trim();
      cols = [name, ...rest];
    } else {
      // if fewer, pad with empty strings to keep positions stable
      cols = parts.slice(0);
      while (cols.length < HEADERS.length) cols.push("");
    }

    // Now cols.length should be >= HEADERS.length (we padded)
    // Take first HEADERS.length elements to be safe
    cols = cols.slice(0, HEADERS.length);

    const name = cols[0].trim();

    // If book is specified, only include narrators who have a checkmark in that book column
    if (bookColIdx !== undefined) {
      const cell = cols[bookColIdx];
      if (!isCheck(cell)) continue;
    }

    // If the name is Obsidian link like [[Name|Display]], extract the actual name part
    const linkMatch = name.match(/\[\[(.+?)(\|.+?)?\]\]/);
    if (linkMatch) {
      // Use the part before the pipe if present, else the whole inside of [[ ]]
      const extractedName = linkMatch[1].trim();
      if (extractedName) {
        narrators.push("-- " + extractedName.replace(/\\+/g, ""));
      }
      continue;
    }

    narrators.push(name);
  }

  return narrators;
}

export function findStudents(markdown: string, book: BookName) {
  const studentLines = extractFirstTableLines(markdown, STUDENTS_TITLE);
  return parseTableLines(studentLines, book);
}

export function updateStudents(markdown: string, displayText: string, link: string) {
  const studentLines = extractFirstTableLines(markdown, STUDENTS_TITLE);
  const index = studentLines.findIndex((line) => line.includes(displayText));
  if (index !== -1) {
    const updatedLine = studentLines[index].replace(displayText, `[[${link}\\|${displayText}]]`);
    markdown = markdown.replace(studentLines[index], updatedLine);
  }
  return markdown;
}

export function findTeachers(markdown: string, book: BookName) {
  const teacherLines = extractFirstTableLines(markdown, TEACHERS_TITLE);
  return parseTableLines(teacherLines, book);
}

export function updateTeachers(markdown: string, displayText: string, link: string) {
  const teacherLines = extractFirstTableLines(markdown, TEACHERS_TITLE);
  const index = teacherLines.findIndex((line) => line.includes(displayText));
  if (index !== -1) {
    const updatedLine = teacherLines[index].replace(displayText, `[[${link}\\|${displayText}]]`);
    markdown = markdown.replace(teacherLines[index], updatedLine);
  }
  return markdown;
}

export async function createFigureNote(
  narrator: NarratorInfo,
  knownName: string,
  teachers: string,
  students: string
): Promise<void> {
  try {
    const filePath = `${PATHS.FIGURES}/${narrator.name}.md`;

    // Check if file already exists
    const existingFile = app.vault.getAbstractFileByPath(filePath);
    if (existingFile instanceof TFile) {
      new Notice(`Note for ${narrator.name} already exists`);
      return;
    }

    const replacements = {
      NAME: narrator.name,
      SIGNED_NAME: getSignedUrl(toArabicDigits(narrator.id!) + "-" + narrator.name),
      KNOWN_NAME: knownName,
      PART: toArabicDigits(narrator.part),
      PAGE: toArabicDigits(narrator.page),
      SHAMELA_INDEX: narrator.shamelaIndex.toString(),
      TAHDHIB_ID: narrator.id?.toString() ?? "",
      DATE: new Date().toISOString().slice(0, 10),
      TEACHERS: teachers,
      STUDENTS: students,
    };

    const template = await getTemplate("Mohadith");
    const noteContent = populateTemplate(template, replacements);

    await app.vault.create(filePath, noteContent);
    new Notice(`Created note for ${narrator.name}`);
  } catch (error) {
    logError(`Failed to create figure note for: ${narrator.name}`, error);
    new Notice(`Failed to create note for ${narrator.name}`);
    throw error;
  }
}
