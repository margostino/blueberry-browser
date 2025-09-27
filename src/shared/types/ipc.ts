// IPC Message Types for Type Safety

export interface TabInfo {
  id: string;
  title: string;
  url: string;
  isActive?: boolean;
  favicon?: string;
}

export interface NavigateMessage {
  url: string;
  tabId?: string;
}

export interface CreateTabMessage {
  url?: string;
  isActive?: boolean;
}

export interface CloseTabMessage {
  tabId: string;
}

export interface SwitchTabMessage {
  tabId: string;
}

export interface ChatMessage {
  message: string;
  messageId: string;
  timestamp?: number;
}

export interface ChatResponse {
  content: string;
  messageId: string;
  isComplete: boolean;
  error?: string;
}

export interface WindowBoundsMessage {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface ScreenshotMessage {
  tabId: string;
  format?: 'png' | 'jpeg';
  quality?: number;
}

export interface FlowCanvasItem {
  id: string;
  type: 'screenshot' | 'note' | 'tab';
  title: string;
  content?: string;
  url?: string;
  screenshot?: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  timestamp: number;
}

export interface FlowCanvasConnection {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface FlowCanvas {
  id: string;
  name: string;
  items: FlowCanvasItem[];
  connections: FlowCanvasConnection[];
  createdAt: number;
  updatedAt: number;
}

export interface FlowCanvasState {
  items: FlowCanvasItem[];
  connections: FlowCanvasConnection[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

// IPC Channel Names
export enum IPCChannels {
  // Navigation
  NAVIGATE_TO_URL = 'navigate-to-url',
  GO_BACK = 'go-back',
  GO_FORWARD = 'go-forward',
  RELOAD = 'reload',
  STOP = 'stop',
  
  // Tab Management
  CREATE_TAB = 'create-tab',
  CLOSE_TAB = 'close-tab',
  SWITCH_TAB = 'switch-tab',
  GET_TABS = 'get-tabs',
  TAB_UPDATED = 'tab-updated',
  
  // Chat
  SEND_CHAT_MESSAGE = 'send-chat-message',
  RECEIVE_CHAT_RESPONSE = 'receive-chat-response',
  CLEAR_CHAT = 'clear-chat',
  
  // Window
  MINIMIZE_WINDOW = 'minimize-window',
  MAXIMIZE_WINDOW = 'maximize-window',
  CLOSE_WINDOW = 'close-window',
  SET_BOUNDS = 'set-bounds',
  GET_BOUNDS = 'get-bounds',
  
  // FlowCanvas
  SAVE_CANVAS = 'save-canvas',
  LOAD_CANVAS = 'load-canvas',
  ADD_CANVAS_ITEM = 'add-canvas-item',
  REMOVE_CANVAS_ITEM = 'remove-canvas-item',
  UPDATE_CANVAS_ITEM = 'update-canvas-item',
  CREATE_CONNECTION = 'create-connection',
  REMOVE_CONNECTION = 'remove-connection',
  
  // Screenshot
  CAPTURE_SCREENSHOT = 'capture-screenshot',
  SELECT_SCREENSHOT_AREA = 'select-screenshot-area',
  
  // Sidebar
  TOGGLE_SIDEBAR = 'toggle-sidebar',
  SET_SIDEBAR_VISIBLE = 'set-sidebar-visible',
  
  // Theme
  SET_THEME = 'set-theme',
  GET_THEME = 'get-theme',
}

// Type guards
export function isTabInfo(obj: unknown): obj is TabInfo {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'title' in obj &&
    'url' in obj &&
    typeof (obj as TabInfo).id === 'string' &&
    typeof (obj as TabInfo).title === 'string' &&
    typeof (obj as TabInfo).url === 'string'
  );
}

export function isNavigateMessage(obj: unknown): obj is NavigateMessage {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'url' in obj &&
    typeof (obj as NavigateMessage).url === 'string'
  );
}

export function isChatMessage(obj: unknown): obj is ChatMessage {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'message' in obj &&
    'messageId' in obj &&
    typeof (obj as ChatMessage).message === 'string' &&
    typeof (obj as ChatMessage).messageId === 'string'
  );
}