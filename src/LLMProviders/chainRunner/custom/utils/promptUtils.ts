import { logError } from "@/logger";
import { readVaultFile } from "./fileUtils";
import { PATHS } from "../constants";

export type PromptTemplate =
  | "ExplainStep"
  | "ExtractNarratedFromTahdib"
  | "ExtractNarrators"
  | "FindNarratorInList"
  | "SystemPrompt";

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

export function applyTemplateReplacements(
  template: string,
  replacements: Record<string, string>
): string {
  let result = template;

  for (const [placeholder, value] of Object.entries(replacements)) {
    const regex = new RegExp(`{{${placeholder}}}`, "g");
    result = result.replace(regex, value);
  }

  return result;
}
