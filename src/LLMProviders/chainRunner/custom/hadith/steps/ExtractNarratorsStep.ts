import { SystemMessage } from "../../BaseSimpleChainRunner";
import { StepRunner } from "../../base/StepRunner";
import { HadithWorkflowState } from "../models/WorkflowState";
import { HadithNarrator } from "../models/HadithNarrator";
import { readVaultFile, getActiveNote, stripObsidianProperties } from "../../utils/fileUtils";
import { getPromptTemplate } from "../../utils/promptUtils";
import { setScore } from "../../utils/scoreUtils";
import { ChoiceSuggestModal } from "../../ui/ChoiceSuggestModal";

/**
 * Step to extract narrators from hadith text
 */
export class ExtractNarratorsStep implements StepRunner<HadithWorkflowState> {
  /**
   * Trigger phrase for this step
   */
  static trigger = "تتبع الرواة";

  /**
   * Format the input for the LLM
   * @param messages The messages to format
   * @param state The current workflow state
   * @returns The formatted messages
   */
  async formatInput(
    messages: SystemMessage[],
    state: HadithWorkflowState
  ): Promise<SystemMessage[]> {
    const userMessage = messages.last()!;
    const hadithNumber = userMessage?.content?.replace(ExtractNarratorsStep.trigger, "").trim();

    const hadithText = hadithNumber
      ? await readVaultFile(`Sunnah/صحيح البخاري/البخاري-${hadithNumber}.md`)
      : await getActiveNote();

    state.hadithLink = hadithNumber
      ? `[[البخاري-${hadithNumber}]]`
      : `[[${app.workspace.getActiveFile()?.name || ""}]]`;

    const prompt = await getPromptTemplate("TraceHadithChainRunner01");

    messages[messages.length - 1] = {
      ...userMessage,
      content: `${prompt}\n\nHere is the Hadith text:\n\n '${stripObsidianProperties(hadithText)}'`,
    };

    return messages;
  }

  /**
   * Process the LLM response
   * @param response The LLM response
   * @param state The current workflow state
   * @returns The result of the step
   */
  async run(
    response: string,
    state: HadithWorkflowState
  ): Promise<{
    output: string;
    nextState: HadithWorkflowState;
    isComplete: boolean;
  }> {
    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      const hadithNarrators = JSON.parse(codeBlockMatch[1]) as HadithNarrator[];

      // Create updated state with narrators
      const newState = {
        ...state,
        hadithNarrators,
      };

      // Quiz the user on narrator identities if enabled
      if (state.executeNextStep) {
        for (const narrator of hadithNarrators) {
          if (narrator.name.split(" ").length > 2) {
            continue;
          }

          const potentialPerson = narrator.potentialPeople[0];
          const choices = [
            potentialPerson.knownName,
            potentialPerson.quizNames[0],
            potentialPerson.quizNames[1],
          ].sort(() => Math.random() - 0.5);

          const choice = await new ChoiceSuggestModal(
            app,
            `من هو ${narrator.name}؟`,
            choices
          ).openAndWait();

          await setScore(choice === potentialPerson.knownName);
        }
      }

      // Format the output message
      let narratorList = hadithNarrators.map((narrator: HadithNarrator) => {
        return `- **${narrator.name}**: ${narrator.potentialPeople.map((p) => p.knownName).join(" أو ")}`;
      });

      narratorList = state.reverseHadithNarrators ? narratorList.reverse() : narratorList;
      const bulletList = narratorList.join("\n");

      let result = `
سند الحديث ${state.hadithLink} هو:

${bulletList}
`;

      if (state.executeNextStep) {
        result += `\n\nسنبدأ الآن في التحقق من الرواة واحداً يلو الآخر ...`;
      }

      return {
        output: result,
        nextState: newState,
        isComplete: true,
      };
    }

    // If no code block was found, return the original response
    return {
      output: response,
      nextState: state,
      isComplete: false,
    };
  }
}
