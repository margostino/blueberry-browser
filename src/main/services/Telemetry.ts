import { LogContext, createLogger } from './Logger';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  tags?: Record<string, string>;
  timestamp: Date;
}

export interface UserAction {
  action: string;
  category: string;
  label?: string;
  value?: number;
  context?: Record<string, any>;
  timestamp: Date;
}

export interface SystemMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  uptime: number;
  timestamp: Date;
}

export interface TelemetryEvent {
  type: 'performance' | 'action' | 'error' | 'system';
  data: PerformanceMetric | UserAction | SystemMetrics | any;
  sessionId: string;
  userId?: string;
}

class TelemetryService {
  private static instance: TelemetryService;
  private readonly logger = createLogger({ module: 'Telemetry' });
  private readonly sessionId: string;
  private readonly metrics: Map<string, PerformanceMetric[]> = new Map();
  private readonly actions: UserAction[] = [];
  private readonly maxBufferSize = 1000;
  private isEnabled: boolean;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.isEnabled = process.env.NODE_ENV === 'development';
    
    if (this.isEnabled) {
      this.startSystemMetricsCollection();
    }
  }

  static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private startSystemMetricsCollection(): void {
    setInterval(() => {
      this.collectSystemMetrics();
    }, 60000); // Every minute
  }

  private collectSystemMetrics(): void {
    const metrics: SystemMetrics = {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date()
    };

    if (process.cpuUsage) {
      metrics.cpuUsage = process.cpuUsage();
    }

    this.logger.debug('System metrics collected', {
      operation: 'collectSystemMetrics',
      metadata: {
        heapUsed: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(metrics.memoryUsage.heapTotal / 1024 / 1024),
        uptime: Math.round(metrics.uptime)
      }
    });
  }

  trackPerformance(
    name: string,
    value: number,
    unit: PerformanceMetric['unit'] = 'ms',
    tags?: Record<string, string>
  ): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      tags,
      timestamp: new Date()
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricsArray = this.metrics.get(name)!;
    metricsArray.push(metric);

    if (metricsArray.length > this.maxBufferSize) {
      metricsArray.shift();
    }

    this.logger.trace(`Performance metric: ${name}`, {
      operation: 'trackPerformance',
      metadata: { value, unit, tags }
    });
  }

  trackAction(
    action: string,
    category: string,
    label?: string,
    value?: number,
    context?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const userAction: UserAction = {
      action,
      category,
      label,
      value,
      context,
      timestamp: new Date()
    };

    this.actions.push(userAction);

    if (this.actions.length > this.maxBufferSize) {
      this.actions.shift();
    }

    this.logger.debug(`User action: ${category}.${action}`, {
      operation: 'trackAction',
      metadata: { label, value, context }
    });
  }

  trackError(error: Error, context?: LogContext): void {
    if (!this.isEnabled) return;

    this.logger.error('Telemetry error tracked', error, {
      ...context,
      operation: 'trackError'
    });
  }

  async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      this.trackPerformance(name, duration, 'ms', tags);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.trackPerformance(name, duration, 'ms', { ...tags, error: 'true' });
      throw error;
    }
  }

  measure<T>(
    name: string,
    operation: () => T,
    tags?: Record<string, string>
  ): T {
    const startTime = performance.now();
    
    try {
      const result = operation();
      const duration = performance.now() - startTime;
      this.trackPerformance(name, duration, 'ms', tags);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.trackPerformance(name, duration, 'ms', { ...tags, error: 'true' });
      throw error;
    }
  }

  getMetricsSummary(metricName?: string): Record<string, any> {
    if (metricName) {
      const metrics = this.metrics.get(metricName) || [];
      return this.calculateSummary(metrics);
    }

    const summary: Record<string, any> = {};
    for (const [name, metrics] of this.metrics) {
      summary[name] = this.calculateSummary(metrics);
    }
    return summary;
  }

  private calculateSummary(metrics: PerformanceMetric[]): Record<string, any> {
    if (metrics.length === 0) {
      return { count: 0 };
    }

    const values = metrics.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return {
      count: metrics.length,
      sum: Math.round(sum * 100) / 100,
      avg: Math.round(avg * 100) / 100,
      min: Math.min(...values),
      max: Math.max(...values),
      p50: Math.round(p50 * 100) / 100,
      p95: Math.round(p95 * 100) / 100,
      p99: Math.round(p99 * 100) / 100,
      unit: metrics[0].unit
    };
  }

  getActions(category?: string): UserAction[] {
    if (category) {
      return this.actions.filter(a => a.category === category);
    }
    return [...this.actions];
  }

  clearMetrics(): void {
    this.metrics.clear();
    this.logger.info('Metrics cleared');
  }

  clearActions(): void {
    this.actions.length = 0;
    this.logger.info('Actions cleared');
  }

  enable(): void {
    this.isEnabled = true;
    this.startSystemMetricsCollection();
    this.logger.info('Telemetry enabled');
  }

  disable(): void {
    this.isEnabled = false;
    this.logger.info('Telemetry disabled');
  }

  isActive(): boolean {
    return this.isEnabled;
  }

  getSessionId(): string {
    return this.sessionId;
  }
}

export const telemetry = TelemetryService.getInstance();

export function trackPerformance(
  name: string,
  value: number,
  unit?: PerformanceMetric['unit'],
  tags?: Record<string, string>
): void {
  telemetry.trackPerformance(name, value, unit, tags);
}

export function trackAction(
  action: string,
  category: string,
  label?: string,
  value?: number,
  context?: Record<string, any>
): void {
  telemetry.trackAction(action, category, label, value, context);
}

export function measureAsync<T>(
  name: string,
  operation: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  return telemetry.measureAsync(name, operation, tags);
}

export function measure<T>(
  name: string,
  operation: () => T,
  tags?: Record<string, string>
): T {
  return telemetry.measure(name, operation, tags);
}