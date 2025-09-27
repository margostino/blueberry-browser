export interface TopBarAPI {
  getTabs: () => Promise<any[]>
  createTab: (url?: string) => Promise<void>
  closeTab: (tabId: string) => Promise<void>
  switchTab: (tabId: string) => Promise<void>
  navigateTab: (tabId: string, url: string) => Promise<void>
  goBack: (tabId: string) => Promise<void>
  goForward: (tabId: string) => Promise<void>
  reload: (tabId: string) => Promise<void>
  toggleSidebar: () => Promise<void>
  tabScreenshot: (tabId: string) => Promise<string>
  tabRunJs: (tabId: string, code: string) => Promise<any>
}

declare global {
  interface Window {
    topBarAPI: TopBarAPI
  }
}