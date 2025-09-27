/**
 * FlowCanvas Domain Entity
 * Core business logic for canvas operations
 */

import { CanvasId } from '../value-objects/CanvasId';
import { CanvasName } from '../value-objects/CanvasName';
import { FlowItem } from './FlowItem';
import { Connection } from './Connection';

export class FlowCanvas {
  private _id: CanvasId;
  private _name: CanvasName;
  private _items: FlowItem[];
  private _connections: Connection[];
  private _created: Date;
  private _modified: Date;
  private _zoom: number;
  private _viewport: { x: number; y: number };
  private _layout: 'freeform' | 'grid' | 'tree';

  constructor(params: {
    id?: CanvasId;
    name: CanvasName;
    items?: FlowItem[];
    connections?: Connection[];
    created?: Date;
    modified?: Date;
    zoom?: number;
    viewport?: { x: number; y: number };
    layout?: 'freeform' | 'grid' | 'tree';
  }) {
    this._id = params.id || CanvasId.generate();
    this._name = params.name;
    this._items = params.items || [];
    this._connections = params.connections || [];
    this._created = params.created || new Date();
    this._modified = params.modified || new Date();
    this._zoom = params.zoom || 1;
    this._viewport = params.viewport || { x: 0, y: 0 };
    this._layout = params.layout || 'freeform';
  }

  // Business Logic Methods

  addItem(item: FlowItem): void {
    if (this.hasItem(item.id)) {
      throw new Error(`Item with id ${item.id.value} already exists`);
    }
    this._items.push(item);
    this.markAsModified();
  }

  removeItem(itemId: string): void {
    const index = this._items.findIndex(item => item.id.value === itemId);
    if (index === -1) {
      throw new Error(`Item with id ${itemId} not found`);
    }

    // Remove associated connections
    this._connections = this._connections.filter(
      conn => conn.from !== itemId && conn.to !== itemId
    );

    this._items.splice(index, 1);
    this.markAsModified();
  }

  updateItem(item: FlowItem): void {
    const index = this._items.findIndex(i => i.id.value === item.id.value);
    if (index === -1) {
      throw new Error(`Item with id ${item.id.value} not found`);
    }
    this._items[index] = item;
    this.markAsModified();
  }

  addConnection(connection: Connection): void {
    // Validate that both items exist
    const fromExists = this._items.some(item => item.id.value === connection.from);
    const toExists = this._items.some(item => item.id.value === connection.to);

    if (!fromExists || !toExists) {
      throw new Error('Cannot connect non-existent items');
    }

    // Check for duplicate connections
    const isDuplicate = this._connections.some(
      conn => conn.from === connection.from && conn.to === connection.to
    );

    if (isDuplicate) {
      throw new Error('Connection already exists');
    }

    this._connections.push(connection);
    this.markAsModified();
  }

  removeConnection(connectionId: string): void {
    const index = this._connections.findIndex(conn => conn.id === connectionId);
    if (index === -1) {
      throw new Error(`Connection with id ${connectionId} not found`);
    }
    this._connections.splice(index, 1);
    this.markAsModified();
  }

  setZoom(zoom: number): void {
    if (zoom < 0.1 || zoom > 5) {
      throw new Error('Zoom must be between 0.1 and 5');
    }
    this._zoom = zoom;
    this.markAsModified();
  }

  setViewport(x: number, y: number): void {
    this._viewport = { x, y };
    this.markAsModified();
  }

  rename(name: CanvasName): void {
    this._name = name;
    this.markAsModified();
  }

  private hasItem(itemId: { value: string }): boolean {
    return this._items.some(item => item.id.value === itemId.value);
  }

  private markAsModified(): void {
    this._modified = new Date();
  }

  // Getters
  get id(): CanvasId { return this._id; }
  get name(): CanvasName { return this._name; }
  get items(): ReadonlyArray<FlowItem> { return this._items; }
  get connections(): ReadonlyArray<Connection> { return this._connections; }
  get created(): Date { return this._created; }
  get modified(): Date { return this._modified; }
  get zoom(): number { return this._zoom; }
  get viewport(): Readonly<{ x: number; y: number }> { return this._viewport; }
  get layout(): 'freeform' | 'grid' | 'tree' { return this._layout; }

  // Domain validation
  isValid(): boolean {
    return this._name.isValid() &&
           this._zoom >= 0.1 &&
           this._zoom <= 5 &&
           this._items.every(item => item.isValid());
  }
}