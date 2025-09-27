import { LogLevel, LogContext, LogEntry } from './Logger';

interface RendererLoggerConfig {
  level: LogLevel;
  isDevelopment: boolean;
  enablePerformance: boolean;
  processName: string;
}

class RendererLogger {
  private config: RendererLoggerConfig;
  private performanceMarks: Map<string, number> = new Map();
  private logBuffer: LogEntry[] = [];
  private readonly MAX_BUFFER_SIZE = 500;

  constructor(processName: string, config?: Partial<RendererLoggerConfig>) {
    this.config = {
      level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
      isDevelopment: process.env.NODE_ENV === 'development',
      enablePerformance: true,
      processName,
      ...config
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level;
  }

  private formatMessage(entry: LogEntry): string {
    const levelEmoji = this.getLevelEmoji(entry.level);
    const contextStr = entry.context ? 
      ` [${Object.entries(entry.context)
        .map(([k, v]) => `${k}:${v}`)
        .join(' ')}]` : '';
    const durationStr = entry.duration ? ` (${entry.duration}ms)` : '';
    return `${levelEmoji} [${this.config.processName}] ${entry.message}${contextStr}${durationStr}`;
  }

  private getLevelEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR: return '❌';
      case LogLevel.WARN: return '⚠️';
      case LogLevel.INFO: return 'ℹ️';
      case LogLevel.DEBUG: return '🔧';
      case LogLevel.TRACE: return '📝';
      default: return '📋';
    }
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
    metadata?: Record<string, any>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...context,
        process: this.config.processName
      },
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } as any : undefined,
      metadata
    };
  }

  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    if (this.config.isDevelopment) {
      const formattedMessage = this.formatMessage(entry);
      
      switch (entry.level) {
        case LogLevel.ERROR:
          console.error(formattedMessage, entry.error || '');
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        default:
          console.log(formattedMessage);
      }
    }

    if ((window as any).electron?.sendLog) {
      (window as any).electron.sendLog(entry);
    }

    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.MAX_BUFFER_SIZE) {
      this.logBuffer.shift();
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log(this.createLogEntry(LogLevel.ERROR, message, context, error));
  }

  warn(message: string, context?: LogContext): void {
    this.log(this.createLogEntry(LogLevel.WARN, message, context));
  }

  info(message: string, context?: LogContext): void {
    this.log(this.createLogEntry(LogLevel.INFO, message, context));
  }

  debug(message: string, context?: LogContext): void {
    this.log(this.createLogEntry(LogLevel.DEBUG, message, context));
  }

  trace(message: string, context?: LogContext): void {
    this.log(this.createLogEntry(LogLevel.TRACE, message, context));
  }

  startTimer(operationId: string): void {
    if (this.config.enablePerformance) {
      this.performanceMarks.set(operationId, performance.now());
    }
  }

  endTimer(operationId: string, message?: string, context?: LogContext): number | undefined {
    if (!this.config.enablePerformance) return undefined;
    
    const startTime = this.performanceMarks.get(operationId);
    if (startTime === undefined) return undefined;
    
    const duration = Math.round(performance.now() - startTime);
    this.performanceMarks.delete(operationId);
    
    if (message) {
      const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
      entry.duration = duration;
      this.log(entry);
    }
    
    return duration;
  }

  withContext(context: LogContext): BoundRendererLogger {
    return new BoundRendererLogger(this, context);
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  getBuffer(): LogEntry[] {
    return [...this.logBuffer];
  }

  clearBuffer(): void {
    this.logBuffer = [];
  }
}

class BoundRendererLogger {
  constructor(
    private logger: RendererLogger,
    private context: LogContext
  ) {}

  error(message: string, error?: Error, additionalContext?: LogContext): void {
    this.logger.error(message, error, { ...this.context, ...additionalContext });
  }

  warn(message: string, additionalContext?: LogContext): void {
    this.logger.warn(message, { ...this.context, ...additionalContext });
  }

  info(message: string, additionalContext?: LogContext): void {
    this.logger.info(message, { ...this.context, ...additionalContext });
  }

  debug(message: string, additionalContext?: LogContext): void {
    this.logger.debug(message, { ...this.context, ...additionalContext });
  }

  trace(message: string, additionalContext?: LogContext): void {
    this.logger.trace(message, { ...this.context, ...additionalContext });
  }

  startTimer(operationId: string): void {
    this.logger.startTimer(operationId);
  }

  endTimer(operationId: string, message?: string): number | undefined {
    return this.logger.endTimer(operationId, message, this.context);
  }
}

export function createRendererLogger(processName: string, context?: LogContext): RendererLogger | BoundRendererLogger {
  const logger = new RendererLogger(processName);
  return context ? logger.withContext(context) : logger;
}