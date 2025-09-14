/**
 * Advanced logging system for API error handling and monitoring
 * Provides structured logging with multiple output formats and destinations
 */

import { LogLevel, LogEntry, ErrorContext, ApiError } from './error-handler'

// Log destination types
export enum LogDestination {
  CONSOLE = 'console',
  FILE = 'file',
  REMOTE = 'remote',
  DATABASE = 'database'
}

// Log format types
export enum LogFormat {
  JSON = 'json',
  TEXT = 'text',
  STRUCTURED = 'structured'
}

// Log configuration
export interface LogConfig {
  level: LogLevel
  destinations: LogDestination[]
  format: LogFormat
  service: string
  environment: string
  version?: string
  includeStackTrace?: boolean
  includeRequestData?: boolean
  maxLogSize?: number
  maxLogFiles?: number
  remoteEndpoint?: string
  remoteApiKey?: string
  databaseConfig?: {
    host: string
    port: number
    database: string
    username: string
    password: string
  }
}

// Log entry with additional metadata
export interface ExtendedLogEntry extends LogEntry {
  id: string
  correlationId?: string
  spanId?: string
  parentSpanId?: string
  tags?: Record<string, string>
  metrics?: Record<string, number>
  duration?: number
  memoryUsage?: NodeJS.MemoryUsage
  cpuUsage?: NodeJS.CpuUsage
}

// Log destination interface
export interface LogDestination {
  write(entry: ExtendedLogEntry): Promise<void>
  flush(): Promise<void>
  close(): Promise<void>
}

// Console destination
export class ConsoleDestination implements LogDestination {
  private config: LogConfig

  constructor(config: LogConfig) {
    this.config = config
  }

