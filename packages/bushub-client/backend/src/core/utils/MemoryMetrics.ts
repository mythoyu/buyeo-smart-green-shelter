export interface MemoryMetric {
  repositoryName: string;
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  lastUpdated: Date;
}

export class MemoryMetrics {
  private static instance: MemoryMetrics;
  private metrics: Map<string, MemoryMetric> = new Map();

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): MemoryMetrics {
    if (!MemoryMetrics.instance) {
      MemoryMetrics.instance = new MemoryMetrics();
    }
    return MemoryMetrics.instance;
  }

  recordHit(repositoryName: string): void {
    const metric = this.metrics.get(repositoryName) || this.createDefaultMetric(repositoryName);
    metric.hits++;
    metric.hitRate = metric.hits / (metric.hits + metric.misses);
    metric.lastUpdated = new Date();
    this.metrics.set(repositoryName, metric);
  }

  recordMiss(repositoryName: string): void {
    const metric = this.metrics.get(repositoryName) || this.createDefaultMetric(repositoryName);
    metric.misses++;
    metric.hitRate = metric.hits / (metric.hits + metric.misses);
    metric.lastUpdated = new Date();
    this.metrics.set(repositoryName, metric);
  }

  updateSize(repositoryName: string, size: number): void {
    const metric = this.metrics.get(repositoryName) || this.createDefaultMetric(repositoryName);
    metric.size = size;
    metric.lastUpdated = new Date();
    this.metrics.set(repositoryName, metric);
  }

  getMetrics(): Record<string, MemoryMetric> {
    const result: Record<string, MemoryMetric> = {};
    this.metrics.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  getMetric(repositoryName: string): MemoryMetric | null {
    return this.metrics.get(repositoryName) || null;
  }

  clearMetrics(): void {
    this.metrics.clear();
  }

  private createDefaultMetric(repositoryName: string): MemoryMetric {
    return {
      repositoryName,
      size: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      lastUpdated: new Date(),
    };
  }
}
