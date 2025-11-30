import { StepRunner } from "../base/StepRunner";
import { BaseState } from "../models/state";
import {
  extractJsonCodeBlock,
  getPromptTemplate,
  populateTemplate,
  readVaultFile,
  stripObsidianProperties,
  toArabicDigits,
  updateVaultFile,
} from "../utils";
import { getQuranChapterNameArabic } from "../utils/quranUtils";
import { BOOKS, PATHS } from "../constants";

type ExtractQuranResponse = {
  verse_in_text: string;
  chapter_id: number;
  verse_id: number;
};

export class ExtractQuranStep extends StepRunner<BaseState> {
  private filePath: string | undefined;

  async getUserPrompt() {
    await this.retrieveHadithFilePath();
    if (!this.filePath) {
      throw new Error("No file path available");
    }
    const hadithText = await readVaultFile(this.filePath);
    const promptTemplate = await getPromptTemplate("ExtractQuran");
    return populateTemplate(promptTemplate, {
      TEXT: stripObsidianProperties(hadithText),
    });
  }

  async processResponse(response: string) {
    const parsed = extractJsonCodeBlock<ExtractQuranResponse[]>(response);
    if (!this.filePath) {
      return { response: "لم يتم العثور على مسار الملف.", isSuccessful: true };
    }

    const fileContent = await readVaultFile(this.filePath);

    if (parsed === null || parsed.length === 0) {
      const hadithLink = this.filePath ? `[[${this.filePath.replace(/\.md$/, "")}]]` : "";
      return {
        response: `لم يتم العثور على آيات قرآنية في النص.${hadithLink ? `\n\nالحديث: ${hadithLink}` : ""}`,
        isSuccessful: true,
      };
    }

    // replace verses in the text with formatted references
    let updatedContent = fileContent;
    for (let i = parsed.length - 1; i >= 0; i--) {
      const verse = parsed[i];
      const chapterName = getQuranChapterNameArabic(verse.chapter_id);
      const verseArabic = toArabicDigits(verse.verse_id + 1);
      const formattedVerseLink = `[[${chapterName}-${verseArabic}|${verse.verse_in_text}]]`;

      // Replace only the last occurrence to avoid replacing earlier ones
      const lastIndex = updatedContent.lastIndexOf(verse.verse_in_text);
      if (lastIndex !== -1) {
        updatedContent =
          updatedContent.slice(0, lastIndex) +
          formattedVerseLink +
          updatedContent.slice(lastIndex + verse.verse_in_text.length);
      }
    }

    // Update the note content
    await updateVaultFile(this.filePath, updatedContent);
    const hadithLink = this.filePath ? `[[${this.filePath.replace(/\.md$/, "")}]]` : "";
    const versesList = parsed
      .map(
        (verse, idx) =>
          `- الآية: "${verse.verse_in_text}" (سورة ${getQuranChapterNameArabic(verse.chapter_id)}، آية ${toArabicDigits(verse.verse_id + 1)})`
      )
      .join("\n");

    const updatedResponse = `تم استخراج ${toArabicDigits(parsed.length)} آية قرآنية من الحديث:\n\n${versesList}\n\nرابط الحديث: ${hadithLink}`;

    return { response: updatedResponse, isSuccessful: true };
  }

  private async retrieveHadithFilePath() {
    const hadithNumber = this.state.args;
    if (hadithNumber) {
      this.filePath = `${PATHS.BUKHARI}/${BOOKS[0].name}-${toArabicDigits(hadithNumber)}.md`;
    } else {
      const activeFile = app.workspace.getActiveFile();
      this.filePath = activeFile?.path || "";
    }
  }
}
