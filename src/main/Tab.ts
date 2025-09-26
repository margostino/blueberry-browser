import { WebContentsView } from "electron";
import type { WebContents, NativeImage } from "electron";
import { createLogger } from "../services/Logger";
import { measureAsync, trackAction } from "../services/Telemetry";

const logger = createLogger({ module: 'Tab' });

export class Tab {
  private webContentsView: WebContentsView;
  private tabId: string;
  private tabTitle: string;
  private tabUrl: string;
  private tabIsVisible: boolean = false;
  constructor(id: string, url: string = "https://margostino.com") {
    this.tabId = id;
    this.tabUrl = url;
    this.tabTitle = "New Tab";
    const isFlowCanvas = url.includes("flowcanvas");
    this.webContentsView = new WebContentsView({
      webPreferences: {
        partition: `persist:tab-${Date.now()}`,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: !isFlowCanvas,
        webSecurity: true,
        preload: isFlowCanvas
          ? require("path").join(__dirname, "../preload/flowcanvas.js")
          : require("path").join(__dirname, "../preload/tab.js"),
      },
    });
    this.setupEventListeners();
    this.loadURL(url);
  }
  private setupEventListeners(): void {
    this.webContentsView.webContents.on("page-title-updated", (_, title) => {
      this.tabTitle = title;
    });
    this.webContentsView.webContents.on("did-navigate", (_, url) => {
      this.tabUrl = url;
    });
    this.webContentsView.webContents.on("did-navigate-in-page", (_, url) => {
      this.tabUrl = url;
    });
  }
  get id(): string {
    return this.tabId;
  }
  get title(): string {
    return this.tabTitle;
  }
  get url(): string {
    return this.tabUrl;
  }
  get isVisible(): boolean {
    return this.tabIsVisible;
  }
  get webContents(): WebContents {
    return this.webContentsView.webContents;
  }
  get view(): WebContentsView {
    return this.webContentsView;
  }
  show(): void {
    this.tabIsVisible = true;
    this.webContentsView.setVisible(true);
  }
  hide(): void {
    this.tabIsVisible = false;
    this.webContentsView.setVisible(false);
  }
  async screenshot(): Promise<NativeImage> {
    return await this.webContentsView.webContents.capturePage();
  }
  async runJs(code: string): Promise<any> {
    // Remove any leading "return " statement since it's illegal outside a function
    const cleanedCode = code.startsWith('return ') ? code.substring(7) : code;
    return await this.webContentsView.webContents.executeJavaScript(cleanedCode);
  }
  async getTabHtml(): Promise<string> {
    return await this.runJs("return document.documentElement.outerHTML");
  }
  async getTabText(): Promise<string> {
    try {
      // Check if the webContents is ready
      if (!this.webContentsView.webContents || this.webContentsView.webContents.isDestroyed()) {
        return '';
      }

      // Wait for the page to finish loading if it's still loading
      if (this.webContentsView.webContents.isLoading()) {
        await new Promise<void>((resolve) => {
          const listener = () => {
            this.webContentsView.webContents.off('did-stop-loading', listener);
            resolve();
          };
          this.webContentsView.webContents.once('did-stop-loading', listener);
          // Timeout after 5 seconds to prevent hanging
          setTimeout(() => {
            this.webContentsView.webContents.off('did-stop-loading', listener);
            resolve();
          }, 5000);
        });
      }

      // First try the preload API if available
      try {
        const result = await this.webContentsView.webContents.executeJavaScript(
          `window.__electronAPI && window.__electronAPI.getPageText ? window.__electronAPI.getPageText() : document.documentElement.innerText`,
          true
        );
        return result || '';
      } catch (apiError) {
        // If preload API fails, try direct access (no return statement!)
        const result = await this.runJs("document.documentElement.innerText");
        return result || '';
      }
    } catch (error) {
      logger.warn('Unable to extract page text', { error: (error as Error).message, tabId: this.id });
      // Fallback: Return page info as context
      const title = this.webContentsView.webContents.getTitle();
      const url = this.webContentsView.webContents.getURL();
      return `Page: ${title}\nURL: ${url}`;
    }
  }
  async loadURL(url: string): Promise<void> {
    this.tabUrl = url;
    
    const startTime = Date.now();
    try {
      await measureAsync(
        'tab.loadURL',
        () => this.webContentsView.webContents.loadURL(url),
        { tabId: this.tabId, url }
      );
      
      const loadTime = Date.now() - startTime;
      logger.info(`Tab loaded successfully`, { 
        tabId: this.tabId, 
        url, 
        loadTime 
      });
      
      trackAction('load_url', 'tab', url, loadTime);
    } catch (error) {
      logger.error(`Failed to load URL`, error as Error, {
        tabId: this.tabId,
        url
      });
      throw error;
    }
  }
  goBack(): void {
    if (this.webContentsView.webContents.navigationHistory.canGoBack()) {
      this.webContentsView.webContents.navigationHistory.goBack();
      trackAction('navigate_back', 'tab', undefined, undefined, { tabId: this.tabId });
      logger.debug('Navigated back', { tabId: this.tabId });
    }
  }
  goForward(): void {
    if (this.webContentsView.webContents.navigationHistory.canGoForward()) {
      this.webContentsView.webContents.navigationHistory.goForward();
    }
  }
  reload(): void {
    this.webContentsView.webContents.reload();
  }
  stop(): void {
    this.webContentsView.webContents.stop();
  }
  destroy(): void {
    this.webContentsView.webContents.close();
  }
}
