/**
 * Performance monitoring and analytics system
 * Tracks application performance metrics, user interactions, and system health
 */

import { errorHandler, ErrorCategory, ErrorSeverity } from '@/lib/error/error-handler'

export enum MetricType {
  TIMING = 'timing',
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  CUSTOM = 'custom'
}

export enum PerformanceCategory {
  AUDIO = 'audio',
  UI = 'ui',
  NETWORK = 'network',
  STORAGE = 'storage',
  RENDERING = 'rendering',
  MEMORY = 'memory',
  USER_INTERACTION = 'user_interaction',
  SYSTEM = 'system'
}

export interface PerformanceMetric {
  id: string
  type: MetricType
  category: PerformanceCategory
  name: string
  value: number
  unit: string
  timestamp: Date
  context: {
    userId?: string
    sessionId?: string
    component?: string
    action?: string
    metadata?: Record<string, any>
  }
}

export interface PerformanceConfig {
  enableRealTimeMonitoring: boolean
  enableMemoryTracking: boolean
  enableNetworkTracking: boolean
  enableUserInteractionTracking: boolean
  enableAudioPerformanceTracking: boolean
  sampleRate: number // 0-1, percentage of events to track
  maxMetricsPerSession: number
  flushInterval: number // milliseconds
  enableRemoteReporting: boolean
  remoteEndpoint?: string
  apiKey?: string
  enableLocalStorage: boolean
  retentionDays: number
}

export interface PerformanceReport {
  sessionId: string
  startTime: Date
  endTime: Date
  duration: number
  metrics: PerformanceMetric[]
  summary: {
    totalMetrics: number
    averageResponseTime: number
    memoryUsage: {
      peak: number
      average: number
      current: number
    }
    networkRequests: {
      total: number
      successful: number
      failed: number
      averageLatency: number
    }
    userInteractions: {
      total: number
      categories: Record<string, number>
    }
    audioPerformance: {
      averageLatency: number
      bufferUnderruns: number
      crossfadeSuccess: number
    }
  }
}

