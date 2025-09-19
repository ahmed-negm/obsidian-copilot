import { BaseSimpleChainRunner, SystemMessage } from "./BaseSimpleChainRunner";
import { stripObsidianProperties } from "./utils";

export class TraceHadithChainRunner extends BaseSimpleChainRunner {
  static trigger = "تتبع الرواة";

  async formatInput(messages: SystemMessage[]): Promise<SystemMessage[]> {
    const activeFile = app.workspace.getActiveFile();
    let fileContent = "";
    if (activeFile) {
      fileContent = await app.vault.read(activeFile);
    }

    const userMessage = messages.last()!;
    messages[messages.length - 1] = {
      ...userMessage,
      content:
        getPrompt() + "Here is the Hadith text:\n\n '" + stripObsidianProperties(fileContent) + "'",
    };
    return messages;
  }

  formatOutput(response: string): string {
    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      try {
        const json = JSON.parse(codeBlockMatch[1]) as {
          name: string;
          potentialFullNames: string[];
        }[];

        const bulletList = json
          .reverse()
          .map((narrator: any) => {
            return `- **${narrator.name}**`;
          })
          .join("\n");

        return `
سند الحديث من الآعلى

${bulletList}

سنبدأ الآن في التحقق من الرواة واحداً يلو الآخر ...
يبدو أن **${json[0].name}** هو **${json[0].potentialFullNames[0]}**. جاري البحث عنه في تهذيب الكمال ...
`;
      } catch (error) {
        console.error("Failed to parse JSON:", error);
      }
    }

    return response;
  }
}

const getPrompt = () => `
Extract the full isnād (chain of narrators) from the provided Hadith, ordered **from al-Bukhārī → ... → Rasūl Allāh ﷺ**, and for each narrator produce candidate full names with thorough research steps and evidence.
- The final output MUST be a JSON array obeying the strict schema below and nothing else (no trailing commentary, no extra text).
- Do NOT include any introduction or conclusion. Only provide a structured list.
- For each narrator, provide:
  1. Full name (including kunyah if available).
  2. Lifespan (birth and death years in Hijri).
  3. Place of origin or residence.
- Use bullet points for clarity.
- Ensure accuracy by cross-referencing multiple reliable Islamic sources (e.g., [Shamela](https://shamela.ws/), [Islamweb](https://www.islamweb.net/)).
- If information is unavailable for certain narrators, state "Information not available" for those fields.
- Maintain a formal and academic tone throughout.
- Ensure clarity, conciseness, and academic rigor in your explanation.
- The JSON must be a **sorted array** of objects, in the order of transmission (first object = the narrator named first in the chain as it appears under al-Bukhārī; don't add an entry for the Prophet ﷺ). Use the exact field names and structure shown in the Output Format section below.
- Each object must contain exactly the fields: 'name', 'potentialFullNames'. No extra fields.
- 'potentialFullNames' must always be a JSON array. If you are certain of a single match, include exactly one string. If ambiguous, list **all plausible candidate full names** (each as a string). If after exhaustive searching nothing matches, put a single item 'لم يُعثر عليه بعد' in the array.
- Exhaustive search effort required: try many orthographic variants, kinship forms, and common OCR errors before declaring "not found". Do **not** stop at the first plausible match.

--- OUTPUT FORMAT (STRICT EXAMPLE) ---
Return a single JSON array like this (this is the only permitted extraneous example; in actual runs return the real data only):
'''
[
  {
    "name": "مُحَمَّدُ بْنُ إِسْحَاقَ",
    "potentialFullNames": ["محمد بن إسحاق بن بشار بن خزيمة الأنصاري"],
  }
]
'''
`;
