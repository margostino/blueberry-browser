import {
  BrowserWindow,
  WebContents,
  clipboard,
  ipcMain,
  screen,
} from "electron";
import * as path from "path";
import { FlowCanvasManager } from "./FlowCanvasManager";
export class ScreenshotManager {
  private selectorWindow: BrowserWindow | null = null;
  private targetWebContents: WebContents | null = null;
  private flowCanvasManager: FlowCanvasManager;
  private lastClipboardImage: string | null = null;
  private clipboardInterval: NodeJS.Timeout | null = null;
  constructor(flowCanvasManager: FlowCanvasManager) {
    this.flowCanvasManager = flowCanvasManager;
    this.setupIPCHandlers();
    this.startClipboardMonitoring();
  }
  private setupIPCHandlers(): void {
    ipcMain.handle("screenshot:capture-area", async (_, bounds) => {
      console.log("📸 Capturing area with bounds:", bounds);
      if (this.targetWebContents) {
        await this.captureSelectedArea(bounds);
      }
      this.closeSelectorWindow();
    });
    ipcMain.handle("screenshot:cancel", () => {
      console.log("❌ Screenshot cancelled");
      this.closeSelectorWindow();
    });
  }
  public async startSelectionMode(webContents: WebContents): Promise<void> {
    console.log("🎯 Starting screenshot selection mode");
    this.targetWebContents = webContents;
    const targetWindow = BrowserWindow.fromWebContents(webContents);
    if (!targetWindow) return;
    const bounds = targetWindow.getBounds();
    this.selectorWindow = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      fullscreenable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "../preload/screenshot-selector.js"),
      },
    });
    const htmlPath =
      process.env.NODE_ENV === "development"
        ? path.join(
            process.cwd(),
            "src/renderer/screenshot-selector/index.html"
          )
        : path.join(__dirname, "../renderer/screenshot-selector/index.html");
    console.log("📂 Loading screenshot selector from:", htmlPath);
    try {
      this.selectorWindow.loadFile(htmlPath);
      this.selectorWindow.webContents.on(
        "did-fail-load",
        (_, _errorCode, errorDescription) => {
          console.error(
            "❌ Failed to load screenshot selector:",
            errorDescription
          );
        }
      );
      this.selectorWindow.webContents.on("dom-ready", () => {
        console.log("✅ Screenshot selector loaded successfully");
        if (process.env.NODE_ENV === "development") {
          this.selectorWindow?.webContents.openDevTools({ mode: "detach" });
        }
      });
    } catch (error) {
      console.error("❌ Error loading screenshot selector:", error);
    }
    this.selectorWindow.on("closed", () => {
      this.selectorWindow = null;
      this.targetWebContents = null;
    });
  }
  private async captureSelectedArea(bounds: {
    left: number;
    top: number;
    width: number;
    height: number;
  }): Promise<void> {
    if (!this.targetWebContents) return;
    try {
      console.log("📸 Capturing page first");
      const fullImage = await this.targetWebContents.capturePage();
      const scaleFactor = screen.getPrimaryDisplay().scaleFactor;
      const adjustedBounds = {
        x: Math.round(bounds.left * scaleFactor),
        y: Math.round(bounds.top * scaleFactor),
        width: Math.round(bounds.width * scaleFactor),
        height: Math.round(bounds.height * scaleFactor),
      };
      console.log("✂️ Cropping with adjusted bounds:", adjustedBounds);
      const croppedImage = fullImage.crop(adjustedBounds);
      const dataURL = croppedImage.toDataURL();
      console.log("💾 Saving cropped screenshot");
      const captureRequest = {
        type: "screenshot" as const,
        content: dataURL,
        source: {
          url: this.targetWebContents.getURL(),
          title: this.targetWebContents.getTitle(),
        },
      };
      const item = await this.flowCanvasManager.captureItem(captureRequest);
      console.log("✅ Selective screenshot captured:", item.id);
      this.targetWebContents.send("flowcanvas:item-added", {
        success: true,
        type: "screenshot",
        selective: true,
      });
    } catch (error) {
      console.error("❌ Failed to capture selected area:", error);
    }
  }
  private closeSelectorWindow(): void {
    if (this.selectorWindow && !this.selectorWindow.isDestroyed()) {
      this.selectorWindow.close();
    }
    this.selectorWindow = null;
    this.targetWebContents = null;
  }
  private startClipboardMonitoring(): void {
    console.log("📋 Starting clipboard monitoring for screenshots");
    this.clipboardInterval = setInterval(() => {
      this.checkClipboardForScreenshot();
    }, 1000);
  }
  private checkClipboardForScreenshot(): void {
    try {
      const image = clipboard.readImage();
      if (!image.isEmpty()) {
        const dataURL = image.toDataURL();
        if (dataURL !== this.lastClipboardImage) {
          this.lastClipboardImage = dataURL;
          console.log("📋 New image detected in clipboard");
          this.handleClipboardScreenshot(dataURL);
        }
      }
    } catch (error) {}
  }
  private async handleClipboardScreenshot(dataURL: string): Promise<void> {
    console.log("📋 Processing clipboard screenshot");
    const focusedWindow = BrowserWindow.getFocusedWindow();
    let sourceUrl = "clipboard://screenshot";
    let sourceTitle = "Clipboard Screenshot";
    if (focusedWindow) {
      const webContents = focusedWindow.webContents;
      sourceUrl = webContents.getURL() || sourceUrl;
      sourceTitle = webContents.getTitle() || sourceTitle;
    }
    const captureRequest = {
      type: "screenshot" as const,
      content: dataURL,
      source: {
        url: sourceUrl,
        title: sourceTitle,
      },
    };
    try {
      const item = await this.flowCanvasManager.captureItem(captureRequest);
      console.log("✅ Clipboard screenshot added to FlowCanvas:", item.id);
      const { webContents } = require("electron");
      webContents.getAllWebContents().forEach((contents) => {
        if (contents.getURL().includes("flowcanvas")) {
          contents.send("flowcanvas:item-added", {
            success: true,
            type: "screenshot",
            fromClipboard: true,
          });
        }
      });
    } catch (error) {
      console.error("❌ Failed to add clipboard screenshot:", error);
    }
  }
  public stopClipboardMonitoring(): void {
    if (this.clipboardInterval) {
      clearInterval(this.clipboardInterval);
      this.clipboardInterval = null;
      console.log("📋 Stopped clipboard monitoring");
    }
  }
  public async captureFromClipboard(): Promise<boolean> {
    try {
      const image = clipboard.readImage();
      if (image.isEmpty()) {
        console.log("📋 No image in clipboard");
        return false;
      }
      const dataURL = image.toDataURL();
      await this.handleClipboardScreenshot(dataURL);
      return true;
    } catch (error) {
      console.error("❌ Failed to capture from clipboard:", error);
      return false;
    }
  }
}
