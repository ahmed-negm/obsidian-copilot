import { TahdibNarrator } from "../models/narrator";

const OTHERS = "Others";
const BOOKS = [
  { symbol: "خ", name: "البخاري" },
  { symbol: "م", name: "مسلم" },
  { symbol: "ت", name: "الترمذي" },
  { symbol: "س", name: "النسائي" },
  { symbol: "ق", name: "ابن ماجه" },
  { symbol: "د", name: "أبي داود" },
] as const;

export type BookName = (typeof BOOKS)[number]["name"];
const HEADERS = ["الاسم", ...BOOKS.map((b) => b.name), OTHERS];

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
      result[h] = "✔";
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
  result[OTHERS] = others.join(" ");
  return result;
}

function narratorToRow(narrator: TahdibNarrator): string {
  const marks = processSymbols(narrator.symbols);
  return `| ${narrator.name} | ${BOOKS.map((b) => marks[b.name]).join(" | ")} | ${marks[OTHERS]} |`;
}

function isCheck(cell: string | undefined): boolean {
  if (!cell) return false;
  return /✔|✓|✅/.test(cell);
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

    // If the name is Obsedian link like [[Name|Display]], extract the actual name part
    const linkMatch = name.match(/\[\[(.+?)(\|.+?)?\]\]/);
    if (linkMatch) {
      // Use the part before the pipe if present, else the whole inside of [[ ]]
      const extractedName = linkMatch[1].trim();
      if (extractedName) {
        narrators.push(extractedName.replace(/\\+/g, ""));
      }
      continue;
    }

    narrators.push(name);
  }

  return narrators;
}

const studentsTitle = "رَوَى عَنه:";
const teachersTitle = "رَوَى عَن:";

export function findStudents(markdown: string, book: BookName) {
  const studentLines = extractFirstTableLines(markdown, studentsTitle);
  return parseTableLines(studentLines, book);
}

export function updateStudents(markdown: string, displayText: string, link: string) {
  const studentLines = extractFirstTableLines(markdown, studentsTitle);
  const index = studentLines.findIndex((line) => line.includes(displayText));
  if (index !== -1) {
    const updatedLine = studentLines[index].replace(displayText, `[[${link}\\|${displayText}]]`);
    markdown = markdown.replace(studentLines[index], updatedLine);
  }
  return markdown;
}

export function findTeachers(markdown: string, book: BookName) {
  const teacherLines = extractFirstTableLines(markdown, teachersTitle);
  return parseTableLines(teacherLines, book);
}

export function toArabicDigits(str: string | number): string {
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  return String(str).replace(/[0-9]/g, (d) => arabic[parseInt(d)]);
}

export function toEnglishDigits(str: string | number): string {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  return String(str).replace(/[٠-٩]/g, (d) => arabicDigits.indexOf(d).toString());
}
