import { Notice } from "obsidian";
import { readVaultFile, updateVaultFile } from "./fileUtils";
import { toArabicDigits } from "./formatUtils";

export async function setScore(isCorrect: boolean, correctAnswer: string): Promise<void> {
  const scoreFile = "_extras/Data/Score.json";
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
