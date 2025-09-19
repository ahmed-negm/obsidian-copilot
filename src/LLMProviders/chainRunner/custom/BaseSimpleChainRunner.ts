import { ABORT_REASON } from "@/constants";
import { logInfo } from "@/logger";
import { ChatMessage } from "@/types/message";
import { extractChatHistory, getMessageRole, withSuppressedTokenWarnings } from "@/utils";
import { ThinkBlockStreamer } from "../utils/ThinkBlockStreamer";
import { BaseChainRunner, ChainRunner } from "../BaseChainRunner";

export type SystemMessage = { role: string; content: string };

export class BaseSimpleChainRunner extends BaseChainRunner {
  async run(
    userMessage: ChatMessage,
    abortController: AbortController,
    updateCurrentAiMessage: (message: string) => void,
    addMessage: (message: ChatMessage) => void,
    options: {
      debug?: boolean;
      ignoreSystemMessage?: boolean;
      updateLoading?: (loading: boolean) => void;
    }
  ): Promise<string> {
    const streamer = new ThinkBlockStreamer(() => {});

    try {
      // Create messages array starting with system message
      const messages: SystemMessage[] = [];

      // Add system message if available
      const systemPrompt = this.getSystemPrompt();
      const chatModel = this.chainManager.chatModelManager.getChatModel();

      if (systemPrompt) {
        messages.push({
          role: getMessageRole(chatModel),
          content: systemPrompt,
        });
      }

      if (this.includeChatHistory() === true) {
        // Get chat history from memory
        const memory = this.chainManager.memoryManager.getMemory();
        const memoryVariables = await memory.loadMemoryVariables({});
        const chatHistory = extractChatHistory(memoryVariables);

        // Add chat history
        for (const entry of chatHistory) {
          messages.push({ role: entry.role, content: entry.content });
        }
      }

      messages.push({
        role: "user",
        content: userMessage.message,
      });

      const formattedMessages = await this.formatInput(messages);
      logInfo("Final Request to AI:\n", formattedMessages);

      // Stream with abort signal
      const chatStream = await withSuppressedTokenWarnings(() =>
        this.chainManager.chatModelManager.getChatModel().stream(formattedMessages, {
          signal: abortController.signal,
        })
      );

      for await (const chunk of chatStream) {
        if (abortController.signal.aborted) {
          logInfo("Stream iteration aborted", { reason: abortController.signal.reason });
          break;
        }
        streamer.processChunk(chunk);
      }
    } catch (error: any) {
      // Check if the error is due to abort signal
      if (error.name === "AbortError" || abortController.signal.aborted) {
        logInfo("Stream aborted by user", { reason: abortController.signal.reason });
        // Don't show error message for user-initiated aborts
      } else {
        await this.handleError(error, addMessage, updateCurrentAiMessage);
      }
    }

    // Always return the response, even if partial
    const response = this.formatOutput(streamer.close());

    // Only skip saving if it's a new chat (clearing everything)
    if (abortController.signal.aborted && abortController.signal.reason === ABORT_REASON.NEW_CHAT) {
      updateCurrentAiMessage("");
      return "";
    }

    await this.handleResponse(
      response,
      userMessage,
      abortController,
      addMessage,
      updateCurrentAiMessage
    );

    const nextStep = this.nextStep();
    if (nextStep) {
      return nextStep.run(
        userMessage,
        abortController,
        updateCurrentAiMessage,
        addMessage,
        options
      );
    }

    return response;
  }

  getSystemPrompt(): string {
    return getSystemPromptText();
  }

  async formatInput(messages: SystemMessage[]): Promise<SystemMessage[]> {
    return messages;
  }

  formatOutput(response: string): string {
    return response;
  }

  nextStep(): ChainRunner | null {
    return null;
  }

  includeChatHistory(): boolean {
    return true;
  }
}

const getSystemPromptText = () => `
- You are to act as an academic Islamic scholar specialized in both:
  1. **ʿUlūm al-Ḥadīth (Hadith Sciences)**, including:
     - Muṣṭalaḥ al-Ḥadīth (Hadith Terminology)
     - ʿIlm al-Rijāl (Biographical Evaluation)
     - al-Jarḥ wa al-Taʿdīl (Narrator Criticism & Authentication)
     - ʿIlal al-Ḥadīth (Analysis of Hidden Defects)
     - Mukhtalif al-Ḥadīth (Reconciling Contradictions)
     - Nāsikh wa Mansūkh (Abrogation in Hadith)
     - Gharīb al-Ḥadīth (Obscure/Linguistic Words in Hadith)
     - Takhrīj al-Ḥadīth (Tracing Hadith Sources)
     - Musṭalaḥāt al-Ruwāt (Narrator Terminology)

  2. **ʿUlūm al-Lugha al-ʿArabiyya (Arabic Linguistic Sciences)**, including:
     - al-Naḥw (Syntax/Grammar)
     - al-Ṣarf (Morphology)
     - al-Balāgha (Rhetoric: bayān, maʿānī, badīʿ)
     - al-ʿArūḍ (Prosody) and al-Qāfiya (Rhyme)
     - al-Ishtiqāq (Derivation/Etymology)
     - al-Muʿjamiyya (Lexicography)
     - Fiqh al-Lugha (Philology)
     - ʿIlm al-Aṣwāt (Phonetics/Phonology)

- ALWAYS respond in **formal Arabic**.
- The answer must be structured in **Markdown format**.
- Try to include **testimony from Qur'an, Hadith, or classical Arabic poetry whenever possible**.
- When including testimony from sources, **cite the source name and reference** in double square brackets immediately after the quote (e.g., [[البخاري-٥]], [[البفرة-55]]) .
`;
