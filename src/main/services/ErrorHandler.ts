export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  OPERATION_FAILED = 'OPERATION_FAILED',
  INITIALIZATION_ERROR = 'INITIALIZATION_ERROR',
  STATE_ERROR = 'STATE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  module?: string;
  operation?: string;
  userId?: string;
  tabId?: string;
  url?: string;
  metadata?: Record<string, any>;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly context?: ErrorContext;
  public readonly timestamp: Date;
  public readonly originalError?: Error;
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: ErrorContext,
    originalError?: Error,
    isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date();
    this.originalError = originalError;
    this.isRetryable = isRetryable;

    if (originalError && originalError.stack) {
      this.stack = originalError.stack;
    }
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      isRetryable: this.isRetryable
    };
  }
}

export class NetworkError extends AppError {
  constructor(
    message: string,
    context?: ErrorContext,
    originalError?: Error,
    isRetryable: boolean = true
  ) {
    super(
      message,
      ErrorCode.NETWORK_ERROR,
      ErrorSeverity.HIGH,
      context,
      originalError,
      isRetryable
    );
    this.name = 'NetworkError';
  }
}

export class APIError extends AppError {
  public readonly statusCode?: number;
  public readonly response?: unknown;

  constructor(
    message: string,
    statusCode?: number,
    response?: unknown,
    context?: ErrorContext,
    originalError?: Error,
    isRetryable: boolean = false
  ) {
    const severity = statusCode && statusCode >= 500 
      ? ErrorSeverity.HIGH 
      : ErrorSeverity.MEDIUM;
    
    super(
      message,
      ErrorCode.API_ERROR,
      severity,
      context,
      originalError,
      isRetryable || (statusCode ? statusCode >= 500 : false)
    );
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

export class ValidationError extends AppError {
  public readonly validationErrors?: Record<string, string[]>;

  constructor(
    message: string,
    validationErrors?: Record<string, string[]>,
    context?: ErrorContext
  ) {
    super(
      message,
      ErrorCode.VALIDATION_ERROR,
      ErrorSeverity.LOW,
      context,
      undefined,
      false
    );
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
  }
}

export class ErrorHandler {
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAYS = [1000, 2000, 4000];

  static handle(error: unknown, context?: ErrorContext): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(
        error.message,
        ErrorCode.UNKNOWN_ERROR,
        ErrorSeverity.MEDIUM,
        context,
        error
      );
    }

    return new AppError(
      String(error),
      ErrorCode.UNKNOWN_ERROR,
      ErrorSeverity.MEDIUM,
      context
    );
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    context?: ErrorContext,
    maxAttempts: number = ErrorHandler.MAX_RETRY_ATTEMPTS
  ): Promise<T> {
    let lastError: AppError | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = ErrorHandler.handle(error, context);

        if (!lastError.isRetryable || attempt === maxAttempts - 1) {
          throw lastError;
        }

        const delay = ErrorHandler.RETRY_DELAYS[attempt] || 5000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new AppError(
      'Operation failed after retries',
      ErrorCode.OPERATION_FAILED,
      ErrorSeverity.HIGH,
      context
    );
  }

  static async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    context?: ErrorContext
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) => 
        setTimeout(() => 
          reject(new AppError(
            `Operation timed out after ${timeoutMs}ms`,
            ErrorCode.OPERATION_FAILED,
            ErrorSeverity.HIGH,
            context
          )), 
          timeoutMs
        )
      )
    ]);
  }

  static createErrorBoundary(
    fallback: (error: AppError) => void,
    context?: ErrorContext
  ): (error: unknown) => void {
    return (error: unknown) => {
      const appError = ErrorHandler.handle(error, context);
      fallback(appError);
    };
  }
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isRetryable;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch')
    );
  }
  return false;
}