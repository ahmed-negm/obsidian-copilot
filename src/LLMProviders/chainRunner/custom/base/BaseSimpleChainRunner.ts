import { ABORT_REASON } from "@/constants";
import { logInfo } from "@/logger";
import { ChatMessage } from "@/types/message";
import { extractChatHistory, getMessageRole, withSuppressedTokenWarnings } from "@/utils";
import { BaseChainRunner, ChainRunner } from "../../BaseChainRunner";
import { ThinkBlockStreamer } from "../../utils/ThinkBlockStreamer";
import { getPromptTemplate } from "../utils";
import { Notice } from "obsidian";
import { WORKFLOW_STEP_FAILED } from "../constants";

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
    const SAY_HELLO_FALLBACK = "Say 'hello' in a very brief sentence.";
    let userPrompt = "";

    try {
      userPrompt = await this.getUserPrompt(userMessage.message);

      let messages: { role: string; content: string }[] = [];

      if (userPrompt === "") {
        // Fallback: Ensure the AI always receives a valid prompt
        messages = [{ role: "user", content: SAY_HELLO_FALLBACK }];
      } else {
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

        messages.push({
          role: "user",
          content: userPrompt,
        });
      }

      logInfo("## AI Request:\n", userPrompt);

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

    const aiResponse = streamer.close();
    logInfo("## AI Response:\n", aiResponse);
    const response = await this.processResponse(userPrompt === "" ? "" : aiResponse);

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
        new Notice(WORKFLOW_STEP_FAILED, 0);
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
