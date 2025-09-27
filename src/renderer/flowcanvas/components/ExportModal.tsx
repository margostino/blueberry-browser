import React, { useState } from 'react';
import { FlowCanvas, FlowItem } from '../../../shared/types/flowcanvas';
import './ExportModal.css';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvas: FlowCanvas;
}

type ExportFormat = 'markdown' | 'json';

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, canvas }) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown');

  if (!isOpen) return null;

  const generateMarkdown = (): string => {
    let markdown = `# ${canvas.name}\n\n`;
    markdown += `Created: ${new Date(canvas.created).toLocaleString()}\n`;
    markdown += `Last Modified: ${new Date(canvas.modified).toLocaleString()}\n\n`;
    markdown += `## Knowledge Assets (${canvas.items.length} items)\n\n`;

    const itemsByType: Record<string, FlowItem[]> = {};
    canvas.items.forEach(item => {
      if (!itemsByType[item.type]) {
        itemsByType[item.type] = [];
      }
      itemsByType[item.type].push(item);
    });

    Object.entries(itemsByType).forEach(([type, items]) => {
      markdown += `### ${type.charAt(0).toUpperCase() + type.slice(1)}s (${items.length})\n\n`;

      items.forEach((item, index) => {
        markdown += `#### ${index + 1}. ${item.source.title}\n\n`;

        if (item.source.url && item.source.url !== 'note://local') {
          markdown += `- **URL:** ${item.source.url}\n`;
        }

        markdown += `- **Created:** ${new Date(item.source.timestamp).toLocaleString()}\n`;

        if (item.tags && item.tags.length > 0) {
          markdown += `- **Tags:** ${item.tags.join(', ')}\n`;
        }

        if (item.content) {
          markdown += `\n**Content:**\n\n`;

          if (item.type === 'screenshot' || item.type === 'image') {
            markdown += `![Screenshot](${item.content})\n`;
          } else {
            markdown += `${item.content}\n`;
          }
        }

        markdown += '\n---\n\n';
      });
    });

    if (canvas.connections.length > 0) {
      markdown += `## Connections (${canvas.connections.length})\n\n`;

      canvas.connections.forEach((conn, index) => {
        const fromItem = canvas.items.find(item => item.id === conn.from);
        const toItem = canvas.items.find(item => item.id === conn.to);

        if (fromItem && toItem) {
          markdown += `${index + 1}. **${fromItem.source.title}** → **${toItem.source.title}**`;
          if (conn.label) {
            markdown += ` (${conn.label})`;
          }
          markdown += '\n';
        }
      });
    }

    return markdown;
  };

  const generateJSON = (): string => {
    const exportData = {
      canvas: {
        id: canvas.id,
        name: canvas.name,
        created: canvas.created,
        modified: canvas.modified,
        itemCount: canvas.items.length,
        connectionCount: canvas.connections.length
      },
      items: canvas.items.map(item => ({
        id: item.id,
        type: item.type,
        title: item.source.title,
        url: item.source.url,
        content: item.content,
        timestamp: item.source.timestamp,
        position: item.position,
        dimensions: item.dimensions,
        tags: item.tags || [],
        color: item.color
      })),
      connections: canvas.connections.map(conn => ({
        id: conn.id,
        from: conn.from,
        to: conn.to,
        type: conn.type,
        label: conn.label,
        style: conn.style,
        color: conn.color
      }))
    };

    return JSON.stringify(exportData, null, 2);
  };

  const handleExport = () => {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (selectedFormat === 'markdown') {
      content = generateMarkdown();
      filename = `${canvas.name.replace(/\s+/g, '-').toLowerCase()}-export.md`;
      mimeType = 'text/markdown';
    } else {
      content = generateJSON();
      filename = `${canvas.name.replace(/\s+/g, '-').toLowerCase()}-export.json`;
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`📥 Exported ${canvas.items.length} items as ${selectedFormat.toUpperCase()}`);
    onClose();
  };

  return (
    <div className="export-modal-overlay" onClick={onClose}>
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="export-modal-header">
          <h3>Export Canvas</h3>
          <button className="export-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="export-modal-content">
          <p className="export-modal-description">
            Export all {canvas.items.length} knowledge assets from "{canvas.name}"
          </p>

          <div className="export-format-options">
            <label className="export-format-option">
              <input
                type="radio"
                name="format"
                value="markdown"
                checked={selectedFormat === 'markdown'}
                onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
              />
              <div className="export-format-details">
                <strong>Markdown (.md)</strong>
                <span>Human-readable format with formatted text and images</span>
              </div>
            </label>

            <label className="export-format-option">
              <input
                type="radio"
                name="format"
                value="json"
                checked={selectedFormat === 'json'}
                onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
              />
              <div className="export-format-details">
                <strong>JSON (.json)</strong>
                <span>Machine-readable format with complete data structure</span>
              </div>
            </label>
          </div>
        </div>

        <div className="export-modal-footer">
          <button className="export-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="export-confirm-btn" onClick={handleExport}>
            Export as {selectedFormat.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
