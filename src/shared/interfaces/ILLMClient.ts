/**
 * LLM Client Interface
 * Defines the contract for AI/LLM integration
 */

export interface ILLMClient {
  sendMessage(message: string, context?: string): Promise<string>;
  clearConversation(): void;
  getMessages(): IChatMessage[];
  setWebContents(webContents: Electron.WebContents): void;
}

export interface IChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  error?: boolean;
}