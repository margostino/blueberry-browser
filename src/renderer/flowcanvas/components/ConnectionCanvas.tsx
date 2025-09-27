import React, { useEffect, useRef, useState } from 'react';
import { Connection, FlowItem } from '../../../shared/types/flowcanvas';
import { ConnectionReasonModal } from './ConnectionReasonModal';

interface ConnectionCanvasProps {
  items: FlowItem[];
  connections: Connection[];
  onConnectionDelete?: (connectionId: string) => void;
  isCreatingConnection: boolean;
  connectionStartPoint: { x: number; y: number } | null;
  mousePosition: { x: number; y: number };
  tempItemPositions?: Map<string, { x: number; y: number }>;
  zoom?: number;
  pan?: { x: number; y: number };
  onOpenReasonModal?: (connection: Connection) => void;
}
export const ConnectionCanvas: React.FC<ConnectionCanvasProps> = ({
  items,
  connections = [],
  isCreatingConnection,
  connectionStartPoint,
  mousePosition,
  tempItemPositions = new Map(),
  zoom = 1,
  pan = { x: 0, y: 0 },
  onOpenReasonModal
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [modalConnection, setModalConnection] = useState<Connection | null>(null);
  const [hoveredConnectionId, setHoveredConnectionId] = useState<string | null>(null);
  const connectionTextBoundsRef = useRef<Map<string, { x: number; y: number; width: number; height: number }>>(new Map());
  const getItemCenter = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return null;

    // Use temporary position if item is being dragged
    const position = tempItemPositions.get(itemId) || item.position;

    return {
      x: position.x + item.dimensions.width / 2,
      y: position.y + item.dimensions.height / 2
    };
  };
  const drawConnection = (
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    connection?: Connection
  ) => {
    drawConnectionWithBounds(ctx, from, to, connection, new Map());
  };

  const drawConnectionWithBounds = (
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    connection: Connection | undefined,
    boundsMap: Map<string, { x: number; y: number; width: number; height: number }>
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
    // Display label for connections or similarity/AI info
    if (connection?.label || connection?.metadata) {
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;

      let displayText = connection.label || '';
      let isClickable = false;

      // For similarity connections, show reason and percentage
      if (connection.metadata?.mode === 'similarity' && connection.metadata?.reason) {
        const percentage = connection.metadata.similarityScore
          ? Math.round(connection.metadata.similarityScore * 100)
          : 0;
        displayText = `${connection.metadata.reason} (${percentage}% match)`;
      }

      // For LLM connections, show truncated reason
      if (connection?.metadata?.mode === 'llm' && connection?.metadata?.reason) {
        const maxLength = 50; // Maximum characters to display
        const reason = connection.metadata.reason;
        displayText = reason.length > maxLength
          ? reason.substring(0, maxLength) + '...'
          : reason;
        isClickable = true;
      }

      if (displayText) {
        // Calculate text metrics for background
        ctx.font = '12px sans-serif';
        const textMetrics = ctx.measureText(displayText);
        const textWidth = textMetrics.width;
        const padding = 8;

        const rectX = midX - textWidth / 2 - padding;
        const rectY = midY - 10;
        const rectWidth = textWidth + padding * 2;
        const rectHeight = 20;

        // Store bounds for click detection if it's clickable
        if (isClickable && connection) {
          // Make the clickable area larger for easier interaction
          const clickPadding = 10;
          boundsMap.set(connection.id, {
            x: rectX - clickPadding,
            y: rectY - clickPadding,
            width: rectWidth + clickPadding * 2,
            height: rectHeight + 25 + clickPadding // Include "click to expand" text area + padding
          });
        }

        // Draw semi-transparent background
        ctx.fillStyle = isClickable ? 'rgba(245, 240, 255, 0.98)' : 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(rectX, rectY, rectWidth, rectHeight);

        // Draw border with thicker line for clickable items
        ctx.strokeStyle = connection.metadata?.mode === 'similarity' ? '#10b981' : '#8b5cf6';
        ctx.lineWidth = isClickable ? 1.5 : 1;
        ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);

        // Draw text
        ctx.fillStyle = isClickable ? '#8b5cf6' : '#333333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayText, midX, midY);

        // Add click hint for LLM connections with better styling
        if (isClickable) {
          ctx.font = 'italic 10px sans-serif';
          ctx.fillStyle = '#8b5cf6';
          ctx.fillText('(click to expand)', midX, midY + 14);

          // Add subtle underline effect on the main text
          const textY = midY + 2;
          ctx.strokeStyle = '#8b5cf6';
          ctx.lineWidth = 0.5;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(midX - textWidth / 2, textY);
          ctx.lineTo(midX + textWidth / 2, textY);
          ctx.stroke();
          ctx.setLineDash([]);
        }

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

    // Clear bounds before redrawing
    const newBounds = new Map<string, { x: number; y: number; width: number; height: number }>();

    // Log connections with LLM metadata for debugging
    const llmConnections = connections.filter(c => c.metadata?.mode === 'llm');
    if (llmConnections.length > 0) {
      console.log('LLM connections found:', llmConnections.length);
    }

    connections.forEach(connection => {
      // Always calculate from item centers, ignore stored points
      const from = getItemCenter(connection.from);
      const to = getItemCenter(connection.to);
      if (from && to) {
        drawConnectionWithBounds(ctx, from, to, connection, newBounds);
      }
    });

    // Update bounds ref after drawing all connections
    if (newBounds.size > 0) {
      console.log(`Clickable areas set for ${newBounds.size} connection(s)`);
    }
    connectionTextBoundsRef.current = newBounds;

    if (isCreatingConnection && connectionStartPoint && mousePosition) {
      drawConnection(ctx, connectionStartPoint, mousePosition);
    }
  }, [items, connections, isCreatingConnection, connectionStartPoint, mousePosition, tempItemPositions]);

  const getFromItemTitle = () => {
    if (!modalConnection) return '';
    const fromItem = items.find(item => item.id === modalConnection.from);
    // For text selections, use a snippet of content if no title
    if (fromItem?.type === 'text' && !fromItem.source?.title) {
      return fromItem.content.substring(0, 30) + '...';
    }
    return fromItem?.source?.title || 'Item';
  };

  const getToItemTitle = () => {
    if (!modalConnection) return '';
    const toItem = items.find(item => item.id === modalConnection.to);
    // For text selections, use a snippet of content if no title
    if (toItem?.type === 'text' && !toItem.source?.title) {
      return toItem.content.substring(0, 30) + '...';
    }
    return toItem?.source?.title || 'Item';
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="connection-canvas"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />
      {/* Container for clickable overlays with high z-index */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1000  // High z-index to ensure it's above everything
        }}
      >
        {Array.from(connectionTextBoundsRef.current.entries()).map(([connectionId, bounds]) => {
          const connection = connections.find(c => c.id === connectionId);
          if (!connection?.metadata?.mode || connection.metadata.mode !== 'llm') return null;

          const isHovered = hoveredConnectionId === connectionId;

          return (
            <div
              key={connectionId}
              className="connection-text-overlay"
              style={{
                position: 'absolute',
                left: bounds.x * zoom + pan.x,
                top: bounds.y * zoom + pan.y,
                width: bounds.width * zoom,
                height: bounds.height * zoom,
                cursor: 'pointer',
                pointerEvents: 'auto',  // Enable pointer events only for this overlay
                background: isHovered ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                border: isHovered ? '2px solid rgba(139, 92, 246, 0.5)' : '2px solid transparent',
                borderRadius: '4px',
                transition: 'all 0.15s ease',
                zIndex: 1001  // Ensure it's above the container
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log('Opening modal for connection:', connectionId);
                if (onOpenReasonModal) {
                  onOpenReasonModal(connection);
                } else {
                  setModalConnection(connection);
                }
              }}
              onMouseEnter={(e) => {
                e.stopPropagation();
                setHoveredConnectionId(connectionId);
              }}
              onMouseLeave={(e) => {
                e.stopPropagation();
                setHoveredConnectionId(null);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              title="Click to see full AI reasoning"
            />
          );
        })}
      </div>

      {/* Canvas overlay for creating connections */}
      {isCreatingConnection && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'all',
            zIndex: 999
          }}
        />
      )}
      {modalConnection && (
        <ConnectionReasonModal
          isOpen={!!modalConnection}
          onClose={() => setModalConnection(null)}
          reason={modalConnection.metadata?.reason || ''}
          fromItemTitle={getFromItemTitle()}
          toItemTitle={getToItemTitle()}
        />
      )}
    </>
  );
};
