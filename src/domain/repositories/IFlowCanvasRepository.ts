/**
 * FlowCanvas Repository Interface
 * Defines the contract for canvas persistence
 */

import { FlowCanvas } from '../entities/FlowCanvas';
import { CanvasId } from '../value-objects/CanvasId';

export interface IFlowCanvasRepository {
  save(canvas: FlowCanvas): Promise<void>;
  findById(id: CanvasId): Promise<FlowCanvas | null>;
  findAll(): Promise<FlowCanvas[]>;
  delete(id: CanvasId): Promise<void>;
  exists(id: CanvasId): Promise<boolean>;

  // Business-specific queries
  findActive(): Promise<FlowCanvas | null>;
  findByName(name: string): Promise<FlowCanvas[]>;
  findRecent(limit: number): Promise<FlowCanvas[]>;
}