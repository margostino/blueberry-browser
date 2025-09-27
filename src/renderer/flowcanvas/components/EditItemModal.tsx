import React, { useEffect, useState } from 'react';
import { FlowItem } from '../../../shared/types/flowcanvas';
import './EditItemModal.css';

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: FlowItem | null;
  onSave: (itemId: string, newContent: string) => void;
}

const EditItemModal: React.FC<EditItemModalProps> = ({ isOpen, onClose, item, onSave }) => {
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (item?.type === 'text') {
      setContent(item.content || '');
      setIsEditing(true);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSave = () => {
    if (item && isEditing) {
      onSave(item.id, content);
      onClose();
    }
  };

  const handleSourceClick = () => {
    if (item.source.url && !item.source.url.startsWith('note://')) {
      window.open(item.source.url, '_blank');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={handleKeyDown}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Item</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="item-info">
            <div className="item-source-info">
              <h3>{item.source.title}</h3>
              {item.source.url && !item.source.url.startsWith('note://') && (
                <button
                  className="source-link-button"
                  onClick={handleSourceClick}
                  title="Open source in new window"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  <span></span>
                </button>
              )}
            </div>
            <div className="item-metadata">
              <span className="item-type">{item.type}</span>
              <span className="item-date">
                {new Date(item.source.timestamp).toLocaleString()}
              </span>
            </div>
          </div>

          {item.type === 'text' ? (
            <div className="edit-content-container">
              <label htmlFor="content-editor" className="content-label">Content</label>
              <textarea
                id="content-editor"
                className="content-editor"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your text here..."
                autoFocus
              />
            </div>
          ) : (
            <div className="non-editable-content">
              {item.type === 'image' || item.type === 'screenshot' ? (
                <img
                  src={item.thumbnail || item.content}
                  alt="Item content"
                  className="preview-image"
                />
              ) : (
                <div className="content-preview">
                  <p>{item.content}</p>
                </div>
              )}
              <p className="non-editable-notice">
                This {item.type} item cannot be edited directly.
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-button cancel" onClick={onClose}>
            Cancel
          </button>
          {item.type === 'text' && (
            <button className="modal-button save" onClick={handleSave}>
              Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditItemModal;
