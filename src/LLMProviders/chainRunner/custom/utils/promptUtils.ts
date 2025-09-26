import { readVaultFile } from "./fileUtils";

/**
 * Get a prompt template by name from the vault
 * @param name The name of the prompt template (without extension)
 * @returns Promise resolving to the prompt template content
 */
export async function getPromptTemplate(name: string): Promise<string> {
  return readVaultFile(`_extras/Prompt/${name}.md`);
}

/**
 * Get a template by name from the vault
 * @param name The name of the template (without extension)
 * @returns Promise resolving to the template content
 */
export async function getTemplate(name: string): Promise<string> {
  return readVaultFile(`_extras/Templates/${name}.md`);
}