export class PerformanceMonitor {
  private config: PerformanceConfig
  private metrics: PerformanceMetric[] = []
  private sessionId: string
  private startTime: Date
  private observers: Map<string, PerformanceObserver> = new Map()
  private isInitialized: boolean = false
  private flushTimer: NodeJS.Timeout | null = null
  private memoryObserver: NodeJS.Timeout | null = null

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enableRealTimeMonitoring: true,
      enableMemoryTracking: true,
      enableNetworkTracking: true,
      enableUserInteractionTracking: true,
      enableAudioPerformanceTracking: true,
      sampleRate: 1.0,
      maxMetricsPerSession: 10000,
      flushInterval: 30000, // 30 seconds
      enableRemoteReporting: false,
      enableLocalStorage: true,
      retentionDays: 7,
      ...config,
    }

    this.sessionId = this.generateSessionId()
    this.startTime = new Date()
  }

  /**
   * Initialize the performance monitor
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Set up performance observers
      this.setupPerformanceObservers()

      // Set up memory monitoring
      if (this.config.enableMemoryTracking) {
        this.setupMemoryMonitoring()
      }

      // Set up network monitoring
      if (this.config.enableNetworkTracking) {
        this.setupNetworkMonitoring()
      }

      // Set up user interaction tracking
      if (this.config.enableUserInteractionTracking) {
        this.setupUserInteractionTracking()
      }

      // Set up audio performance tracking
      if (this.config.enableAudioPerformanceTracking) {
        this.setupAudioPerformanceTracking()
      }

      // Start flush timer
      if (this.config.enableRealTimeMonitoring) {
        this.startFlushTimer()
      }

      // Load existing metrics from localStorage
      if (this.config.enableLocalStorage) {
        await this.loadMetricsFromStorage()
      }

      this.isInitialized = true
      this.trackMetric(MetricType.COUNTER, PerformanceCategory.SYSTEM, 'monitor_initialized', 1, 'count')

    } catch (error) {
      errorHandler.handleError(error, {
        component: 'PerformanceMonitor',
        action: 'initialize',
      })
      throw error
    }
  }

  /**
   * Track a performance metric
   */
  trackMetric(
    type: MetricType,
    category: PerformanceCategory,
    name: string,
    value: number,
    unit: string = 'ms',
    context?: Partial<PerformanceMetric['context']>
  ): void {
    if (!this.shouldSample()) return

    try {
      const metric: PerformanceMetric = {
        id: this.generateId(),
        type,
        category,
        name,
        value,
        unit,
        timestamp: new Date(),
        context: {
          sessionId: this.sessionId,
          ...context,
        },
      }

      this.metrics.push(metric)

      // Limit metrics per session
      if (this.metrics.length > this.config.maxMetricsPerSession) {
        this.metrics = this.metrics.slice(-this.config.maxMetricsPerSession)
      }

      // Save to localStorage if enabled
      if (this.config.enableLocalStorage) {
        this.saveMetricsToStorage()
      }

    } catch (error) {
      errorHandler.handleError(error, {
        component: 'PerformanceMonitor',
        action: 'trackMetric',
        metadata: { metricName: name, metricType: type },
      })
    }
  }

  /**
   * Track timing metric
   */
  trackTiming(
    category: PerformanceCategory,
    name: string,
    startTime: number,
    endTime?: number,
    context?: Partial<PerformanceMetric['context']>
  ): void {
    const duration = (endTime || performance.now()) - startTime
    this.trackMetric(MetricType.TIMING, category, name, duration, 'ms', context)
  }

  /**
   * Track counter metric
   */
  trackCounter(
    category: PerformanceCategory,
    name: string,
    increment: number = 1,
    context?: Partial<PerformanceMetric['context']>
  ): void {
    this.trackMetric(MetricType.COUNTER, category, name, increment, 'count', context)
  }

  /**
   * Track gauge metric
   */
  trackGauge(
    category: PerformanceCategory,
    name: string,
    value: number,
    unit: string = 'unit',
    context?: Partial<PerformanceMetric['context']>
  ): void {
    this.trackMetric(MetricType.GAUGE, category, name, value, unit, context)
  }

  /**
   * Track user interaction
   */
  trackUserInteraction(
    action: string,
    component: string,
    duration?: number,
    metadata?: Record<string, any>
  ): void {
    this.trackMetric(
      MetricType.TIMING,
      PerformanceCategory.USER_INTERACTION,
      `user_interaction_${action}`,
      duration || 0,
      'ms',
      {
        component,
        action,
        metadata,
      }
    )
  }

  /**
   * Track audio performance
   */
  trackAudioPerformance(
    metric: string,
    value: number,
    unit: string = 'ms',
    context?: Partial<PerformanceMetric['context']>
  ): void {
    this.trackMetric(
      MetricType.TIMING,
      PerformanceCategory.AUDIO,
      `audio_${metric}`,
      value,
      unit,
      context
    )
  }

  /**
   * Track network request
   */
  trackNetworkRequest(
    url: string,
    method: string,
    duration: number,
    status: number,
    size?: number
  ): void {
    this.trackMetric(
      MetricType.TIMING,
      PerformanceCategory.NETWORK,
      'network_request',
      duration,
      'ms',
      {
        action: 'network_request',
        metadata: {
          url,
          method,
          status,
          size,
        },
      }
    )

    // Track success/failure
    this.trackCounter(
      PerformanceCategory.NETWORK,
      status >= 200 && status < 300 ? 'network_success' : 'network_error',
      1,
      {
        action: 'network_request',
        metadata: { status },
      }
    )
  }

  /**
   * Track memory usage
   */
  trackMemoryUsage(): void {
    if (typeof performance === 'undefined' || !performance.memory) return

    const memory = performance.memory
    this.trackGauge(PerformanceCategory.MEMORY, 'memory_used', memory.usedJSHeapSize, 'bytes')
    this.trackGauge(PerformanceCategory.MEMORY, 'memory_total', memory.totalJSHeapSize, 'bytes')
    this.trackGauge(PerformanceCategory.MEMORY, 'memory_limit', memory.jsHeapSizeLimit, 'bytes')
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): PerformanceReport {
    const endTime = new Date()
    const duration = endTime.getTime() - this.startTime.getTime()

    // Calculate summary statistics
    const timingMetrics = this.metrics.filter(m => m.type === MetricType.TIMING)
    const networkMetrics = this.metrics.filter(m => m.category === PerformanceCategory.NETWORK)
    const userInteractionMetrics = this.metrics.filter(m => m.category === PerformanceCategory.USER_INTERACTION)
    const audioMetrics = this.metrics.filter(m => m.category === PerformanceCategory.AUDIO)
    const memoryMetrics = this.metrics.filter(m => m.category === PerformanceCategory.MEMORY)

    const averageResponseTime = timingMetrics.length > 0
      ? timingMetrics.reduce((sum, m) => sum + m.value, 0) / timingMetrics.length
      : 0

    const networkRequests = networkMetrics.filter(m => m.name === 'network_request')
    const successfulRequests = networkMetrics.filter(m => m.name === 'network_success')
    const failedRequests = networkMetrics.filter(m => m.name === 'network_error')

    const averageNetworkLatency = networkRequests.length > 0
      ? networkRequests.reduce((sum, m) => sum + m.value, 0) / networkRequests.length
      : 0

    const userInteractionCategories = userInteractionMetrics.reduce((acc, m) => {
      const category = m.context.action || 'unknown'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const audioLatencyMetrics = audioMetrics.filter(m => m.name.includes('latency'))
    const averageAudioLatency = audioLatencyMetrics.length > 0
      ? audioLatencyMetrics.reduce((sum, m) => sum + m.value, 0) / audioLatencyMetrics.length
      : 0

    const bufferUnderruns = audioMetrics.filter(m => m.name.includes('buffer_underrun')).length
    const crossfadeSuccess = audioMetrics.filter(m => m.name.includes('crossfade_success')).length

    const memoryUsageMetrics = memoryMetrics.filter(m => m.name === 'memory_used')
    const peakMemory = memoryUsageMetrics.length > 0
      ? Math.max(...memoryUsageMetrics.map(m => m.value))
      : 0
    const averageMemory = memoryUsageMetrics.length > 0
      ? memoryUsageMetrics.reduce((sum, m) => sum + m.value, 0) / memoryUsageMetrics.length
      : 0
    const currentMemory = memoryUsageMetrics.length > 0
      ? memoryUsageMetrics[memoryUsageMetrics.length - 1].value
      : 0

    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime,
      duration,
      metrics: [...this.metrics],
      summary: {
        totalMetrics: this.metrics.length,
        averageResponseTime,
        memoryUsage: {
          peak: peakMemory,
          average: averageMemory,
          current: currentMemory,
        },
        networkRequests: {
          total: networkRequests.length,
          successful: successfulRequests.length,
          failed: failedRequests.length,
          averageLatency: averageNetworkLatency,
        },
        userInteractions: {
          total: userInteractionMetrics.length,
          categories: userInteractionCategories,
        },
        audioPerformance: {
          averageLatency: averageAudioLatency,
          bufferUnderruns,
          crossfadeSuccess,
        },
      },
    }
  }

  /**
   * Get metrics with optional filtering
   */
  getMetrics(filters?: {
    type?: MetricType
    category?: PerformanceCategory
    name?: string
    startTime?: Date
    endTime?: Date
    limit?: number
  }): PerformanceMetric[] {
    let filteredMetrics = [...this.metrics]

    if (filters) {
      if (filters.type) {
        filteredMetrics = filteredMetrics.filter(m => m.type === filters.type)
      }
      if (filters.category) {
        filteredMetrics = filteredMetrics.filter(m => m.category === filters.category)
      }
      if (filters.name) {
        filteredMetrics = filteredMetrics.filter(m => m.name === filters.name)
      }
      if (filters.startTime) {
        filteredMetrics = filteredMetrics.filter(m => m.timestamp >= filters.startTime!)
      }
      if (filters.endTime) {
        filteredMetrics = filteredMetrics.filter(m => m.timestamp <= filters.endTime!)
      }
      if (filters.limit) {
        filteredMetrics = filteredMetrics.slice(-filters.limit)
      }
    }

    return filteredMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Clear metrics
   */
  async clearMetrics(): Promise<void> {
    this.metrics = []
    
    if (this.config.enableLocalStorage) {
      try {
        localStorage.removeItem('performance_metrics')
      } catch (error) {
        errorHandler.handleError(error, {
          component: 'PerformanceMonitor',
          action: 'clearMetrics',
        })
      }
    }
  }

  /**
   * Export metrics
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    const report = this.getPerformanceReport()
    
    if (format === 'json') {
      return JSON.stringify(report, null, 2)
    } else {
      // CSV format
      const headers = ['timestamp', 'type', 'category', 'name', 'value', 'unit', 'component', 'action']
      const csvRows = [headers.join(',')]
      
      report.metrics.forEach(metric => {
        const row = [
          metric.timestamp.toISOString(),
          metric.type,
          metric.category,
          metric.name,
          metric.value,
          metric.unit,
          `"${metric.context.component || ''}"`,
          `"${metric.context.action || ''}"`
        ]
        csvRows.push(row.join(','))
      })
      
      return csvRows.join('\n')
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // Restart flush timer if interval changed
    if (newConfig.flushInterval) {
      this.stopFlushTimer()
      this.startFlushTimer()
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): PerformanceConfig {
    return { ...this.config }
  }

  /**
   * Get session information
   */
  getSessionInfo(): {
    sessionId: string
    startTime: Date
    duration: number
    metricCount: number
  } {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      duration: Date.now() - this.startTime.getTime(),
      metricCount: this.metrics.length,
    }
  }

  /**
   * Set up performance observers
   */
  private setupPerformanceObservers(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return

    try {
      // Navigation timing
      const navObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming
            this.trackTiming(
              PerformanceCategory.SYSTEM,
              'page_load',
              navEntry.fetchStart,
              navEntry.loadEventEnd
            )
          }
        })
      })
      navObserver.observe({ entryTypes: ['navigation'] })
      this.observers.set('navigation', navObserver)

      // Resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming
            this.trackTiming(
              PerformanceCategory.NETWORK,
              'resource_load',
              resourceEntry.startTime,
              resourceEntry.responseEnd
            )
          }
        })
      })
      resourceObserver.observe({ entryTypes: ['resource'] })
      this.observers.set('resource', resourceObserver)

      // Paint timing
      const paintObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'paint') {
            this.trackTiming(
              PerformanceCategory.RENDERING,
              `paint_${entry.name}`,
              0,
              entry.startTime
            )
          }
        })
      })
      paintObserver.observe({ entryTypes: ['paint'] })
      this.observers.set('paint', paintObserver)

    } catch (error) {
      errorHandler.handleError(error, {
        component: 'PerformanceMonitor',
        action: 'setupPerformanceObservers',
      })
    }
  }

  /**
   * Set up memory monitoring
   */
  private setupMemoryMonitoring(): void {
    if (typeof window === 'undefined') return

    this.memoryObserver = setInterval(() => {
      this.trackMemoryUsage()
    }, 10000) // Every 10 seconds
  }

  /**
   * Set up network monitoring
   */
  private setupNetworkMonitoring(): void {
    if (typeof window === 'undefined') return

    // Override fetch to track network requests
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const startTime = performance.now()
      const url = args[0]?.toString() || 'unknown'
      const method = (args[1]?.method || 'GET').toUpperCase()

      try {
        const response = await originalFetch(...args)
        const endTime = performance.now()
        
        this.trackNetworkRequest(
          url,
          method,
          endTime - startTime,
          response.status,
          response.headers.get('content-length') ? parseInt(response.headers.get('content-length')!) : undefined
        )

        return response
      } catch (error) {
        const endTime = performance.now()
        this.trackNetworkRequest(url, method, endTime - startTime, 0)
        throw error
      }
    }
  }

  /**
   * Set up user interaction tracking
   */
  private setupUserInteractionTracking(): void {
    if (typeof window === 'undefined') return

    const trackInteraction = (event: Event) => {
      const target = event.target as HTMLElement
      if (!target) return

      const component = target.tagName.toLowerCase()
      const action = event.type
      const startTime = performance.now()

      // Track interaction start
      this.trackUserInteraction(action, component, 0, {
        target: target.className || target.id || 'unknown',
      })

      // Track interaction end after a short delay
      setTimeout(() => {
        const endTime = performance.now()
        this.trackUserInteraction(`${action}_end`, component, endTime - startTime)
      }, 100)
    }

    // Track common user interactions
    const events = ['click', 'keydown', 'scroll', 'resize', 'focus', 'blur']
    events.forEach(eventType => {
      document.addEventListener(eventType, trackInteraction, { passive: true })
    })
  }

  /**
   * Set up audio performance tracking
   */
  private setupAudioPerformanceTracking(): void {
    // This would integrate with the audio engine to track performance metrics
    // For now, we'll set up a basic structure
    this.trackCounter(PerformanceCategory.AUDIO, 'audio_tracking_initialized', 1)
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }

    this.flushTimer = setInterval(() => {
      this.flushMetrics()
    }, this.config.flushInterval)
  }

  /**
   * Stop flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }

  /**
   * Flush metrics to remote endpoint
   */
  private async flushMetrics(): Promise<void> {
    if (!this.config.enableRemoteReporting || !this.config.remoteEndpoint || !this.config.apiKey) {
      return
    }

    try {
      const report = this.getPerformanceReport()
      
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(report),
      })

      // Clear metrics after successful flush
      this.metrics = []

    } catch (error) {
      errorHandler.handleError(error, {
        component: 'PerformanceMonitor',
        action: 'flushMetrics',
      })
    }
  }

  /**
   * Save metrics to localStorage
   */
  private saveMetricsToStorage(): void {
    try {
      const metricsToSave = this.metrics.slice(-this.config.maxMetricsPerSession)
      localStorage.setItem('performance_metrics', JSON.stringify(metricsToSave))
    } catch (error) {
      errorHandler.handleError(error, {
        component: 'PerformanceMonitor',
        action: 'saveMetricsToStorage',
      })
    }
  }

  /**
   * Load metrics from localStorage
   */
  private async loadMetricsFromStorage(): Promise<void> {
    try {
      const storedMetrics = localStorage.getItem('performance_metrics')
      if (storedMetrics) {
        const parsedMetrics = JSON.parse(storedMetrics)
        this.metrics = parsedMetrics.map((metric: any) => ({
          ...metric,
          timestamp: new Date(metric.timestamp),
        }))
      }
    } catch (error) {
      errorHandler.handleError(error, {
        component: 'PerformanceMonitor',
        action: 'loadMetricsFromStorage',
      })
    }
  }

  /**
   * Check if we should sample this event
   */
  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.stopFlushTimer()

    if (this.memoryObserver) {
      clearInterval(this.memoryObserver)
      this.memoryObserver = null
    }

    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()

    this.isInitialized = false
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()
