/**
 * Application Constants
 * Centralized definition of all application constants
 */

// Application Info
export const APP_INFO = {
  NAME: 'Blueberry Browser',
  VERSION: '1.0.0',
  DEFAULT_URL: 'https://margostino.com',
  USER_CONFIG_DIR: '.blueberry',
} as const;

// Window Defaults
export const WINDOW_DEFAULTS = {
  WIDTH: 1000,
  HEIGHT: 800,
  MIN_WIDTH: 400,
  MIN_HEIGHT: 300,
  TITLE_BAR_STYLE: 'hidden' as const,
} as const;

// Tab Limits
export const TAB_LIMITS = {
  MAX_TABS: 20,
  DEFAULT_PARTITION: 'persist:default',
} as const;

// AI/LLM Settings
export const AI_SETTINGS = {
  MAX_CONTEXT_LENGTH: 4000,
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 2000,
  STREAMING_ENABLED: true,
} as const;

// FlowCanvas Database
export const FLOWCANVAS_DB = {
  NAME: 'FlowCanvasDB',
  VERSION: 1,
  STORES: {
    CANVASES: 'canvases',
    ITEMS: 'items',
    PREFERENCES: 'preferences',
  },
} as const;

// Performance
export const PERFORMANCE = {
  TELEMETRY_INTERVAL: 60000, // 1 minute
  DEFAULT_CACHE_SIZE_MB: 100,
  API_TIMEOUT_MS: 30000,
} as const;

// Security
export const SECURITY = {
  ALLOWED_PROTOCOLS: ['http', 'https', 'file'] as const,
  WEB_SECURITY: true,
  NODE_INTEGRATION: false,
  CONTEXT_ISOLATION: true,
  SANDBOX: true,
} as const;

// File Paths
// Note: These should be resolved in the main process where process.env is available
export const PATHS = {
  SCREENSHOTS_DIR: 'screenshots',
  LOGS_DIR: 'logs',
} as const;

// Search Engines
export const SEARCH_ENGINES = {
  GOOGLE: 'https://www.google.com/search?q=',
  DUCKDUCKGO: 'https://duckduckgo.com/?q=',
  BING: 'https://www.bing.com/search?q=',
} as const;

export const DEFAULT_SEARCH_ENGINE = 'google' as const;