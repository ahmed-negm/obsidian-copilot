import { ABORT_REASON } from "@/constants";
import { logInfo } from "@/logger";
import { ChatMessage } from "@/types/message";
import { extractChatHistory, getMessageRole, withSuppressedTokenWarnings } from "@/utils";
import { ThinkBlockStreamer } from "../utils/ThinkBlockStreamer";
import { BaseChainRunner, ChainRunner } from "../BaseChainRunner";
import { getPromptTemplate } from "./utils";

export type SystemMessage = { role: string; content: string };

export class BaseSimpleChainRunner extends BaseChainRunner {
  protected succeeded: boolean = false;

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
      const systemPrompt = await this.getSystemPrompt();
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
    const response = await this.formatOutput(streamer.close());

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

    const nextStep = await this.nextStep();
    if (this.succeeded && nextStep) {
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

  async getSystemPrompt(): Promise<string> {
    return getPromptTemplate("SystemPrompt");
  }

  async formatInput(messages: SystemMessage[]): Promise<SystemMessage[]> {
    return messages;
  }

  async formatOutput(response: string): Promise<string> {
    return response;
  }

  async nextStep(): Promise<ChainRunner | null> {
    return null;
  }

  includeChatHistory(): boolean {
    return true;
  }
}
