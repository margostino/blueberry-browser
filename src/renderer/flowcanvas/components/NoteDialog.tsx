import React, { useState, useRef, useEffect } from 'react';
interface NoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string, color?: string) => void;
}
const noteColors = [
  { name: 'Yellow', value: '#fff9dc' },
  { name: 'Pink', value: '#ffd4e5' },
  { name: 'Blue', value: '#d4e4ff' },
  { name: 'Green', value: '#d4ffd4' },
  { name: 'Purple', value: '#e9d4ff' },
  { name: 'Orange', value: '#ffead4' }
];
export const NoteDialog: React.FC<NoteDialogProps> = ({ isOpen, onClose, onSave }) => {
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(noteColors[0].value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);
  const handleSave = () => {
    if (content.trim()) {
      onSave(content.trim(), selectedColor);
      setContent('');
      setSelectedColor(noteColors[0].value);
      onClose();
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
  };
  if (!isOpen) return null;
  return (
    <>
      <div className="dialog-overlay" onClick={onClose} />
      <div className="note-dialog" onKeyDown={handleKeyDown}>
        <div className="dialog-header">
          <h3>Create Quick Note</h3>
          <button className="dialog-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="dialog-body">
          <textarea
            ref={textareaRef}
            className="note-textarea"
            placeholder="Type your note here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
          />
          <div className="color-picker">
            <span className="color-label">Note color:</span>
            <div className="color-options">
              {noteColors.map((color) => (
                <button
                  key={color.value}
                  className={`color-option ${selectedColor === color.value ? 'selected' : ''}`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setSelectedColor(color.value)}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="dialog-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={!content.trim()}
          >
            Add Note (⌘+Enter)
          </button>
        </div>
      </div>
    </>
  );
};