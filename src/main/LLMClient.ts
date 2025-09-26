import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { streamText, type CoreMessage, type LanguageModel } from "ai";
import * as dotenv from "dotenv";
import { WebContents } from "electron";
import { join } from "path";
import { config } from "../config/Config";
import { APIError, ErrorHandler } from "../services/ErrorHandler";
import { createLogger } from "../services/Logger";
import type { Window } from "./Window";
dotenv.config({ path: join(__dirname, "../../.env") });
interface ChatRequest {
  message: string;
  messageId: string;
}
interface StreamChunk {
  content: string;
  isComplete: boolean;
}
type LLMProvider = "openai" | "anthropic";
const DEFAULT_MODELS: Record<LLMProvider, string> = {
  openai: "gpt-5-nano",
  anthropic: "claude-3-5-sonnet-20241022",
};
const MAX_CONTEXT_LENGTH = 4000;
const DEFAULT_TEMPERATURE = config.get("ai").temperature;
const logger = createLogger({ module: "LLMClient" });

export class LLMClient {
  private readonly webContents: WebContents;
  private window: Window | null = null;
  private readonly provider: LLMProvider;
  private readonly modelName: string;
  private readonly model: LanguageModel | null;
  private messages: CoreMessage[] = [];
  constructor(webContents: WebContents) {
    this.webContents = webContents;
    this.provider = this.getProvider();
    this.modelName = this.getModelName();
    this.model = this.initializeModel();
    this.logInitializationStatus();
  }
  setWindow(window: Window): void {
    this.window = window;
  }
  private getProvider(): LLMProvider {
    return config.get("ai").provider;
  }
  private getModelName(): string {
    return config.get("ai").model || DEFAULT_MODELS[this.provider];
  }
  private initializeModel(): LanguageModel | null {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;
    switch (this.provider) {
      case "anthropic":
        return anthropic(this.modelName);
      case "openai":
        return openai(this.modelName);
      default:
        return null;
    }
  }
  private getApiKey(): string | undefined {
    switch (this.provider) {
      case "anthropic":
        return config.getAnthropicKey();
      case "openai":
        return config.getOpenAIKey();
      default:
        return undefined;
    }
  }
  private logInitializationStatus(): void {
    if (this.model) {
      logger.info(
        `LLM Client initialized with ${this.provider} provider using model: ${this.modelName}`
      );
    } else {
      const keyName =
        this.provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
      logger.error(
        `LLM Client initialization failed: ${keyName} not found in environment variables. ` +
          `Please add your API key to the .env file in the project root.`
      );
    }
  }
  async sendChatMessage(request: ChatRequest): Promise<void> {
    try {
      let screenshot: string | null = null;
      if (this.window) {
        const activeTab = this.window.activeTab;
        if (activeTab) {
          try {
            const image = await activeTab.screenshot();
            screenshot = image.toDataURL();
          } catch (error) {
            const appError = ErrorHandler.handle(error, {
              module: "LLMClient",
              operation: "captureScreenshot",
              tabId: activeTab.id,
            });
            logger.error("Failed to capture screenshot", appError);
          }
        }
      }
      const userContent: any[] = [];
      if (screenshot) {
        userContent.push({
          type: "image",
          image: screenshot,
        });
      }
      userContent.push({
        type: "text",
        text: request.message,
      });
      const userMessage: CoreMessage = {
        role: "user",
        content: userContent.length === 1 ? request.message : userContent,
      };
      this.messages.push(userMessage);
      this.sendMessagesToRenderer();
      if (!this.model) {
        this.sendErrorMessage(
          request.messageId,
          "LLM service is not configured. Please add your API key to the .env file."
        );
        return;
      }
      const messages = await this.prepareMessagesWithContext(request);
      await this.streamResponse(messages, request.messageId);
    } catch (error) {
      logger.error("Error in LLM request", error as Error, {
        messageId: request.messageId,
      });
      this.handleStreamError(error, request.messageId);
    }
  }
  clearMessages(): void {
    this.messages = [];
    this.sendMessagesToRenderer();
  }
  getMessages(): CoreMessage[] {
    return this.messages;
  }
  private sendMessagesToRenderer(): void {
    this.webContents.send("chat-messages-updated", this.messages);
  }
  private async prepareMessagesWithContext(
    _request: ChatRequest
  ): Promise<CoreMessage[]> {
    let pageUrl: string | null = null;
    let pageText: string | null = null;
    if (this.window) {
      const activeTab = this.window.activeTab;
      if (activeTab) {
        pageUrl = activeTab.url;
        try {
          pageText = await activeTab.getTabText();
        } catch (error) {
          logger.error("Failed to get page text", error as Error);
        }
      }
    }
    const systemMessage: CoreMessage = {
      role: "system",
      content: this.buildSystemPrompt(pageUrl, pageText),
    };
    return [systemMessage, ...this.messages];
  }
  private buildSystemPrompt(
    url: string | null,
    pageText: string | null
  ): string {
    const parts: string[] = [
      "You are a helpful AI assistant integrated into a web browser.",
      "You can analyze and discuss web pages with the user.",
      "The user's messages may include screenshots of the current page as the first image.",
    ];
    if (url) {
      parts.push(`\nCurrent page URL: ${url}`);
    }
    if (pageText) {
      const truncatedText = this.truncateText(pageText, MAX_CONTEXT_LENGTH);
      parts.push(`\nPage content (text):\n${truncatedText}`);
    }
    parts.push(
      "\nPlease provide helpful, accurate, and contextual responses about the current webpage.",
      "If the user asks about specific content, refer to the page content and/or screenshot provided."
    );
    return parts.join("\n");
  }
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }
  private async streamResponse(
    messages: CoreMessage[],
    messageId: string
  ): Promise<void> {
    if (!this.model) {
      throw new APIError("Model not initialized", undefined, undefined, {
        module: "LLMClient",
        operation: "streamResponse",
      });
    }

    const context = {
      module: "LLMClient",
      operation: "streamResponse",
      metadata: { messageId, provider: this.provider },
    };

    const model = this.model;
    try {
      const result = await ErrorHandler.withRetry(
        async () =>
          streamText({
            model,
            messages,
            temperature: DEFAULT_TEMPERATURE,
            maxRetries: 3,
            abortSignal: undefined,
          }),
        context,
        3
      );

      await this.processStream(result.textStream, messageId);
    } catch (error) {
      const appError = ErrorHandler.handle(error, context);
      logger.error("Failed to stream response", appError);
      throw appError;
    }
  }
  private async processStream(
    textStream: AsyncIterable<string>,
    messageId: string
  ): Promise<void> {
    let accumulatedText = "";
    const assistantMessage: CoreMessage = {
      role: "assistant",
      content: "",
    };
    const messageIndex = this.messages.length;
    this.messages.push(assistantMessage);
    for await (const chunk of textStream) {
      accumulatedText += chunk;
      this.messages[messageIndex] = {
        role: "assistant",
        content: accumulatedText,
      };
      this.sendMessagesToRenderer();
      this.sendStreamChunk(messageId, {
        content: chunk,
        isComplete: false,
      });
    }
    this.messages[messageIndex] = {
      role: "assistant",
      content: accumulatedText,
    };
    this.sendMessagesToRenderer();
    this.sendStreamChunk(messageId, {
      content: accumulatedText,
      isComplete: true,
    });
  }
  private handleStreamError(error: unknown, messageId: string): void {
    logger.error("Error streaming from LLM", error as Error, { messageId });
    const errorMessage = this.getErrorMessage(error);
    this.sendErrorMessage(messageId, errorMessage);
  }
  private getErrorMessage(error: unknown): string {
    if (!(error instanceof Error)) {
      return "An unexpected error occurred. Please try again.";
    }
    const message = error.message.toLowerCase();
    if (message.includes("401") || message.includes("unauthorized")) {
      return "Authentication error: Please check your API key in the .env file.";
    }
    if (message.includes("429") || message.includes("rate limit")) {
      return "Rate limit exceeded. Please try again in a few moments.";
    }
    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("econnrefused")
    ) {
      return "Network error: Please check your internet connection.";
    }
    if (message.includes("timeout")) {
      return "Request timeout: The service took too long to respond. Please try again.";
    }
    return "Sorry, I encountered an error while processing your request. Please try again.";
  }
  private sendErrorMessage(messageId: string, errorMessage: string): void {
    this.sendStreamChunk(messageId, {
      content: errorMessage,
      isComplete: true,
    });
  }
  private sendStreamChunk(messageId: string, chunk: StreamChunk): void {
    this.webContents.send("chat-response", {
      messageId,
      content: chunk.content,
      isComplete: chunk.isComplete,
    });
  }
}
