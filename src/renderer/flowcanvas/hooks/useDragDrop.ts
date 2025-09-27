import { useState, useCallback, useRef } from 'react';
import { FlowItem } from '../../../shared/types/flowcanvas';
export const useDragDrop = () => {
  const [draggedItem, setDraggedItem] = useState<FlowItem | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStartPosition = useRef({ x: 0, y: 0 });
  const handleDragStart = useCallback((
    item: FlowItem,
    e: React.MouseEvent,
    container: HTMLElement | null
  ) => {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - item.position.x;
    const offsetY = e.clientY - rect.top - item.position.y;
    setDraggedItem(item);
    setDragOffset({ x: offsetX, y: offsetY });
    dragStartPosition.current = { x: item.position.x, y: item.position.y };
  }, []);
  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOffset({ x: 0, y: 0 });
  }, []);
  const calculateNewPosition = useCallback((
    e: MouseEvent,
    container: HTMLElement | null
  ): { x: number; y: number } | null => {
    if (!container || !draggedItem) return null;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left - dragOffset.x);
    const y = Math.max(0, e.clientY - rect.top - dragOffset.y);
    return { x, y };
  }, [draggedItem, dragOffset]);
  return {
    draggedItem,
    dragOffset,
    handleDragStart,
    handleDragEnd,
    calculateNewPosition
  };
};