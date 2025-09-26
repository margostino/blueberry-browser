# 🌊 FlowCanvas - Browser Canvas Feature Requirements

> **FlowCanvas**: Where information flows into understanding. Transform scattered browsing into flowing streams of connected knowledge.

## Executive Summary

FlowCanvas is a revolutionary browser feature that transforms how users collect, organize, and synthesize information from the web. Instead of losing context across dozens of tabs, users can capture snippets, images, and insights onto a persistent, spatial canvas that turns browsing sessions into lasting knowledge artifacts.

**Core Value Proposition**: "Enter your Flow. Every browsing session flows into lasting understanding."

---

## 📋 Version 1.0 - Proof of Concept (Week 1)

### Goal
Demonstrate the core capture-and-canvas concept with minimal viable functionality.

### User Stories

#### Must Have (P0)
1. **As a user, I can open a FlowCanvas** while browsing
   - Accessible via sidebar button or keyboard shortcut (Cmd/Ctrl + W)
   - Canvas opens in a new tab with special URL: `blueberry://flowcanvas`

2. **As a user, I can capture text snippets** from any webpage
   - Select text → Right-click → "Add to FlowCanvas"
   - OR Select text → Keyboard shortcut (Cmd/Ctrl + Shift + W)
   - Snippet appears on canvas with source URL and timestamp

3. **As a user, I can see and interact with my canvas**
   - Drag items to reposition them
   - Items stay where I put them (spatial memory)
   - Double-click item to see full content
   - Click source link to return to original page

4. **As a user, my canvas persists** between sessions
   - Canvas auto-saves every change
   - Canvas survives browser restart
   - Can have one active canvas at a time

### Technical Deliverables

#### Frontend Components
```
src/renderer/flowcanvas/
├── FlowCanvasApp.tsx        # Main canvas application
├── components/
│   ├── Canvas.tsx           # Main canvas container
│   ├── CanvasItem.tsx       # Individual item component
│   └── CaptureButton.tsx    # Floating capture button
├── hooks/
│   ├── useCanvas.ts         # Canvas state management
│   └── useDragDrop.ts       # Drag and drop logic
└── styles/
    └── flowcanvas.css       # Canvas-specific styles
```

#### Backend Integration
```
src/main/
├── FlowCanvasManager.ts     # Core canvas logic
├── storage/
│   └── CanvasStorage.ts     # IndexedDB interface
└── events/
    └── FlowCanvasEvents.ts  # IPC event handlers
```

#### Data Models
```typescript
interface FlowItem {
  id: string;                 // UUID
  type: 'text';               // Only text in v1
  content: string;            // The captured text
  source: {
    url: string;              // Where it came from
    title: string;            // Page title
    timestamp: number;        // When captured
  };
  position: {
    x: number;                // Canvas X coordinate
    y: number;                // Canvas Y coordinate
  };
  dimensions: {
    width: number;            // Item width
    height: number;           // Item height
  };
}

interface FlowCanvas {
  id: string;                 // UUID
  name: string;               // "My Research Flow"
  items: FlowItem[];          // All items on canvas
  created: number;            // Creation timestamp
  modified: number;           // Last modified
}
```

### Success Criteria
- [ ] Can capture at least 10 text snippets from different sites
- [ ] Items remain in position after page refresh
- [ ] Canvas loads in under 1 second
- [ ] No data loss on browser restart
- [ ] Smooth dragging at 60fps

### Implementation Steps

1. **Day 1-2: Canvas Infrastructure**
   - Create new FlowCanvas renderer process
   - Set up canvas tab with special protocol handler
   - Implement basic canvas component with drag-drop

2. **Day 3-4: Capture Mechanism**
   - Add context menu integration for text selection
   - Create IPC channel for capture events
   - Build floating capture confirmation

3. **Day 5-6: Storage & Persistence**
   - Implement IndexedDB storage layer
   - Add auto-save functionality
   - Create canvas state restoration

4. **Day 7: Polish & Testing**
   - Add visual feedback for actions
   - Test with various websites
   - Fix edge cases

---

## 📈 Version 2.0 - Enhanced Capture (Week 2)

### New Capabilities

#### Rich Content Types
- **Image Capture**: Right-click any image → "Add to FlowCanvas"
- **Screenshot Regions**: Capture specific areas of pages
- **Full Cards**: Capture entire article/post as a card
- **Quick Notes**: Add text notes directly on canvas

#### Canvas Intelligence
- **Auto-Layout**: "Organize" button arranges items in grid
- **Connections**: Draw lines between related items
- **Search**: Find items by content or source
- **Zoom**: Zoom in/out for overview or detail

