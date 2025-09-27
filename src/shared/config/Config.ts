import * as path from 'path';
import * as fs from 'fs';
import { createLogger } from '../../main/services/Logger';

const logger = createLogger({ module: 'Config' });

// Environment configuration type
interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  LOG_LEVEL?: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  TELEMETRY_ENABLED?: boolean;
  VITE_DEV_SERVER_PORT?: string;
  MAX_TABS: number;
  DEFAULT_SEARCH_ENGINE: string;
  ENABLE_DEVTOOLS?: boolean;
  API_TIMEOUT_MS: number;
  CACHE_SIZE_MB: number;
}

// Application configuration type
interface AppConfig {
  app: {
    name: string;
    version: string;
    defaultUrl: string;
    userAgent?: string;
  };
  window: {
    defaultWidth: number;
    defaultHeight: number;
    minWidth: number;
    minHeight: number;
    titleBarStyle: 'default' | 'hidden' | 'hiddenInset';
    autoHideMenuBar: boolean;
  };
  tabs: {
    maxTabs: number;
    preloadEnabled: boolean;
    persistentSessions: boolean;
    defaultPartition: string;
  };
  ai: {
    provider: 'openai' | 'anthropic';
    model?: string;
    temperature: number;
    maxTokens: number;
    streamingEnabled: boolean;
  };
  performance: {
    enableTelemetry: boolean;
    telemetryInterval: number;
    cacheEnabled: boolean;
    cacheSizeMB: number;
    lazyLoading: boolean;
  };
  security: {
    webSecurity: boolean;
    nodeIntegration: boolean;
    contextIsolation: boolean;
    sandbox: boolean;
    allowedProtocols: string[];
  };
  developer: {
    devTools: boolean;
    hotReload: boolean;
    verboseLogging: boolean;
    sourceMapSupport: boolean;
  };
}

