import React, { useEffect } from 'react';
import { Canvas } from './components/Canvas';
import { CanvasHeader } from './components/CanvasHeader';
import { FlowCanvas as FlowCanvasType } from '../../../types/flowcanvas';
import { useCanvas } from './hooks/useCanvas';
import './styles/flowcanvas.css';

export const FlowCanvasApp: React.FC = () => {
  const { canvas, loading, error, loadCanvas, saveCanvas, updateItem, deleteItem } = useCanvas();
  const [isFindingConnections, setIsFindingConnections] = React.useState(false);
  
  useEffect(() => {
    loadCanvas();
  }, [loadCanvas]);
  
  const handleFindConnections = async () => {
    if (!canvas || canvas.items.length < 2 || isFindingConnections) return;
    
    setIsFindingConnections(true);
    
    try {
      console.log('🔍 Finding connections for canvas items...');
      
      // Send request to main process to find connections
      if (window.electronAPI) {
        const connections = await window.electronAPI.invoke('flowcanvas:find-connections', canvas);
        
        if (connections && connections.length > 0) {
          // Update canvas with new connections
          const updatedCanvas = {
            ...canvas,
            connections: [...(canvas.connections || []), ...connections],
            modified: Date.now()
          };
          
          saveCanvas(updatedCanvas);
          console.log(`✅ Found and created ${connections.length} connections`);
        } else {
          console.log('❌ No strong connections found');
        }
      }
    } catch (error) {
      console.error('Error finding connections:', error);
    } finally {
      setIsFindingConnections(false);
    }
  };
  
  const handleClearConnections = () => {
    if (!canvas || !canvas.connections || canvas.connections.length === 0) {
      return;
    }
    
    console.log('🗑️ Clearing all connections and connection notes...');
    
    // Remove all connection note items (those created by AI)
    const filteredItems = canvas.items.filter(item => {
      // Remove notes that were created as AI connections
      if (item.type === 'note' && item.source.url === 'note://ai-connection') {
        return false;
      }
      return true;
    });
    
    // Update canvas without connections and AI notes
    const updatedCanvas = {
      ...canvas,
      items: filteredItems,
      connections: [],
      modified: Date.now()
    };
    
    saveCanvas(updatedCanvas);
    console.log('✅ Cleared all connections');
  };
  
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
        onFindConnections={handleFindConnections}
        isFindingConnections={isFindingConnections}
        onClearConnections={handleClearConnections}
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