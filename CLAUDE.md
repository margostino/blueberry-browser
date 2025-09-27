# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Setup
```bash
# Install dependencies (uses pnpm)
pnpm install

# Create .env file with OpenAI API key
cp .env.example .env
# Add your OPENAI_API_KEY to the .env file
```

### Development
```bash
# Run in development mode with hot reload
pnpm dev
# or
pnpm dev:hot
```

### Build and Package
```bash
# Run type checking and build
pnpm build

# Type checking only
pnpm typecheck        # Both Node and Web
pnpm typecheck:node   # Node/main process only  
pnpm typecheck:web    # Web/renderer processes only

# Linting and formatting
pnpm lint
pnpm format

# Platform-specific builds
pnpm build:mac
pnpm build:win
pnpm build:linux
pnpm build:unpack    # Build without packaging
```

## Architecture Overview

### Multi-Process Electron Architecture

This is an Electron application with multiple renderer processes and windows, each serving a specific purpose:

#### Main Process (`src/main/`)
- **Window.ts**: Core window management, handles multiple tabs and coordinates sub-windows
- **Tab.ts**: Individual browser tab implementation with WebContentsView
- **EventManager.ts**: Central IPC event coordination between processes
- **TopBar.ts**: Top bar window management (address bar, tab bar)
- **SideBar.ts**: Sidebar window for AI chat interface
- **LLMClient.ts**: AI integration (OpenAI/Anthropic)
- **FlowCanvasManager.ts**: Visual knowledge workspace for capturing, organizing, and connecting web content with AI-powered insights

#### Renderer Processes (`src/renderer/`)
Three separate renderer processes, each with its own entry point:

1. **TopBar** (`src/renderer/topbar/`)
   - Address bar, navigation controls, tab management UI
   - Entry: `index.html` → `main.tsx` → `TopBarApp.tsx`
   - Context: `BrowserContext.tsx` for state management

2. **Sidebar** (`src/renderer/sidebar/`)
   - AI chat interface
   - Entry: `index.html` → `main.tsx` → `SidebarApp.tsx`
   - Context: `ChatContext.tsx` for chat state

3. **FlowCanvas** (`src/renderer/flowcanvas/`)
   - Visual knowledge workspace for capturing, organizing, and connecting web content
   - Entry: `index.html` → `main.tsx` → `App.tsx`
   - Core Components: Canvas, CanvasItem, ConnectionCanvas, ExportModal
   - AI Features: Similarity analysis (🔗) and deep LLM-powered connection discovery (🤖)
   - Storage: IndexedDB with auto-save, crash recovery, and export to Markdown/JSON
   - Architecture: Clean Domain-Driven Design with Use Cases, Repositories, and DTOs

#### Preload Scripts (`src/preload/`)
Secure bridge between renderer and main processes:
- `topbar.ts`: TopBar IPC API
- `sidebar.ts`: Sidebar IPC API
- `flowcanvas.ts`: FlowCanvas IPC API
- `tab.ts`: Tab content injection
- `screenshot-selector.ts`: Screenshot selection overlay

### Key Architectural Patterns

1. **Window Coordination**: The main Window class orchestrates multiple BrowserViews (TopBar, SideBar, Tab content) within a single BrowserWindow, managing their bounds and visibility.

2. **IPC Communication**: Uses contextBridge in preload scripts to expose safe APIs. Events flow through EventManager for centralized handling.

3. **Tab Management**: Tabs are WebContentsView instances with persistent partitions, managed by the Window class with unique IDs.

4. **FlowCanvas Feature**: A visual knowledge workspace that transforms chaotic browsing into organized knowledge:
   - **Capture Methods**: Text selection, images, screenshots (full/area), quick notes
   - **AI-Powered Connections**: Similarity analysis and LLM deep analysis for discovering relationships
   - **Visual Organization**: Spatial layout, 6-color coding, resizable items, connection lines
   - **Persistent Knowledge**: Auto-save to IndexedDB, survives crashes, exportable to Markdown/JSON

### Project Structure Conventions

- React components with TypeScript
- Tailwind CSS for styling
- Shared components in `src/renderer/common/`
- Type definitions in `src/types/`
- Each renderer process is self-contained with its own context and components
- Vite configuration in `electron.vite.config.ts` defines multiple entry points

### Important Implementation Details

1. **Multi-Window Build**: The build system (electron-vite) is configured for multiple HTML entry points and corresponding preload scripts.

2. **Tab Preloading**: Tabs use a preload script (`tab.ts`) to safely extract page content and enable browser functionality.

3. **Persistent Storage**: FlowCanvas uses IndexedDB for canvas state persistence with auto-save functionality.

4. **AI Integration**: LLMClient supports both OpenAI and Anthropic APIs for chat functionality.

5. **Screenshot Capture**: Integrated screenshot functionality for FlowCanvas items using Electron's desktopCapturer API.

### FlowCanvas Keyboard Shortcuts

| Action | Shortcut | Description |
|--------|----------|-------------|
| Open Canvas | `Cmd/Ctrl+Shift+F` | Access FlowCanvas from anywhere |
| New Note | `N` | Add quick note on canvas |
| Connect Items | `C` | Start connection mode |
| Delete | `Delete` | Remove selected items |
| Find Connections | `Cmd+L` | AI analyze relationships |
| Full Screenshot | `Cmd+Shift+S` | Capture full page |
| Area Screenshot | `Cmd+Shift+A` | Capture selected area |

### FlowCanvas Feature Status

**Current Version**: 1.1.0 (November 2024)

**Completed Features**:
- Visual canvas system with drag & drop, zoom, pan
- Multi-content capture (text, images, screenshots, notes)
- 6-color theming system for categorization
- AI-powered connection discovery:
  - 🔗 Similarity Analysis: Fast local keyword/topic analysis
  - 🤖 AI Deep Analysis: LLM-powered semantic relationships
- Auto-save with crash recovery
- Export to Markdown and JSON formats
- Clean Architecture with Domain-Driven Design patterns

**In Progress** (v2.0):
- AI synthesis and summarization features
- Smart organization and clustering
- Enhanced capture capabilities