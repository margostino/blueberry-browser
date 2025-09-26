import { ipcMain, BrowserWindow, webContents } from "electron";
import type { WebContents } from "electron";
import { v4 as uuidv4 } from "uuid";
import { CaptureRequest, FlowCanvas, FlowItem, Connection } from "../../types/flowcanvas";
import { FlowCanvasContextMenuHandler } from "./ContextMenuHandler";
import { FlowCanvasStorage } from "./FlowCanvasStorage";
import { createLogger } from "../../services/Logger";
const logger = createLogger({ module: 'FlowCanvasManager' });

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
    
    ipcMain.handle("flowcanvas:find-connections", async (_, canvas: FlowCanvas) => {
      return this.findConnections(canvas);
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
    logger.info(`Capturing ${request.type}`, { 
      source: request.source.title,
      url: request.source.url 
    });
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
      logger.info('Item captured successfully', { 
        itemId: item.id,
        totalItems: this.activeCanvas.items.length 
      });
      webContents.getAllWebContents().forEach((contents) => {
        const url = contents.getURL();
        logger.trace(`Checking webContents URL: ${url}`);
        if (url.includes("flowcanvas")) {
          logger.debug(`Sending item to FlowCanvas tab`, { url, itemId: item.id });
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
  private async findConnections(canvas: FlowCanvas): Promise<Connection[]> {
    if (!canvas || canvas.items.length < 2) {
      return [];
    }

    try {
      logger.info('Finding connections between canvas items...');
      
      // For now, let's implement a simpler connection finding algorithm
      // that looks for similar content between items
      const connections: Connection[] = [];
      const processedPairs = new Set<string>();
      
      // Compare each pair of items
      for (let i = 0; i < canvas.items.length; i++) {
        for (let j = i + 1; j < canvas.items.length; j++) {
          const item1 = canvas.items[i];
          const item2 = canvas.items[j];
          
          // Skip if already connected
          const pairKey = `${item1.id}-${item2.id}`;
          if (processedPairs.has(pairKey)) continue;
          
          // Analyze similarity between items
          const similarity = this.calculateSimilarity(item1, item2);
          
          if (similarity.score > 0.3) { // Threshold for connection
            // Calculate connection points (center of items)
            const fromPoint = {
              x: item1.position.x + item1.dimensions.width / 2,
              y: item1.position.y + item1.dimensions.height / 2
            };
            
            const toPoint = {
              x: item2.position.x + item2.dimensions.width / 2,
              y: item2.position.y + item2.dimensions.height / 2
            };

            // Create the connection
            const connection: Connection = {
              id: uuidv4(),
              from: item1.id,
              to: item2.id,
              type: 'curved',
              color: '#10b981', // Green color for AI-found connections
              label: similarity.reason,
              style: 'solid',
              fromPoint,
              toPoint
            };

            connections.push(connection);
            processedPairs.add(pairKey);

            // Create a note item for the connection reason
            const notePosition = {
              x: (fromPoint.x + toPoint.x) / 2 - 150,
              y: (fromPoint.y + toPoint.y) / 2 - 50
            };

            const noteItem: FlowItem = {
              id: uuidv4(),
              type: 'note',
              content: `🔗 Connection: ${similarity.reason}`,
              source: {
                url: 'note://ai-connection',
                title: 'AI Connection',
                timestamp: Date.now()
              },
              position: notePosition,
              dimensions: {
                width: 300,
                height: 100
              },
              color: '#ecfdf5' // Light green background
            };

            // Add the note to the canvas
            if (this.activeCanvas) {
              this.activeCanvas.items.push(noteItem);
            }
          }
        }
      }

      logger.info(`Found ${connections.length} connections between items`);
      return connections;

    } catch (error) {
      logger.error('Error finding connections:', error as Error);
      return [];
    }
  }
  
  private calculateSimilarity(item1: FlowItem, item2: FlowItem): { score: number; reason: string } {
    // Simple similarity calculation based on content overlap
    const content1 = item1.content.toLowerCase();
    const content2 = item2.content.toLowerCase();
    
    // Extract meaningful words (basic tokenization)
    const words1 = new Set(content1.match(/\b\w{4,}\b/g) || []);
    const words2 = new Set(content2.match(/\b\w{4,}\b/g) || []);
    
    // Calculate Jaccard similarity
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    if (union.size === 0) return { score: 0, reason: '' };
    
    const score = intersection.size / union.size;
    
    // Check for same domain
    if (item1.source.url && item2.source.url) {
      try {
        const url1 = new URL(item1.source.url);
        const url2 = new URL(item2.source.url);
        if (url1.hostname === url2.hostname) {
          return { 
            score: Math.min(score + 0.3, 1), 
            reason: `Same domain (${url1.hostname}) with shared topics` 
          };
        }
      } catch {}
    }
    
    // Generate reason based on common words
    if (intersection.size > 0) {
      const commonWords = Array.from(intersection).slice(0, 3).join(', ');
      return { 
        score, 
        reason: `Shared topics: ${commonWords}` 
      };
    }
    
    // Check for related types
    if (item1.type === 'note' && item2.type === 'note') {
      return { score: 0.2, reason: 'Related notes' };
    }
    
    return { score: 0, reason: '' };
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
