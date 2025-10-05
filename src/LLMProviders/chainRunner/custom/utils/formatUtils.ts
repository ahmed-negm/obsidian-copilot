import { TahdibNarrator } from "../models/narrator";

const SYMBOL_MAP: Record<string, string> = {
  خ: "Bukhari",
  م: "Muslim",
  ت: "Termezi",
  س: "Nasaai",
  ق: "Ibn Maga",
  د: "Abu Dawood",
};

const HEADERS = [
  "Name",
  "Bukhari",
  "Muslim",
  "Termezi",
  "Nasaai",
  "Ibn Maga",
  "Abu Dawood",
  "Others",
];

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
  for (const ch of chars) {
    if (SYMBOL_MAP[ch]) {
      result[SYMBOL_MAP[ch]] = "✔";
      used.add(ch);
    }
  }

  const others = chars.filter((ch) => !used.has(ch) && ch !== "");
  result["Others"] = others.join(" ");
  return result;
}

function narratorToRow(narrator: TahdibNarrator): string {
  const marks = processSymbols(narrator.symbols);
  return `| ${narrator.name} | ${marks["Bukhari"]} | ${marks["Muslim"]} | ${marks["Termezi"]} | ${marks["Nasaai"]} | ${marks["Ibn Maga"]} | ${marks["Abu Dawood"]} | ${marks["Others"]} |`;
}

export function toArabicDigits(str: string | number): string {
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  return String(str).replace(/[0-9]/g, (d) => arabic[parseInt(d)]);
}

export function toEnglishDigits(str: string | number): string {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  return String(str).replace(/[٠-٩]/g, (d) => arabicDigits.indexOf(d).toString());
}
