import { logError } from "@/logger";
import { readVaultFile } from "./fileUtils";
import { PATHS, FILE_EXTENSIONS } from "../constants";

export async function getPromptTemplate(name: string): Promise<string> {
  try {
    return await readVaultFile(`${PATHS.PROMPTS}/${name}${FILE_EXTENSIONS.MARKDOWN}`);
  } catch (error) {
    logError(`Failed to read prompt template: ${name}`, error);
    throw new Error(`Failed to read prompt template: ${name}`);
  }
}

export async function getTemplate(name: string): Promise<string> {
  try {
    return await readVaultFile(`${PATHS.TEMPLATES}/${name}${FILE_EXTENSIONS.MARKDOWN}`);
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
