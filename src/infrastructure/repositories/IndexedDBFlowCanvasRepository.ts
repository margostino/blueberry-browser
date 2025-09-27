/**
 * IndexedDB Implementation of FlowCanvas Repository
 * Concrete implementation for browser storage
 */

import { IFlowCanvasRepository } from '../../domain/repositories/IFlowCanvasRepository';
import { FlowCanvas } from '../../domain/entities/FlowCanvas';
import { CanvasId } from '../../domain/value-objects/CanvasId';
import { FlowCanvasMapper } from '../../application/mappers/FlowCanvasMapper';
import { FlowCanvasDTO } from '../../application/dto/FlowCanvasDTO';
import { FLOWCANVAS_DB } from '../../shared/constants/app';

export class IndexedDBFlowCanvasRepository implements IFlowCanvasRepository {
  private db: IDBDatabase | null = null;
  private activeCanvasId: string | null = null;

  constructor() {
    this.initDB();
  }

  private async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(FLOWCANVAS_DB.NAME, FLOWCANVAS_DB.VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create canvases store
        if (!db.objectStoreNames.contains(FLOWCANVAS_DB.STORES.CANVASES)) {
          const canvasStore = db.createObjectStore(FLOWCANVAS_DB.STORES.CANVASES, {
            keyPath: 'id'
          });
          canvasStore.createIndex('created', 'created', { unique: false });
          canvasStore.createIndex('modified', 'modified', { unique: false });
          canvasStore.createIndex('name', 'name', { unique: false });
        }

        // Create preferences store
        if (!db.objectStoreNames.contains(FLOWCANVAS_DB.STORES.PREFERENCES)) {
          db.createObjectStore(FLOWCANVAS_DB.STORES.PREFERENCES, { keyPath: 'key' });
        }
      };
    });
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return await this.initDB();
  }

  async save(canvas: FlowCanvas): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction([FLOWCANVAS_DB.STORES.CANVASES], 'readwrite');
    const store = transaction.objectStore(FLOWCANVAS_DB.STORES.CANVASES);

    const dto = FlowCanvasMapper.toDTO(canvas);

    return new Promise((resolve, reject) => {
      const request = store.put(dto);
      request.onsuccess = () => {
        // Update active canvas ID
        this.setActiveCanvasId(canvas.id.value);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async findById(id: CanvasId): Promise<FlowCanvas | null> {
    const db = await this.getDB();
    const transaction = db.transaction([FLOWCANVAS_DB.STORES.CANVASES], 'readonly');
    const store = transaction.objectStore(FLOWCANVAS_DB.STORES.CANVASES);

    return new Promise((resolve, reject) => {
      const request = store.get(id.value);
      request.onsuccess = () => {
        const dto = request.result as FlowCanvasDTO | undefined;
        if (dto) {
          try {
            const canvas = FlowCanvasMapper.toDomain(dto);
            resolve(canvas);
          } catch (error) {
            // Handle corrupted data
            console.error('Failed to map canvas from storage:', error);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async findAll(): Promise<FlowCanvas[]> {
    const db = await this.getDB();
    const transaction = db.transaction([FLOWCANVAS_DB.STORES.CANVASES], 'readonly');
    const store = transaction.objectStore(FLOWCANVAS_DB.STORES.CANVASES);
    const index = store.index('modified');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev'); // Sort by modified desc
      const canvases: FlowCanvas[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          try {
            const dto = cursor.value as FlowCanvasDTO;
            const canvas = FlowCanvasMapper.toDomain(dto);
            canvases.push(canvas);
          } catch (error) {
            console.error('Failed to map canvas:', error);
          }
          cursor.continue();
        } else {
          resolve(canvases);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id: CanvasId): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction([FLOWCANVAS_DB.STORES.CANVASES], 'readwrite');
    const store = transaction.objectStore(FLOWCANVAS_DB.STORES.CANVASES);

    return new Promise((resolve, reject) => {
      const request = store.delete(id.value);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async exists(id: CanvasId): Promise<boolean> {
    const canvas = await this.findById(id);
    return canvas !== null;
  }

  async findActive(): Promise<FlowCanvas | null> {
    const activeId = await this.getActiveCanvasId();
    if (activeId) {
      return await this.findById(new CanvasId(activeId));
    }

    // If no active canvas, return the most recent
    const allCanvases = await this.findAll();
    return allCanvases.length > 0 ? allCanvases[0] : null;
  }

  async findByName(name: string): Promise<FlowCanvas[]> {
    const db = await this.getDB();
    const transaction = db.transaction([FLOWCANVAS_DB.STORES.CANVASES], 'readonly');
    const store = transaction.objectStore(FLOWCANVAS_DB.STORES.CANVASES);
    const index = store.index('name');

    return new Promise((resolve, reject) => {
      const request = index.getAll(name);
      request.onsuccess = () => {
        const dtos = request.result as FlowCanvasDTO[];
        const canvases = dtos.map(dto => FlowCanvasMapper.toDomain(dto));
        resolve(canvases);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async findRecent(limit: number): Promise<FlowCanvas[]> {
    const allCanvases = await this.findAll();
    return allCanvases.slice(0, limit);
  }

  // Private helper methods

  private async getActiveCanvasId(): Promise<string | null> {
    const db = await this.getDB();
    const transaction = db.transaction([FLOWCANVAS_DB.STORES.PREFERENCES], 'readonly');
    const store = transaction.objectStore(FLOWCANVAS_DB.STORES.PREFERENCES);

    return new Promise((resolve, reject) => {
      const request = store.get('activeCanvasId');
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async setActiveCanvasId(canvasId: string): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction([FLOWCANVAS_DB.STORES.PREFERENCES], 'readwrite');
    const store = transaction.objectStore(FLOWCANVAS_DB.STORES.PREFERENCES);

    return new Promise((resolve, reject) => {
      const request = store.put({ key: 'activeCanvasId', value: canvasId });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}