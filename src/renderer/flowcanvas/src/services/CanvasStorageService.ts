import { FlowCanvas, FlowItem } from '../../../../types/flowcanvas';
const DB_NAME = 'FlowCanvasDB';
const DB_VERSION = 1;
const CANVAS_STORE = 'canvases';
const ITEMS_STORE = 'items';
const PREFERENCES_STORE = 'preferences';
export class CanvasStorageService {
  private db: IDBDatabase | null = null;
  constructor() {
    this.initDB();
  }
  private async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(CANVAS_STORE)) {
          const canvasStore = db.createObjectStore(CANVAS_STORE, { keyPath: 'id' });
          canvasStore.createIndex('created', 'created', { unique: false });
          canvasStore.createIndex('modified', 'modified', { unique: false });
          canvasStore.createIndex('name', 'name', { unique: false });
        }
        if (!db.objectStoreNames.contains(ITEMS_STORE)) {
          const itemsStore = db.createObjectStore(ITEMS_STORE, { keyPath: 'id' });
          itemsStore.createIndex('canvasId', 'canvasId', { unique: false });
          itemsStore.createIndex('type', 'type', { unique: false });
          itemsStore.createIndex('created', 'created', { unique: false });
        }
        if (!db.objectStoreNames.contains(PREFERENCES_STORE)) {
          db.createObjectStore(PREFERENCES_STORE, { keyPath: 'key' });
        }
      };
    });
  }
  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return await this.initDB();
  }
  async saveCanvas(canvas: FlowCanvas): Promise<boolean> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([CANVAS_STORE], 'readwrite');
      const store = transaction.objectStore(CANVAS_STORE);
      canvas.modified = Date.now();
      await new Promise((resolve, reject) => {
        const request = store.put(canvas);
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
      await this.setActiveCanvasId(canvas.id);
      return true;
    } catch (error) {
      console.error('Failed to save canvas:', error);
      return false;
    }
  }
  async getCanvas(canvasId: string): Promise<FlowCanvas | null> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([CANVAS_STORE], 'readonly');
      const store = transaction.objectStore(CANVAS_STORE);
      return new Promise((resolve, reject) => {
        const request = store.get(canvasId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get canvas:', error);
      return null;
    }
  }
  async getAllCanvases(): Promise<FlowCanvas[]> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([CANVAS_STORE], 'readonly');
      const store = transaction.objectStore(CANVAS_STORE);
      const index = store.index('modified');
      return new Promise((resolve, reject) => {
        const request = index.openCursor(null, 'prev'); 
        const canvases: FlowCanvas[] = [];
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            canvases.push(cursor.value);
            cursor.continue();
          } else {
            resolve(canvases);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get all canvases:', error);
      return [];
    }
  }
  async deleteCanvas(canvasId: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([CANVAS_STORE], 'readwrite');
      const store = transaction.objectStore(CANVAS_STORE);
      return new Promise((resolve, reject) => {
        const request = store.delete(canvasId);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(false);
      });
    } catch (error) {
      console.error('Failed to delete canvas:', error);
      return false;
    }
  }
  async getActiveCanvas(): Promise<FlowCanvas | null> {
    try {
      const activeId = await this.getActiveCanvasId();
      if (activeId) {
        return await this.getCanvas(activeId);
      }
      const canvases = await this.getAllCanvases();
      return canvases.length > 0 ? canvases[0] : null;
    } catch (error) {
      console.error('Failed to get active canvas:', error);
      return null;
    }
  }
  async createCanvas(): Promise<FlowCanvas> {
    const canvas: FlowCanvas = {
      id: this.generateId(),
      name: `Flow ${new Date().toLocaleDateString()}`,
      items: [], 
      connections: [], 
      created: Date.now(),
      modified: Date.now(),
      zoom: 1,
      viewport: { x: 0, y: 0 },
      layout: 'freeform'
    };
    await this.saveCanvas(canvas);
    return canvas;
  }
  private async getActiveCanvasId(): Promise<string | null> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([PREFERENCES_STORE], 'readonly');
      const store = transaction.objectStore(PREFERENCES_STORE);
      return new Promise((resolve, reject) => {
        const request = store.get('activeCanvasId');
        request.onsuccess = () => resolve(request.result?.value || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get active canvas ID:', error);
      return null;
    }
  }
  private async setActiveCanvasId(canvasId: string): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([PREFERENCES_STORE], 'readwrite');
      const store = transaction.objectStore(PREFERENCES_STORE);
      return new Promise((resolve, reject) => {
        const request = store.put({ key: 'activeCanvasId', value: canvasId });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to set active canvas ID:', error);
    }
  }
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  private getMockItems(): FlowItem[] {
    return [
      {
        id: this.generateId(),
        type: 'text',
        content: 'FlowCanvas transforms how users collect, organize, and synthesize information from the web. Instead of losing context across dozens of tabs, users can capture snippets, images, and insights onto a persistent, spatial canvas.',
        source: {
          url: 'https://flowcanvas.app',
          title: 'FlowCanvas Introduction',
          timestamp: Date.now() - 3600000
        },
        position: { x: 100, y: 100 },
        dimensions: { width: 280, height: 150 }
      },
      {
        id: this.generateId(),
        type: 'text',
        content: 'Core Value Proposition: "Enter your Flow. Every browsing session flows into lasting understanding."',
        source: {
          url: 'https://flowcanvas.app',
          title: 'Value Proposition',
          timestamp: Date.now() - 1800000
        },
        position: { x: 420, y: 120 },
        dimensions: { width: 280, height: 120 }
      },
      {
        id: this.generateId(),
        type: 'text',
        content: 'Users can capture text snippets from any webpage using right-click context menu or keyboard shortcut (Cmd/Ctrl + Shift + W)',
        source: {
          url: 'https://flowcanvas.app',
          title: 'Key Features',
          timestamp: Date.now() - 900000
        },
        position: { x: 250, y: 280 },
        dimensions: { width: 280, height: 120 }
      }
    ];
  }
}