  async write(entry: ExtendedLogEntry): Promise<void> {
    const formatted = this.formatEntry(entry)
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formatted)
        break
      case LogLevel.INFO:
        console.info(formatted)
        break
      case LogLevel.WARN:
        console.warn(formatted)
        break
      case LogLevel.ERROR:
        console.error(formatted)
        break
      case LogLevel.FATAL:
        console.error(formatted)
        break
    }
  }

  private formatEntry(entry: ExtendedLogEntry): string {
    const timestamp = entry.timestamp.toISOString()
    const level = entry.level.toUpperCase().padEnd(5)
    const service = entry.service
    const message = entry.message
    
    let formatted = `[${timestamp}] ${level} ${service}: ${message}`
    
    if (entry.context) {
      formatted += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`
    }
    
    if (entry.error) {
      formatted += `\n  Error: ${entry.error.message}`
      if (this.config.includeStackTrace && entry.error.stack) {
        formatted += `\n  Stack: ${entry.error.stack}`
      }
    }
    
    if (entry.tags && Object.keys(entry.tags).length > 0) {
      formatted += `\n  Tags: ${JSON.stringify(entry.tags)}`
    }
    
    if (entry.metrics && Object.keys(entry.metrics).length > 0) {
      formatted += `\n  Metrics: ${JSON.stringify(entry.metrics)}`
    }
    
    return formatted
  }

  async flush(): Promise<void> {
    // Console doesn't need flushing
  }

  async close(): Promise<void> {
    // Console doesn't need closing
  }
}

// File destination
export class FileDestination implements LogDestination {
  private config: LogConfig
  private filePath: string
  private writeStream?: NodeJS.WritableStream

  constructor(config: LogConfig, filePath: string) {
    this.config = config
    this.filePath = filePath
  }

  async write(entry: ExtendedLogEntry): Promise<void> {
    if (!this.writeStream) {
      const fs = await import('fs')
      const path = await import('path')
      
      // Ensure directory exists
      const dir = path.dirname(this.filePath)
      await fs.promises.mkdir(dir, { recursive: true })
      
      this.writeStream = fs.createWriteStream(this.filePath, { flags: 'a' })
    }

    const formatted = this.formatEntry(entry)
    this.writeStream.write(formatted + '\n')
  }

  private formatEntry(entry: ExtendedLogEntry): string {
    if (this.config.format === LogFormat.JSON) {
      return JSON.stringify(entry)
    }
    
    // Default to structured text format
    const timestamp = entry.timestamp.toISOString()
    const level = entry.level.toUpperCase()
    const service = entry.service
    const message = entry.message
    
    let formatted = `${timestamp} [${level}] ${service}: ${message}`
    
    if (entry.context) {
      formatted += ` | Context: ${JSON.stringify(entry.context)}`
    }
    
    if (entry.error) {
      formatted += ` | Error: ${entry.error.message}`
    }
    
    if (entry.tags) {
      formatted += ` | Tags: ${JSON.stringify(entry.tags)}`
    }
    
    return formatted
  }

  async flush(): Promise<void> {
    if (this.writeStream) {
      return new Promise((resolve, reject) => {
        this.writeStream!.on('finish', resolve)
        this.writeStream!.on('error', reject)
        this.writeStream!.end()
      })
    }
  }

  async close(): Promise<void> {
    if (this.writeStream) {
      this.writeStream.end()
      this.writeStream = undefined
    }
  }
}

// Remote destination (for external logging services)
export class RemoteDestination implements LogDestination {
  private config: LogConfig
  private endpoint: string
  private apiKey: string
  private buffer: ExtendedLogEntry[] = []
  private bufferSize: number = 100
  private flushInterval: number = 5000 // 5 seconds
  private flushTimer?: NodeJS.Timeout

  constructor(config: LogConfig) {
    this.config = config
    this.endpoint = config.remoteEndpoint || 'https://logs.example.com/api/logs'
    this.apiKey = config.remoteApiKey || ''
    
    // Start periodic flushing
    this.startPeriodicFlush()
  }

  async write(entry: ExtendedLogEntry): Promise<void> {
    this.buffer.push(entry)
    
    if (this.buffer.length >= this.bufferSize) {
      await this.flush()
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return

    const entries = [...this.buffer]
    this.buffer = []

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'User-Agent': `${this.config.service}/${this.config.version || '1.0.0'}`
        },
        body: JSON.stringify({
          logs: entries,
          service: this.config.service,
          environment: this.config.environment,
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        console.error(`Failed to send logs to remote service: ${response.status} ${response.statusText}`)
        // Re-add entries to buffer for retry
        this.buffer.unshift(...entries)
      }
    } catch (error) {
      console.error('Error sending logs to remote service:', error)
      // Re-add entries to buffer for retry
      this.buffer.unshift(...entries)
    }
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        console.error('Error during periodic log flush:', error)
      })
    }, this.flushInterval)
  }

  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = undefined
    }
    
    await this.flush()
  }
}

// Database destination
export class DatabaseDestination implements LogDestination {
  private config: LogConfig
  private connection?: any // Database connection

  constructor(config: LogConfig) {
    this.config = config
  }

  async write(entry: ExtendedLogEntry): Promise<void> {
    if (!this.connection) {
      await this.connect()
    }

    try {
      // Insert log entry into database
      await this.connection.query(`
        INSERT INTO logs (
          id, level, message, service, environment, timestamp,
          context, error_data, tags, metrics, correlation_id,
          span_id, parent_span_id, duration, memory_usage, cpu_usage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        entry.id,
        entry.level,
        entry.message,
        entry.service,
        entry.environment,
        entry.timestamp,
        entry.context ? JSON.stringify(entry.context) : null,
        entry.error ? JSON.stringify(entry.error) : null,
        entry.tags ? JSON.stringify(entry.tags) : null,
        entry.metrics ? JSON.stringify(entry.metrics) : null,
        entry.correlationId,
        entry.spanId,
        entry.parentSpanId,
        entry.duration,
        entry.memoryUsage ? JSON.stringify(entry.memoryUsage) : null,
        entry.cpuUsage ? JSON.stringify(entry.cpuUsage) : null
      ])
    } catch (error) {
      console.error('Error writing log to database:', error)
    }
  }

  private async connect(): Promise<void> {
    // In a real implementation, this would connect to the database
    // For now, we'll use a mock connection
    this.connection = {
      query: async (sql: string, params: any[]) => {
        console.log('Database query:', sql, params)
      }
    }
  }

  async flush(): Promise<void> {
    // Database writes are typically synchronous
  }

  async close(): Promise<void> {
    if (this.connection) {
      // Close database connection
      this.connection = undefined
    }
  }
}

// Advanced logger implementation
export class AdvancedLogger {
  private config: LogConfig
  private destinations: LogDestination[] = []
  private correlationId?: string
  private spanId?: string
  private parentSpanId?: string

  constructor(config: LogConfig) {
    this.config = config
    this.initializeDestinations()
  }

  private initializeDestinations(): void {
    for (const destination of this.config.destinations) {
      switch (destination) {
        case LogDestination.CONSOLE:
          this.destinations.push(new ConsoleDestination(this.config))
          break
        case LogDestination.FILE:
          const filePath = `logs/${this.config.service}-${this.config.environment}.log`
          this.destinations.push(new FileDestination(this.config, filePath))
          break
        case LogDestination.REMOTE:
          this.destinations.push(new RemoteDestination(this.config))
          break
        case LogDestination.DATABASE:
          this.destinations.push(new DatabaseDestination(this.config))
          break
      }
    }
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    error?: ApiError,
    context?: ErrorContext,
    additionalData?: Record<string, any>
  ): ExtendedLogEntry {
    const entry: ExtendedLogEntry = {
      id: this.generateId(),
      level,
      message,
      error,
      context,
      timestamp: new Date(),
      service: this.config.service,
      environment: this.config.environment,
      correlationId: this.correlationId,
      spanId: this.spanId,
      parentSpanId: this.parentSpanId,
      tags: additionalData?.tags,
      metrics: additionalData?.metrics,
      duration: additionalData?.duration,
      memoryUsage: additionalData?.memoryUsage,
      cpuUsage: additionalData?.cpuUsage
    }

    return entry
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private async writeToDestinations(entry: ExtendedLogEntry): Promise<void> {
    const promises = this.destinations.map(destination => 
      destination.write(entry).catch(error => {
        console.error('Error writing to log destination:', error)
      })
    )
    
    await Promise.allSettled(promises)
  }

  // Set correlation ID for request tracing
  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId
  }

