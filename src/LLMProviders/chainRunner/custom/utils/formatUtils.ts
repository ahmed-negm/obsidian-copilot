import { TahdibNarrator } from "../models/narrator";

const OTHERS = "Others";
const BOOKS = [
  { symbol: "خ", name: "البخاري" },
  { symbol: "م", name: "مسلم" },
  { symbol: "ت", name: "الترمذي" },
  { symbol: "س", name: "النسائي" },
  { symbol: "ق", name: "ابن ماجه" },
  { symbol: "د", name: "أبي داود" },
];

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

export function toArabicDigits(str: string | number): string {
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  return String(str).replace(/[0-9]/g, (d) => arabic[parseInt(d)]);
}

export function toEnglishDigits(str: string | number): string {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  return String(str).replace(/[٠-٩]/g, (d) => arabicDigits.indexOf(d).toString());
}
