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

## TypeScript Coding Guidelines

### Core Principles

1. **Type Safety First**: Leverage TypeScript's type system fully
   - Always define explicit types for function parameters and return values
   - Avoid using `any` type - use `unknown` or specific types instead
   - Use strict mode in tsconfig.json
   - Prefer interfaces over type aliases for object shapes

2. **Clean Code Practices**
   - Single Responsibility Principle: Each function/class should do one thing well
   - Keep functions small and focused (typically < 30 lines)
   - Use descriptive variable and function names that explain intent
   - Prefer immutability: use `const` by default, `readonly` for properties
   - Avoid deep nesting (max 3 levels of indentation)

3. **NO REDUNDANT COMMENTS**
   - **NEVER add comments that state the obvious**
   - Code should be self-documenting through clear naming
   - Remove comments like:
     ```typescript
     // BAD - Redundant comments to remove:
     // Initialize variable
     const user = new User();

     // Check if user exists
     if (user) { ... }

     // Return the result
     return result;
     ```
   - Only add comments when they provide value:
     ```typescript
     // GOOD - Explains complex business logic:
     // Users inactive for 90+ days require re-verification per SOC2 compliance
     if (daysSinceLastLogin > 90) { ... }

     // GOOD - Documents workaround:
     // Workaround for Electron bug #12345 - remove after v25.0
     setTimeout(() => window.reload(), 100);
     ```

### TypeScript Best Practices

1. **Type Definitions**
   ```typescript
   // GOOD: Explicit, narrow types
   interface UserCredentials {
     readonly email: string;
     readonly hashedPassword: string;
   }

   function authenticate(credentials: UserCredentials): Promise<AuthToken> {
     // implementation
   }

   // BAD: Loose typing
   function authenticate(data: any): any {
     // implementation
   }
   ```

2. **Error Handling**
   ```typescript
   // GOOD: Type-safe error handling
   class ValidationError extends Error {
     constructor(public readonly field: string, message: string) {
       super(message);
     }
   }

   function validateEmail(email: string): Result<string, ValidationError> {
     if (!email.includes('@')) {
       return { success: false, error: new ValidationError('email', 'Invalid format') };
     }
     return { success: true, data: email };
   }
   ```

3. **Async/Await Pattern**
   ```typescript
   // GOOD: Clean async handling
   async function fetchUserData(id: string): Promise<User> {
     try {
       const response = await api.get(`/users/${id}`);
       return UserMapper.toDomain(response.data);
     } catch (error) {
       logger.error('Failed to fetch user', { id, error });
       throw new UserNotFoundError(id);
     }
   }
   ```

4. **Functional Programming Patterns**
   ```typescript
   // GOOD: Pure functions, immutability
   const addItem = (items: readonly Item[], newItem: Item): Item[] =>
     [...items, newItem];

   const updateItem = (items: readonly Item[], id: string, updates: Partial<Item>): Item[] =>
     items.map(item => item.id === id ? { ...item, ...updates } : item);
   ```

5. **Domain-Driven Design**
   ```typescript
   // GOOD: Rich domain models with encapsulation
   export class FlowCanvas {
     private readonly _items: FlowItem[] = [];

     constructor(
       private readonly _id: CanvasId,
       private readonly _name: CanvasName
     ) {}

     addItem(item: FlowItem): void {
       if (this.hasItem(item.id)) {
         throw new DuplicateItemError(item.id);
       }
       this._items.push(item);
     }

     private hasItem(id: ItemId): boolean {
       return this._items.some(item => item.id.equals(id));
     }
   }
   ```

6. **Dependency Injection**
   ```typescript
   // GOOD: Constructor injection for testability
   export class FlowCanvasUseCases {
     constructor(
       private readonly repository: IFlowCanvasRepository,
       private readonly validator: IValidator<FlowCanvas>
     ) {}

     async createCanvas(dto: CreateCanvasDTO): Promise<FlowCanvas> {
       const validated = await this.validator.validate(dto);
       const canvas = FlowCanvas.create(validated);
       await this.repository.save(canvas);
       return canvas;
     }
   }
   ```

### Code Organization

1. **File Structure**
   - One class/interface per file
   - Group related functionality in directories
   - Use barrel exports (index.ts) for clean imports
   - Separate concerns: domain, application, infrastructure, presentation

2. **Import Order**
   ```typescript
   // 1. External libraries
   import { app, BrowserWindow } from 'electron';
   import { v4 as uuidv4 } from 'uuid';

   // 2. Internal absolute imports
   import { FlowCanvas } from '@/domain/entities/FlowCanvas';

   // 3. Relative imports
   import { CanvasMapper } from './mappers/CanvasMapper';
   import type { CanvasDTO } from './types';
   ```

3. **Naming Conventions**
   - PascalCase: Classes, Interfaces, Types, Enums
   - camelCase: Variables, functions, methods
   - UPPER_SNAKE_CASE: Constants
   - kebab-case: File names
   - Prefix interfaces with 'I' only for abstractions (e.g., IRepository)

### Performance Guidelines

1. **Memoization**: Use for expensive computations
2. **Lazy Loading**: Load modules/components only when needed
3. **Debouncing/Throttling**: For high-frequency events
4. **Virtual Scrolling**: For large lists
5. **Web Workers**: For CPU-intensive tasks in renderer process

### Security Guidelines

1. **Input Validation**: Always validate and sanitize user input
2. **Context Isolation**: Use preload scripts for IPC
3. **CSP Headers**: Implement Content Security Policy
4. **No Direct DOM Manipulation**: Use React's virtual DOM
5. **Secure Storage**: Encrypt sensitive data before persistence