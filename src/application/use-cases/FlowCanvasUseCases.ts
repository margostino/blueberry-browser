/**
 * FlowCanvas Use Cases
 * Application layer orchestration of business logic
 */

import { IFlowCanvasRepository } from '../../domain/repositories/IFlowCanvasRepository';
import { FlowCanvas } from '../../domain/entities/FlowCanvas';
import { FlowItem } from '../../domain/entities/FlowItem';
import { Connection } from '../../domain/entities/Connection';
import { CanvasId } from '../../domain/value-objects/CanvasId';
import { CanvasName } from '../../domain/value-objects/CanvasName';
import { FlowCanvasMapper } from '../mappers/FlowCanvasMapper';
import { FlowCanvasValidator } from '../validation/FlowCanvasValidator';
import {
  FlowCanvasDTO,
  CreateCanvasRequestDTO,
  UpdateCanvasRequestDTO,
  CanvasResponseDTO
} from '../dto/FlowCanvasDTO';

export class FlowCanvasUseCases {
  constructor(
    private readonly repository: IFlowCanvasRepository
  ) {}

  /**
   * Create a new canvas
   */
  async createCanvas(request: CreateCanvasRequestDTO): Promise<CanvasResponseDTO> {
    try {
      const name = request.name
        ? new CanvasName(request.name)
        : CanvasName.createDefault();

      const canvas = new FlowCanvas({
        name,
        layout: request.layout || 'freeform'
      });

      await this.repository.save(canvas);

      return {
        success: true,
        data: FlowCanvasMapper.toDTO(canvas)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create canvas'
      };
    }
  }

  /**
   * Get canvas by ID
   */
  async getCanvas(canvasId: string): Promise<CanvasResponseDTO> {
    try {
      const canvas = await this.repository.findById(new CanvasId(canvasId));

      if (!canvas) {
        return {
          success: false,
          error: 'Canvas not found'
        };
      }

      return {
        success: true,
        data: FlowCanvasMapper.toDTO(canvas)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get canvas'
      };
    }
  }

  /**
   * Get all canvases
   */
  async getAllCanvases(): Promise<FlowCanvasDTO[]> {
    const canvases = await this.repository.findAll();
    return FlowCanvasMapper.toDTOList(canvases);
  }

  /**
   * Get active canvas
   */
  async getActiveCanvas(): Promise<CanvasResponseDTO> {
    try {
      let canvas = await this.repository.findActive();

      // Create a new canvas if none exists
      if (!canvas) {
        canvas = new FlowCanvas({
          name: CanvasName.createDefault()
        });
        await this.repository.save(canvas);
      }

      return {
        success: true,
        data: FlowCanvasMapper.toDTO(canvas)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get active canvas'
      };
    }
  }

  /**
   * Update canvas
   */
  async updateCanvas(request: UpdateCanvasRequestDTO): Promise<CanvasResponseDTO> {
    try {
      // Validate the update request
      const validationResult = FlowCanvasValidator.safeValidateCanvas(request);
      if (!validationResult.success) {
        return {
          success: false,
          error: FlowCanvasValidator.formatErrors(validationResult.errors!).join(', ')
        };
      }

      const canvas = await this.repository.findById(new CanvasId(request.id));

      if (!canvas) {
        return {
          success: false,
          error: 'Canvas not found'
        };
      }

      // Apply updates
      if (request.name) {
        canvas.rename(new CanvasName(request.name));
      }

      if (request.zoom !== undefined) {
        canvas.setZoom(request.zoom);
      }

      if (request.viewport) {
        canvas.setViewport(request.viewport.x, request.viewport.y);
      }

      // Save updated canvas
      await this.repository.save(canvas);

      return {
        success: true,
        data: FlowCanvasMapper.toDTO(canvas)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update canvas'
      };
    }
  }

  /**
   * Delete canvas
   */
  async deleteCanvas(canvasId: string): Promise<CanvasResponseDTO> {
    try {
      const id = new CanvasId(canvasId);
      const exists = await this.repository.exists(id);

      if (!exists) {
        return {
          success: false,
          error: 'Canvas not found'
        };
      }

      await this.repository.delete(id);

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete canvas'
      };
    }
  }

  /**
   * Add item to canvas
   */
  async addItemToCanvas(canvasId: string, item: FlowItem): Promise<CanvasResponseDTO> {
    try {
      const canvas = await this.repository.findById(new CanvasId(canvasId));

      if (!canvas) {
        return {
          success: false,
          error: 'Canvas not found'
        };
      }

      canvas.addItem(item);
      await this.repository.save(canvas);

      return {
        success: true,
        data: FlowCanvasMapper.toDTO(canvas)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add item'
      };
    }
  }

  /**
   * Remove item from canvas
   */
  async removeItemFromCanvas(canvasId: string, itemId: string): Promise<CanvasResponseDTO> {
    try {
      const canvas = await this.repository.findById(new CanvasId(canvasId));

      if (!canvas) {
        return {
          success: false,
          error: 'Canvas not found'
        };
      }

      canvas.removeItem(itemId);
      await this.repository.save(canvas);

      return {
        success: true,
        data: FlowCanvasMapper.toDTO(canvas)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove item'
      };
    }
  }

  /**
   * Add connection between items
   */
  async addConnection(
    canvasId: string,
    connection: Connection
  ): Promise<CanvasResponseDTO> {
    try {
      const canvas = await this.repository.findById(new CanvasId(canvasId));

      if (!canvas) {
        return {
          success: false,
          error: 'Canvas not found'
        };
      }

      canvas.addConnection(connection);
      await this.repository.save(canvas);

      return {
        success: true,
        data: FlowCanvasMapper.toDTO(canvas)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add connection'
      };
    }
  }

  /**
   * Remove connection
   */
  async removeConnection(
    canvasId: string,
    connectionId: string
  ): Promise<CanvasResponseDTO> {
    try {
      const canvas = await this.repository.findById(new CanvasId(canvasId));

      if (!canvas) {
        return {
          success: false,
          error: 'Canvas not found'
        };
      }

      canvas.removeConnection(connectionId);
      await this.repository.save(canvas);

      return {
        success: true,
        data: FlowCanvasMapper.toDTO(canvas)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove connection'
      };
    }
  }
}