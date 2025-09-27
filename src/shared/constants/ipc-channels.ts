/**
 * IPC Channel Constants
 * Centralized definition of all IPC communication channels between main and renderer processes
 */

// Tab Management
export const TAB_CHANNELS = {
  CREATE: 'create-tab',
  CLOSE: 'close-tab',
  SWITCH: 'switch-tab',
  GET_ALL: 'get-tabs',
  GET_ACTIVE_INFO: 'get-active-tab-info',
  SCREENSHOT: 'tab-screenshot',
  RUN_JS: 'tab-run-js',
} as const;

// Navigation
export const NAVIGATION_CHANNELS = {
  NAVIGATE: 'navigate-to',
  NAVIGATE_TAB: 'navigate-tab',
  GO_BACK: 'go-back',
  GO_FORWARD: 'go-forward',
  RELOAD: 'reload',
  TAB_GO_BACK: 'tab-go-back',
  TAB_GO_FORWARD: 'tab-go-forward',
  TAB_RELOAD: 'tab-reload',
} as const;

// Page Content
export const PAGE_CHANNELS = {
  GET_CONTENT: 'get-page-content',
  GET_TEXT: 'get-page-text',
  GET_URL: 'get-current-url',
  TEXT_RESPONSE: 'page-text-response',
} as const;

// Sidebar
export const SIDEBAR_CHANNELS = {
  TOGGLE: 'toggle-sidebar',
  CHAT_MESSAGE: 'sidebar-chat-message',
  CLEAR_CHAT: 'sidebar-clear-chat',
  GET_MESSAGES: 'sidebar-get-messages',
  CHAT_RESPONSE: 'chat-response',
  MESSAGES_UPDATED: 'chat-messages-updated',
} as const;

// FlowCanvas
export const FLOWCANVAS_CHANNELS = {
  CREATE: 'flowcanvas:create',
  LOAD: 'flowcanvas:load',
  SAVE: 'flowcanvas:save',
  GET_ACTIVE: 'flowcanvas:get-active',
  UPDATE_ITEM: 'flowcanvas:update-item',
  DELETE_ITEM: 'flowcanvas:delete-item',
  OPEN: 'flowcanvas:open',
  ITEM_CAPTURED: 'flowcanvas:item-captured',
  ITEM_ADDED: 'flowcanvas:item-added',
  FIND_CONNECTIONS: 'flowcanvas:find-connections',
} as const;

// UI/Theme
export const UI_CHANNELS = {
  DARK_MODE_CHANGED: 'dark-mode-changed',
  DARK_MODE_UPDATED: 'dark-mode-updated',
  WINDOW_RESIZED: 'window-resized',
} as const;

// System
export const SYSTEM_CHANNELS = {
  PING: 'ping',
} as const;

// Type exports for type-safe IPC communication
export type TabChannel = typeof TAB_CHANNELS[keyof typeof TAB_CHANNELS];
export type NavigationChannel = typeof NAVIGATION_CHANNELS[keyof typeof NAVIGATION_CHANNELS];
export type PageChannel = typeof PAGE_CHANNELS[keyof typeof PAGE_CHANNELS];
export type SidebarChannel = typeof SIDEBAR_CHANNELS[keyof typeof SIDEBAR_CHANNELS];
export type FlowCanvasChannel = typeof FLOWCANVAS_CHANNELS[keyof typeof FLOWCANVAS_CHANNELS];
export type UIChannel = typeof UI_CHANNELS[keyof typeof UI_CHANNELS];
export type SystemChannel = typeof SYSTEM_CHANNELS[keyof typeof SYSTEM_CHANNELS];

export type IPCChannel =
  | TabChannel
  | NavigationChannel
  | PageChannel
  | SidebarChannel
  | FlowCanvasChannel
  | UIChannel
  | SystemChannel;