import ChainManager from "@/LLMProviders/chainManager";
import { BaseSimpleChainRunner } from "../base/BaseSimpleChainRunner";
import { getRange, readVaultFile, toArabicDigits } from "../utils";
import { BOOKS, PATHS } from "../constants";

export class ListUnprocessedHadithsRunner extends BaseSimpleChainRunner {
  constructor(
    chainManager: ChainManager,
    private args: string
  ) {
    super(chainManager);
  }

  async getUserPrompt(_userMessage: string): Promise<string> {
    return "";
  }

  async processResponse(_response: string): Promise<string> {
    const range = getRange(this.args);
    if (!range) {
      return "No range provided";
    }

    const unProcessedHadiths: string[] = [];
    for (let i = range.start; i <= range.end; i++) {
      const hadithNumber = toArabicDigits(i);
      const fileName = `${BOOKS[0].name}-${toArabicDigits(hadithNumber)}`;
      const filePath = `${PATHS.BUKHARI}/${fileName}.md`;
      const hadithText = await readVaultFile(filePath);
      if (!hadithText.includes("[[") || !hadithText.includes("]]")) {
        unProcessedHadiths.push(`[[${fileName}]]`);
      }
    }

    return unProcessedHadiths.join("\n\n");
  }
}
