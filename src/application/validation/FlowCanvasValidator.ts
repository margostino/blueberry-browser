/**
 * FlowCanvas Validator
 * Validation logic using Zod schemas
 */

import { z } from 'zod';
import { FlowCanvasDTO, FlowItemDTO, ConnectionDTO } from '../dto/FlowCanvasDTO';

// Validation schemas
const PositionSchema = z.object({
  x: z.number(),
  y: z.number()
});

const DimensionsSchema = z.object({
  width: z.number().positive('Width must be positive'),
  height: z.number().positive('Height must be positive')
});

const FlowItemSchema = z.object({
  id: z.string().min(1, 'Item ID cannot be empty'),
  type: z.enum(['note', 'screenshot', 'link', 'code', 'diagram']),
  content: z.any(),
  position: PositionSchema,
  dimensions: DimensionsSchema,
  metadata: z.record(z.any()).optional(),
  created: z.number().optional(),
  modified: z.number().optional()
});

const ConnectionSchema = z.object({
  id: z.string().min(1, 'Connection ID cannot be empty'),
  from: z.string().min(1, 'From ID cannot be empty'),
  to: z.string().min(1, 'To ID cannot be empty'),
  type: z.enum(['straight', 'curved', 'step']).optional(),
  style: z.enum(['solid', 'dashed', 'dotted']).optional(),
  color: z.string().optional(),
  label: z.string().optional(),
  fromPoint: PositionSchema.optional(),
  toPoint: PositionSchema.optional(),
  created: z.number().optional()
});

const FlowCanvasSchema = z.object({
  id: z.string().min(1, 'Canvas ID cannot be empty'),
  name: z.string()
    .min(1, 'Canvas name cannot be empty')
    .max(100, 'Canvas name too long'),
  items: z.array(FlowItemSchema),
  connections: z.array(ConnectionSchema),
  created: z.number(),
  modified: z.number(),
  zoom: z.number().min(0.1).max(5),
  viewport: PositionSchema,
  layout: z.enum(['freeform', 'grid', 'tree'])
});

export class FlowCanvasValidator {
  /**
   * Validate a complete FlowCanvas DTO
   */
  static validateCanvas(dto: unknown): FlowCanvasDTO {
    const result = FlowCanvasSchema.parse(dto);

    // Additional business rule validations
    this.validateBusinessRules(result);

    return result;
  }

  /**
   * Validate a FlowItem DTO
   */
  static validateItem(dto: unknown): FlowItemDTO {
    return FlowItemSchema.parse(dto);
  }

  /**
   * Validate a Connection DTO
   */
  static validateConnection(dto: unknown): ConnectionDTO {
    return ConnectionSchema.parse(dto);
  }

  /**
   * Safe validation that returns errors instead of throwing
   */
  static safeValidateCanvas(dto: unknown): {
    success: boolean;
    data?: FlowCanvasDTO;
    errors?: z.ZodError;
  } {
    const result = FlowCanvasSchema.safeParse(dto);

    if (result.success) {
      try {
        this.validateBusinessRules(result.data);
        return { success: true, data: result.data };
      } catch (error) {
        return {
          success: false,
          errors: new z.ZodError([
            {
              code: 'custom',
              message: error instanceof Error ? error.message : 'Business rule violation',
              path: []
            }
          ])
        };
      }
    }

    return {
      success: false,
      errors: result.error
    };
  }

  /**
   * Validate business rules that go beyond schema validation
   */
  private static validateBusinessRules(canvas: FlowCanvasDTO): void {
    // Ensure all connections reference existing items
    const itemIds = new Set(canvas.items.map(item => item.id));

    for (const connection of canvas.connections) {
      if (!itemIds.has(connection.from)) {
        throw new Error(`Connection references non-existent item: ${connection.from}`);
      }
      if (!itemIds.has(connection.to)) {
        throw new Error(`Connection references non-existent item: ${connection.to}`);
      }
      if (connection.from === connection.to) {
        throw new Error(`Connection cannot connect item to itself: ${connection.from}`);
      }
    }

    // Check for duplicate connection IDs
    const connectionIds = new Set<string>();
    for (const connection of canvas.connections) {
      if (connectionIds.has(connection.id)) {
        throw new Error(`Duplicate connection ID: ${connection.id}`);
      }
      connectionIds.add(connection.id);
    }

    // Check for duplicate item IDs
    const itemIdSet = new Set<string>();
    for (const item of canvas.items) {
      if (itemIdSet.has(item.id)) {
        throw new Error(`Duplicate item ID: ${item.id}`);
      }
      itemIdSet.add(item.id);
    }
  }

  /**
   * Extract validation errors in a user-friendly format
   */
  static formatErrors(error: z.ZodError): string[] {
    return error.errors.map(err => {
      const path = err.path.join('.');
      return path ? `${path}: ${err.message}` : err.message;
    });
  }
}