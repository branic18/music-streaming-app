/**
 * Simplified unit tests for error handler
 */

import { ErrorHandler, ErrorCategory, ErrorSeverity } from './error-handler'
import type { AppError, LogEntry } from './error-handler'

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}

// Mock global objects
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

Object.defineProperty(global, 'window', {
  value: {
    navigator: { userAgent: 'test-user-agent' },
    location: { href: 'http://test.com' },
    addEventListener: jest.fn(),
  },
  writable: true,
})

Object.defineProperty(global, 'fetch', {
  value: jest.fn(() => Promise.resolve({ ok: true })),
  writable: true,
})

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler

  beforeEach(() => {
    jest.clearAllMocks()
    errorHandler = new ErrorHandler({
      enableConsoleLogging: false,
      enableRemoteLogging: false,
      enableLocalStorage: true,
      maxLogEntries: 100,
      logRetentionDays: 1,
    })
  })

  afterEach(() => {
    errorHandler['logs'] = []
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', async () => {
      await errorHandler.initialize()
      
      const config = errorHandler.getConfig()
      
      expect(config.enableConsoleLogging).toBe(false)
      expect(config.enableRemoteLogging).toBe(false)
      expect(config.enableLocalStorage).toBe(true)
      expect(config.maxLogEntries).toBe(100)
      expect(config.logRetentionDays).toBe(1)
    })

    it('should accept custom configuration', () => {
      const customHandler = new ErrorHandler({
        enableConsoleLogging: true,
        enableRemoteLogging: true,
        maxLogEntries: 500,
        remoteEndpoint: 'https://api.example.com/logs',
        apiKey: 'test-api-key',
      })

      const config = customHandler.getConfig()
      
      expect(config.enableConsoleLogging).toBe(true)
      expect(config.enableRemoteLogging).toBe(true)
      expect(config.maxLogEntries).toBe(500)
      expect(config.remoteEndpoint).toBe('https://api.example.com/logs')
      expect(config.apiKey).toBe('test-api-key')
    })
  })

  describe('Error Creation', () => {
    it('should create application error', () => {
      const error = errorHandler.createError(
        'Test error message',
        'TEST_ERROR',
        ErrorCategory.UI,
        ErrorSeverity.MEDIUM
      )

      expect(error.message).toBe('Test error message')
      expect(error.code).toBe('TEST_ERROR')
      expect(error.category).toBe(ErrorCategory.UI)
      expect(error.severity).toBe(ErrorSeverity.MEDIUM)
      expect(error.context.timestamp).toBeInstanceOf(Date)
      expect(error.isRetryable).toBeDefined()
      expect(error.maxRetries).toBeDefined()
    })

    it('should create error with original error', () => {
      const originalError = new Error('Original error')
      const appError = errorHandler.createError(
        'Wrapped error',
        'WRAPPED_ERROR',
        ErrorCategory.SYSTEM,
        ErrorSeverity.HIGH,
        originalError
      )

      expect(appError.originalError).toBe(originalError)
    })

    it('should create error with custom context', () => {
      const customContext = {
        component: 'TestComponent',
        action: 'testAction',
        metadata: { test: 'value' },
      }

      const error = errorHandler.createError(
        'Test error',
        'TEST_ERROR',
        ErrorCategory.UI,
        ErrorSeverity.LOW,
        undefined,
        customContext
      )

      expect(error.context.component).toBe('TestComponent')
      expect(error.context.action).toBe('testAction')
      expect(error.context.metadata).toEqual({ test: 'value' })
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      await errorHandler.initialize()
    })

    it('should handle application error', async () => {
      const appError = errorHandler.createError(
        'Test error',
        'TEST_ERROR',
        ErrorCategory.UI,
        ErrorSeverity.MEDIUM
      )

      await errorHandler.handleError(appError)

      const logs = errorHandler.getLogs()
      const errorLogs = logs.filter(log => log.message === 'Test error')
      expect(errorLogs).toHaveLength(1)
      expect(errorLogs[0].message).toBe('Test error')
      expect(errorLogs[0].category).toBe(ErrorCategory.UI)
      expect(errorLogs[0].severity).toBe(ErrorSeverity.MEDIUM)
    })

    it('should handle regular error', async () => {
      const regularError = new Error('Regular error')

      await errorHandler.handleError(regularError)

      const logs = errorHandler.getLogs()
      const errorLogs = logs.filter(log => log.message === 'Regular error')
      expect(errorLogs).toHaveLength(1)
      expect(errorLogs[0].message).toBe('Regular error')
      expect(errorLogs[0].category).toBe(ErrorCategory.UNKNOWN)
      expect(errorLogs[0].severity).toBe(ErrorSeverity.MEDIUM)
    })

    it('should handle error with context', async () => {
      const error = new Error('Test error with context')
      const context = {
        component: 'TestComponent',
        action: 'testAction',
      }

      await errorHandler.handleError(error, context)

      const logs = errorHandler.getLogs()
      const errorLogs = logs.filter(log => log.message === 'Test error with context')
      expect(errorLogs).toHaveLength(1)
      // Check that the error was logged with the correct message
      expect(errorLogs[0].message).toBe('Test error with context')
      expect(errorLogs[0].category).toBe(ErrorCategory.UNKNOWN)
    })
  })

  describe('Logging', () => {
    beforeEach(async () => {
      await errorHandler.initialize()
    })

    it('should log different levels', async () => {
      await errorHandler.log('debug', 'Debug message', ErrorCategory.SYSTEM, ErrorSeverity.LOW)
      await errorHandler.log('info', 'Info message', ErrorCategory.SYSTEM, ErrorSeverity.LOW)
      await errorHandler.log('warn', 'Warning message', ErrorCategory.SYSTEM, ErrorSeverity.MEDIUM)
      await errorHandler.log('error', 'Error message', ErrorCategory.SYSTEM, ErrorSeverity.HIGH)

      const logs = errorHandler.getLogs()
      const testLogs = logs.filter(log => 
        ['Debug message', 'Info message', 'Warning message', 'Error message'].includes(log.message)
      )
      expect(testLogs).toHaveLength(4)
      
      // Check that all levels are present (order may vary due to timing)
      const levels = testLogs.map(log => log.level)
      expect(levels).toContain('debug')
      expect(levels).toContain('info')
      expect(levels).toContain('warn')
      expect(levels).toContain('error')
    })

    it('should log with metadata', async () => {
      const metadata = { userId: '123', action: 'test' }
      
      await errorHandler.log('info', 'Test message', ErrorCategory.SYSTEM, ErrorSeverity.LOW, metadata)

      const logs = errorHandler.getLogs()
      expect(logs[0].metadata).toEqual(metadata)
    })

    it('should save logs to localStorage', async () => {
      await errorHandler.log('info', 'Test message')

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'app_logs',
        expect.stringContaining('Test message')
      )
    })
  })

  describe('Log Filtering', () => {
    beforeEach(async () => {
      await errorHandler.initialize()
      
      // Add test logs
      await errorHandler.log('info', 'Info message', ErrorCategory.UI, ErrorSeverity.LOW)
      await errorHandler.log('error', 'Error message', ErrorCategory.NETWORK, ErrorSeverity.HIGH)
      await errorHandler.log('warn', 'Warning message', ErrorCategory.STORAGE, ErrorSeverity.MEDIUM)
    })

    it('should filter logs by level', () => {
      const errorLogs = errorHandler.getLogs({ level: 'error' })
      expect(errorLogs).toHaveLength(1)
      expect(errorLogs[0].message).toBe('Error message')
    })

    it('should filter logs by category', () => {
      const uiLogs = errorHandler.getLogs({ category: ErrorCategory.UI })
      expect(uiLogs).toHaveLength(1)
      expect(uiLogs[0].message).toBe('Info message')
    })

    it('should filter logs by severity', () => {
      const highSeverityLogs = errorHandler.getLogs({ severity: ErrorSeverity.HIGH })
      expect(highSeverityLogs).toHaveLength(1)
      expect(highSeverityLogs[0].message).toBe('Error message')
    })

    it('should limit log results', () => {
      const limitedLogs = errorHandler.getLogs({ limit: 2 })
      expect(limitedLogs).toHaveLength(2)
    })
  })

  describe('Error Statistics', () => {
    beforeEach(async () => {
      await errorHandler.initialize()
      
      // Add test logs
      await errorHandler.log('error', 'Error 1', ErrorCategory.UI, ErrorSeverity.MEDIUM)
      await errorHandler.log('error', 'Error 2', ErrorCategory.NETWORK, ErrorSeverity.HIGH)
      await errorHandler.log('fatal', 'Fatal error', ErrorCategory.SYSTEM, ErrorSeverity.CRITICAL)
      await errorHandler.log('info', 'Info message', ErrorCategory.UI, ErrorSeverity.LOW)
    })

    it('should calculate error statistics', () => {
      const stats = errorHandler.getErrorStatistics()
      
      expect(stats.totalErrors).toBe(3) // error + error + fatal
      expect(stats.criticalErrors).toBe(1)
      expect(stats.errorsByCategory[ErrorCategory.UI]).toBe(1)
      expect(stats.errorsByCategory[ErrorCategory.NETWORK]).toBe(1)
      expect(stats.errorsByCategory[ErrorCategory.SYSTEM]).toBe(1)
      expect(stats.errorsBySeverity[ErrorSeverity.MEDIUM]).toBe(1)
      expect(stats.errorsBySeverity[ErrorSeverity.HIGH]).toBe(1)
      expect(stats.errorsBySeverity[ErrorSeverity.CRITICAL]).toBe(1)
    })
  })

  describe('Log Export', () => {
    beforeEach(async () => {
      await errorHandler.initialize()
      
      await errorHandler.log('info', 'Test message', ErrorCategory.SYSTEM, ErrorSeverity.LOW)
    })

    it('should export logs as JSON', () => {
      const jsonExport = errorHandler.exportLogs('json')
      const parsed = JSON.parse(jsonExport)
      
      expect(Array.isArray(parsed)).toBe(true)
      // Check that the test message is in the exported logs
      const testLog = parsed.find((log: any) => log.message === 'Test message')
      expect(testLog).toBeDefined()
      expect(testLog.message).toBe('Test message')
    })

    it('should export logs as CSV', () => {
      const csvExport = errorHandler.exportLogs('csv')
      
      expect(csvExport).toContain('timestamp,level,category,severity,message')
      expect(csvExport).toContain('Test message')
    })
  })

  describe('Event Listeners', () => {
    it('should add and remove error listeners', () => {
      const listener = jest.fn()
      
      errorHandler.addErrorListener('test-listener', listener)
      expect(errorHandler['errorListeners'].has('test-listener')).toBe(true)
      
      errorHandler.removeErrorListener('test-listener')
      expect(errorHandler['errorListeners'].has('test-listener')).toBe(false)
    })

    it('should notify error listeners', async () => {
      await errorHandler.initialize()
      
      const listener = jest.fn()
      errorHandler.addErrorListener('test-listener', listener)
      
      const appError = errorHandler.createError('Test error', 'TEST_ERROR')
      await errorHandler.handleError(appError)
      
      expect(listener).toHaveBeenCalledWith(appError)
    })
  })

  describe('Configuration', () => {
    it('should update configuration', () => {
      errorHandler.updateConfig({
        maxLogEntries: 500,
        enableRemoteLogging: true,
      })

      const config = errorHandler.getConfig()
      expect(config.maxLogEntries).toBe(500)
      expect(config.enableRemoteLogging).toBe(true)
    })

    it('should get current configuration', () => {
      const config = errorHandler.getConfig()
      
      expect(config).toBeDefined()
      expect(typeof config.maxLogEntries).toBe('number')
      expect(typeof config.enableConsoleLogging).toBe('boolean')
    })
  })

  describe('Log Cleanup', () => {
    it('should clear logs', async () => {
      await errorHandler.initialize()
      
      await errorHandler.log('info', 'Test message')
      const logsBeforeClear = errorHandler.getLogs()
      expect(logsBeforeClear.length).toBeGreaterThan(0)
      
      await errorHandler.clearLogs()
      expect(errorHandler.getLogs()).toHaveLength(0)
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('app_logs')
    })
  })

  describe('Error Retry Logic', () => {
    it('should determine if error is retryable', () => {
      const networkError = errorHandler.createError(
        'Network error',
        'NETWORK_ERROR',
        ErrorCategory.NETWORK
      )
      expect(networkError.isRetryable).toBe(true)

      const uiError = errorHandler.createError(
        'UI error',
        'UI_ERROR',
        ErrorCategory.UI
      )
      expect(uiError.isRetryable).toBe(false)
    })

    it('should set max retries based on category and severity', () => {
      const networkError = errorHandler.createError(
        'Network error',
        'NETWORK_ERROR',
        ErrorCategory.NETWORK,
        ErrorSeverity.MEDIUM
      )
      expect(networkError.maxRetries).toBe(3)

      const criticalError = errorHandler.createError(
        'Critical error',
        'CRITICAL_ERROR',
        ErrorCategory.SYSTEM,
        ErrorSeverity.CRITICAL
      )
      expect(criticalError.maxRetries).toBe(0)
    })
  })
})