export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private envConfig!: EnvConfig;
  private appConfig!: AppConfig;
  private configPath: string;
  private userConfigPath: string;

  private constructor() {
    this.configPath = path.join(__dirname, '../../config/default.json');
    this.userConfigPath = path.join(
      process.env.HOME || process.env.USERPROFILE || '.',
      '.blueberry',
      'config.json'
    );
    this.loadConfiguration();
  }

  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  private loadConfiguration(): void {
    // Load and validate environment variables
    this.loadEnvironmentVariables();
    
    // Load application configuration
    this.loadAppConfiguration();
    
    // Apply environment overrides
    this.applyEnvironmentOverrides();
    
    logger.info('Configuration loaded successfully', {
      environment: this.envConfig.NODE_ENV,
      telemetry: this.appConfig.performance.enableTelemetry,
      aiProvider: this.appConfig.ai.provider,
    });
  }

  private loadEnvironmentVariables(): void {
    try {
      // Load .env file if it exists
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
      }

      // Parse environment variables with defaults
      this.envConfig = {
        NODE_ENV: this.validateEnum(process.env.NODE_ENV, ['development', 'production', 'test'], 'production') as EnvConfig['NODE_ENV'],
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        LOG_LEVEL: this.validateEnum(process.env.LOG_LEVEL, ['error', 'warn', 'info', 'debug', 'trace']) as EnvConfig['LOG_LEVEL'],
        TELEMETRY_ENABLED: process.env.TELEMETRY_ENABLED === 'true',
        VITE_DEV_SERVER_PORT: process.env.VITE_DEV_SERVER_PORT,
        MAX_TABS: this.parseNumber(process.env.MAX_TABS, 20),
        DEFAULT_SEARCH_ENGINE: process.env.DEFAULT_SEARCH_ENGINE || 'google',
        ENABLE_DEVTOOLS: process.env.ENABLE_DEVTOOLS === 'true',
        API_TIMEOUT_MS: this.parseNumber(process.env.API_TIMEOUT_MS, 30000),
        CACHE_SIZE_MB: this.parseNumber(process.env.CACHE_SIZE_MB, 100),
      };
    } catch (error) {
      logger.error('Failed to load environment variables', error as Error);
      this.envConfig = this.getDefaultEnvConfig();
    }
  }

  private loadAppConfiguration(): void {
    try {
      let configData = this.getDefaultAppConfig();
      
      // Load default configuration if it exists
      if (fs.existsSync(this.configPath)) {
        const defaultConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        configData = this.deepMerge(configData, defaultConfig);
      }
      
      // Load user configuration if it exists
      if (fs.existsSync(this.userConfigPath)) {
        const userConfig = JSON.parse(fs.readFileSync(this.userConfigPath, 'utf-8'));
        configData = this.deepMerge(configData, userConfig);
      }
      
      this.appConfig = this.validateAppConfig(configData);
    } catch (error) {
      logger.error('Failed to load app configuration', error as Error);
      this.appConfig = this.getDefaultAppConfig();
    }
  }

  private validateEnum<T>(value: string | undefined, validValues: readonly T[], defaultValue?: T): T | undefined {
    if (!value) return defaultValue;
    return validValues.includes(value as T) ? (value as T) : defaultValue;
  }

  private parseNumber(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  private getDefaultEnvConfig(): EnvConfig {
    return {
      NODE_ENV: 'production',
      OPENAI_API_KEY: undefined,
      ANTHROPIC_API_KEY: undefined,
      LOG_LEVEL: undefined,
      TELEMETRY_ENABLED: undefined,
      VITE_DEV_SERVER_PORT: undefined,
      MAX_TABS: 20,
      DEFAULT_SEARCH_ENGINE: 'google',
      ENABLE_DEVTOOLS: undefined,
      API_TIMEOUT_MS: 30000,
      CACHE_SIZE_MB: 100,
    };
  }

  private getDefaultAppConfig(): AppConfig {
    return {
      app: {
        name: 'Blueberry Browser',
        version: '1.0.0',
        defaultUrl: 'https://margostino.com',
        userAgent: undefined,
      },
      window: {
        defaultWidth: 1000,
        defaultHeight: 800,
        minWidth: 400,
        minHeight: 300,
        titleBarStyle: 'hidden',
        autoHideMenuBar: false,
      },
      tabs: {
        maxTabs: 20,
        preloadEnabled: true,
        persistentSessions: true,
        defaultPartition: 'persist:default',
      },
      ai: {
        provider: 'openai',
        model: undefined,
        temperature: 0.7,
        maxTokens: 2000,
        streamingEnabled: true,
      },
      performance: {
        enableTelemetry: true,
        telemetryInterval: 60000,
        cacheEnabled: true,
        cacheSizeMB: 100,
        lazyLoading: true,
      },
      security: {
        webSecurity: true,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        allowedProtocols: ['http', 'https', 'file'],
      },
      developer: {
        devTools: false,
        hotReload: true,
        verboseLogging: false,
        sourceMapSupport: true,
      },
    };
  }

  private validateAppConfig(config: unknown): AppConfig {
    const defaults = this.getDefaultAppConfig();
    return this.deepMerge(defaults, config) as AppConfig;
  }

  private applyEnvironmentOverrides(): void {
    // Apply environment-specific overrides
    if (this.envConfig.NODE_ENV === 'development') {
      this.appConfig.developer.devTools = true;
      this.appConfig.developer.verboseLogging = true;
    }
    
    if (this.envConfig.TELEMETRY_ENABLED !== undefined) {
      this.appConfig.performance.enableTelemetry = this.envConfig.TELEMETRY_ENABLED;
    }
    
    if (this.envConfig.MAX_TABS) {
      this.appConfig.tabs.maxTabs = this.envConfig.MAX_TABS;
    }
    
    if (this.envConfig.ENABLE_DEVTOOLS !== undefined) {
      this.appConfig.developer.devTools = this.envConfig.ENABLE_DEVTOOLS;
    }
    
    if (this.envConfig.API_TIMEOUT_MS) {
      this.appConfig.ai.maxTokens = Math.min(
        this.envConfig.API_TIMEOUT_MS / 10,
        this.appConfig.ai.maxTokens
      );
    }
    
    if (this.envConfig.CACHE_SIZE_MB) {
      this.appConfig.performance.cacheSizeMB = this.envConfig.CACHE_SIZE_MB;
    }
  }

  private deepMerge(target: any, source: any): any {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }
    
    return output;
  }

  private isObject(item: unknown): item is Record<string, unknown> {
    return item !== null && typeof item === 'object' && !Array.isArray(item);
  }

  get env(): EnvConfig {
    return this.envConfig;
  }

  get app(): AppConfig {
    return this.appConfig;
  }

  get isDevelopment(): boolean {
    return this.envConfig.NODE_ENV === 'development';
  }

  get isProduction(): boolean {
    return this.envConfig.NODE_ENV === 'production';
  }

  get isTest(): boolean {
    return this.envConfig.NODE_ENV === 'test';
  }

  getOpenAIKey(): string | undefined {
    return this.envConfig.OPENAI_API_KEY;
  }

  getAnthropicKey(): string | undefined {
    return this.envConfig.ANTHROPIC_API_KEY;
  }

  get<K extends keyof AppConfig>(section: K): AppConfig[K] {
    return this.appConfig[section];
  }

  set<K extends keyof AppConfig>(section: K, value: Partial<AppConfig[K]>): void {
    this.appConfig[section] = { ...this.appConfig[section], ...value };
    this.saveUserConfiguration();
  }

  private saveUserConfiguration(): void {
    try {
      const userConfigDir = path.dirname(this.userConfigPath);
      
      if (!fs.existsSync(userConfigDir)) {
        fs.mkdirSync(userConfigDir, { recursive: true });
      }
      
      fs.writeFileSync(
        this.userConfigPath,
        JSON.stringify(this.appConfig, null, 2),
        'utf-8'
      );
      
      logger.info('User configuration saved', { path: this.userConfigPath });
    } catch (error) {
      logger.error('Failed to save user configuration', error as Error);
    }
  }

  reload(): void {
    this.loadConfiguration();
    logger.info('Configuration reloaded');
  }

  validate(): boolean {
    try {
      // Basic validation
      if (!this.envConfig || !this.appConfig) {
        return false;
      }
      
      // Check required fields
      if (!this.appConfig.app.name || !this.appConfig.app.version) {
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('Configuration validation failed', error as Error);
      return false;
    }
  }

  toJSON(): { env: EnvConfig; app: AppConfig } {
    return {
      env: this.envConfig,
      app: this.appConfig,
    };
  }
}

// Export singleton instance
export const config = ConfigurationManager.getInstance();

// Export configuration types
export type { EnvConfig, AppConfig };