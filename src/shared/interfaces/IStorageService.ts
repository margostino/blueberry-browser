/**
 * Storage Service Interface
 * Defines the contract for persistent storage services
 */

export interface IStorageService<T> {
  save(data: T): Promise<boolean>;
  load(id: string): Promise<T | null>;
  loadAll(): Promise<T[]>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
}

export interface ICanvasStorageService extends IStorageService<FlowCanvas> {
  getActiveCanvas(): Promise<FlowCanvas | null>;
  createCanvas(): Promise<FlowCanvas>;
}

// Import type without implementation dependency
import type { FlowCanvas } from '../types/flowcanvas';