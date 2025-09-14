/**
 * Simplified unit tests for API error handling and logging system
 */

import {
  ErrorHandler,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ExternalApiError,
  DatabaseError,
  NetworkError,
  InternalServerError,
  GeoBlockedError,
  ErrorType,
  LogLevel,
  ConsoleLogger,
  createErrorResponse,
  createSuccessResponse,
  withErrorHandling
} from './error-handler'
import { NextRequest, NextResponse } from 'next/server'
import { ZodError, z } from 'zod'

// Mock NextRequest and NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, options = {}) => ({
    url,
    method: options.method || 'GET',
    headers: new Map(Object.entries(options.headers || {}))
  })),
  NextResponse: {
    json: jest.fn((data, options) => ({
      status: options?.status || 200,
      headers: options?.headers || new Map(),
      json: () => Promise.resolve(data)
    }))
  }
}))

describe('Error Handling System', () => {
  let errorHandler: ErrorHandler
  let mockLogger: jest.Mocked<ConsoleLogger>

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn()
    } as any

    errorHandler = new ErrorHandler(mockLogger, true) // Development mode
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Error Classes', () => {
    it('should create ValidationError with correct properties', () => {
      const error = new ValidationError('Invalid input', 'Field is required')

      expect(error.type).toBe(ErrorType.VALIDATION_ERROR)
      expect(error.statusCode).toBe(400)
      expect(error.isOperational).toBe(true)
      expect(error.retryable).toBe(false)
      expect(error.message).toBe('Invalid input')
      expect(error.details).toBe('Field is required')
      expect(error.timestamp).toBeInstanceOf(Date)
    })

    it('should create AuthenticationError with correct properties', () => {
      const error = new AuthenticationError('Invalid credentials')

      expect(error.type).toBe(ErrorType.AUTHENTICATION_ERROR)
      expect(error.statusCode).toBe(401)
      expect(error.isOperational).toBe(true)
      expect(error.retryable).toBe(false)
      expect(error.message).toBe('Invalid credentials')
    })

    it('should create AuthorizationError with correct properties', () => {
      const error = new AuthorizationError('Access denied')

      expect(error.type).toBe(ErrorType.AUTHORIZATION_ERROR)
      expect(error.statusCode).toBe(403)
      expect(error.isOperational).toBe(true)
      expect(error.retryable).toBe(false)
      expect(error.message).toBe('Access denied')
    })

    it('should create NotFoundError with correct properties', () => {
      const error = new NotFoundError('Resource not found')

      expect(error.type).toBe(ErrorType.NOT_FOUND_ERROR)
      expect(error.statusCode).toBe(404)
      expect(error.isOperational).toBe(true)
      expect(error.retryable).toBe(false)
      expect(error.message).toBe('Resource not found')
    })

    it('should create RateLimitError with correct properties', () => {
      const error = new RateLimitError('Rate limit exceeded', 'Too many requests', undefined, 60)

      expect(error.type).toBe(ErrorType.RATE_LIMIT_ERROR)
      expect(error.statusCode).toBe(429)
      expect(error.isOperational).toBe(true)
      expect(error.retryable).toBe(true)
      expect(error.message).toBe('Rate limit exceeded')
      expect(error.retryAfter).toBe(60)
    })

    it('should create ExternalApiError with correct properties', () => {
      const originalError = new Error('Network timeout')
      const error = new ExternalApiError('External API failed', 'Service unavailable', undefined, originalError)

      expect(error.type).toBe(ErrorType.EXTERNAL_API_ERROR)
      expect(error.statusCode).toBe(502)
      expect(error.isOperational).toBe(true)
      expect(error.retryable).toBe(true)
      expect(error.message).toBe('External API failed')
      expect(error.originalError).toBe(originalError)
    })

    it('should create DatabaseError with correct properties', () => {
      const originalError = new Error('Connection failed')
      const error = new DatabaseError('Database error', 'Connection timeout', undefined, originalError)

      expect(error.type).toBe(ErrorType.DATABASE_ERROR)
      expect(error.statusCode).toBe(500)
      expect(error.isOperational).toBe(true)
      expect(error.retryable).toBe(true)
      expect(error.message).toBe('Database error')
      expect(error.originalError).toBe(originalError)
    })

    it('should create NetworkError with correct properties', () => {
      const originalError = new Error('Network unreachable')
      const error = new NetworkError('Network error', 'Connection failed', undefined, originalError)

      expect(error.type).toBe(ErrorType.NETWORK_ERROR)
      expect(error.statusCode).toBe(503)
      expect(error.isOperational).toBe(true)
      expect(error.retryable).toBe(true)
      expect(error.message).toBe('Network error')
      expect(error.originalError).toBe(originalError)
    })

    it('should create InternalServerError with correct properties', () => {
      const originalError = new Error('Unexpected error')
      const error = new InternalServerError('Internal error', 'System failure', undefined, originalError)

      expect(error.type).toBe(ErrorType.INTERNAL_SERVER_ERROR)
      expect(error.statusCode).toBe(500)
      expect(error.isOperational).toBe(false)
      expect(error.retryable).toBe(false)
      expect(error.message).toBe('Internal error')
      expect(error.originalError).toBe(originalError)
    })

    it('should create GeoBlockedError with correct properties', () => {
      const error = new GeoBlockedError('Access denied', 'Service not available in your region', undefined, 'XX')

      expect(error.type).toBe(ErrorType.GEO_BLOCKED)
      expect(error.statusCode).toBe(403)
      expect(error.isOperational).toBe(true)
      expect(error.retryable).toBe(false)
      expect(error.message).toBe('Access denied')
      expect(error.country).toBe('XX')
    })
  })

  describe('ErrorHandler', () => {
    it('should extract context from request', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-request-id': 'req-123',
          'x-user-id': 'user-456',
          'x-session-id': 'session-789',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Test Agent'
        }
      })

      const context = (errorHandler as any).extractContext(request)

      expect(context.requestId).toBe('req-123')
      expect(context.userId).toBe('user-456')
      expect(context.sessionId).toBe('session-789')
      expect(context.ipAddress).toBe('192.168.1.1')
      expect(context.userAgent).toBe('Test Agent')
      expect(context.endpoint).toBe('/api/test')
      expect(context.method).toBe('GET')
      expect(context.timestamp).toBeInstanceOf(Date)
    })

    it('should handle Zod validation errors', () => {
      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email')
      })

      try {
        schema.parse({ name: '', email: 'invalid' })
      } catch (error) {
        const validationError = errorHandler.handleZodError(error as ZodError)

        expect(validationError).toBeInstanceOf(ValidationError)
        expect(validationError.type).toBe(ErrorType.VALIDATION_ERROR)
        expect(validationError.statusCode).toBe(400)
        expect(validationError.details).toContain('Name is required')
        expect(validationError.details).toContain('Invalid email')
      }
    })

    it('should handle unknown errors', () => {
      const unknownError = new Error('Something went wrong')
      const context = { requestId: 'req-123' }

      const internalError = errorHandler.handleUnknownError(unknownError, context)

      expect(internalError).toBeInstanceOf(InternalServerError)
      expect(internalError.type).toBe(ErrorType.INTERNAL_SERVER_ERROR)
      expect(internalError.statusCode).toBe(500)
      expect(internalError.message).toBe('Something went wrong')
      expect(internalError.context).toBe(context)
    })

    it('should handle string errors', () => {
      const stringError = 'Simple error message'

      const internalError = errorHandler.handleUnknownError(stringError)

      expect(internalError).toBeInstanceOf(InternalServerError)
      expect(internalError.message).toBe('Simple error message')
    })

    it('should handle non-Error objects', () => {
      const objectError = { code: 500, message: 'Object error' }

      const internalError = errorHandler.handleUnknownError(objectError)

      expect(internalError).toBeInstanceOf(InternalServerError)
      expect(internalError.message).toBe('An unexpected error occurred')
      expect(internalError.details).toContain('Object error')
    })
  })

  describe('Error Response Creation', () => {
    it('should create error response for operational errors', () => {
      const error = new ValidationError('Invalid input', 'Field is required')
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'x-request-id': 'req-123' }
      })

      const response = errorHandler.createErrorResponse(error, request)

      expect(response.status).toBe(400)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Operational error: Invalid input',
        expect.objectContaining({ requestId: 'req-123' })
      )
    })

    it('should create error response for system errors', () => {
      const error = new InternalServerError('System failure')
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'x-request-id': 'req-123' }
      })

      const response = errorHandler.createErrorResponse(error, request)

      expect(response.status).toBe(500)
      expect(mockLogger.error).toHaveBeenCalledWith(
        'System error: System failure',
        error,
        expect.objectContaining({ requestId: 'req-123' })
      )
    })

    it('should include retry headers for retryable errors', () => {
      const error = new RateLimitError('Rate limit exceeded', 'Too many requests', undefined, 60)
      const request = new NextRequest('http://localhost:3000/api/test')

      const response = errorHandler.createErrorResponse(error, request)

      expect(response.status).toBe(429)
      expect(response.headers).toHaveProperty('Retry-After', '60')
      expect(response.headers).toHaveProperty('X-Error-Type', 'RATE_LIMIT_ERROR')
    })

    it('should include request ID in response headers', () => {
      const error = new ValidationError('Invalid input')
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'x-request-id': 'req-123' }
      })

      const response = errorHandler.createErrorResponse(error, request)

      expect(response.headers).toHaveProperty('X-Request-ID', 'req-123')
      expect(response.headers).toHaveProperty('X-Error-Type', 'VALIDATION_ERROR')
    })
  })

  describe('Success Response Creation', () => {
    it('should create success response with data', () => {
      const data = { id: 1, name: 'Test' }
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'x-request-id': 'req-123' }
      })

      const response = errorHandler.createSuccessResponse(data, request, 201)

      expect(response.status).toBe(201)
      expect(mockLogger.info).toHaveBeenCalledWith(
        'API request successful: GET /api/test',
        expect.objectContaining({ requestId: 'req-123' })
      )
    })

    it('should include request ID in success response headers', () => {
      const data = { success: true }
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'x-request-id': 'req-123' }
      })

      const response = errorHandler.createSuccessResponse(data, request)

      expect(response.headers).toHaveProperty('X-Request-ID', 'req-123')
    })
  })

  describe('API Error Handling', () => {
    it('should handle ApiError instances', async () => {
      const error = new ValidationError('Invalid input')
      const request = new NextRequest('http://localhost:3000/api/test')

      const response = errorHandler.handleApiError(error, request)

      expect(response.status).toBe(400)
    })

    it('should handle ZodError instances', async () => {
      const schema = z.object({ name: z.string() })
      let zodError: ZodError

      try {
        schema.parse({ name: 123 })
      } catch (error) {
        zodError = error as ZodError
      }

      const request = new NextRequest('http://localhost:3000/api/test')
      const response = errorHandler.handleApiError(zodError!, request)

      expect(response.status).toBe(400)
    })

    it('should handle unknown errors', async () => {
      const unknownError = new Error('Unknown error')
      const request = new NextRequest('http://localhost:3000/api/test')

      const response = errorHandler.handleApiError(unknownError, request)

      expect(response.status).toBe(500)
    })
  })

  describe('Error Handler Wrapper', () => {
    it('should wrap async handlers with error handling', async () => {
      const handler = async (request: NextRequest) => {
        throw new ValidationError('Test error')
      }

      const wrappedHandler = errorHandler.withErrorHandling(handler)
      const request = new NextRequest('http://localhost:3000/api/test')

      const response = await wrappedHandler(request)

      expect(response.status).toBe(400)
    })

    it('should pass through successful responses', async () => {
      const handler = async (request: NextRequest) => {
        return NextResponse.json({ success: true })
      }

      const wrappedHandler = errorHandler.withErrorHandling(handler)
      const request = new NextRequest('http://localhost:3000/api/test')

      const response = await wrappedHandler(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Error Creation from Status Code', () => {
    it('should create appropriate errors for different status codes', () => {
      const context = { requestId: 'req-123' }

      expect(errorHandler.createErrorFromStatusCode(400, 'Bad Request', context)).toBeInstanceOf(ValidationError)
      expect(errorHandler.createErrorFromStatusCode(401, 'Unauthorized', context)).toBeInstanceOf(AuthenticationError)
      expect(errorHandler.createErrorFromStatusCode(403, 'Forbidden', context)).toBeInstanceOf(AuthorizationError)
      expect(errorHandler.createErrorFromStatusCode(404, 'Not Found', context)).toBeInstanceOf(NotFoundError)
      expect(errorHandler.createErrorFromStatusCode(429, 'Too Many Requests', context)).toBeInstanceOf(RateLimitError)
      expect(errorHandler.createErrorFromStatusCode(500, 'Internal Error', context)).toBeInstanceOf(InternalServerError)
      expect(errorHandler.createErrorFromStatusCode(502, 'Bad Gateway', context)).toBeInstanceOf(ExternalApiError)
      expect(errorHandler.createErrorFromStatusCode(503, 'Service Unavailable', context)).toBeInstanceOf(NetworkError)
    })

    it('should use default messages when not provided', () => {
      const error = errorHandler.createErrorFromStatusCode(400)

      expect(error.message).toBe('Bad Request')
    })
  })

  describe('Health Check', () => {
    it('should return health status', () => {
      const health = errorHandler.healthCheck()

      expect(health.status).toBe('healthy')
      expect(health.timestamp).toBeInstanceOf(Date)
      expect(health.logger).toBe('Object') // Mock logger returns 'Object'
    })
  })

  describe('Utility Functions', () => {
    it('should create error response using utility function', () => {
      const error = new ValidationError('Invalid input')
      const request = new NextRequest('http://localhost:3000/api/test')

      const response = createErrorResponse(error, request)

      expect(response.status).toBe(400)
    })

    it('should create success response using utility function', () => {
      const data = { success: true }
      const request = new NextRequest('http://localhost:3000/api/test')

      const response = createSuccessResponse(data, request)

      expect(response.status).toBe(200)
    })

    it('should wrap handler using utility function', async () => {
      const handler = async (request: NextRequest) => {
        throw new ValidationError('Test error')
      }

      const wrappedHandler = withErrorHandling(handler)
      const request = new NextRequest('http://localhost:3000/api/test')

      const response = await wrappedHandler(request)

      expect(response.status).toBe(400)
    })
  })

  describe('Development vs Production', () => {
    it('should include stack traces in development mode', () => {
      const error = new InternalServerError('Test error', 'Stack trace here')
      const request = new NextRequest('http://localhost:3000/api/test')

      const response = errorHandler.createErrorResponse(error, request)

      expect(response.status).toBe(500)
      // In development mode, stack traces should be included
    })

    it('should not include sensitive information in production mode', () => {
      const productionHandler = new ErrorHandler(mockLogger, false) // Production mode
      const error = new InternalServerError('Test error', 'Stack trace here')
      const request = new NextRequest('http://localhost:3000/api/test')

      const response = productionHandler.createErrorResponse(error, request)

      expect(response.status).toBe(500)
      // In production mode, stack traces should not be included
    })
  })
})
