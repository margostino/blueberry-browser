/**
 * FlowCanvas Mapper
 * Converts between Domain Entities and DTOs
 */

import { FlowCanvas } from '../../domain/entities/FlowCanvas';
import { FlowItem } from '../../domain/entities/FlowItem';
import { Connection } from '../../domain/entities/Connection';
import { CanvasId } from '../../domain/value-objects/CanvasId';
import { CanvasName } from '../../domain/value-objects/CanvasName';
import { FlowCanvasDTO, FlowItemDTO, ConnectionDTO } from '../dto/FlowCanvasDTO';

export class FlowCanvasMapper {
  /**
   * Convert Domain Entity to DTO
   */
  static toDTO(entity: FlowCanvas): FlowCanvasDTO {
    return {
      id: entity.id.value,
      name: entity.name.value,
      items: entity.items.map(item => this.itemToDTO(item)),
      connections: entity.connections.map(conn => this.connectionToDTO(conn)),
      created: entity.created.getTime(),
      modified: entity.modified.getTime(),
      zoom: entity.zoom,
      viewport: { ...entity.viewport },
      layout: entity.layout
    };
  }

  /**
   * Convert DTO to Domain Entity
   */
  static toDomain(dto: FlowCanvasDTO): FlowCanvas {
    return new FlowCanvas({
      id: new CanvasId(dto.id),
      name: new CanvasName(dto.name),
      items: dto.items.map(item => this.itemToDomain(item)),
      connections: dto.connections.map(conn => this.connectionToDomain(conn)),
      created: new Date(dto.created),
      modified: new Date(dto.modified),
      zoom: dto.zoom,
      viewport: dto.viewport,
      layout: dto.layout
    });
  }

  /**
   * Convert multiple Domain Entities to DTOs
   */
  static toDTOList(entities: FlowCanvas[]): FlowCanvasDTO[] {
    return entities.map(entity => this.toDTO(entity));
  }

  /**
   * Convert multiple DTOs to Domain Entities
   */
  static toDomainList(dtos: FlowCanvasDTO[]): FlowCanvas[] {
    return dtos.map(dto => this.toDomain(dto));
  }

  // Private helper methods for nested entities

  private static itemToDTO(item: FlowItem): FlowItemDTO {
    return {
      id: item.id.value,
      type: item.type,
      content: item.content,
      position: { ...item.position },
      dimensions: { ...item.dimensions },
      metadata: { ...item.metadata },
      created: item.created.getTime(),
      modified: item.modified.getTime()
    };
  }

  private static itemToDomain(dto: FlowItemDTO): FlowItem {
    return new FlowItem({
      id: dto.id,
      type: dto.type,
      content: dto.content,
      position: dto.position,
      dimensions: dto.dimensions,
      metadata: dto.metadata,
      created: dto.created ? new Date(dto.created) : undefined,
      modified: dto.modified ? new Date(dto.modified) : undefined
    });
  }

  private static connectionToDTO(connection: Connection): ConnectionDTO {
    return {
      id: connection.id,
      from: connection.from,
      to: connection.to,
      type: connection.type,
      style: connection.style,
      color: connection.color,
      label: connection.label,
      fromPoint: connection.fromPoint,
      toPoint: connection.toPoint,
      created: connection.created.getTime()
    };
  }

  private static connectionToDomain(dto: ConnectionDTO): Connection {
    return new Connection({
      id: dto.id,
      from: dto.from,
      to: dto.to,
      type: dto.type,
      style: dto.style,
      color: dto.color,
      label: dto.label,
      fromPoint: dto.fromPoint,
      toPoint: dto.toPoint,
      created: dto.created ? new Date(dto.created) : undefined
    });
  }
}