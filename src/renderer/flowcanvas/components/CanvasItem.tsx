import React, { useCallback, useRef, useState } from 'react';
import { FlowItem } from '../../../shared/types/flowcanvas';
interface CanvasItemProps {
  item: FlowItem;
  isSelected: boolean;
  isConnectionStart?: boolean;
  isCreatingConnection?: boolean;
  onSelect: (itemId: string) => void;
  onDragStart: (item: FlowItem, e: React.MouseEvent) => void;
  onDragEnd: (item: FlowItem, position: { x: number; y: number }) => void;
  onUpdate: (item: FlowItem) => void;
  onDelete: (itemId: string) => void;
}
export const CanvasItem: React.FC<CanvasItemProps> = ({
  item,
  isSelected,
  isConnectionStart = false,
  isCreatingConnection = false,
  onSelect,
  onDragStart,
  onDragEnd,
  onUpdate,
  onDelete
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStateRef = useRef({
    handle: null as string | null,
    startSize: { width: 0, height: 0 },
    startPosition: { x: 0, y: 0 },
    startMousePos: { x: 0, y: 0 }
  });
  const itemRef = useRef<HTMLDivElement>(null);
  const itemDataRef = useRef(item);
  const onUpdateRef = useRef(onUpdate);
  itemDataRef.current = item;
  onUpdateRef.current = onUpdate;
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    onSelect(item.id);
    if (!isCreatingConnection) {
      const rect = itemRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - item.position.x,
          y: e.clientY - item.position.y
        });
        setIsDragging(true);
        onDragStart(item, e);
      }
    }
  }, [item, onSelect, onDragStart, isCreatingConnection]);
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newPosition = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      };
      if (itemRef.current) {
        itemRef.current.style.transform = `translate(${newPosition.x}px, ${newPosition.y}px)`;
      }
    }
  }, [isDragging, dragOffset]);
  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
      const newPosition = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      };
      onDragEnd(item, newPosition);
    }
  }, [isDragging, dragOffset, item, onDragEnd]);
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [isDragging, handleMouseMove, handleMouseUp]);
  const handleDoubleClick = useCallback(() => {
    if (item.source.url && !item.source.url.startsWith('note://')) {
      window.open(item.source.url, '_blank');
    }
  }, [item.source.url]);
  const handleResizeMouseDown = useCallback((e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStateRef.current = {
      handle,
      startSize: {
        width: item.dimensions.width,
        height: item.dimensions.height
      },
      startPosition: {
        x: item.position.x,
        y: item.position.y
      },
      startMousePos: {
        x: e.clientX,
        y: e.clientY
      }
    };
    onSelect(item.id);
  }, [item, onSelect]);
  React.useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: MouseEvent) => {
      const state = resizeStateRef.current;
      const currentItem = itemDataRef.current;
      if (!state.handle) {
        return;
      }
      const deltaX = e.clientX - state.startMousePos.x;
      const deltaY = e.clientY - state.startMousePos.y;
      let newWidth = state.startSize.width;
      let newHeight = state.startSize.height;
      let newX = state.startPosition.x;
      let newY = state.startPosition.y;
      if (state.handle.includes('e')) {
        newWidth = state.startSize.width + deltaX;
      }
      if (state.handle.includes('w')) {
        newWidth = state.startSize.width - deltaX;
        newX = state.startPosition.x + deltaX;
      }
      if (state.handle.includes('s')) {
        newHeight = state.startSize.height + deltaY;
      }
      if (state.handle.includes('n')) {
        newHeight = state.startSize.height - deltaY;
        newY = state.startPosition.y + deltaY;
      }
      const minWidth = currentItem.type === 'note' ? 150 : 200;
      const minHeight = currentItem.type === 'note' ? 100 : 150;
      if (newWidth < minWidth) {
        if (state.handle.includes('w')) {
          newX = state.startPosition.x + (state.startSize.width - minWidth);
        }
        newWidth = minWidth;
      }
      if (newHeight < minHeight) {
        if (state.handle.includes('n')) {
          newY = state.startPosition.y + (state.startSize.height - minHeight);
        }
        newHeight = minHeight;
      }
      const updatedItem = {
        ...currentItem,
        dimensions: {
          width: newWidth,
          height: newHeight
        },
        position: {
          x: newX,
          y: newY
        }
      };
      onUpdateRef.current(updatedItem);
    };
    const handleUp = () => {
      setIsResizing(false);
      resizeStateRef.current.handle = null;
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isResizing]);
  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);
  const handleImageError = useCallback(() => {
    setImageLoading(false);
    setImageError(true);
  }, []);
  const renderContent = () => {
    switch (item.type) {
      case 'note':
        return (
          <div className="item-note-content">
            {item.content}
          </div>
        );
      case 'text':
        return (
          <div className="item-text-content">
            {item.content.substring(0, 200)}
            {item.content.length > 200 && '...'}
          </div>
        );
      case 'screenshot':
      case 'image':
        if (imageError) {
          return (
            <div className="item-image-error">
              <span style={{ fontSize: '24px' }}>🖼️</span>
              <span style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                Image failed to load
              </span>
              <a
                href={item.content}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '11px', color: '#3b82f6', marginTop: '4px' }}
                onClick={(e) => e.stopPropagation()}
              >
                Open original
              </a>
            </div>
          );
        }
        return (
          <>
            {imageLoading && (
              <div className="item-image-loading">
                <span style={{ fontSize: '14px', color: '#666' }}>Loading image...</span>
              </div>
            )}
            <img
              src={item.thumbnail || item.content}
              alt="Captured image"
              className="item-image-content"
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ display: imageLoading ? 'none' : 'block' }}
            />
          </>
        );
      default:
        return <div className="item-content">{item.content}</div>;
    }
  };
  return (
    <div
      ref={itemRef}
      data-item-id={item.id}
      className={`canvas-item ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''} ${isConnectionStart ? 'connection-start' : ''} item-type-${item.type}`}
      style={{
        transform: `translate(${item.position.x}px, ${item.position.y}px)`,
        width: item.dimensions.width,
        height: item.dimensions.height,
        backgroundColor: item.color
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      <div className="item-header">
        <span className="item-source-title">{item.source.title}</span>
        <button
          className="item-close"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
        >
          ×
        </button>
      </div>
      <div className="item-body">
        {renderContent()}
      </div>
      {item.type !== 'note' && (
        <div className="item-footer">
          <a
            href={item.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="item-source-link"
            onClick={(e) => e.stopPropagation()}
          >
            {item.source.url.startsWith('clipboard://') ? '📋 Clipboard' : item.source.title || 'Untitled'}
          </a>
          <span className="item-timestamp">
            {new Date(item.source.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
      {}
      {isSelected && (
        <>
          <div
            className="resize-handle resize-handle-n"
            onMouseDown={(e) => handleResizeMouseDown(e, 'n')}
          />
          <div
            className="resize-handle resize-handle-ne"
            onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
          />
          <div
            className="resize-handle resize-handle-e"
            onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
          />
          <div
            className="resize-handle resize-handle-se"
            onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
          />
          <div
            className="resize-handle resize-handle-s"
            onMouseDown={(e) => handleResizeMouseDown(e, 's')}
          />
          <div
            className="resize-handle resize-handle-sw"
            onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
          />
          <div
            className="resize-handle resize-handle-w"
            onMouseDown={(e) => handleResizeMouseDown(e, 'w')}
          />
          <div
            className="resize-handle resize-handle-nw"
            onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
          />
        </>
      )}
    </div>
  );
};
