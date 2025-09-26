import React, { useEffect } from 'react';
import { Canvas } from './components/Canvas';
import { CanvasHeader } from './components/CanvasHeader';
import { PromptModal } from './components/PromptModal';
import { useCanvas } from './hooks/useCanvas';
import './styles/flowcanvas.css';

export const FlowCanvasApp: React.FC = () => {
  const { canvas, loading, error, loadCanvas, saveCanvas, updateItem, deleteItem } = useCanvas();
  const [isFindingConnections, setIsFindingConnections] = React.useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = React.useState(false);

  const defaultPrompt = `Role: You are an expert comparative analyst. Your job is to determine if there is a meaningful connection between two texts, either through:
• Direct overlap (shared words, themes, entities), or
• Common knowledge links (external cultural, literary, or symbolic associations).

Instructions:
1. Analyze both texts.
2. Check for explicit overlap (words, entities, themes).
3. Check for implicit/common knowledge connections (e.g., symbols, metaphors, historical/literary references).
4. Decide if there is a connection:
• If yes → connection: true and explain briefly why.
• If no → connection: false and explain briefly why not.

Output Format:
Return only valid JSON in this form:
{
  "connection": true,
  "reasoning": "Both texts discuss mirrors, and Borges is known for using mirrors as metaphors in his stories."
}

Example (no connection):
{
  "connection": false,
  "reasoning": "Text A is about quantum physics and Text B is a cooking recipe; they do not share direct or implicit links."
}`;

  useEffect(() => {
    loadCanvas();
  }, [loadCanvas]);

  const handleFindConnections = async (mode: 'similarity' | 'llm' = 'similarity', prompt?: string) => {
    if (!canvas) return;

    if (mode === 'llm' && !prompt) {
      setIsPromptModalOpen(true);
      return;
    }

    setIsFindingConnections(true);

    try {
      console.log(`🔍 Finding connections using ${mode} mode...`);

      if (window.electronAPI) {
        const result = await window.electronAPI.invoke('flowcanvas:find-connections', canvas, mode, prompt);

        if (result && result.connections && result.connections.length > 0) {
          const updatedCanvas = result.canvas || {
            ...canvas,
            connections: [...(canvas.connections || []), ...result.connections],
            modified: Date.now()
          };

          saveCanvas(updatedCanvas);
          console.log(`✅ Found and created ${result.connections.length} connections using ${mode} mode`);
        } else {
          console.log(`❌ No strong connections found using ${mode} mode`);
        }
      }
    } catch (error) {
      console.error('Error finding connections:', error);
    } finally {
      setIsFindingConnections(false);
    }
  };

  const handlePromptConfirm = (prompt: string) => {
    handleFindConnections('llm', prompt);
  };

  const handleClearConnections = () => {
    if (!canvas || !canvas.connections || canvas.connections.length === 0) {
      return;
    }

    console.log('🗑️ Clearing all connections and connection notes...');

    const filteredItems = canvas.items.filter(item => {
      if (item.type === 'note' && item.source.url === 'note://ai-connection') {
        return false;
      }
      return true;
    });

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
      <PromptModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        onConfirm={handlePromptConfirm}
        defaultPrompt={defaultPrompt}
      />
    </div>
  );
};

export default FlowCanvasApp;