#### Better UX
- **Multiple Canvases**: Create/switch between canvases
- **Canvas Library**: See all your canvases in grid view
- **Keyboard Navigation**: Arrow keys to move between items
- **Bulk Actions**: Select multiple items to move/delete

### Technical Additions
```typescript
interface FlowItem {
  // ... v1 fields plus:
  type: 'text' | 'image' | 'screenshot' | 'note' | 'card';
  thumbnail?: string;         // For images/screenshots
  connections: string[];      // IDs of connected items
  tags: string[];            // User-added tags
  color?: string;            // Item background color
}

interface FlowCanvas {
  // ... v1 fields plus:
  zoom: number;              // Zoom level 0.5 - 2.0
  viewport: {                // Current view position
    x: number;
    y: number;
  };
  layout: 'freeform' | 'grid' | 'list';
}
```

### Deliverables
- [ ] Support for 5 content types
- [ ] Connection lines between items
- [ ] Canvas management UI
- [ ] Basic search functionality
- [ ] Export to Markdown

---

## 🚀 Version 3.0 - AI-Powered Synthesis (Week 3+)

### AI Features
1. **Smart Clustering**: AI groups related items automatically
2. **Summary Generation**: "Summarize this canvas" button
3. **Insight Extraction**: Find key points across items
4. **Contradiction Detection**: Highlight conflicting information
5. **Question Suggestions**: "What to explore next?"

### Collaboration
1. **Share Canvas**: Generate shareable link
2. **Real-time Collaboration**: Multiple users on same canvas
3. **Comments**: Add comments to items
4. **Version History**: See canvas evolution over time

### Advanced Layouts
1. **Timeline View**: Arrange by date
2. **Mind Map View**: Hierarchical organization
3. **Kanban View**: Organize into columns
4. **Graph View**: Network visualization

### Export Options
- Markdown document
- PDF report
- JSON data
- Notion import
- Obsidian vault

---

## 🔧 Technical Architecture

### Frontend Stack
- **React 19**: Already in use
- **React DnD**: Drag and drop (or @dnd-kit/sortable)
- **Canvas Rendering**: HTML5 Canvas or SVG for connections
- **State Management**: Zustand or Context API
- **Styling**: Tailwind CSS (already configured)

### Storage Architecture
```javascript
// IndexedDB Schema
const DB_NAME = 'FlowCanvasDB';
const STORES = {
  canvases: 'canvases',
  items: 'items',
  preferences: 'preferences'
};

// Store structures
canvases: {
  keyPath: 'id',
  indexes: ['created', 'modified', 'name']
}

items: {
  keyPath: 'id',
  indexes: ['canvasId', 'type', 'created']
}
```

### IPC Communication
```typescript
// Main -> Renderer
'flowcanvas:item-captured'    // New item captured
'flowcanvas:canvas-updated'   // Canvas data changed
'flowcanvas:sync-complete'    // Sync finished

// Renderer -> Main
'flowcanvas:capture-text'     // Request text capture
'flowcanvas:capture-image'    // Request image capture
'flowcanvas:save-canvas'      // Save canvas state
'flowcanvas:load-canvas'      // Load canvas data
```

### File Structure
```
blueberry-browser/
├── src/
│   ├── main/
│   │   ├── flowcanvas/
│   │   │   ├── FlowCanvasManager.ts
│   │   │   ├── CaptureService.ts
│   │   │   ├── StorageService.ts
│   │   │   └── SyncService.ts
│   ├── renderer/
│   │   ├── flowcanvas/
│   │   │   ├── index.html
│   │   │   ├── src/
│   │   │   │   ├── App.tsx
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   ├── services/
│   │   │   │   └── utils/
│   └── preload/
│       └── flowcanvas.ts
```

---

## 📊 Success Metrics

### User Engagement (v1)
- [ ] Users create at least 5 items per canvas
- [ ] 60% of users return to canvas next day
- [ ] Average session time > 5 minutes

### Performance (v1)
- [ ] Canvas loads < 1 second
- [ ] Drag operations at 60 fps
- [ ] Save operations < 100ms
- [ ] Memory usage < 100MB per canvas

### Quality (v1)
- [ ] Zero data loss incidents
- [ ] Works on top 100 websites
- [ ] No browser crashes
- [ ] Graceful offline handling

---

## 🚦 Implementation Checklist

