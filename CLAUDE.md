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
- **FlowCanvasManager**: Canvas feature for visual browsing history/workflow

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
   - Visual canvas for browsing history and workflow visualization
   - Entry: `index.html` → `main.tsx` → `App.tsx`
   - Components: Canvas, CanvasItem, ConnectionCanvas
   - Storage: Persistent canvas state via FlowCanvasStorage

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

4. **FlowCanvas Feature**: A visual browsing history/workflow system that can capture tab states, create connections between items, and persist canvas data.

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

3. **Persistent Storage**: FlowCanvas uses local file storage for canvas state persistence.

4. **AI Integration**: LLMClient supports both OpenAI and Anthropic APIs for chat functionality.

5. **Screenshot Capture**: Integrated screenshot functionality for FlowCanvas items using Electron's desktopCapturer API.