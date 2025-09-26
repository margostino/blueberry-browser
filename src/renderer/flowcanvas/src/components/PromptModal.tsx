import React, { useState } from 'react';
import './PromptModal.css';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (prompt: string) => void;
  defaultPrompt: string;
}

export const PromptModal: React.FC<PromptModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  defaultPrompt
}) => {
  const [prompt, setPrompt] = useState(defaultPrompt);

  React.useEffect(() => {
    setPrompt(defaultPrompt);
  }, [defaultPrompt]);

  const handleConfirm = () => {
    onConfirm(prompt);
    onClose();
  };

  const handleReset = () => {
    setPrompt(defaultPrompt);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content prompt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Customize AI Analysis Prompt</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="prompt-description">
            Edit the prompt below to customize how the AI analyzes connections between items:
          </div>
          <textarea
            className="prompt-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your custom prompt..."
            rows={15}
          />
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleReset}>
            Reset to Default
          </button>
          <div className="modal-actions">
            <button className="btn btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleConfirm}>
              Analyze with This Prompt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};