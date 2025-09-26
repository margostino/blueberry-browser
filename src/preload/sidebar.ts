import { contextBridge } from "electron";
/// <reference path="./sidebar.d.ts" />
import { electronAPI } from "@electron-toolkit/preload";
import type { ChatMessage } from "../types/ipc";

interface ChatRequest {
  message: string;
  context: {
    url: string | null;
    content: string | null;
    text: string | null;
  };
  messageId: string;
}
interface ChatResponse {
  messageId: string;
  content: string;
  isComplete: boolean;
}
const sidebarAPI = {
  sendChatMessage: (request: Partial<ChatRequest>) =>
    electronAPI.ipcRenderer.invoke("sidebar-chat-message", request),
  clearChat: () => electronAPI.ipcRenderer.invoke("sidebar-clear-chat"),
  getMessages: () => electronAPI.ipcRenderer.invoke("sidebar-get-messages"),
  onChatResponse: (callback: (data: ChatResponse) => void) => {
    electronAPI.ipcRenderer.on("chat-response", (_, data) => callback(data));
  },
  onMessagesUpdated: (callback: (messages: ChatMessage[]) => void) => {
    electronAPI.ipcRenderer.on("chat-messages-updated", (_, messages) =>
      callback(messages)
    );
  },
  removeChatResponseListener: () => {
    electronAPI.ipcRenderer.removeAllListeners("chat-response");
  },
  removeMessagesUpdatedListener: () => {
    electronAPI.ipcRenderer.removeAllListeners("chat-messages-updated");
  },
  getPageContent: () => electronAPI.ipcRenderer.invoke("get-page-content"),
  getPageText: () => electronAPI.ipcRenderer.invoke("get-page-text"),
  getCurrentUrl: () => electronAPI.ipcRenderer.invoke("get-current-url"),
  getActiveTabInfo: () => electronAPI.ipcRenderer.invoke("get-active-tab-info"),
  createTab: (url?: string) =>
    electronAPI.ipcRenderer.invoke("create-tab", url),
};
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("sidebarAPI", sidebarAPI);
  } catch (error) {
    console.error(error);
  }
} else {
  (window as unknown as { electron: typeof electronAPI }).electron = electronAPI;
  (window as unknown as { sidebarAPI: typeof sidebarAPI }).sidebarAPI = sidebarAPI;
}
