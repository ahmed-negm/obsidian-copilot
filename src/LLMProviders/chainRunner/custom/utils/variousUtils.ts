import { Notice } from "obsidian";
import { readVaultFile, updateVaultFile } from "./fileUtils";
import { PATHS } from "../constants";

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export async function setScore(isCorrect: boolean, correctAnswer: string): Promise<void> {
  const scoreFile = `${PATHS.DATA}/Score.json`;
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
      (!isCorrect ? `الإجابة الصحيحة : ${correctAnswer}` + "\n\n" : "") +
      `الدقة : ${toArabicDigits(score.toFixed(0))}% إجماليًا`
  );
}

export function extractJsonCodeBlock<T = any>(text: string): T | null {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export function toArabicDigits(str: string | number): string {
  return String(str).replace(/[0-9]/g, (d) => ARABIC_DIGITS[parseInt(d)]);
}

export function toEnglishDigits(str: string | number): string {
  return String(str).replace(/[٠-٩]/g, (d) => ARABIC_DIGITS.indexOf(d).toString());
}

export function getSignedUrl(url: string): string {
  return url.replaceAll(" ", "%20");
}
