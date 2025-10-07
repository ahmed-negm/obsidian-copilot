import { ABORT_REASON } from "@/constants";
import { logInfo } from "@/logger";
import { ChatMessage } from "@/types/message";
import { extractChatHistory, getMessageRole, withSuppressedTokenWarnings } from "@/utils";
import { BaseChainRunner, ChainRunner } from "../../BaseChainRunner";
import { ThinkBlockStreamer } from "../../utils/ThinkBlockStreamer";
import { getPromptTemplate } from "../utils";
import { Notice } from "obsidian";

export class BaseSimpleChainRunner extends BaseChainRunner {
  protected isRunnerSuccessful: boolean = false;

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
    let userPrompt = "";

    try {
      let messages: { role: string; content: string }[] = [];

      const systemPrompt = await this.getSystemPrompt();
      const chatModel = this.chainManager.chatModelManager.getChatModel();

      if (systemPrompt) {
        messages.push({
          role: getMessageRole(chatModel),
          content: systemPrompt,
        });
      }

      if (this.includeChatHistory() === true) {
        const memory = this.chainManager.memoryManager.getMemory();
        const memoryVariables = await memory.loadMemoryVariables({});
        const chatHistory = extractChatHistory(memoryVariables);

        for (const entry of chatHistory) {
          messages.push({ role: entry.role, content: entry.content });
        }
      }

      userPrompt = await this.getUserPrompt(userMessage.message);
      messages.push({
        role: "user",
        content: userPrompt,
      });

      if (userPrompt === "") {
        messages = [{ role: "user", content: "Say 'hello' in a very brief sentence." }];
      }

      logInfo("Final Request to AI:\n", messages);

      const chatStream = await withSuppressedTokenWarnings(() =>
        this.chainManager.chatModelManager.getChatModel().stream(messages, {
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
      if (error.name === "AbortError" || abortController.signal.aborted) {
        logInfo("Stream aborted by user", { reason: abortController.signal.reason });
      } else {
        await this.handleError(error, addMessage, updateCurrentAiMessage);
      }
    }

    const response = await this.processResponse(userPrompt === "" ? "" : streamer.close());

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

    const nextRunner = this.nextRunner();
    if (nextRunner) {
      if (this.isRunnerSuccessful) {
        return nextRunner.run(
          userMessage,
          abortController,
          updateCurrentAiMessage,
          addMessage,
          options
        );
      } else {
        new Notice("❌ تم إيقاف السلسلة بسبب فشل في خطوة ما.", 0);
      }
    }

    return response;
  }

  async getSystemPrompt(): Promise<string> {
    return getPromptTemplate("SystemPrompt");
  }

  async getUserPrompt(userMessage: string): Promise<string> {
    return userMessage;
  }

  async processResponse(response: string): Promise<string> {
    return response;
  }

  nextRunner(): ChainRunner | null {
    return null;
  }

  includeChatHistory(): boolean {
    return true;
  }
}
