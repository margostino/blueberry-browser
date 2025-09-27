import React from 'react';
import './ConnectionReasonModal.css';

interface ConnectionReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: string;
  fromItemTitle?: string;
  toItemTitle?: string;
}

export const ConnectionReasonModal: React.FC<ConnectionReasonModalProps> = ({
  isOpen,
  onClose,
  reason,
  fromItemTitle,
  toItemTitle
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>AI Analysis Connection</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {fromItemTitle && toItemTitle && (
            <div className="connection-info">
              <span className="connection-from">{fromItemTitle}</span>
              <span className="connection-arrow">→</span>
              <span className="connection-to">{toItemTitle}</span>
            </div>
          )}
          
          <div className="reasoning-section">
            <h3>Connection Reasoning</h3>
            <div className="reasoning-content">
              {reason}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="button button-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};