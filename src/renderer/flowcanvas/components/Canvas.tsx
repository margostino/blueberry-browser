import React, { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Connection, FlowCanvas, FlowItem } from '../../../shared/types/flowcanvas';
import { useDragDrop } from '../hooks/useDragDrop';
import { CanvasItem } from './CanvasItem';
import { ConnectionCanvas } from './ConnectionCanvas';
interface CanvasProps {
  canvas: FlowCanvas;
  onItemUpdate: (item: FlowItem) => void;
  onItemDelete: (itemId: string) => void;
  onCanvasUpdate: (canvas: FlowCanvas) => void;
}
export const Canvas: React.FC<CanvasProps> = ({
  canvas,
  onItemUpdate,
  onItemDelete,
  onCanvasUpdate
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [tempItemPositions, setTempItemPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [isCreatingConnection, setIsCreatingConnection] = useState(false);
  const [connectionStartPoint, setConnectionStartPoint] = useState<{x: number, y: number} | null>(null);
  const [mousePosition, setMousePosition] = useState<{x: number, y: number}>({ x: 0, y: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const { handleDragStart, handleDragEnd } = useDragDrop();
  useEffect(() => {
    const handleItemCaptured = (_event: any, item: FlowItem) => {
      console.log('📨 Canvas received new item:', item);
      const updatedCanvas = {
        ...canvas,
        items: [...canvas.items, item],
        modified: Date.now()
      };
      onCanvasUpdate(updatedCanvas);
    };
    let cleanup: (() => void) | undefined;
    if (typeof window !== 'undefined') {
      if (window.electronAPI) {
        window.electronAPI.on('flowcanvas:item-captured', handleItemCaptured);
        cleanup = () => {
          window.electronAPI.removeListener('flowcanvas:item-captured', handleItemCaptured);
        };
      } else if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.on('flowcanvas:item-captured', handleItemCaptured);
        cleanup = () => {
          window.electron.ipcRenderer.removeListener('flowcanvas:item-captured', handleItemCaptured);
        };
      }
    }
    return cleanup;
  }, [canvas, onCanvasUpdate]);
  const handleItemDragStart = useCallback((item: FlowItem, e: React.MouseEvent) => {
    setIsDragging(true);
    setDraggedItemId(item.id);
    handleDragStart(item, e, canvasRef.current);
  }, [handleDragStart]);
  const handleItemDragEnd = useCallback((item: FlowItem, position: { x: number; y: number }) => {
    setIsDragging(false);
    setDraggedItemId(null);
    setTempItemPositions(new Map());
    
    // Update only the dragged item
    const updatedItem = {
      ...item,
      position
    };
    onItemUpdate(updatedItem);
    handleDragEnd();
  }, [handleDragEnd, onItemUpdate]);
  const handleConnectionDelete = useCallback((connectionId: string) => {
    const updatedCanvas = {
      ...canvas,
      connections: (canvas.connections || []).filter(c => c.id !== connectionId),
      modified: Date.now()
    };
    onCanvasUpdate(updatedCanvas);
  }, [canvas, onCanvasUpdate]);
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
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    if (!isCreatingConnection && e.target === e.currentTarget && !e.shiftKey && !e.metaKey) {
      setIsSelecting(true);
      setSelectionBox({ start: { x, y }, end: { x, y } });
      if (!e.ctrlKey && !e.metaKey) {
        setSelectedItemIds(new Set());
      }
    }
  }, [isCreatingConnection, zoom, pan]);
  const handleMouseUp = useCallback((_e: React.MouseEvent) => {
    if (isSelecting) {
      setIsSelecting(false);
    }
    setSelectionBox(null);
  }, [isSelecting]);
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    if ((e.shiftKey || e.metaKey) && !isCreatingConnection) {
      let connectionToDelete: string | null = null;
      canvas.connections?.forEach(connection => {
        let from: { x: number; y: number } | null = null;
        let to: { x: number; y: number } | null = null;
        if (connection.fromPoint && connection.toPoint) {
          from = connection.fromPoint;
          to = connection.toPoint;
        }
        if (from && to) {
          const dist = pointToLineDistance({ x, y }, from, to);
          if (dist < 10) {
            connectionToDelete = connection.id;
          }
        }
      });
      if (connectionToDelete) {
        console.log('🗑️ Deleting connection:', connectionToDelete);
        handleConnectionDelete(connectionToDelete);
        return;
      }
    }
    if (isCreatingConnection) {
      if (!connectionStartPoint) {
        console.log('🔗 Starting connection at:', { x, y });
        setConnectionStartPoint({ x, y });
      } else {
        console.log('✅ Completing connection to:', { x, y });
        const newConnection: Connection = {
          id: uuidv4(),
          from: `point_${connectionStartPoint.x}_${connectionStartPoint.y}`,
          to: `point_${x}_${y}`,
          type: 'curved',
          color: '#3b82f6',
          style: 'solid',
          fromPoint: connectionStartPoint,
          toPoint: { x, y }
        };
        const updatedCanvas = {
          ...canvas,
          connections: [...(canvas.connections || []), newConnection],
          modified: Date.now()
        };
        onCanvasUpdate(updatedCanvas);
        setConnectionStartPoint(null);
        setIsCreatingConnection(false);
      }
    } else if (e.target === e.currentTarget && !isSelecting) {
      setSelectedItemIds(new Set());
    }
  }, [isCreatingConnection, connectionStartPoint, canvas, onCanvasUpdate, handleConnectionDelete, isSelecting, zoom, pan]);
  const handleItemSelect = useCallback((itemId: string, e?: React.MouseEvent) => {
    if (!isCreatingConnection) {
      if (e?.ctrlKey || e?.metaKey) {
        const newSelected = new Set(selectedItemIds);
        if (newSelected.has(itemId)) {
          newSelected.delete(itemId);
        } else {
          newSelected.add(itemId);
        }
        setSelectedItemIds(newSelected);
      } else if (e?.shiftKey && selectedItemIds.size > 0) {
        const newSelected = new Set(selectedItemIds);
        newSelected.add(itemId);
        setSelectedItemIds(newSelected);
      } else {
        setSelectedItemIds(new Set([itemId]));
      }
    }
  }, [isCreatingConnection, selectedItemIds]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedItemIds.size > 0) {
        selectedItemIds.forEach(itemId => {
          onItemDelete(itemId);
        });
        setSelectedItemIds(new Set());
      } else if (e.key === 'a' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const allItemIds = new Set(canvas.items.map(item => item.id));
        setSelectedItemIds(allItemIds);
      } else if (e.key === 'c' && !e.metaKey && !e.ctrlKey) {
        console.log('🔗 Toggling connection mode');
        setIsCreatingConnection(!isCreatingConnection);
        setConnectionStartPoint(null);
      } else if (e.key === 'Escape') {
        console.log('❌ Canceling connection mode');
        setIsCreatingConnection(false);
        setConnectionStartPoint(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemIds, onItemDelete, isCreatingConnection, canvas.items]);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
    }
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) < 50) {
      const scaleFactor = e.deltaY > 0 ? 0.95 : 1.05;
      const newZoom = Math.min(Math.max(zoom * scaleFactor, 0.1), 5);
      const zoomRatio = newZoom / zoom;
      const newPanX = mouseX - (mouseX - pan.x) * zoomRatio;
      const newPanY = mouseY - (mouseY - pan.y) * zoomRatio;
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    } else {
      setPan({
        x: pan.x - e.deltaX,
        y: pan.y - e.deltaY
      });
    }
  }, [zoom, pan]);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    if (isCreatingConnection && connectionStartPoint) {
      setMousePosition({ x, y });
    }
    
    // Track temporary position of dragged item for connection updates
    if (isDragging && draggedItemId) {
      const draggedElement = document.querySelector(`[data-item-id="${draggedItemId}"]`) as HTMLElement;
      if (draggedElement) {
        const transform = draggedElement.style.transform;
        const match = transform.match(/translate\(([^,]+)px,[^0-9-]*([^)]+)px\)/);
        if (match) {
          const newX = parseFloat(match[1]);
          const newY = parseFloat(match[2]);
          setTempItemPositions(new Map([[draggedItemId, { x: newX, y: newY }]]));
        }
      }
    }
    if (isSelecting && selectionBox) {
      setSelectionBox({ ...selectionBox, end: { x, y } });
      const minX = Math.min(selectionBox.start.x, x);
      const maxX = Math.max(selectionBox.start.x, x);
      const minY = Math.min(selectionBox.start.y, y);
      const maxY = Math.max(selectionBox.start.y, y);
      const newSelectedIds = new Set<string>();
      canvas.items.forEach(item => {
        const itemLeft = item.position.x;
        const itemRight = item.position.x + item.dimensions.width;
        const itemTop = item.position.y;
        const itemBottom = item.position.y + item.dimensions.height;
        if (itemLeft < maxX && itemRight > minX && itemTop < maxY && itemBottom > minY) {
          newSelectedIds.add(item.id);
        }
      });
      setSelectedItemIds(newSelectedIds);
    }
  }, [isCreatingConnection, connectionStartPoint, isSelecting, selectionBox, canvas.items, isDragging, draggedItemId]);
  return (
    <div
      ref={canvasRef}
      className={`flowcanvas-container ${isDragging ? 'dragging' : ''} ${isCreatingConnection ? 'connecting' : ''}`}
      onClick={handleCanvasClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      style={{ overflow: 'hidden' }}
    >
      <div className="canvas-grid-background" style={{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        transformOrigin: '0 0'
      }} />
      {}
      {selectionBox && (
        <div style={{
          position: 'absolute',
          left: Math.min(selectionBox.start.x, selectionBox.end.x) * zoom + pan.x,
          top: Math.min(selectionBox.start.y, selectionBox.end.y) * zoom + pan.y,
          width: Math.abs(selectionBox.end.x - selectionBox.start.x) * zoom,
          height: Math.abs(selectionBox.end.y - selectionBox.start.y) * zoom,
          border: '2px dashed #3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          pointerEvents: 'none',
          zIndex: 999
        }} />
      )}
      {}
      {isCreatingConnection && (
        <div style={{
          position: 'fixed',
          top: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '14px',
          zIndex: 1000,
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
        }}>
          🔗 Connection Mode: Click anywhere to set start point, then click again to complete. Press ESC to cancel
        </div>
      )}
      {}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.6)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '12px',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <button
          onClick={() => {
            const newZoom = Math.max(zoom - 0.1, 0.1);
            setZoom(newZoom);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0 4px'
          }}
        >
          −
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => {
            const newZoom = Math.min(zoom + 0.1, 5);
            setZoom(newZoom);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0 4px'
          }}
        >
          +
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          style={{
            background: 'transparent',
            color: 'white',
            cursor: 'pointer',
            fontSize: '11px',
            marginLeft: '5px',
            padding: '2px 6px',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '4px'
          }}
        >
          Reset
        </button>
      </div>
      <div className="canvas-content" style={{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        transformOrigin: '0 0',
        width: '100%',
        height: '100%'
      }}>
        {}
        <ConnectionCanvas
          items={canvas.items}
          connections={canvas.connections || []}
          onConnectionDelete={handleConnectionDelete}
          isCreatingConnection={isCreatingConnection}
          connectionStartPoint={connectionStartPoint}
          mousePosition={mousePosition}
          tempItemPositions={tempItemPositions}
          zoom={zoom}
          pan={pan}
        />
        {canvas.items.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#999',
            fontSize: '18px',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌊</div>
            <div style={{ marginBottom: '8px' }}>Your FlowCanvas is ready!</div>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <div>📝 Select text → Right-click → "Add to FlowCanvas"</div>
              <div>🖼️ Right-click image → "Add Image to FlowCanvas"</div>
              <div>📸 Right-click → "Capture Full Page" (Cmd+Shift+S)</div>
              <div>🎯 Right-click → "Capture Area" (Cmd+Shift+A)</div>
              <div>📋 Right-click → "Paste from Clipboard" (Cmd+Shift+V)</div>
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #ddd' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Connection Controls:</div>
                <div>🔗 Press 'C' → Enter connection mode</div>
                <div>🎯 Click anywhere → Set start point</div>
                <div>✅ Click again → Complete connection</div>
                <div>❌ Shift+Click on connection → Delete connection</div>
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                💡 Tip: System screenshots are auto-detected from clipboard!
              </div>
            </div>
          </div>
        )}
        {canvas.items.map((item) => (
          <CanvasItem
            key={item.id}
            item={item}
            isSelected={selectedItemIds.has(item.id)}
            isConnectionStart={false}
            isCreatingConnection={isCreatingConnection}
            onSelect={(id) => handleItemSelect(id)}
            onDragStart={handleItemDragStart}
            onDragEnd={handleItemDragEnd}
            onUpdate={onItemUpdate}
            onDelete={onItemDelete}
          />
        ))}
      </div>
    </div>
  );
};
