import { logError } from "@/logger";
import { readVaultFile } from "./fileUtils";
import { PATHS } from "../constants";
import { BookName } from "./figureUtils";

export type PromptTemplate =
  | "ExplainStep"
  | "ExtractNarratedFromTahdib"
  | "ExtractIsnadFromHadith"
  | "FindNarratorInList"
  | "SystemPrompt"
  | "FindStudentStep"
  | "FindTeacherStep"
  | "MohadithDictionary";

export async function getPromptTemplate(name: PromptTemplate): Promise<string> {
  try {
    return await readVaultFile(`${PATHS.PROMPTS}/${name}.md`);
  } catch (error) {
    logError(`Failed to read prompt template: ${name}`, error);
    throw new Error(`Failed to read prompt template: ${name}`);
  }
}

export type Template = "Mohadith";

export async function getTemplate(name: Template): Promise<string> {
  try {
    return await readVaultFile(`${PATHS.TEMPLATES}/${name}.md`);
  } catch (error) {
    logError(`Failed to read template: ${name}`, error);
    throw new Error(`Failed to read template: ${name}`);
  }
}

export async function getAIKnowledge(book: BookName): Promise<string> {
  try {
    return await readVaultFile(`${PATHS.AI_KNOWLEDGE}/${book}.md`);
  } catch (error) {
    logError(`Failed to read AI knowledge file`, error);
    throw new Error(`Failed to read AI knowledge file`);
  }
}

export function populateTemplate(
  template: string,
  replacements: Record<string, string | number>
): string {
  let result = template;

  for (const [placeholder, value] of Object.entries(replacements)) {
    const regex = new RegExp(`{{${placeholder}}}`, "g");
    result = result.replace(regex, String(value));
  }

  return result;
}
