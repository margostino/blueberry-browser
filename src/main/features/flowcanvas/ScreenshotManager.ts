import type { WebContents } from "electron";
import type { FlowCanvasManager } from "./FlowCanvasManager";

export class ScreenshotManager {
  // @ts-ignore - Will be used in future implementation
  constructor(private readonly _flowCanvasManager: FlowCanvasManager) {}

  async startSelectionMode(_webContents: WebContents): Promise<void> {
    return Promise.resolve();
  }

  async captureFromClipboard(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
