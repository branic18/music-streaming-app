/**
 * Comprehensive error handling and logging system
 * Provides centralized error management, logging, and user feedback
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  AUDIO = 'audio',
  NETWORK = 'network',
  STORAGE = 'storage',
  UI = 'ui',
  AUTH = 'auth',
  API = 'api',
  VALIDATION = 'validation',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

export interface ErrorContext {
  userId?: string
  sessionId?: string
  timestamp: Date
  userAgent?: string
  url?: string
  component?: string
  action?: string
  metadata?: Record<string, any>
}

export interface AppError extends Error {
  code: string
  severity: ErrorSeverity
  category: ErrorCategory
  context: ErrorContext
  isRetryable: boolean
  retryCount?: number
  maxRetries?: number
  originalError?: Error
}

export interface LogEntry {
  id: string
  timestamp: Date
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  message: string
  category: ErrorCategory
  severity: ErrorSeverity
  context: ErrorContext
  stack?: string
  metadata?: Record<string, any>
}

export interface ErrorHandlerConfig {
  enableConsoleLogging: boolean
  enableRemoteLogging: boolean
  enableLocalStorage: boolean
  maxLogEntries: number
  logRetentionDays: number
  remoteEndpoint?: string
  apiKey?: string
  enableUserFeedback: boolean
  enableErrorReporting: boolean
  enablePerformanceMonitoring: boolean
}

export class ErrorHandler {
  private config: ErrorHandlerConfig
  private logs: LogEntry[] = []
  private errorListeners: Map<string, (error: AppError) => void> = new Map()
  private isInitialized: boolean = false

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableConsoleLogging: true,
      enableRemoteLogging: false,
      enableLocalStorage: true,
      maxLogEntries: 1000,
      logRetentionDays: 7,
      enableUserFeedback: true,
      enableErrorReporting: true,
      enablePerformanceMonitoring: true,
      ...config,
    }
  }

  /**
   * Initialize the error handler
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Set up global error handlers
      this.setupGlobalErrorHandlers()

      // Load existing logs from localStorage
      if (this.config.enableLocalStorage) {
        await this.loadLogsFromStorage()
      }

      // Clean up old logs
      this.cleanupOldLogs()

      this.isInitialized = true
      this.log('info', 'Error handler initialized', ErrorCategory.SYSTEM, ErrorSeverity.LOW)

    } catch (error) {
      console.error('Failed to initialize error handler:', error)
      throw error
    }
  }

  /**
   * Create a new application error
   */
  createError(
    message: string,
    code: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    originalError?: Error,
    context?: Partial<ErrorContext>
  ): AppError {
    const appError: AppError = {
      name: 'AppError',
      message,
      code,
      severity,
      category,
      context: {
        timestamp: new Date(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        ...context,
      },
      isRetryable: this.isRetryableError(category, code),
      maxRetries: this.getMaxRetries(category, severity),
      originalError,
    }

    return appError
  }

  /**
   * Handle an error
   */
  async handleError(error: Error | AppError, context?: Partial<ErrorContext>): Promise<void> {
    try {
      let appError: AppError

      if (this.isAppError(error)) {
        appError = error
        if (context) {
          appError.context = { ...appError.context, ...context }
        }
      } else {
        appError = this.createError(
          error.message,
          'UNKNOWN_ERROR',
          ErrorCategory.UNKNOWN,
          ErrorSeverity.MEDIUM,
          error,
          context
        )
      }

      // Log the error
      await this.logError(appError)

      // Notify listeners
      this.notifyErrorListeners(appError)

      // Handle based on severity
      await this.handleErrorBySeverity(appError)

    } catch (handlerError) {
      console.error('Error in error handler:', handlerError)
    }
  }

  /**
   * Log a message
   */
  async log(
    level: LogEntry['level'],
    message: string,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    severity: ErrorSeverity = ErrorSeverity.LOW,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const logEntry: LogEntry = {
        id: this.generateId(),
        timestamp: new Date(),
        level,
        message,
        category,
        severity,
        context: {
          timestamp: new Date(),
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        },
        metadata,
      }

      // Add to logs array
      this.logs.push(logEntry)

      // Console logging
      if (this.config.enableConsoleLogging) {
        this.logToConsole(logEntry)
      }

      // Local storage
      if (this.config.enableLocalStorage) {
        await this.saveLogsToStorage()
      }

      // Remote logging
      if (this.config.enableRemoteLogging && this.config.remoteEndpoint) {
        await this.sendLogToRemote(logEntry)
      }

      // Clean up if too many logs
      if (this.logs.length > this.config.maxLogEntries) {
        this.logs = this.logs.slice(-this.config.maxLogEntries)
      }

    } catch (error) {
      console.error('Failed to log message:', error)
    }
  }

  /**
   * Get logs with optional filtering
   */
  getLogs(filters?: {
    level?: LogEntry['level']
    category?: ErrorCategory
    severity?: ErrorSeverity
    startDate?: Date
    endDate?: Date
    limit?: number
  }): LogEntry[] {
    let filteredLogs = [...this.logs]

    if (filters) {
      if (filters.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filters.level)
      }
      if (filters.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filters.category)
      }
      if (filters.severity) {
        filteredLogs = filteredLogs.filter(log => log.severity === filters.severity)
      }
      if (filters.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!)
      }
      if (filters.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!)
      }
      if (filters.limit) {
        filteredLogs = filteredLogs.slice(-filters.limit)
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Clear logs
   */
  async clearLogs(): Promise<void> {
    this.logs = []
    
    if (this.config.enableLocalStorage) {
      try {
        localStorage.removeItem('app_logs')
      } catch (error) {
        console.error('Failed to clear logs from localStorage:', error)
      }
    }
  }

  /**
   * Export logs
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    const logs = this.getLogs()
    
    if (format === 'json') {
      return JSON.stringify(logs, null, 2)
    } else {
      // CSV format
      const headers = ['timestamp', 'level', 'category', 'severity', 'message', 'url', 'userAgent']
      const csvRows = [headers.join(',')]
      
      logs.forEach(log => {
        const row = [
          log.timestamp.toISOString(),
          log.level,
          log.category,
          log.severity,
          `"${log.message.replace(/"/g, '""')}"`,
          `"${log.context.url || ''}"`,
          `"${log.context.userAgent || ''}"`
        ]
        csvRows.push(row.join(','))
      })
      
      return csvRows.join('\n')
    }
  }

  /**
   * Add error listener
   */
  addErrorListener(id: string, listener: (error: AppError) => void): void {
    this.errorListeners.set(id, listener)
  }

  /**
   * Remove error listener
   */
  removeErrorListener(id: string): void {
    this.errorListeners.delete(id)
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number
    errorsByCategory: Record<ErrorCategory, number>
    errorsBySeverity: Record<ErrorSeverity, number>
    errorsByLevel: Record<LogEntry['level'], number>
    recentErrors: number
    criticalErrors: number
  } {
    const errors = this.logs.filter(log => log.level === 'error' || log.level === 'fatal')
    const recentErrors = errors.filter(error => 
      error.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000
    ).length
    const criticalErrors = errors.filter(error => error.severity === ErrorSeverity.CRITICAL).length

    const errorsByCategory = Object.values(ErrorCategory).reduce((acc, category) => {
      acc[category] = errors.filter(error => error.category === category).length
      return acc
    }, {} as Record<ErrorCategory, number>)

    const errorsBySeverity = Object.values(ErrorSeverity).reduce((acc, severity) => {
      acc[severity] = errors.filter(error => error.severity === severity).length
      return acc
    }, {} as Record<ErrorSeverity, number>)

    const errorsByLevel = ['debug', 'info', 'warn', 'error', 'fatal'].reduce((acc, level) => {
      acc[level as LogEntry['level']] = this.logs.filter(log => log.level === level).length
      return acc
    }, {} as Record<LogEntry['level'], number>)

    return {
      totalErrors: errors.length,
      errorsByCategory,
      errorsBySeverity,
      errorsByLevel,
      recentErrors,
      criticalErrors,
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current configuration
   */
  getConfig(): ErrorHandlerConfig {
    return { ...this.config }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(category: ErrorCategory, code: string): boolean {
    const retryableCategories = [ErrorCategory.NETWORK, ErrorCategory.API, ErrorCategory.STORAGE]
    const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT', 'STORAGE_QUOTA_EXCEEDED']
    
    return retryableCategories.includes(category) || retryableCodes.includes(code)
  }

  /**
   * Get max retries for error
   */
  private getMaxRetries(category: ErrorCategory, severity: ErrorSeverity): number {
    if (severity === ErrorSeverity.CRITICAL) return 0
    if (category === ErrorCategory.NETWORK) return 3
    if (category === ErrorCategory.API) return 2
    return 1
  }

  /**
   * Check if error is AppError
   */
  private isAppError(error: Error): error is AppError {
    return 'code' in error && 'severity' in error && 'category' in error
  }

  /**
   * Log error
   */
  private async logError(error: AppError): Promise<void> {
    const level: LogEntry['level'] = error.severity === ErrorSeverity.CRITICAL ? 'fatal' : 'error'
    
    await this.log(
      level,
      error.message,
      error.category,
      error.severity,
      {
        code: error.code,
        isRetryable: error.isRetryable,
        retryCount: error.retryCount,
        maxRetries: error.maxRetries,
        stack: error.stack,
        originalError: error.originalError?.message,
      }
    )
  }

  /**
   * Handle error by severity
   */
  private async handleErrorBySeverity(error: AppError): Promise<void> {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        await this.handleCriticalError(error)
        break
      case ErrorSeverity.HIGH:
        await this.handleHighSeverityError(error)
        break
      case ErrorSeverity.MEDIUM:
        await this.handleMediumSeverityError(error)
        break
      case ErrorSeverity.LOW:
        await this.handleLowSeverityError(error)
        break
    }
  }

  /**
   * Handle critical errors
   */
  private async handleCriticalError(error: AppError): Promise<void> {
    // Show critical error modal
    if (this.config.enableUserFeedback) {
      this.showCriticalErrorModal(error)
    }

    // Send to remote logging immediately
    if (this.config.enableRemoteLogging) {
      await this.sendCriticalErrorToRemote(error)
    }
  }

  /**
   * Handle high severity errors
   */
  private async handleHighSeverityError(error: AppError): Promise<void> {
    // Show error notification
    if (this.config.enableUserFeedback) {
      this.showErrorNotification(error)
    }
  }

  /**
   * Handle medium severity errors
   */
  private async handleMediumSeverityError(error: AppError): Promise<void> {
    // Log and potentially show notification
    if (this.config.enableUserFeedback && error.category === ErrorCategory.UI) {
      this.showErrorNotification(error)
    }
  }

  /**
   * Handle low severity errors
   */
  private async handleLowSeverityError(error: AppError): Promise<void> {
    // Just log, no user feedback needed
  }

  /**
   * Show critical error modal
   */
  private showCriticalErrorModal(error: AppError): void {
    // This would integrate with your UI framework
    console.error('CRITICAL ERROR:', error)
    // In a real app, you'd show a modal here
  }

  /**
   * Show error notification
   */
  private showErrorNotification(error: AppError): void {
    // This would integrate with your notification system
    console.warn('Error notification:', error.message)
    // In a real app, you'd show a toast notification here
  }

  /**
   * Send critical error to remote
   */
  private async sendCriticalErrorToRemote(error: AppError): Promise<void> {
    if (!this.config.remoteEndpoint || !this.config.apiKey) return

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          type: 'critical_error',
          error: {
            message: error.message,
            code: error.code,
            severity: error.severity,
            category: error.category,
            context: error.context,
            stack: error.stack,
          },
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (error) {
      console.error('Failed to send critical error to remote:', error)
    }
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(new Error(event.reason), {
        component: 'global',
        action: 'unhandledrejection',
      })
    })

    // Global errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), {
        component: 'global',
        action: 'global_error',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      })
    })
  }

  /**
   * Log to console
   */
  private logToConsole(logEntry: LogEntry): void {
    const timestamp = logEntry.timestamp.toISOString()
    const prefix = `[${timestamp}] [${logEntry.level.toUpperCase()}] [${logEntry.category}]`

    switch (logEntry.level) {
      case 'debug':
        console.debug(prefix, logEntry.message, logEntry.metadata)
        break
      case 'info':
        console.info(prefix, logEntry.message, logEntry.metadata)
        break
      case 'warn':
        console.warn(prefix, logEntry.message, logEntry.metadata)
        break
      case 'error':
      case 'fatal':
        console.error(prefix, logEntry.message, logEntry.metadata)
        break
    }
  }

  /**
   * Save logs to localStorage
   */
  private async saveLogsToStorage(): Promise<void> {
    try {
      const logsToSave = this.logs.slice(-this.config.maxLogEntries)
      localStorage.setItem('app_logs', JSON.stringify(logsToSave))
    } catch (error) {
      console.error('Failed to save logs to localStorage:', error)
    }
  }

  /**
   * Load logs from localStorage
   */
  private async loadLogsFromStorage(): Promise<void> {
    try {
      const storedLogs = localStorage.getItem('app_logs')
      if (storedLogs) {
        const parsedLogs = JSON.parse(storedLogs)
        this.logs = parsedLogs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp),
          context: {
            ...log.context,
            timestamp: new Date(log.context.timestamp),
          },
        }))
      }
    } catch (error) {
      console.error('Failed to load logs from localStorage:', error)
    }
  }

  /**
   * Send log to remote endpoint
   */
  private async sendLogToRemote(logEntry: LogEntry): Promise<void> {
    if (!this.config.remoteEndpoint || !this.config.apiKey) return

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(logEntry),
      })
    } catch (error) {
      console.error('Failed to send log to remote:', error)
    }
  }

  /**
   * Clean up old logs
   */
  private cleanupOldLogs(): void {
    const cutoffDate = new Date(Date.now() - this.config.logRetentionDays * 24 * 60 * 60 * 1000)
    this.logs = this.logs.filter(log => log.timestamp > cutoffDate)
  }

  /**
   * Notify error listeners
   */
  private notifyErrorListeners(error: AppError): void {
    this.errorListeners.forEach((listener) => {
      try {
        listener(error)
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError)
      }
    })
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler()
