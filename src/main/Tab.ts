import { NativeImage, WebContents, WebContentsView } from "electron";
export class Tab {
  private webContentsView: WebContentsView;
  private _id: string;
  private _title: string;
  private _url: string;
  private _isVisible: boolean = false;
  constructor(id: string, url: string = "https://margostino.com") {
    this._id = id;
    this._url = url;
    this._title = "New Tab";
    const isFlowCanvas = url.includes("flowcanvas");
    this.webContentsView = new WebContentsView({
      webPreferences: {
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
      this._title = title;
    });
    this.webContentsView.webContents.on("did-navigate", (_, url) => {
      this._url = url;
    });
    this.webContentsView.webContents.on("did-navigate-in-page", (_, url) => {
      this._url = url;
    });
  }
  get id(): string {
    return this._id;
  }
  get title(): string {
    return this._title;
  }
  get url(): string {
    return this._url;
  }
  get isVisible(): boolean {
    return this._isVisible;
  }
  get webContents(): WebContents {
    return this.webContentsView.webContents;
  }
  get view(): WebContentsView {
    return this.webContentsView;
  }
  show(): void {
    this._isVisible = true;
    this.webContentsView.setVisible(true);
  }
  hide(): void {
    this._isVisible = false;
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
      console.warn('Unable to extract page text:', error);
      // Fallback: Return page info as context
      const title = this.webContentsView.webContents.getTitle();
      const url = this.webContentsView.webContents.getURL();
      return `Page: ${title}\nURL: ${url}`;
    }
  }
  loadURL(url: string): Promise<void> {
    this._url = url;
    return this.webContentsView.webContents.loadURL(url);
  }
  goBack(): void {
    if (this.webContentsView.webContents.navigationHistory.canGoBack()) {
      this.webContentsView.webContents.navigationHistory.goBack();
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
