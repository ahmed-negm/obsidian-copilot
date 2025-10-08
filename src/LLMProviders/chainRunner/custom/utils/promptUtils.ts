import { readVaultFile } from "./fileUtils";
import { PATHS, FILE_EXTENSIONS } from "../constants";

/**
 * Get a prompt template by name from the vault
 * @param name The name of the prompt template (without extension)
 * @returns Promise resolving to the prompt template content
 * @throws Error if the prompt template cannot be read
 */
export async function getPromptTemplate(name: string): Promise<string> {
  try {
    return await readVaultFile(`${PATHS.PROMPTS}/${name}${FILE_EXTENSIONS.MARKDOWN}`);
  } catch (error) {
    console.error(`Failed to read prompt template: ${name}`, error);
    throw new Error(`Failed to read prompt template: ${name}`);
  }
}

/**
 * Get a template by name from the vault
 * @param name The name of the template (without extension)
 * @returns Promise resolving to the template content
 * @throws Error if the template cannot be read
 */
export async function getTemplate(name: string): Promise<string> {
  try {
    return await readVaultFile(`${PATHS.TEMPLATES}/${name}${FILE_EXTENSIONS.MARKDOWN}`);
  } catch (error) {
    console.error(`Failed to read template: ${name}`, error);
    throw new Error(`Failed to read template: ${name}`);
  }
}

/**
 * Replace multiple placeholders in a template
 * @param template The template string with placeholders
 * @param replacements Object with key-value pairs for replacements
 * @returns The template with placeholders replaced
 */
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
