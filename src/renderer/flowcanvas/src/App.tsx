import React, { useEffect } from 'react';
import { Canvas } from './components/Canvas';
import { CanvasHeader } from './components/CanvasHeader';
import { FlowCanvas as FlowCanvasType } from '../../../types/flowcanvas';
import { useCanvas } from './hooks/useCanvas';
import './styles/flowcanvas.css';
export const FlowCanvasApp: React.FC = () => {
  const { canvas, loading, error, loadCanvas, saveCanvas, updateItem, deleteItem } = useCanvas();
  useEffect(() => {
    loadCanvas();
  }, [loadCanvas]);
  if (loading) {
    return (
      <div className="flowcanvas-loading">
        <div className="loading-spinner">Loading Canvas...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flowcanvas-error">
        <p>Error loading canvas: {error}</p>
        <button onClick={() => loadCanvas()}>Retry</button>
      </div>
    );
  }
  if (!canvas) {
    return (
      <div className="flowcanvas-empty">
        <p>No canvas found. Loading...</p>
      </div>
    );
  }
  return (
    <div className="flowcanvas-app">
      <CanvasHeader
        canvas={canvas}
        onCanvasChange={saveCanvas}
      />
      <Canvas
        canvas={canvas}
        onItemUpdate={updateItem}
        onItemDelete={deleteItem}
        onCanvasUpdate={saveCanvas}
      />
    </div>
  );
};
export default FlowCanvasApp;