import type { WebContents } from "electron";
import { BrowserWindow, clipboard, desktopCapturer, ipcMain } from "electron";
import path from "path";
import { createLogger } from "../../services/Logger";
import type { FlowCanvasManager } from "./FlowCanvasManager";

const logger = createLogger({ module: "ScreenshotManager" });

export class ScreenshotManager {
  private selectorWindow: BrowserWindow | null = null;

  constructor(private readonly flowCanvasManager: FlowCanvasManager) {
    this.setupHandlers();
  }

  private setupHandlers(): void {
    ipcMain.handle(
      "screenshot:capture-area",
      async (
        _,
        bounds: { left: number; top: number; width: number; height: number }
      ) => {
        return this.captureArea(bounds);
      }
    );

    ipcMain.handle("screenshot:cancel-capture", async () => {
      if (this.selectorWindow) {
        this.selectorWindow.close();
        this.selectorWindow = null;
      }
    });
  }

  async startSelectionMode(webContents: WebContents): Promise<void> {
    logger.info("Starting screenshot selection mode");

    try {
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 1920, height: 1080 },
      });

      const primaryDisplay = sources[0];
      if (!primaryDisplay) {
        throw new Error("No display found");
      }

      const currentWindow = BrowserWindow.fromWebContents(webContents);
      const currentUrl = webContents.getURL();
      const currentTitle = webContents.getTitle();

      this.selectorWindow = new BrowserWindow({
        fullscreen: true,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        movable: false,
        resizable: false,
        enableLargerThanScreen: true,
        hasShadow: false,
        webPreferences: {
          preload: path.join(
            __dirname,
            "../../../preload/screenshot-selector.js"
          ),
          contextIsolation: true,
          nodeIntegration: false,
        },
      });

      this.selectorWindow.on("closed", () => {
        this.selectorWindow = null;
      });

      this.selectorWindow.loadFile(
        path.join(__dirname, "../../../renderer/screenshot-selector/index.html")
      );

      this.selectorWindow.webContents.on("did-finish-load", () => {
        this.selectorWindow?.webContents.executeJavaScript(`
          window.sourceUrl = ${JSON.stringify(currentUrl)};
          window.sourceTitle = ${JSON.stringify(currentTitle)};
        `);
      });

      if (currentWindow) {
        currentWindow.focus();
      }
    } catch (error) {
      logger.error("Failed to start selection mode", error as Error);
      throw error;
    }
  }

  private async captureArea(bounds: {
    left: number;
    top: number;
    width: number;
    height: number;
  }): Promise<void> {
    logger.info("Capturing screenshot area", bounds);

    try {
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 1920, height: 1080 },
      });

      const primaryDisplay = sources[0];
      if (!primaryDisplay) {
        throw new Error("No display found for screenshot");
      }

      const image = primaryDisplay.thumbnail;
      const scaleFactor = image.getSize().width / 1920;

      const cropped = image.crop({
        x: Math.round(bounds.left * scaleFactor),
        y: Math.round(bounds.top * scaleFactor),
        width: Math.round(bounds.width * scaleFactor),
        height: Math.round(bounds.height * scaleFactor),
      });

      const dataURL = cropped.toDataURL();

      const sourceUrl =
        (await this.selectorWindow?.webContents.executeJavaScript(
          "window.sourceUrl"
        )) || "";
      const sourceTitle =
        (await this.selectorWindow?.webContents.executeJavaScript(
          "window.sourceTitle"
        )) || "Screenshot";

      await this.flowCanvasManager.captureItem({
        type: "screenshot",
        content: dataURL,
        source: {
          url: sourceUrl,
          title: sourceTitle,
        },
      });

      logger.info("Screenshot captured and added to FlowCanvas");

      if (this.selectorWindow) {
        this.selectorWindow.close();
        this.selectorWindow = null;
      }
    } catch (error) {
      logger.error("Failed to capture area", error as Error);
      throw error;
    }
  }

  async captureFromClipboard(): Promise<boolean> {
    try {
      const image = clipboard.readImage();
      if (image.isEmpty()) {
        logger.warn("No image in clipboard");
        return false;
      }

      const dataURL = image.toDataURL();

      await this.flowCanvasManager.captureItem({
        type: "screenshot",
        content: dataURL,
        source: {
          url: "clipboard",
          title: "Clipboard Image",
        },
      });

      logger.info("Clipboard image added to FlowCanvas");
      return true;
    } catch (error) {
      logger.error("Failed to capture from clipboard", error as Error);
      return false;
    }
  }
}
