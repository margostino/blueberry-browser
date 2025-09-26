interface SidebarAPI {
  sendChatMessage: (request: any) => Promise<any>;
  clearChat: () => Promise<void>;
  getMessages: () => Promise<any[]>;
  onChatResponse: (callback: (data: any) => void) => void;
  onMessagesUpdated: (callback: (messages: any[]) => void) => void;
  removeChatResponseListener: () => void;
  removeMessagesUpdatedListener: () => void;
  getPageContent: () => Promise<string | null>;
  getPageText: () => Promise<string | null>;
  getCurrentUrl: () => Promise<string | null>;
  getActiveTabInfo: () => Promise<any>;
  createTab: (url?: string) => Promise<any>;
}
declare global {
  interface Window {
    electron: any;
    sidebarAPI: SidebarAPI;
  }
}
export {};