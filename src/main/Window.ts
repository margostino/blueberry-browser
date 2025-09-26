import { BaseWindow, shell } from "electron";
import * as path from "path";
import { SideBar } from "./SideBar";
import { Tab } from "./Tab";
import { TopBar } from "./TopBar";
import { FlowCanvasManager } from "./flowcanvas/FlowCanvasManager";
import { createLogger } from "../services/Logger";
import { trackAction } from "../services/Telemetry";
import { config } from "../config/Config";
const logger = createLogger({ module: 'Window' });

export class Window {
  private baseWindowInstance: BaseWindow;
  private tabsMap: Map<string, Tab> = new Map();
  private activeTabId: string | null = null;
  private tabCounter: number = 0;
  private topBarInstance: TopBar;
  private sideBarInstance: SideBar;
  private flowCanvasManager: FlowCanvasManager;
  constructor(flowCanvasManager: FlowCanvasManager) {
    this.flowCanvasManager = flowCanvasManager;
    const windowConfig = config.get('window');
    this.baseWindowInstance = new BaseWindow({
      width: windowConfig.defaultWidth,
      height: windowConfig.defaultHeight,
      show: true,
      autoHideMenuBar: windowConfig.autoHideMenuBar,
      titleBarStyle: windowConfig.titleBarStyle,
      ...(process.platform !== "darwin" ? { titleBarOverlay: true } : {}),
      trafficLightPosition: { x: 15, y: 13 },
    });
    this.baseWindowInstance.setMinimumSize(windowConfig.minWidth, windowConfig.minHeight);
    this.topBarInstance = new TopBar(this.baseWindowInstance);
    this.sideBarInstance = new SideBar(this.baseWindowInstance);
    this.sideBarInstance.client.setWindow(this);
    this.createTab();
    this.baseWindowInstance.on("resize", () => {
      this.updateTabBounds();
      this.topBarInstance.updateBounds();
      this.sideBarInstance.updateBounds();
      const bounds = this.baseWindowInstance.getBounds();
      if (this.activeTab) {
        this.activeTab.webContents.send("window-resized", {
          width: bounds.width,
          height: bounds.height,
        });
      }
    });
    this.tabsMap.forEach((tab) => {
      tab.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return { action: "deny" };
      });
    });
    this.setupEventListeners();
  }
  private setupEventListeners(): void {
    this.baseWindowInstance.on("closed", () => {
      this.tabsMap.forEach((tab) => tab.destroy());
      this.tabsMap.clear();
    });
  }
  get window(): BaseWindow {
    return this.baseWindowInstance;
  }
  get activeTab(): Tab | null {
    if (this.activeTabId) {
      return this.tabsMap.get(this.activeTabId) || null;
    }
    return null;
  }
  get allTabs(): Tab[] {
    return Array.from(this.tabsMap.values());
  }
  get tabCount(): number {
    return this.tabsMap.size;
  }
  createTab(url?: string): Tab {
    const tabId = `tab-${++this.tabCounter}`;
    const isFlowCanvas = url && this.flowCanvasManager.isFlowCanvasURL(url);
    if (isFlowCanvas) {
      let flowCanvasPath: string;
      if (process.env.NODE_ENV === "development") {
        const vitePort = process.env.VITE_DEV_SERVER_PORT || "5173";
        flowCanvasPath = `http://localhost:${vitePort}/flowcanvas/index.html`;
        logger.debug(`FlowCanvas: Loading from ${flowCanvasPath}`);
      } else {
        flowCanvasPath = `file://${path.join(__dirname, "../renderer/flowcanvas/index.html")}`;
      }
      const tab = new Tab(tabId, flowCanvasPath);
      this.baseWindowInstance.contentView.addChildView(tab.view);
      const bounds = this.baseWindowInstance.getBounds();
      tab.view.setBounds({
        x: 0,
        y: 88,
        width: bounds.width - 400,
        height: bounds.height - 88,
      });
      this.tabsMap.set(tabId, tab);
      if (this.tabsMap.size === 1) {
        this.switchActiveTab(tabId);
      } else {
        tab.hide();
      }
      return tab;
    }
    const tab = new Tab(tabId, url);
    this.flowCanvasManager.registerWebContents(tab.webContents);
    logger.debug(`FlowCanvas context menu registered for tab ${tabId}`);
    this.baseWindowInstance.contentView.addChildView(tab.view);
    const bounds = this.baseWindowInstance.getBounds();
    tab.view.setBounds({
      x: 0,
      y: 88, 
      width: bounds.width - 400, 
      height: bounds.height - 88, 
    });
    this.tabsMap.set(tabId, tab);
    if (this.tabsMap.size === 1) {
      this.switchActiveTab(tabId);
    } else {
      tab.hide();
    }
    
    trackAction('create_tab', 'window', url || 'new', undefined, { 
      tabId, 
      tabCount: this.tabsMap.size 
    });
    logger.info('Tab created', { tabId, url, tabCount: this.tabsMap.size });
    
    return tab;
  }
  closeTab(tabId: string): boolean {
    const tab = this.tabsMap.get(tabId);
    if (!tab) {
      logger.warn('Attempted to close non-existent tab', { tabId });
      return false;
    }
    this.baseWindowInstance.contentView.removeChildView(tab.view);
    tab.destroy();
    this.tabsMap.delete(tabId);
    
    trackAction('close_tab', 'window', undefined, undefined, { 
      tabId, 
      remainingTabs: this.tabsMap.size 
    });
    logger.info('Tab closed', { tabId, remainingTabs: this.tabsMap.size });
    if (this.activeTabId === tabId) {
      this.activeTabId = null;
      const remainingTabs = Array.from(this.tabsMap.keys());
      if (remainingTabs.length > 0) {
        this.switchActiveTab(remainingTabs[0]);
      }
    }
    if (this.tabsMap.size === 0) {
      this.baseWindowInstance.close();
    }
    return true;
  }
  switchActiveTab(tabId: string): boolean {
    const tab = this.tabsMap.get(tabId);
    if (!tab) {
      return false;
    }
    if (this.activeTabId && this.activeTabId !== tabId) {
      const currentTab = this.tabsMap.get(this.activeTabId);
      if (currentTab) {
        currentTab.hide();
      }
    }
    tab.show();
    this.activeTabId = tabId;
    this.baseWindowInstance.setTitle(tab.title || "Blueberry Browser");
    return true;
  }
  getTab(tabId: string): Tab | undefined {
    return this.tabsMap.get(tabId);
  }
  show(): void {
    this.baseWindowInstance.show();
  }
  hide(): void {
    this.baseWindowInstance.hide();
  }
  close(): void {
    this.baseWindowInstance.close();
  }
  focus(): void {
    this.baseWindowInstance.focus();
  }
  minimize(): void {
    this.baseWindowInstance.minimize();
  }
  maximize(): void {
    this.baseWindowInstance.maximize();
  }
  unmaximize(): void {
    this.baseWindowInstance.unmaximize();
  }
  isMaximized(): boolean {
    return this.baseWindowInstance.isMaximized();
  }
  setTitle(title: string): void {
    this.baseWindowInstance.setTitle(title);
  }
  setBounds(bounds: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }): void {
    this.baseWindowInstance.setBounds(bounds);
  }
  getBounds(): { x: number; y: number; width: number; height: number } {
    return this.baseWindowInstance.getBounds();
  }
  private updateTabBounds(): void {
    const bounds = this.baseWindowInstance.getBounds();
    const sidebarWidth = this.sideBarInstance.getIsVisible() ? 400 : 0;
    this.tabsMap.forEach((tab) => {
      tab.view.setBounds({
        x: 0,
        y: 88,
        width: bounds.width - sidebarWidth,
        height: bounds.height - 88,
      });
    });
  }
  updateAllBounds(): void {
    this.updateTabBounds();
    this.sideBarInstance.updateBounds();
  }
  get sidebar(): SideBar {
    return this.sideBarInstance;
  }
  get topBar(): TopBar {
    return this.topBarInstance;
  }
  get tabs(): Tab[] {
    return Array.from(this.tabsMap.values());
  }
  get baseWindow(): BaseWindow {
    return this.baseWindowInstance;
  }
}