  // Set span ID for distributed tracing
  setSpanId(spanId: string, parentSpanId?: string): void {
    this.spanId = spanId
    this.parentSpanId = parentSpanId
  }

  // Log methods
  async debug(message: string, context?: ErrorContext, additionalData?: Record<string, any>): Promise<void> {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = this.createLogEntry(LogLevel.DEBUG, message, undefined, context, additionalData)
      await this.writeToDestinations(entry)
    }
  }

  async info(message: string, context?: ErrorContext, additionalData?: Record<string, any>): Promise<void> {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = this.createLogEntry(LogLevel.INFO, message, undefined, context, additionalData)
      await this.writeToDestinations(entry)
    }
  }

  async warn(message: string, context?: ErrorContext, additionalData?: Record<string, any>): Promise<void> {
    if (this.shouldLog(LogLevel.WARN)) {
      const entry = this.createLogEntry(LogLevel.WARN, message, undefined, context, additionalData)
      await this.writeToDestinations(entry)
    }
  }

  async error(message: string, error?: ApiError, context?: ErrorContext, additionalData?: Record<string, any>): Promise<void> {
    if (this.shouldLog(LogLevel.ERROR)) {
      const entry = this.createLogEntry(LogLevel.ERROR, message, error, context, additionalData)
      await this.writeToDestinations(entry)
    }
  }

  async fatal(message: string, error?: ApiError, context?: ErrorContext, additionalData?: Record<string, any>): Promise<void> {
    if (this.shouldLog(LogLevel.FATAL)) {
      const entry = this.createLogEntry(LogLevel.FATAL, message, error, context, additionalData)
      await this.writeToDestinations(entry)
    }
  }

  // Performance logging
  async logPerformance(
    operation: string,
    duration: number,
    context?: ErrorContext,
    additionalMetrics?: Record<string, number>
  ): Promise<void> {
    const metrics = {
      duration,
      ...additionalMetrics,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    }

    await this.info(`Performance: ${operation}`, context, { metrics })
  }

  // Business event logging
  async logBusinessEvent(
    event: string,
    data: Record<string, any>,
    context?: ErrorContext
  ): Promise<void> {
    await this.info(`Business Event: ${event}`, context, { tags: data })
  }

  // Security event logging
  async logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: ErrorContext,
    additionalData?: Record<string, any>
  ): Promise<void> {
    const level = severity === 'critical' ? LogLevel.FATAL : 
                  severity === 'high' ? LogLevel.ERROR :
                  severity === 'medium' ? LogLevel.WARN : LogLevel.INFO

    const entry = this.createLogEntry(level, `Security Event: ${event}`, undefined, context, {
      tags: { severity, ...additionalData }
    })
    
    await this.writeToDestinations(entry)
  }

  // Check if should log based on level
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL]
    const configLevelIndex = levels.indexOf(this.config.level)
    const messageLevelIndex = levels.indexOf(level)
    
    return messageLevelIndex >= configLevelIndex
  }

  // Flush all destinations
  async flush(): Promise<void> {
    const promises = this.destinations.map(destination => destination.flush())
    await Promise.allSettled(promises)
  }

  // Close all destinations
  async close(): Promise<void> {
    const promises = this.destinations.map(destination => destination.close())
    await Promise.allSettled(promises)
  }

  // Health check
  healthCheck(): { status: string; destinations: string[]; config: LogConfig } {
    return {
      status: 'healthy',
      destinations: this.destinations.map(d => d.constructor.name),
      config: this.config
    }
  }
}

// Default logger configuration
export const defaultLogConfig: LogConfig = {
  level: LogLevel.INFO,
  destinations: [LogDestination.CONSOLE],
  format: LogFormat.STRUCTURED,
  service: 'music-streaming-app',
  environment: process.env.NODE_ENV || 'development',
  version: process.env.npm_package_version || '1.0.0',
  includeStackTrace: process.env.NODE_ENV === 'development',
  includeRequestData: true,
  maxLogSize: 10 * 1024 * 1024, // 10MB
  maxLogFiles: 5
}

// Export singleton logger instance
export const logger = new AdvancedLogger(defaultLogConfig)
