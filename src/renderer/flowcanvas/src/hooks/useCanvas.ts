import { useState, useCallback } from 'react';
import { FlowCanvas, FlowItem } from '../../../../types/flowcanvas';
import { CanvasStorageService } from '../services/CanvasStorageService';
const storageService = new CanvasStorageService();
export const useCanvas = () => {
  const [canvas, setCanvas] = useState<FlowCanvas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const loadCanvas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const activeCanvas = await window.electronAPI.invoke('flowcanvas:get-active');
        setCanvas(activeCanvas);
      } else {
        const savedCanvas = await storageService.getActiveCanvas();
        if (savedCanvas) {
          setCanvas(savedCanvas);
        } else {
          const newCanvas = await storageService.createCanvas();
          setCanvas(newCanvas);
        }
      }
    } catch (err) {
      console.error('Error loading canvas:', err);
      try {
        const newCanvas = await storageService.createCanvas();
        setCanvas(newCanvas);
      } catch (createErr) {
        setError(createErr instanceof Error ? createErr.message : 'Failed to load canvas');
      }
    } finally {
      setLoading(false);
    }
  }, []);
  const saveCanvas = useCallback(async (updatedCanvas: FlowCanvas) => {
    setIsSaving(true);
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        await window.electronAPI.invoke('flowcanvas:save', updatedCanvas);
      } else {
        await storageService.saveCanvas(updatedCanvas);
      }
      setCanvas(updatedCanvas);
    } catch (err) {
      console.error('Error saving canvas:', err);
      setError(err instanceof Error ? err.message : 'Failed to save canvas');
    } finally {
      setIsSaving(false);
    }
  }, []);
  const updateItem = useCallback(async (item: FlowItem) => {
    if (!canvas) return;
    const updatedItems = canvas.items.map(i =>
      i.id === item.id ? item : i
    );
    const updatedCanvas = {
      ...canvas,
      items: updatedItems,
      modified: Date.now()
    };
    await saveCanvas(updatedCanvas);
  }, [canvas, saveCanvas]);
  const deleteItem = useCallback(async (itemId: string) => {
    if (!canvas) return;
    const updatedItems = canvas.items.filter(i => i.id !== itemId);
    const updatedCanvas = {
      ...canvas,
      items: updatedItems,
      modified: Date.now()
    };
    await saveCanvas(updatedCanvas);
  }, [canvas, saveCanvas]);
  const addItem = useCallback(async (item: FlowItem) => {
    if (!canvas) return;
    const updatedCanvas = {
      ...canvas,
      items: [...canvas.items, item],
      modified: Date.now()
    };
    await saveCanvas(updatedCanvas);
  }, [canvas, saveCanvas]);
  return {
    canvas,
    loading,
    error,
    isSaving,
    loadCanvas,
    saveCanvas,
    updateItem,
    deleteItem,
    addItem
  };
};