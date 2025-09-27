import type { WebContents } from "electron";
import { BrowserWindow, ipcMain, webContents } from "electron";
import { v4 as uuidv4 } from "uuid";
import { createLogger } from "../../services/Logger";
import {
  CaptureRequest,
  Connection,
  FlowCanvas,
  FlowItem,
} from "../../../shared/types/flowcanvas";
import { LLMClient } from "../llm/LLMClient";
import { FlowCanvasContextMenuHandler } from "./ContextMenuHandler";
import { FlowCanvasStorage } from "./FlowCanvasStorage";
const logger = createLogger({ module: "FlowCanvasManager" });

export class FlowCanvasManager {
  private storage: FlowCanvasStorage;
  private activeCanvas: FlowCanvas | null = null;
  private contextMenuHandler: FlowCanvasContextMenuHandler;
  private llmClient: LLMClient | null = null;
  private mainWindow: any = null;
  constructor() {
    this.storage = new FlowCanvasStorage();
    this.contextMenuHandler = new FlowCanvasContextMenuHandler(this);
    this.setupIPCHandlers();
  }
  public setLLMClient(client: LLMClient): void {
    this.llmClient = client;
    logger.info("LLM client set for FlowCanvasManager");
  }
  
  public setMainWindow(window: any): void {
    this.mainWindow = window;
    logger.info("Main window set for FlowCanvasManager");
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

    ipcMain.handle(
      "flowcanvas:find-connections",
      async (
        _,
        canvas: FlowCanvas,
        mode: "similarity" | "llm" = "similarity",
        prompt?: string
      ) => {
        return this.findConnections(canvas, mode, prompt);
      }
    );
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
    logger.info(`Capturing ${request.type}`, {
      source: request.source.title,
      url: request.source.url,
    });
    
    // Check if FlowCanvas is open, if not, open it
    await this.ensureFlowCanvasIsOpen();
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
      logger.info("Item captured successfully", {
        itemId: item.id,
        totalItems: this.activeCanvas.items.length,
      });
      webContents.getAllWebContents().forEach((contents) => {
        const url = contents.getURL();
        logger.trace(`Checking webContents URL: ${url}`);
        if (url.includes("flowcanvas")) {
          logger.debug(`Sending item to FlowCanvas tab`, {
            url,
            itemId: item.id,
          });
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
  
  private async ensureFlowCanvasIsOpen(): Promise<void> {
    if (!this.mainWindow) {
      logger.warn("Main window not set, cannot ensure FlowCanvas is open");
      return;
    }
    
    // Check if FlowCanvas tab already exists
    const flowCanvasTab = this.mainWindow.allTabs.find(
      (tab: any) =>
        tab.url.includes("flowcanvas") ||
        tab.url.includes("localhost:5173/flowcanvas")
    );
    
    if (!flowCanvasTab) {
      // FlowCanvas not open, create it in background
      logger.info("FlowCanvas not open, creating new tab in background");
      const newTab = this.mainWindow.createTab("blueberry://flowcanvas");
      
      // Don't switch to it - stay on current tab
      if (newTab) {
        logger.info("FlowCanvas tab created in background");
      }
    } else {
      // FlowCanvas already exists, no need to do anything
      logger.info("FlowCanvas already open in background");
    }
  }
  private async findConnections(
    canvas: FlowCanvas,
    mode: "similarity" | "llm" = "similarity",
    customPrompt?: string
  ): Promise<{ connections: Connection[]; canvas: FlowCanvas | null }> {
    if (!canvas || canvas.items.length < 2) {
      return {
        connections: [],
        canvas: canvas,
      };
    }

    try {
      logger.info(`Finding connections using ${mode} mode...`);

      const connections: Connection[] = [];
      const processedPairs = new Set<string>();

      for (let i = 0; i < canvas.items.length; i++) {
        for (let j = i + 1; j < canvas.items.length; j++) {
          const item1 = canvas.items[i];
          const item2 = canvas.items[j];

          const pairKey = `${item1.id}-${item2.id}`;
          if (processedPairs.has(pairKey)) continue;

          let isConnected = false;
          let connectionReason = "";

          let similarityScore: number | undefined;

          if (mode === "llm") {
            const llmResult = await this.analyzeConnectionWithLLM(
              item1,
              item2,
              customPrompt
            );
            isConnected = llmResult.connected;
            connectionReason = llmResult.reason;
          } else {
            const similarity = this.calculateSimilarity(item1, item2);
            isConnected = similarity.score > 0.3;
            similarityScore = similarity.score;
            connectionReason = similarity.reason;
          }

          if (isConnected) {
            const connection: Connection = {
              id: uuidv4(),
              from: item1.id,
              to: item2.id,
              type: "curved",
              color: mode === "llm" ? "#8b5cf6" : "#10b981", // Purple for LLM, green for similarity
              label: "", // No label on the connection line
              style: "solid",
              // Don't store fixed points - let ConnectionCanvas calculate dynamically
              metadata: {
                mode,
                similarityScore,
                reason: connectionReason
              }
            };

            connections.push(connection);
            processedPairs.add(pairKey);
            
            // No longer creating NOTE items for either mode
            // Similarity shows inline text with percentage
            // LLM shows truncated text with modal for full content
          }
        }
      }

      logger.info(`Found ${connections.length} connections using ${mode} mode`);

      if (this.activeCanvas) {
        this.activeCanvas.connections = [
          ...(this.activeCanvas.connections || []),
          ...connections,
        ];
        this.activeCanvas.modified = Date.now();
        await this.saveCanvas(this.activeCanvas);
      }

      return {
        connections,
        canvas: this.activeCanvas,
      };
    } catch (error) {
      logger.error(`Error finding connections with ${mode}:`, error as Error);
      return {
        connections: [],
        canvas: this.activeCanvas,
      };
    }
  }

  private calculateSimilarity(
    item1: FlowItem,
    item2: FlowItem
  ): { score: number; reason: string } {
    const content1 = item1.content.toLowerCase();
    const content2 = item2.content.toLowerCase();

    const words1 = new Set(content1.match(/\b\w{4,}\b/g) || []);
    const words2 = new Set(content2.match(/\b\w{4,}\b/g) || []);

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return { score: 0, reason: "" };

    const score = intersection.size / union.size;

    if (item1.source.url && item2.source.url) {
      try {
        const url1 = new URL(item1.source.url);
        const url2 = new URL(item2.source.url);
        if (url1.hostname === url2.hostname) {
          return {
            score: Math.min(score + 0.3, 1),
            reason: `Same domain (${url1.hostname}) with shared topics`,
          };
        }
      } catch {}
    }

    if (intersection.size > 0) {
      const commonWords = Array.from(intersection).slice(0, 3).join(", ");
      return {
        score,
        reason: `Shared topics: ${commonWords}`,
      };
    }

    if (item1.type === "note" && item2.type === "note") {
      return { score: 0.2, reason: "Related notes" };
    }

    return { score: 0, reason: "" };
  }

  private async analyzeConnectionWithLLM(
    item1: FlowItem,
    item2: FlowItem,
    customPrompt?: string
  ): Promise<{ connected: boolean; reason: string }> {
    if (!this.llmClient) {
      logger.warn(
        "LLM client not initialized, falling back to similarity check"
      );
      const similarity = this.calculateSimilarity(item1, item2);
      return {
        connected: similarity.score > 0.3,
        reason: similarity.reason,
      };
    }

    try {
      const model = (this.llmClient as any).model;
      if (!model) {
        logger.warn(
          "LLM model not available, falling back to similarity check"
        );
        const similarity = this.calculateSimilarity(item1, item2);
        return {
          connected: similarity.score > 0.3,
          reason: similarity.reason,
        };
      }

      const { generateText } = await import("ai");

      const systemPrompt =
        customPrompt ||
        `Role: You are an expert comparative analyst. Your job is to determine if there is a meaningful connection between two texts, either through:
• Direct overlap (shared words, themes, entities), or
• Common knowledge links (external cultural, literary, or symbolic associations).

Instructions:
1. Analyze both texts.
2. Check for explicit overlap (words, entities, themes).
3. Check for implicit/common knowledge connections (e.g., symbols, metaphors, historical/literary references).
4. Decide if there is a connection:
• If yes → connection: true and explain briefly why.
• If no → connection: false and explain briefly why not.

Output Format:
Return only valid JSON in this form:
{
  "connection": true,
  "reasoning": "Both texts discuss mirrors, and Borges is known for using mirrors as metaphors in his stories."
}

Example (no connection):
{
  "connection": false,
  "reasoning": "Text A is about quantum physics and Text B is a cooking recipe; they do not share direct or implicit links."
}`;

      const userPrompt = `Item content A: ${item1.content.substring(0, 1000)}

Item content B: ${item2.content.substring(0, 1000)}

Analyze if there is a meaningful connection between these two texts.`;

      const { text } = await generateText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.7,
      });

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Invalid JSON response from LLM");
      }

      const result = JSON.parse(jsonMatch[0]);

      return {
        connected: result.connection === true,
        reason: result.reasoning || "AI analysis",
      };
    } catch (error) {
      logger.error("Error analyzing connection with LLM:", error as Error);
      const similarity = this.calculateSimilarity(item1, item2);
      return {
        connected: similarity.score > 0.3,
        reason: similarity.reason,
      };
    }
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
