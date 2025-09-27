import { createLogger } from './Logger';

const logger = createLogger({ module: 'SecurityValidator' });

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'url' | 'enum';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enumValues?: readonly string[];
  sanitize?: boolean;
}

export interface ValidationSchema {
  [key: string]: ValidationRule[];
}

export class SecurityValidator {
  private static readonly URL_PATTERN = /^(https?|file|chrome|about|blueberry):\/\/.*/i;
  private static readonly SCRIPT_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
  private static readonly SQL_INJECTION_PATTERN = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/gi;
  private static readonly XSS_PATTERN = /(<script|javascript:|on\w+\s*=)/gi;

  static validateIPCMessage<T>(message: unknown, schema: ValidationSchema): T | null {
    try {
      if (!message || typeof message !== 'object') {
        logger.warn('Invalid IPC message structure', { message });
        return null;
      }

      const validated = {} as T;
      const messageObj = message as Record<string, unknown>;

      for (const [field, rules] of Object.entries(schema)) {
        const value = messageObj[field];
        const validatedValue = SecurityValidator.validateField(field, value, rules);
        
        if (validatedValue === undefined && rules.some(r => r.required)) {
          logger.warn(`Required field missing: ${field}`);
          return null;
        }

        if (validatedValue !== undefined) {
          (validated as any)[field] = validatedValue;
        }
      }

      return validated;
    } catch (error) {
      logger.error('IPC message validation failed', error as Error);
      return null;
    }
  }

  private static validateField(
    fieldName: string,
    value: unknown,
    rules: ValidationRule[]
  ): unknown {
    if (value === undefined || value === null) {
      const requiredRule = rules.find(r => r.required);
      if (requiredRule) {
        throw new Error(`Field ${fieldName} is required`);
      }
      return undefined;
    }

    for (const rule of rules) {
      switch (rule.type) {
        case 'string':
          value = SecurityValidator.validateString(value, rule);
          break;
        case 'number':
          value = SecurityValidator.validateNumber(value, rule);
          break;
        case 'boolean':
          value = SecurityValidator.validateBoolean(value);
          break;
        case 'url':
          value = SecurityValidator.validateURL(value as string);
          break;
        case 'enum':
          value = SecurityValidator.validateEnum(value as string, rule.enumValues);
          break;
        case 'object':
          value = SecurityValidator.validateObject(value);
          break;
        case 'array':
          value = SecurityValidator.validateArray(value);
          break;
      }
    }

    return value;
  }

  private static validateString(value: unknown, rule: ValidationRule): string {
    if (typeof value !== 'string') {
      throw new Error(`Expected string, got ${typeof value}`);
    }

    let sanitized = value;

    if (rule.sanitize !== false) {
      sanitized = SecurityValidator.sanitizeString(value);
    }

    if (rule.minLength !== undefined && sanitized.length < rule.minLength) {
      throw new Error(`String too short (min: ${rule.minLength})`);
    }

    if (rule.maxLength !== undefined && sanitized.length > rule.maxLength) {
      throw new Error(`String too long (max: ${rule.maxLength})`);
    }

    if (rule.pattern && !rule.pattern.test(sanitized)) {
      throw new Error(`String does not match required pattern`);
    }

    return sanitized;
  }

  private static validateNumber(value: unknown, rule: ValidationRule): number {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    
    if (typeof num !== 'number' || isNaN(num)) {
      throw new Error(`Expected number, got ${typeof value}`);
    }

    if (rule.min !== undefined && num < rule.min) {
      throw new Error(`Number too small (min: ${rule.min})`);
    }

    if (rule.max !== undefined && num > rule.max) {
      throw new Error(`Number too large (max: ${rule.max})`);
    }

    return num;
  }

  private static validateBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new Error(`Expected boolean, got ${typeof value}`);
  }

  private static validateURL(url: string): string {
    if (typeof url !== 'string') {
      throw new Error('URL must be a string');
    }

    const sanitized = SecurityValidator.sanitizeString(url);

    if (!SecurityValidator.URL_PATTERN.test(sanitized)) {
      throw new Error('Invalid URL format');
    }

    // Check for javascript: protocol
    if (sanitized.toLowerCase().startsWith('javascript:')) {
      throw new Error('JavaScript URLs are not allowed');
    }

    // Check for data: URLs that might contain scripts
    if (sanitized.toLowerCase().startsWith('data:') && 
        sanitized.toLowerCase().includes('script')) {
      throw new Error('Data URLs with scripts are not allowed');
    }

    return sanitized;
  }

  private static validateEnum(
    value: string,
    allowedValues?: readonly string[]
  ): string {
    if (!allowedValues || !allowedValues.includes(value)) {
      throw new Error(`Value must be one of: ${allowedValues?.join(', ')}`);
    }
    return value;
  }

  private static validateObject(value: unknown): object {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('Expected object');
    }
    return value;
  }

  private static validateArray(value: unknown): unknown[] {
    if (!Array.isArray(value)) {
      throw new Error('Expected array');
    }
    return value;
  }

  sanitizeInput(input: string): string {
    return SecurityValidator.sanitizeString(input);
  }

  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';

    let sanitized = input;

    sanitized = sanitized.replace(SecurityValidator.SCRIPT_PATTERN, '');

    sanitized = sanitized.replace(SecurityValidator.XSS_PATTERN, '');

    // Escape HTML entities
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return sanitized;
  }

  static sanitizeHTML(html: string): string {
    if (typeof html !== 'string') return '';

    // Basic HTML sanitization (in production, use a library like DOMPurify)
    let sanitized = html;

    sanitized = sanitized.replace(SecurityValidator.SCRIPT_PATTERN, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');

    sanitized = sanitized.replace(/javascript:/gi, '');

    return sanitized;
  }

  static isValidURL(url: string): boolean {
    try {
      SecurityValidator.validateURL(url);
      return true;
    } catch {
      return false;
    }
  }

  static checkForSQLInjection(input: string): boolean {
    return SecurityValidator.SQL_INJECTION_PATTERN.test(input);
  }

  static checkForXSS(input: string): boolean {
    return SecurityValidator.XSS_PATTERN.test(input);
  }

  static createCSP(): string {
    return [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https:",
      "media-src 'self'",
      "object-src 'none'",
      "frame-src 'none'",
      "worker-src 'self'",
      "form-action 'self'",
      "base-uri 'self'",
      "manifest-src 'self'"
    ].join('; ');
  }
}