### Week 1 - Core Canvas (v1)
- [ ] Set up FlowCanvas module structure
- [ ] Create canvas tab with special protocol
- [ ] Implement drag-and-drop canvas
- [ ] Add text capture from context menu
- [ ] Build IndexedDB storage layer
- [ ] Add auto-save functionality
- [ ] Test on 10 different websites
- [ ] Create demo video

### Week 2 - Enhanced Features (v2)
- [ ] Add image capture support
- [ ] Implement screenshot tool
- [ ] Create connection lines
- [ ] Build canvas management UI
- [ ] Add search functionality
- [ ] Implement multiple canvases
- [ ] Add export to Markdown
- [ ] Performance optimization

### Future - AI & Collaboration (v3)
- [ ] Integrate AI clustering
- [ ] Add summary generation
- [ ] Build sharing mechanism
- [ ] Implement real-time sync
- [ ] Create advanced layouts
- [ ] Add version history
- [ ] Build onboarding flow
- [ ] Launch beta testing

---

## 🎯 Definition of Done (v1 MVP)

A user can:
1. Open FlowCanvas from any webpage ✅
2. Capture at least 10 text snippets ✅
3. Arrange them spatially on canvas ✅
4. See source attribution for each item ✅
5. Click back to original sources ✅
6. Find their canvas after restart ✅
7. Experience smooth interactions ✅

The code:
1. Has no memory leaks ✅
2. Handles errors gracefully ✅
3. Is modular and extensible ✅
4. Includes basic documentation ✅
5. Passes basic test scenarios ✅

---

## 🎨 UI/UX Specifications

### Visual Design
- **Canvas Background**: Subtle dot grid pattern (#f5f5f5)
- **Items**: White cards with soft shadows
- **Hover State**: Blue border + grab cursor
- **Dragging**: 50% opacity + pointer cursor
- **Connections**: Curved bezier lines
- **Selection**: Blue outline with resize handles

### Interactions
- **Single Click**: Select item
- **Double Click**: Open item detail
- **Right Click**: Context menu
- **Drag**: Move item
- **Ctrl/Cmd + Drag**: Duplicate item
- **Delete Key**: Remove selected items
- **Ctrl/Cmd + Z**: Undo last action

### Canvas Controls
```
┌─────────────────────────────────────┐
│ [←][→] Canvas Name  [Search] [+ New] │
├─────────────────────────────────────┤
│                                     │
│         • (item)                    │
│                 \                   │
│                  • (item)           │
│     • (item)                        │
│                                     │
└─────────────────────────────────────┘
  [Zoom -][100%][Zoom +] [Organize] [Export]
```

---

## 🔒 Privacy & Security

### Data Handling
- All canvas data stored locally by default
- No automatic cloud sync without consent
- Captured content includes source attribution
- Respect robots.txt and content policies

### Permissions
- Request clipboard access for capture
- Request storage permission for persistence
- Optional: network access for sync

---

## 📝 Development Notes

### Key Decisions
1. **Why IndexedDB?** Better for large data than localStorage
2. **Why separate tab?** Full screen real estate for canvas
3. **Why not iframe?** Security and performance concerns
4. **Why React DnD?** Most mature, well-documented

### Potential Challenges
1. **Performance with 100+ items**: Virtual scrolling/culling
2. **Large images**: Thumbnail generation, lazy loading
3. **Cross-origin content**: Proxy or screenshot approach
4. **Conflict resolution**: Operational transforms for collaboration

### Testing Scenarios
1. Capture from paywalled site
2. Capture from SPA (React/Vue sites)
3. Large canvas with 200+ items
4. Slow network conditions
5. Browser crash recovery

---

## 📚 References

### Inspiration
- **Milanote**: Visual board for creatives
- **Miro/Figma**: Infinite canvas interactions
- **Obsidian Canvas**: Knowledge graph approach
- **Pinterest**: Visual collection patterns

### Technical Resources
- [React DnD Documentation](https://react-dnd.github.io/react-dnd/)
- [IndexedDB Best Practices](https://web.dev/indexeddb/)
- [Electron Context Menus](https://www.electronjs.org/docs/api/menu)
- [Canvas Performance Tips](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)

---

## ✅ Sign-off

This document represents the complete requirements for FlowCanvas v1.0 MVP. By proceeding with implementation, we commit to delivering the P0 user stories within the one-week timeframe, with v2 and v3 features as stretch goals based on progress.

**Feature Name**: FlowCanvas
**Version**: 1.0 MVP
**Timeline**: 1 week
**Owner**: Blueberry Browser Team
**Status**: Ready for Implementation

---

*"Enter your Flow. Let knowledge stream naturally."* 🌊