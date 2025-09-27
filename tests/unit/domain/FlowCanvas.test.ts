/**
 * FlowCanvas Domain Entity Tests
 * Example test structure for domain entities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FlowCanvas } from '../../../src/domain/entities/FlowCanvas';
import { FlowItem } from '../../../src/domain/entities/FlowItem';
import { Connection } from '../../../src/domain/entities/Connection';
import { CanvasId } from '../../../src/domain/value-objects/CanvasId';
import { CanvasName } from '../../../src/domain/value-objects/CanvasName';

describe('FlowCanvas Domain Entity', () => {
  let canvas: FlowCanvas;

  beforeEach(() => {
    canvas = new FlowCanvas({
      name: new CanvasName('Test Canvas')
    });
  });

  describe('Canvas Creation', () => {
    it('should create a canvas with default values', () => {
      expect(canvas.name.value).toBe('Test Canvas');
      expect(canvas.items).toHaveLength(0);
      expect(canvas.connections).toHaveLength(0);
      expect(canvas.zoom).toBe(1);
      expect(canvas.layout).toBe('freeform');
    });

    it('should generate an ID automatically', () => {
      expect(canvas.id).toBeDefined();
      expect(canvas.id.value).toBeTruthy();
    });

    it('should set created and modified dates', () => {
      expect(canvas.created).toBeInstanceOf(Date);
      expect(canvas.modified).toBeInstanceOf(Date);
    });
  });

  describe('Item Management', () => {
    let testItem: FlowItem;

    beforeEach(() => {
      testItem = new FlowItem({
        id: 'item-1',
        type: 'note',
        content: 'Test content',
        position: { x: 100, y: 100 },
        dimensions: { width: 200, height: 150 }
      });
    });

    it('should add an item to the canvas', () => {
      canvas.addItem(testItem);
      expect(canvas.items).toHaveLength(1);
      expect(canvas.items[0]).toBe(testItem);
    });

    it('should throw error when adding duplicate item', () => {
      canvas.addItem(testItem);
      expect(() => canvas.addItem(testItem)).toThrow('already exists');
    });

    it('should remove an item from the canvas', () => {
      canvas.addItem(testItem);
      canvas.removeItem('item-1');
      expect(canvas.items).toHaveLength(0);
    });

    it('should throw error when removing non-existent item', () => {
      expect(() => canvas.removeItem('non-existent')).toThrow('not found');
    });

    it('should update an existing item', () => {
      canvas.addItem(testItem);

      const updatedItem = testItem.updateContent('Updated content');
      canvas.updateItem(updatedItem);

      expect(canvas.items[0].content).toBe('Updated content');
    });

    it('should remove connections when removing an item', () => {
      const item2 = new FlowItem({
        id: 'item-2',
        type: 'note',
        content: 'Item 2',
        position: { x: 300, y: 100 },
        dimensions: { width: 200, height: 150 }
      });

      canvas.addItem(testItem);
      canvas.addItem(item2);

      const connection = new Connection({
        id: 'conn-1',
        from: 'item-1',
        to: 'item-2'
      });

      canvas.addConnection(connection);
      expect(canvas.connections).toHaveLength(1);

      canvas.removeItem('item-1');
      expect(canvas.connections).toHaveLength(0);
    });
  });

  describe('Connection Management', () => {
    let item1: FlowItem;
    let item2: FlowItem;

    beforeEach(() => {
      item1 = new FlowItem({
        id: 'item-1',
        type: 'note',
        content: 'Item 1',
        position: { x: 100, y: 100 },
        dimensions: { width: 200, height: 150 }
      });

      item2 = new FlowItem({
        id: 'item-2',
        type: 'note',
        content: 'Item 2',
        position: { x: 300, y: 100 },
        dimensions: { width: 200, height: 150 }
      });

      canvas.addItem(item1);
      canvas.addItem(item2);
    });

    it('should add a connection between existing items', () => {
      const connection = new Connection({
        id: 'conn-1',
        from: 'item-1',
        to: 'item-2'
      });

      canvas.addConnection(connection);
      expect(canvas.connections).toHaveLength(1);
    });

    it('should throw error when connecting non-existent items', () => {
      const connection = new Connection({
        id: 'conn-1',
        from: 'non-existent',
        to: 'item-2'
      });

      expect(() => canvas.addConnection(connection)).toThrow('non-existent items');
    });

    it('should prevent duplicate connections', () => {
      const connection1 = new Connection({
        id: 'conn-1',
        from: 'item-1',
        to: 'item-2'
      });

      const connection2 = new Connection({
        id: 'conn-2',
        from: 'item-1',
        to: 'item-2'
      });

      canvas.addConnection(connection1);
      expect(() => canvas.addConnection(connection2)).toThrow('already exists');
    });

    it('should remove a connection', () => {
      const connection = new Connection({
        id: 'conn-1',
        from: 'item-1',
        to: 'item-2'
      });

      canvas.addConnection(connection);
      canvas.removeConnection('conn-1');
      expect(canvas.connections).toHaveLength(0);
    });
  });

  describe('Canvas Properties', () => {
    it('should set zoom within valid range', () => {
      canvas.setZoom(2);
      expect(canvas.zoom).toBe(2);

      canvas.setZoom(0.5);
      expect(canvas.zoom).toBe(0.5);
    });

    it('should throw error for invalid zoom values', () => {
      expect(() => canvas.setZoom(0.05)).toThrow('between 0.1 and 5');
      expect(() => canvas.setZoom(6)).toThrow('between 0.1 and 5');
    });

    it('should set viewport position', () => {
      canvas.setViewport(100, 200);
      expect(canvas.viewport).toEqual({ x: 100, y: 200 });
    });

    it('should rename the canvas', () => {
      const newName = new CanvasName('Updated Canvas Name');
      canvas.rename(newName);
      expect(canvas.name.value).toBe('Updated Canvas Name');
    });
  });

  describe('Modification Tracking', () => {
    it('should update modified date when adding items', () => {
      const originalModified = canvas.modified;

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        const item = new FlowItem({
          id: 'item-1',
          type: 'note',
          content: 'Test',
          position: { x: 0, y: 0 },
          dimensions: { width: 100, height: 100 }
        });

        canvas.addItem(item);
        expect(canvas.modified.getTime()).toBeGreaterThan(originalModified.getTime());
      }, 10);
    });
  });

  describe('Validation', () => {
    it('should validate a valid canvas', () => {
      expect(canvas.isValid()).toBe(true);
    });

    it('should validate canvas with items', () => {
      const item = new FlowItem({
        id: 'item-1',
        type: 'note',
        content: 'Test',
        position: { x: 0, y: 0 },
        dimensions: { width: 100, height: 100 }
      });

      canvas.addItem(item);
      expect(canvas.isValid()).toBe(true);
    });
  });
});