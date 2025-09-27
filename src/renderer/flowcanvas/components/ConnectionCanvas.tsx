import React, { useRef, useEffect } from 'react';
import { Connection, FlowItem } from '../../../shared/types/flowcanvas';
interface ConnectionCanvasProps {
  items: FlowItem[];
  connections: Connection[];
  onConnectionDelete?: (connectionId: string) => void;
  isCreatingConnection: boolean;
  connectionStartPoint: { x: number; y: number } | null;
  mousePosition: { x: number; y: number };
}
export const ConnectionCanvas: React.FC<ConnectionCanvasProps> = ({
  items,
  connections = [],
  onConnectionDelete,
  isCreatingConnection,
  connectionStartPoint,
  mousePosition
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const getItemCenter = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return null;
    return {
      x: item.position.x + item.dimensions.width / 2,
      y: item.position.y + item.dimensions.height / 2
    };
  };
  const drawConnection = (
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    connection?: Connection
  ) => {
    const type = connection?.type || 'curved';
    const color = connection?.color || '#3b82f6';
    const style = connection?.style || 'solid';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (style === 'dashed') {
      ctx.setLineDash([8, 4]);
    } else if (style === 'dotted') {
      ctx.setLineDash([2, 4]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    if (type === 'straight') {
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
    } else if (type === 'curved') {
      const controlPoint1X = from.x + (to.x - from.x) / 3;
      const controlPoint1Y = from.y;
      const controlPoint2X = from.x + (to.x - from.x) * 2 / 3;
      const controlPoint2Y = to.y;
      ctx.moveTo(from.x, from.y);
      ctx.bezierCurveTo(
        controlPoint1X, controlPoint1Y,
        controlPoint2X, controlPoint2Y,
        to.x, to.y
      );
    } else if (type === 'step') {
      const midX = (from.x + to.x) / 2;
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(midX, from.y);
      ctx.lineTo(midX, to.y);
      ctx.lineTo(to.x, to.y);
    }
    ctx.stroke();
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const arrowLength = 10;
    const arrowAngle = Math.PI / 6;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - arrowLength * Math.cos(angle - arrowAngle),
      to.y - arrowLength * Math.sin(angle - arrowAngle)
    );
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - arrowLength * Math.cos(angle + arrowAngle),
      to.y - arrowLength * Math.sin(angle + arrowAngle)
    );
    ctx.stroke();
    // Display label for connections or similarity info with percentage
    if (connection?.label || connection?.metadata) {
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      
      let displayText = connection.label || '';
      
      // For similarity connections, show reason and percentage
      if (connection.metadata?.mode === 'similarity' && connection.metadata?.reason) {
        const percentage = connection.metadata.similarityScore 
          ? Math.round(connection.metadata.similarityScore * 100) 
          : 0;
        displayText = `${connection.metadata.reason} (${percentage}% match)`;
      }
      
      if (displayText) {
        // Calculate text metrics for background
        ctx.font = '12px sans-serif';
        const textMetrics = ctx.measureText(displayText);
        const textWidth = textMetrics.width;
        const padding = 8;
        
        // Draw semi-transparent background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(
          midX - textWidth / 2 - padding,
          midY - 10,
          textWidth + padding * 2,
          20
        );
        
        // Draw border
        ctx.strokeStyle = connection.metadata?.mode === 'similarity' ? '#10b981' : '#8b5cf6';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          midX - textWidth / 2 - padding,
          midY - 10,
          textWidth + padding * 2,
          20
        );
        
        // Draw text
        ctx.fillStyle = '#333333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayText, midX, midY);
        
        // Reset line width for next drawing
        ctx.lineWidth = 2;
      }
    }
  };
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.scrollWidth;
      canvas.height = container.scrollHeight;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    connections.forEach(connection => {
      if (connection.fromPoint && connection.toPoint) {
        drawConnection(ctx, connection.fromPoint, connection.toPoint, connection);
      } else {
        const from = getItemCenter(connection.from);
        const to = getItemCenter(connection.to);
        if (from && to) {
          drawConnection(ctx, from, to, connection);
        }
      }
    });
    if (isCreatingConnection && connectionStartPoint && mousePosition) {
      drawConnection(ctx, connectionStartPoint, mousePosition);
    }
  }, [items, connections, isCreatingConnection, connectionStartPoint, mousePosition]);
  const handleClick = (e: React.MouseEvent) => {
    if (!onConnectionDelete || connections.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    connections.forEach(connection => {
      let from: { x: number; y: number } | null = null;
      let to: { x: number; y: number } | null = null;
      if (connection.fromPoint && connection.toPoint) {
        from = connection.fromPoint;
        to = connection.toPoint;
      } else {
        from = getItemCenter(connection.from);
        to = getItemCenter(connection.to);
      }
      if (from && to) {
        const dist = pointToLineDistance(
          { x: clickX, y: clickY },
          from,
          to
        );
        if (dist < 10) { 
          if (e.shiftKey || e.metaKey) {
            onConnectionDelete(connection.id);
          }
        }
      }
    });
  };
  const pointToLineDistance = (
    point: { x: number; y: number },
    lineStart: { x: number; y: number },
    lineEnd: { x: number; y: number }
  ): number => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }
    let xx, yy;
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }
    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };
  return (
    <canvas
      ref={canvasRef}
      className="connection-canvas"
      onClick={handleClick}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: isCreatingConnection ? 'all' : 'none',
        zIndex: isCreatingConnection ? 999 : 1
      }}
    />
  );
};