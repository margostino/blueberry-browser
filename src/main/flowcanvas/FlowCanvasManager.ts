import { BrowserWindow, WebContents, ipcMain } from "electron";
import { v4 as uuidv4 } from "uuid";
import { CaptureRequest, FlowCanvas, FlowItem } from "../../types/flowcanvas";
import { FlowCanvasContextMenuHandler } from "./ContextMenuHandler";
import { FlowCanvasStorage } from "./FlowCanvasStorage";
export class FlowCanvasManager {
  private storage: FlowCanvasStorage;
  private activeCanvas: FlowCanvas | null = null;
  private contextMenuHandler: FlowCanvasContextMenuHandler;
  constructor() {
    this.storage = new FlowCanvasStorage();
    this.contextMenuHandler = new FlowCanvasContextMenuHandler(this);
    this.setupIPCHandlers();
  }
  private setupIPCHandlers(): void {
    ipcMain.handle("flowcanvas:create", async () => {
      return this.createCanvas();
    });
    ipcMain.handle("flowcanvas:load", async (_, canvasId: string) => {
      return this.loadCanvas(canvasId);
    });
    ipcMain.handle("flowcanvas:save", async (_, canvas: FlowCanvas) => {
      return this.saveCanvas(canvas);
    });
    ipcMain.handle("flowcanvas:get-active", async () => {
      return this.getActiveCanvas();
    });
    ipcMain.handle(
      "flowcanvas:capture-item",
      async (_, request: CaptureRequest) => {
        return this.captureItem(request);
      }
    );
    ipcMain.handle("flowcanvas:update-item", async (_, item: FlowItem) => {
      return this.updateItem(item);
    });
    ipcMain.handle("flowcanvas:delete-item", async (_, itemId: string) => {
      return this.deleteItem(itemId);
    });
    ipcMain.handle("flowcanvas:open", async () => {
      return this.openCanvasTab();
    });
  }
  private async createCanvas(): Promise<FlowCanvas> {
    const canvas: FlowCanvas = {
      id: uuidv4(),
      name: `Flow ${new Date().toLocaleDateString()}`,
      items: [],
      connections: [],
      created: Date.now(),
      modified: Date.now(),
      zoom: 1,
      viewport: { x: 0, y: 0 },
      layout: "freeform",
    };
    await this.storage.saveCanvas(canvas);
    this.activeCanvas = canvas;
    return canvas;
  }
  private async loadCanvas(canvasId: string): Promise<FlowCanvas | null> {
    const canvas = await this.storage.getCanvas(canvasId);
    if (canvas) {
      this.activeCanvas = canvas;
    }
    return canvas;
  }
  private async saveCanvas(canvas: FlowCanvas): Promise<boolean> {
    canvas.modified = Date.now();
    const success = await this.storage.saveCanvas(canvas);
    if (success) {
      this.activeCanvas = canvas;
    }
    return success;
  }
  private async getActiveCanvas(): Promise<FlowCanvas | null> {
    if (!this.activeCanvas) {
      const canvases = await this.storage.getAllCanvases();
      if (canvases.length > 0) {
        this.activeCanvas = canvases[0];
      } else {
        this.activeCanvas = await this.createCanvas();
      }
    }
    return this.activeCanvas
      ? JSON.parse(JSON.stringify(this.activeCanvas))
      : null;
  }
  public async captureItem(request: CaptureRequest): Promise<FlowItem> {
    console.log(
      `📥 FlowCanvas: Capturing ${request.type} from ${request.source.title}`
    );
    let dimensions = { width: 280, height: 150 };
    if (request.type === "image") {
      dimensions = { width: 320, height: 240 };
    } else if (request.type === "screenshot") {
      dimensions = { width: 400, height: 300 };
    }
    const item: FlowItem = {
      id: uuidv4(),
      type: request.type,
      content: request.content,
      source: {
        url: request.source.url,
        title: request.source.title,
        timestamp: Date.now(),
      },
      position: {
        x: Math.random() * 500 + 100,
        y: Math.random() * 300 + 100,
      },
      dimensions,
    };
    if (request.type === "image" || request.type === "screenshot") {
      item.thumbnail = request.content;
    }
    if (!this.activeCanvas) {
      this.activeCanvas = await this.getActiveCanvas();
    }
    if (this.activeCanvas) {
      this.activeCanvas.items.push(item);
      await this.saveCanvas(this.activeCanvas);
      console.log(
        `✅ FlowCanvas: Item captured, total items: ${this.activeCanvas.items.length}`
      );
      const { webContents } = require("electron");
      webContents.getAllWebContents().forEach((contents) => {
        const url = contents.getURL();
        console.log(`🔍 Checking webContents URL: ${url}`);
        if (url.includes("flowcanvas")) {
          console.log(`📬 Sending item to FlowCanvas tab: ${url}`);
          contents.send("flowcanvas:item-captured", item);
        }
      });
    }
    return item;
  }
  private async updateItem(item: FlowItem): Promise<boolean> {
    if (!this.activeCanvas) return false;
    const index = this.activeCanvas.items.findIndex((i) => i.id === item.id);
    if (index !== -1) {
      this.activeCanvas.items[index] = item;
      return await this.saveCanvas(this.activeCanvas);
    }
    return false;
  }
  private async deleteItem(itemId: string): Promise<boolean> {
    if (!this.activeCanvas) return false;
    const index = this.activeCanvas.items.findIndex((i) => i.id === itemId);
    if (index !== -1) {
      this.activeCanvas.items.splice(index, 1);
      return await this.saveCanvas(this.activeCanvas);
    }
    return false;
  }
  private async openCanvasTab(): Promise<string> {
    return "blueberry://flowcanvas";
  }
  public setCanvasWindow(_window: BrowserWindow): void {}
  public registerWebContents(webContents: WebContents): void {
    this.contextMenuHandler.setupContextMenu(webContents);
  }
  public isFlowCanvasURL(url: string): boolean {
    return (
      url === "blueberry://flowcanvas" ||
      url.includes("flowcanvas") ||
      url.includes("localhost:5173/flowcanvas")
    );
  }
}
