/**
 * API error handling and logging system
 * Provides comprehensive error handling, logging, and monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

// Error types and interfaces
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  BAD_REQUEST = 'BAD_REQUEST',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE = 'UNSUPPORTED_MEDIA_TYPE',
  GEO_BLOCKED = 'GEO_BLOCKED',
  FEATURE_UNAVAILABLE = 'FEATURE_UNAVAILABLE'
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export interface ErrorContext {
  requestId?: string
  userId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  endpoint?: string
  method?: string
  timestamp?: Date
  stackTrace?: string
  additionalData?: Record<string, any>
}

export interface ApiError extends Error {
  type: ErrorType
  statusCode: number
  message: string
  details?: string
  context?: ErrorContext
  isOperational: boolean
  retryable: boolean
  timestamp: Date
}

export interface LogEntry {
  level: LogLevel
  message: string
  error?: ApiError
  context?: ErrorContext
  timestamp: Date
  service: string
  environment: string
}

// Error class definitions
export class ValidationError extends Error implements ApiError {
  public readonly type = ErrorType.VALIDATION_ERROR
  public readonly statusCode = 400
  public readonly isOperational = true
  public readonly retryable = false
  public readonly timestamp = new Date()

  constructor(
    message: string,
    public readonly details?: string,
    public readonly context?: ErrorContext
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends Error implements ApiError {
  public readonly type = ErrorType.AUTHENTICATION_ERROR
  public readonly statusCode = 401
  public readonly isOperational = true
  public readonly retryable = false
  public readonly timestamp = new Date()

  constructor(
    message: string,
    public readonly details?: string,
    public readonly context?: ErrorContext
  ) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error implements ApiError {
  public readonly type = ErrorType.AUTHORIZATION_ERROR
  public readonly statusCode = 403
  public readonly isOperational = true
  public readonly retryable = false
  public readonly timestamp = new Date()

  constructor(
    message: string,
    public readonly details?: string,
    public readonly context?: ErrorContext
  ) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends Error implements ApiError {
  public readonly type = ErrorType.NOT_FOUND_ERROR
  public readonly statusCode = 404
  public readonly isOperational = true
  public readonly retryable = false
  public readonly timestamp = new Date()

  constructor(
    message: string,
    public readonly details?: string,
    public readonly context?: ErrorContext
  ) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class RateLimitError extends Error implements ApiError {
  public readonly type = ErrorType.RATE_LIMIT_ERROR
  public readonly statusCode = 429
  public readonly isOperational = true
  public readonly retryable = true
  public readonly timestamp = new Date()

  constructor(
    message: string,
    public readonly details?: string,
    public readonly context?: ErrorContext,
    public readonly retryAfter?: number
  ) {
    super(message)
    this.name = 'RateLimitError'
  }
}

export class ExternalApiError extends Error implements ApiError {
  public readonly type = ErrorType.EXTERNAL_API_ERROR
  public readonly statusCode = 502
  public readonly isOperational = true
  public readonly retryable = true
  public readonly timestamp = new Date()

  constructor(
    message: string,
    public readonly details?: string,
    public readonly context?: ErrorContext,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'ExternalApiError'
  }
}

export class DatabaseError extends Error implements ApiError {
  public readonly type = ErrorType.DATABASE_ERROR
  public readonly statusCode = 500
  public readonly isOperational = true
  public readonly retryable = true
  public readonly timestamp = new Date()

  constructor(
    message: string,
    public readonly details?: string,
    public readonly context?: ErrorContext,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class NetworkError extends Error implements ApiError {
  public readonly type = ErrorType.NETWORK_ERROR
  public readonly statusCode = 503
  public readonly isOperational = true
  public readonly retryable = true
  public readonly timestamp = new Date()

  constructor(
    message: string,
    public readonly details?: string,
    public readonly context?: ErrorContext,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'NetworkError'
  }
}

export class InternalServerError extends Error implements ApiError {
  public readonly type = ErrorType.INTERNAL_SERVER_ERROR
  public readonly statusCode = 500
  public readonly isOperational = false
  public readonly retryable = false
  public readonly timestamp = new Date()

  constructor(
    message: string,
    public readonly details?: string,
    public readonly context?: ErrorContext,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'InternalServerError'
  }
}

export class GeoBlockedError extends Error implements ApiError {
  public readonly type = ErrorType.GEO_BLOCKED
  public readonly statusCode = 403
  public readonly isOperational = true
  public readonly retryable = false
  public readonly timestamp = new Date()

  constructor(
    message: string,
    public readonly details?: string,
    public readonly context?: ErrorContext,
    public readonly country?: string
  ) {
    super(message)
    this.name = 'GeoBlockedError'
  }
}

// Logger interface and implementation
export interface Logger {
  debug(message: string, context?: ErrorContext): void
  info(message: string, context?: ErrorContext): void
  warn(message: string, context?: ErrorContext): void
  error(message: string, error?: ApiError, context?: ErrorContext): void
  fatal(message: string, error?: ApiError, context?: ErrorContext): void
}

export class ConsoleLogger implements Logger {
  private service: string
  private environment: string

  constructor(service: string = 'music-streaming-app', environment: string = 'development') {
    this.service = service
    this.environment = environment
  }

  private formatLog(level: LogLevel, message: string, error?: ApiError, context?: ErrorContext): LogEntry {
    return {
      level,
      message,
      error,
      context,
      timestamp: new Date(),
      service: this.service,
      environment: this.environment
    }
  }

  private log(level: LogLevel, message: string, error?: ApiError, context?: ErrorContext): void {
    const logEntry = this.formatLog(level, message, error, context)
    
    // In production, this would send to a logging service
    if (this.environment === 'production') {
      // Send to external logging service (e.g., DataDog, LogRocket, etc.)
      console.log(JSON.stringify(logEntry))
    } else {
      // Development logging with colors and formatting
      const timestamp = logEntry.timestamp.toISOString()
      const contextStr = context ? ` [${JSON.stringify(context)}]` : ''
      const errorStr = error ? `\nError: ${error.message}\nStack: ${error.stack}` : ''
      
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(`[${timestamp}] DEBUG: ${message}${contextStr}${errorStr}`)
          break
        case LogLevel.INFO:
          console.info(`[${timestamp}] INFO: ${message}${contextStr}${errorStr}`)
          break
        case LogLevel.WARN:
          console.warn(`[${timestamp}] WARN: ${message}${contextStr}${errorStr}`)
          break
        case LogLevel.ERROR:
          console.error(`[${timestamp}] ERROR: ${message}${contextStr}${errorStr}`)
          break
        case LogLevel.FATAL:
          console.error(`[${timestamp}] FATAL: ${message}${contextStr}${errorStr}`)
          break
      }
    }
  }

  debug(message: string, context?: ErrorContext): void {
    this.log(LogLevel.DEBUG, message, undefined, context)
  }

  info(message: string, context?: ErrorContext): void {
    this.log(LogLevel.INFO, message, undefined, context)
  }

  warn(message: string, context?: ErrorContext): void {
    this.log(LogLevel.WARN, message, undefined, context)
  }

  error(message: string, error?: ApiError, context?: ErrorContext): void {
    this.log(LogLevel.ERROR, message, error, context)
  }

  fatal(message: string, error?: ApiError, context?: ErrorContext): void {
    this.log(LogLevel.FATAL, message, error, context)
  }
}

// Error handler class
export class ErrorHandler {
  private logger: Logger
  private isDevelopment: boolean

  constructor(logger?: Logger, isDevelopment: boolean = process.env.NODE_ENV === 'development') {
    this.logger = logger || new ConsoleLogger()
    this.isDevelopment = isDevelopment
  }

  // Extract context from request
  private extractContext(request: NextRequest, additionalData?: Record<string, any>): ErrorContext {
    let endpoint = '/unknown'
    try {
      if (request.url) {
        const url = new URL(request.url)
        endpoint = url.pathname
      }
    } catch (error) {
      // If URL parsing fails, use a default endpoint
      endpoint = '/unknown'
    }
    
    return {
      requestId: request.headers.get('x-request-id') || undefined,
      userId: request.headers.get('x-user-id') || undefined,
      sessionId: request.headers.get('x-session-id') || undefined,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 
                 request.headers.get('x-real-ip') || 
                 request.headers.get('cf-connecting-ip') || 
                 '127.0.0.1',
      userAgent: request.headers.get('user-agent') || undefined,
      endpoint,
      method: request.method,
      timestamp: new Date(),
      additionalData
    }
  }

  // Check if error is an ApiError
  private isApiError(error: unknown): error is ApiError {
    return error instanceof Error && 
           'type' in error && 
           'statusCode' in error && 
           'isOperational' in error && 
           'retryable' in error && 
           'timestamp' in error
  }

  // Handle Zod validation errors
  handleZodError(error: ZodError, context?: ErrorContext): ValidationError {
    const details = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
    const validationError = new ValidationError('Validation failed', details, context)
    
    this.logger.warn('Validation error occurred', context)
    return validationError
  }

  // Handle unknown errors
  handleUnknownError(error: unknown, context?: ErrorContext): InternalServerError {
    let message = 'An unexpected error occurred'
    let details: string | undefined

    if (error instanceof Error) {
      message = error.message
      details = error.stack
    } else if (typeof error === 'string') {
      message = error
    } else {
      details = JSON.stringify(error)
    }

    const internalError = new InternalServerError(message, details, context, error instanceof Error ? error : undefined)
    
    this.logger.error('Unknown error occurred', internalError, context)
    return internalError
  }

  // Create error response
  createErrorResponse(error: ApiError, request?: NextRequest): NextResponse {
    const context = request ? this.extractContext(request) : error.context
    
    // Log the error
    if (error.isOperational) {
      this.logger.warn(`Operational error: ${error.message}`, context)
    } else {
      this.logger.error(`System error: ${error.message}`, error, context)
    }

    // Prepare error response
    const errorResponse = {
      success: false,
      error: error.message,
      type: error.type,
      statusCode: error.statusCode,
      timestamp: error.timestamp.toISOString(),
      ...(this.isDevelopment && error.details && { details: error.details }),
      ...(this.isDevelopment && error.stack && { stack: error.stack }),
      ...(context?.requestId && { requestId: context.requestId })
    }

    // Add retry information for retryable errors
    if (error.retryable && error instanceof RateLimitError && error.retryAfter) {
      return NextResponse.json(errorResponse, {
        status: error.statusCode,
        headers: {
          'Retry-After': error.retryAfter.toString(),
          'X-Error-Type': error.type,
          'X-Request-ID': context?.requestId || '',
          'Content-Type': 'application/json'
        }
      })
    }

    return NextResponse.json(errorResponse, {
      status: error.statusCode,
      headers: {
        'X-Error-Type': error.type,
        'X-Request-ID': context?.requestId || '',
        'Content-Type': 'application/json'
      }
    })
  }

  // Handle API route errors
  handleApiError(error: unknown, request: NextRequest): NextResponse {
    const context = this.extractContext(request)

    if (this.isApiError(error)) {
      return this.createErrorResponse(error, request)
    }

    if (error instanceof ZodError) {
      const validationError = this.handleZodError(error, context)
      return this.createErrorResponse(validationError, request)
    }

    const internalError = this.handleUnknownError(error, context)
    return this.createErrorResponse(internalError, request)
  }

  // Create success response with logging
  createSuccessResponse(data: any, request: NextRequest, statusCode: number = 200): NextResponse {
    const context = this.extractContext(request)
    
    this.logger.info(`API request successful: ${request.method} ${context.endpoint}`, context)

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
      ...(context?.requestId && { requestId: context.requestId })
    }, {
      status: statusCode,
      headers: {
        'X-Request-ID': context?.requestId || '',
        'Content-Type': 'application/json'
      }
    })
  }

  // Wrap async API route handlers
  withErrorHandling<T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      try {
        return await handler(request, ...args)
      } catch (error) {
        return this.handleApiError(error, request)
      }
    }
  }

  // Create error from HTTP status code
  createErrorFromStatusCode(statusCode: number, message?: string, context?: ErrorContext): ApiError {
    switch (statusCode) {
      case 400:
        return new ValidationError(message || 'Bad Request', undefined, context)
      case 401:
        return new AuthenticationError(message || 'Unauthorized', undefined, context)
      case 403:
        return new AuthorizationError(message || 'Forbidden', undefined, context)
      case 404:
        return new NotFoundError(message || 'Not Found', undefined, context)
      case 409:
        return new Error(message || 'Conflict') as ApiError
      case 422:
        return new Error(message || 'Unprocessable Entity') as ApiError
      case 429:
        return new RateLimitError(message || 'Too Many Requests', undefined, context)
      case 500:
        return new InternalServerError(message || 'Internal Server Error', undefined, context)
      case 502:
        return new ExternalApiError(message || 'Bad Gateway', undefined, context)
      case 503:
        return new NetworkError(message || 'Service Unavailable', undefined, context)
      default:
        return new InternalServerError(message || 'Unknown Error', undefined, context)
    }
  }

  // Health check for error handling system
  healthCheck(): { status: string; timestamp: Date; logger: string } {
    return {
      status: 'healthy',
      timestamp: new Date(),
      logger: this.logger.constructor.name
    }
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler()

// Export utility functions
export function createErrorResponse(error: ApiError, request?: NextRequest): NextResponse {
  return errorHandler.createErrorResponse(error, request)
}

export function createSuccessResponse(data: any, request: NextRequest, statusCode?: number): NextResponse {
  return errorHandler.createSuccessResponse(data, request, statusCode)
}

export function withErrorHandling<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return errorHandler.withErrorHandling(handler)
}

// Export all error classes and types
export {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ExternalApiError,
  DatabaseError,
  NetworkError,
  InternalServerError,
  GeoBlockedError
}
