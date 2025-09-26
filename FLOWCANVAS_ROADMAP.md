# 🌊 FlowCanvas - Visual Knowledge Management for Web Browsing

## What is FlowCanvas?

FlowCanvas is an integrated visual canvas system built into the Blueberry Browser that allows users to capture, organize, and connect content from their web browsing sessions. Think of it as a digital workspace where you can collect text snippets, images, screenshots, and notes from different web pages, then arrange and connect them to create visual knowledge maps.

### Core Concept

While browsing the web, users often need to collect information from multiple sources, compare content, and build connections between different pieces of information. FlowCanvas provides a persistent visual workspace where this collected content can be organized, annotated, and connected - all without leaving the browser.

## 🚀 Features Implemented (What We Built Today)

### 1. **Text Capture** ✅

- Select any text on a webpage
- Right-click → "Add to FlowCanvas"
- Text appears as a card on your canvas with source URL and timestamp

### 2. **Image Capture** ✅

- Right-click any image → "Add Image to FlowCanvas"
- Images are displayed with thumbnails
- Maintains source URL for reference

### 3. **Screenshot Capture** ✅

- **Full Page Screenshot**: Right-click → "Capture Full Page" (Cmd+Shift+S)
- **Area Selection**: Right-click → "Capture Area" (Cmd+Shift+A)
- **Clipboard Integration**: System screenshots are automatically detected

### 4. **Quick Notes** ✅

- Add sticky notes directly to canvas (Cmd+N)
- 6 color options for organization
- No source URL - purely for user annotations

### 5. **Canvas Management** ✅

- Rename canvas by clicking the title
- Item count display
- Persistent storage using IndexedDB
- Auto-save on every change

### 6. **Item Manipulation** ✅

- **Drag & Drop**: Click and drag items to reposition
- **Resize**: 8-point resize handles on all items
- **Delete**: Select item + Delete key
- **Double-click**: Open source URL in new tab

### 7. **Visual Connections** ✅

- Connect items to show relationships
- Press 'C' with item selected to start connection mode
- Click another item to create connection
- Visual feedback with pulsing indicators
- Shift+Click on connection to delete

### 8. **Keyboard Shortcuts** ✅

- **Cmd+Shift+F**: Open FlowCanvas from anywhere
- **Cmd+N**: Create new note
- **C**: Start connection mode
- **Delete**: Remove selected item
- **ESC**: Cancel operations

### 9. **Default Homepage** ✅

- Browser opens to margostino.com by default
- New tabs also open to margostino.com

## 🎯 Completed Technical Implementation

### Architecture

- **Frontend**: React + TypeScript + Vite
- **Storage**: IndexedDB for persistent local storage
- **IPC Communication**: Electron IPC for main/renderer process communication
- **Styling**: Custom CSS with responsive design
- **State Management**: React hooks with functional components

### Key Components

1. `FlowCanvasManager` - Main process coordinator
2. `CanvasStorageService` - IndexedDB wrapper for persistence
3. `Canvas` - Main canvas component with drag/drop
4. `CanvasItem` - Individual item component with resize
5. `ConnectionCanvas` - SVG layer for visual connections
6. `ScreenshotManager` - Screenshot capture and clipboard monitoring

## 🚧 Immediate Next Steps (Priority Features)

### 1. **Enhanced Connections**

- [ ] Connection labels and annotations
- [ ] Different connection styles (arrows, lines, curves)
- [ ] Connection color customization
- [ ] Grouped connections between multiple items

### 2. **Canvas Collections/Folders**

- [ ] Multiple canvas support
- [ ] Canvas switching/navigation
- [ ] Canvas templates for common workflows
- [ ] Canvas search across all canvases

### 3. **Export/Import**

- [ ] Export to PNG/PDF
- [ ] Export to Markdown
- [ ] Export to JSON for backup
- [ ] Import from other tools

### 4. **Collaboration Features**

- [ ] Share canvas via link
- [ ] Real-time collaboration
- [ ] Comments on items
- [ ] Version history

## 🔮 Future Roadmap (Vision Features)

### Phase 1: Enhanced Content Types

- [ ] Code snippets with syntax highlighting
- [ ] Embedded videos (YouTube, Vimeo)
- [ ] PDF attachments
- [ ] Audio notes
- [ ] Drawing/sketching tools
- [ ] Tables and structured data

### Phase 2: Organization & Navigation

- [ ] Tags and labels for items
- [ ] Advanced search and filters
- [ ] Zoom controls (zoom in/out)
- [ ] Minimap for large canvases
- [ ] Grid/snap-to-grid alignment
- [ ] Auto-layout algorithms

### Phase 3: AI Integration

- [ ] Smart content suggestions
- [ ] Auto-organize canvas layout
- [ ] Content summarization
- [ ] Automatic relationship detection
- [ ] Smart search with semantic understanding
- [ ] Content extraction from complex pages

### Phase 4: Advanced Features

- [ ] Canvas presentations mode
- [ ] Time-based canvas replay
- [ ] Canvas analytics (usage patterns)
- [ ] API integrations (Notion, Obsidian, etc.)
- [ ] Mobile companion app
- [ ] Cloud sync across devices

### Phase 5: Developer Features

- [ ] Plugin/extension system
- [ ] Custom item types
- [ ] Workflow automation
- [ ] Webhooks and integrations
- [ ] REST API for external tools

## 💡 Use Cases

1. **Research & Learning**
   - Collect information from multiple sources
   - Create visual study guides
   - Compare different perspectives

2. **Project Planning**
   - Gather requirements from various stakeholders
   - Create mood boards and inspiration collections
   - Document decision-making process

3. **Content Creation**
   - Collect references and inspiration
   - Organize article outlines
   - Plan video/podcast content

4. **Shopping & Comparison**
   - Compare products from different sites
   - Create wish lists with visual references
   - Document purchase decisions

5. **Travel Planning**
   - Collect destination information
   - Create visual itineraries
   - Save booking confirmations

## 🛠 Technical Debt & Improvements

### Performance

- [ ] Virtual scrolling for large canvases
- [ ] Image lazy loading
- [ ] Canvas viewport optimization
- [ ] Batch operations for multiple items

### Code Quality

- [ ] Add comprehensive tests
- [ ] Improve TypeScript types
- [ ] Extract constants and magic numbers
- [ ] Add error boundaries
- [ ] Implement logging system

### User Experience

- [ ] Undo/redo functionality
- [ ] Better error messages
- [ ] Loading states for all operations
- [ ] Tooltips for all controls
- [ ] Onboarding tutorial

## 📝 Known Issues

1. Canvas performance with 100+ items needs optimization
2. Connection lines don't curve around items
3. No conflict resolution for concurrent edits
4. Limited mobile/touch support
5. No accessibility features (ARIA labels, keyboard navigation)

## 🎉 Summary

FlowCanvas transforms web browsing from a linear experience into a spatial, visual knowledge-building activity. By providing tools to capture, organize, and connect information directly within the browser, it bridges the gap between browsing and knowledge management.

Today we built the foundation - a fully functional visual canvas with capture capabilities, persistence, and visual connections. The roadmap ahead focuses on enhancing collaboration, adding AI intelligence, and expanding the types of content and interactions possible within the canvas.

The vision is to make FlowCanvas the ultimate tool for visual thinkers, researchers, and anyone who wants to build structured knowledge from their web browsing activities.

---

**Built with ❤️ for visual thinkers and knowledge workers**
