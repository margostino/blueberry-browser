import React, { useState } from 'react';
import { FlowCanvas, FlowItem } from '../../../../types/flowcanvas';
import { NoteDialog } from './NoteDialog';
import { v4 as uuidv4 } from 'uuid';
interface CanvasHeaderProps {
  canvas: FlowCanvas;
  onCanvasChange: (canvas: FlowCanvas) => void;
}
export const CanvasHeader: React.FC<CanvasHeaderProps> = ({ canvas, onCanvasChange }) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [canvasName, setCanvasName] = useState(canvas.name);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const handleNameSave = () => {
    if (canvasName.trim() && canvasName !== canvas.name) {
      onCanvasChange({
        ...canvas,
        name: canvasName.trim()
      });
    }
    setIsEditingName(false);
  };
  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setCanvasName(canvas.name);
      setIsEditingName(false);
    }
  };
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setIsNoteDialogOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const handleCreateNote = (content: string, color?: string) => {
    const newNote: FlowItem = {
      id: uuidv4(),
      type: 'note',
      content: content,
      source: {
        url: 'note://local',
        title: 'Quick Note',
        timestamp: Date.now()
      },
      position: {
        x: 100 + Math.random() * 400,
        y: 100 + Math.random() * 300
      },
      dimensions: {
        width: 300,
        height: 250
      },
      color: color
    };
    const updatedCanvas = {
      ...canvas,
      items: [...canvas.items, newNote],
      modified: Date.now()
    };
    onCanvasChange(updatedCanvas);
    console.log('📝 Note created:', newNote.id);
  };
  return (
    <div className="canvas-header">
      <div className="canvas-header-left">
        {isEditingName ? (
          <input
            type="text"
            value={canvasName}
            onChange={(e) => setCanvasName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={handleNameKeyDown}
            className="canvas-name-input"
            autoFocus
          />
        ) : (
          <h2
            className="canvas-name"
            onClick={() => setIsEditingName(true)}
          >
            {canvas.name}
          </h2>
        )}
        <span className="canvas-item-count">
          {canvas.items.length} {canvas.items.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      <div className="canvas-header-right">
        <button
          className="canvas-action-btn"
          title="Add Note (Cmd+N)"
          onClick={() => setIsNoteDialogOpen(true)}
        >
          + Add Note
        </button>
        <button className="canvas-action-btn" title="Export">
          Export
        </button>
      </div>
      <NoteDialog
        isOpen={isNoteDialogOpen}
        onClose={() => setIsNoteDialogOpen(false)}
        onSave={handleCreateNote}
      />
    </div>
  );
};