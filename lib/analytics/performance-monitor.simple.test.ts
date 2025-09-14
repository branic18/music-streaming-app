/**
 * Simplified unit tests for performance monitor
 */

import { PerformanceMonitor, MetricType, PerformanceCategory } from './performance-monitor'

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000,
  },
}

// Mock PerformanceObserver
class MockPerformanceObserver {
  constructor(public callback: (list: any) => void) {}
  observe(options: any) {}
  disconnect() {}
}

// Mock global objects
Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
})

Object.defineProperty(global, 'PerformanceObserver', {
  value: MockPerformanceObserver,
  writable: true,
})

Object.defineProperty(global, 'window', {
  value: {
    fetch: jest.fn(() => Promise.resolve({
      status: 200,
      headers: {
        get: jest.fn(() => '1024'),
      },
    })),
    addEventListener: jest.fn(),
  },
  writable: true,
})

Object.defineProperty(global, 'document', {
  value: {
    addEventListener: jest.fn(),
  },
  writable: true,
})

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor

  beforeEach(() => {
    jest.clearAllMocks()
    performanceMonitor = new PerformanceMonitor({
      enableRealTimeMonitoring: false,
      enableMemoryTracking: false,
      enableNetworkTracking: false,
      enableUserInteractionTracking: false,
      enableAudioPerformanceTracking: false,
      enableLocalStorage: true,
      maxMetricsPerSession: 100,
    })
  })

  afterEach(() => {
    performanceMonitor.destroy()
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', async () => {
      await performanceMonitor.initialize()
      
      const config = performanceMonitor.getConfig()
      
      expect(config.enableRealTimeMonitoring).toBe(false)
      expect(config.enableMemoryTracking).toBe(false)
      expect(config.enableNetworkTracking).toBe(false)
      expect(config.enableUserInteractionTracking).toBe(false)
      expect(config.enableAudioPerformanceTracking).toBe(false)
      expect(config.sampleRate).toBe(1.0)
      expect(config.maxMetricsPerSession).toBe(100)
    })

    it('should accept custom configuration', () => {
      const customMonitor = new PerformanceMonitor({
        enableRealTimeMonitoring: true,
        enableMemoryTracking: true,
        sampleRate: 0.5,
        maxMetricsPerSession: 500,
        flushInterval: 60000,
        enableRemoteReporting: true,
        remoteEndpoint: 'https://api.example.com/metrics',
        apiKey: 'test-api-key',
      })

      const config = customMonitor.getConfig()
      
      expect(config.enableRealTimeMonitoring).toBe(true)
      expect(config.enableMemoryTracking).toBe(true)
      expect(config.sampleRate).toBe(0.5)
      expect(config.maxMetricsPerSession).toBe(500)
      expect(config.flushInterval).toBe(60000)
      expect(config.enableRemoteReporting).toBe(true)
      expect(config.remoteEndpoint).toBe('https://api.example.com/metrics')
      expect(config.apiKey).toBe('test-api-key')
    })
  })

  describe('Metric Tracking', () => {
    beforeEach(async () => {
      await performanceMonitor.initialize()
    })

    it('should track timing metric', () => {
      performanceMonitor.trackTiming(
        PerformanceCategory.UI,
        'component_render',
        100,
        150
      )

      const metrics = performanceMonitor.getMetrics()
      const timingMetrics = metrics.filter(m => m.name === 'component_render')
      
      expect(timingMetrics).toHaveLength(1)
      expect(timingMetrics[0].type).toBe(MetricType.TIMING)
      expect(timingMetrics[0].category).toBe(PerformanceCategory.UI)
      expect(timingMetrics[0].value).toBe(50)
      expect(timingMetrics[0].unit).toBe('ms')
    })

    it('should track counter metric', () => {
      performanceMonitor.trackCounter(
        PerformanceCategory.USER_INTERACTION,
        'button_clicks',
        1
      )

      const metrics = performanceMonitor.getMetrics()
      const counterMetrics = metrics.filter(m => m.name === 'button_clicks')
      
      expect(counterMetrics).toHaveLength(1)
      expect(counterMetrics[0].type).toBe(MetricType.COUNTER)
      expect(counterMetrics[0].category).toBe(PerformanceCategory.USER_INTERACTION)
      expect(counterMetrics[0].value).toBe(1)
      expect(counterMetrics[0].unit).toBe('count')
    })

    it('should track gauge metric', () => {
      performanceMonitor.trackGauge(
        PerformanceCategory.MEMORY,
        'memory_usage',
        1024,
        'bytes'
      )

      const metrics = performanceMonitor.getMetrics()
      const gaugeMetrics = metrics.filter(m => m.name === 'memory_usage')
      
      expect(gaugeMetrics).toHaveLength(1)
      expect(gaugeMetrics[0].type).toBe(MetricType.GAUGE)
      expect(gaugeMetrics[0].category).toBe(PerformanceCategory.MEMORY)
      expect(gaugeMetrics[0].value).toBe(1024)
      expect(gaugeMetrics[0].unit).toBe('bytes')
    })

    it('should track user interaction', () => {
      performanceMonitor.trackUserInteraction(
        'click',
        'button',
        50,
        { target: 'play-button' }
      )

      const metrics = performanceMonitor.getMetrics()
      const interactionMetrics = metrics.filter(m => m.name === 'user_interaction_click')
      
      expect(interactionMetrics).toHaveLength(1)
      expect(interactionMetrics[0].type).toBe(MetricType.TIMING)
      expect(interactionMetrics[0].category).toBe(PerformanceCategory.USER_INTERACTION)
      expect(interactionMetrics[0].context.component).toBe('button')
      expect(interactionMetrics[0].context.action).toBe('click')
      expect(interactionMetrics[0].context.metadata?.target).toBe('play-button')
    })

    it('should track audio performance', () => {
      performanceMonitor.trackAudioPerformance(
        'latency',
        25,
        'ms',
        { component: 'audio-engine' }
      )

      const metrics = performanceMonitor.getMetrics()
      const audioMetrics = metrics.filter(m => m.name === 'audio_latency')
      
      expect(audioMetrics).toHaveLength(1)
      expect(audioMetrics[0].type).toBe(MetricType.TIMING)
      expect(audioMetrics[0].category).toBe(PerformanceCategory.AUDIO)
      expect(audioMetrics[0].value).toBe(25)
      expect(audioMetrics[0].unit).toBe('ms')
      expect(audioMetrics[0].context.component).toBe('audio-engine')
    })

    it('should track network request', () => {
      performanceMonitor.trackNetworkRequest(
        'https://api.example.com/tracks',
        'GET',
        200,
        200,
        1024
      )

      const metrics = performanceMonitor.getMetrics()
      const networkMetrics = metrics.filter(m => m.category === PerformanceCategory.NETWORK)
      
      expect(networkMetrics).toHaveLength(2) // One for timing, one for success counter
      
      const timingMetric = networkMetrics.find(m => m.name === 'network_request')
      expect(timingMetric).toBeDefined()
      expect(timingMetric?.value).toBe(200)
      expect(timingMetric?.context.metadata?.url).toBe('https://api.example.com/tracks')
      expect(timingMetric?.context.metadata?.method).toBe('GET')
      expect(timingMetric?.context.metadata?.status).toBe(200)
      expect(timingMetric?.context.metadata?.size).toBe(1024)

      const successMetric = networkMetrics.find(m => m.name === 'network_success')
      expect(successMetric).toBeDefined()
      expect(successMetric?.value).toBe(1)
    })

    it('should track memory usage', () => {
      performanceMonitor.trackMemoryUsage()

      const metrics = performanceMonitor.getMetrics()
      const memoryMetrics = metrics.filter(m => m.category === PerformanceCategory.MEMORY)
      
      expect(memoryMetrics).toHaveLength(3) // used, total, limit
      expect(memoryMetrics.some(m => m.name === 'memory_used')).toBe(true)
      expect(memoryMetrics.some(m => m.name === 'memory_total')).toBe(true)
      expect(memoryMetrics.some(m => m.name === 'memory_limit')).toBe(true)
    })
  })

  describe('Metric Filtering', () => {
    beforeEach(async () => {
      await performanceMonitor.initialize()
      
      // Add test metrics
      performanceMonitor.trackTiming(PerformanceCategory.UI, 'render', 0, 100)
      performanceMonitor.trackCounter(PerformanceCategory.USER_INTERACTION, 'clicks', 1)
      performanceMonitor.trackGauge(PerformanceCategory.MEMORY, 'usage', 1024)
    })

    it('should filter metrics by type', () => {
      const timingMetrics = performanceMonitor.getMetrics({ type: MetricType.TIMING })
      expect(timingMetrics).toHaveLength(1)
      expect(timingMetrics[0].name).toBe('render')

      const counterMetrics = performanceMonitor.getMetrics({ type: MetricType.COUNTER })
      expect(counterMetrics).toHaveLength(2) // monitor_initialized + clicks
      expect(counterMetrics.some(m => m.name === 'clicks')).toBe(true)
    })

    it('should filter metrics by category', () => {
      const uiMetrics = performanceMonitor.getMetrics({ category: PerformanceCategory.UI })
      expect(uiMetrics).toHaveLength(1)
      expect(uiMetrics[0].name).toBe('render')

      const memoryMetrics = performanceMonitor.getMetrics({ category: PerformanceCategory.MEMORY })
      expect(memoryMetrics).toHaveLength(1)
      expect(memoryMetrics[0].name).toBe('usage')
    })

    it('should filter metrics by name', () => {
      const renderMetrics = performanceMonitor.getMetrics({ name: 'render' })
      expect(renderMetrics).toHaveLength(1)
      expect(renderMetrics[0].type).toBe(MetricType.TIMING)
    })

    it('should limit metric results', () => {
      const limitedMetrics = performanceMonitor.getMetrics({ limit: 2 })
      expect(limitedMetrics).toHaveLength(2)
    })
  })

  describe('Performance Report', () => {
    beforeEach(async () => {
      await performanceMonitor.initialize()
      
      // Add test metrics
      performanceMonitor.trackTiming(PerformanceCategory.UI, 'render', 0, 100)
      performanceMonitor.trackCounter(PerformanceCategory.USER_INTERACTION, 'clicks', 1)
      performanceMonitor.trackNetworkRequest('https://api.example.com', 'GET', 200, 200)
      performanceMonitor.trackAudioPerformance('latency', 25, 'ms')
    })

    it('should generate performance report', () => {
      const report = performanceMonitor.getPerformanceReport()
      
      expect(report.sessionId).toBeDefined()
      expect(report.startTime).toBeInstanceOf(Date)
      expect(report.endTime).toBeInstanceOf(Date)
      expect(report.duration).toBeGreaterThan(0)
      expect(report.metrics).toHaveLength(6) // monitor_initialized, render, clicks, network_request, network_success, audio_latency
      
      expect(report.summary.totalMetrics).toBe(6)
      expect(report.summary.averageResponseTime).toBeGreaterThan(0)
      expect(report.summary.networkRequests.total).toBe(1)
      expect(report.summary.networkRequests.successful).toBe(1)
      expect(report.summary.networkRequests.failed).toBe(0)
      expect(report.summary.userInteractions.total).toBe(1)
      expect(report.summary.audioPerformance.averageLatency).toBe(25)
    })
  })

  describe('Export and Clear', () => {
    beforeEach(async () => {
      await performanceMonitor.initialize()
      
      performanceMonitor.trackCounter(PerformanceCategory.SYSTEM, 'test_metric', 1)
    })

    it('should export metrics as JSON', () => {
      const jsonExport = performanceMonitor.exportMetrics('json')
      const parsed = JSON.parse(jsonExport)
      
      expect(parsed.sessionId).toBeDefined()
      expect(parsed.metrics).toBeDefined()
      expect(parsed.summary).toBeDefined()
      expect(Array.isArray(parsed.metrics)).toBe(true)
    })

    it('should export metrics as CSV', () => {
      const csvExport = performanceMonitor.exportMetrics('csv')
      
      expect(csvExport).toContain('timestamp,type,category,name,value,unit,component,action')
      expect(csvExport).toContain('test_metric')
    })

    it('should clear metrics', async () => {
      const metricsBeforeClear = performanceMonitor.getMetrics()
      expect(metricsBeforeClear.length).toBeGreaterThan(0)
      
      await performanceMonitor.clearMetrics()
      
      expect(performanceMonitor.getMetrics()).toHaveLength(0)
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('performance_metrics')
    })
  })

  describe('Configuration', () => {
    it('should update configuration', () => {
      performanceMonitor.updateConfig({
        sampleRate: 0.5,
        maxMetricsPerSession: 200,
      })

      const config = performanceMonitor.getConfig()
      expect(config.sampleRate).toBe(0.5)
      expect(config.maxMetricsPerSession).toBe(200)
    })

    it('should get current configuration', () => {
      const config = performanceMonitor.getConfig()
      
      expect(config).toBeDefined()
      expect(typeof config.sampleRate).toBe('number')
      expect(typeof config.maxMetricsPerSession).toBe('number')
    })
  })

  describe('Session Information', () => {
    it('should get session information', () => {
      const sessionInfo = performanceMonitor.getSessionInfo()
      
      expect(sessionInfo.sessionId).toBeDefined()
      expect(sessionInfo.startTime).toBeInstanceOf(Date)
      expect(sessionInfo.duration).toBeGreaterThanOrEqual(0)
      expect(sessionInfo.metricCount).toBe(0)
    })
  })

  describe('Sampling', () => {
    it('should respect sample rate', () => {
      const monitor = new PerformanceMonitor({ sampleRate: 0 })
      
      monitor.trackCounter(PerformanceCategory.SYSTEM, 'test', 1)
      
      expect(monitor.getMetrics()).toHaveLength(0)
    })
  })

  describe('Metric Limits', () => {
    it('should limit metrics per session', () => {
      const monitor = new PerformanceMonitor({ maxMetricsPerSession: 2 })
      
      monitor.trackCounter(PerformanceCategory.SYSTEM, 'test1', 1)
      monitor.trackCounter(PerformanceCategory.SYSTEM, 'test2', 1)
      monitor.trackCounter(PerformanceCategory.SYSTEM, 'test3', 1)
      
      const metrics = monitor.getMetrics()
      expect(metrics).toHaveLength(2)
      expect(metrics[0].name).toBe('test2')
      expect(metrics[1].name).toBe('test3')
    })
  })
})
