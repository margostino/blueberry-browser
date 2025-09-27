/**
 * Logger Interface
 * Defines the contract for logging services
 */

export interface ILogger {
  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
  trace(message: string, meta?: Record<string, unknown>): void;
}

export interface ILoggerOptions {
  module: string;
  level?: 'error' | 'warn' | 'info' | 'debug' | 'trace';
}