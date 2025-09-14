/**
 * Analytics data collection endpoint
 * Handles collection, validation, and processing of analytics events
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { apiResponseSchema } from '@/lib/validation/schemas'
import { ApiResponse } from '@/lib/types'
import { 
  AnalyticsEvent, 
  EventSchema, 
  AnalyticsProcessor,
  analyticsEventCollector,
  EventType
} from '@/lib/analytics/events'

// Request validation schemas
const analyticsRequestSchema = z.object({
  events: z.array(EventSchema).min(1, 'At least one event is required').max(100, 'Maximum 100 events per request'),
  sessionId: z.string().uuid().optional(),
  userId: z.string().optional(),
  deviceId: z.string().optional(),
  batchId: z.string().optional()
})

const analyticsQuerySchema = z.object({
  type: z.enum(['collect', 'query', 'stats']).default('collect'),
  eventType: z.nativeEnum(EventType).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0)
})

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  requests: 1000, // requests per window
  window: 15 * 60 * 1000, // 15 minutes in milliseconds
  burst: 50 // burst requests allowed
}

// Rate limiting storage
interface RateLimitEntry {
  count: number
  resetTime: number
  burstCount: number
  burstResetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Analytics data storage (in production, this would be a database)
const analyticsStorage = new Map<string, AnalyticsEvent[]>()
const sessionStorage = new Map<string, { userId?: string; deviceId?: string; startTime: Date }>()

// Rate limiting utility functions
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()
  
  return '127.0.0.1'
}

function checkRateLimit(clientIP: string): { allowed: boolean; remaining: number; resetTime: number; retryAfter?: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(clientIP)
  
  if (!entry) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + RATE_LIMIT_CONFIG.window,
      burstCount: 1,
      burstResetTime: now + 1000 // 1 second burst window
    }
    rateLimitStore.set(clientIP, newEntry)
    
    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.requests - 1,
      resetTime: newEntry.resetTime
    }
  }
  
  // Check if window has expired
  if (now > entry.resetTime) {
    entry.count = 1
    entry.resetTime = now + RATE_LIMIT_CONFIG.window
    entry.burstCount = 1
    entry.burstResetTime = now + 1000
    
    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.requests - 1,
      resetTime: entry.resetTime
    }
  }
  
  // Check burst limit
  if (now < entry.burstResetTime) {
    if (entry.burstCount >= RATE_LIMIT_CONFIG.burst) {
      return {
        allowed: false,
        remaining: RATE_LIMIT_CONFIG.requests - entry.count,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.burstResetTime - now) / 1000)
      }
    }
    entry.burstCount++
  } else {
    entry.burstCount = 1
    entry.burstResetTime = now + 1000
  }
  
  // Check main rate limit
  if (entry.count >= RATE_LIMIT_CONFIG.requests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000)
    }
  }
  
  entry.count++
  
  return {
    allowed: true,
    remaining: RATE_LIMIT_CONFIG.requests - entry.count,
    resetTime: entry.resetTime
  }
}

function cleanupExpiredRateLimits(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

// Analytics processing functions
function processEvents(events: AnalyticsEvent[]): {
  playbackStats: any
  searchStats: any
  performanceStats: any
  errorStats: any
  totalEvents: number
  eventTypes: Record<string, number>
} {
  const playbackEvents = events.filter(e => [
    EventType.TRACK_PLAY, EventType.TRACK_PAUSE, EventType.TRACK_SKIP,
    EventType.TRACK_SEEK, EventType.TRACK_FINISH, EventType.TRACK_REPEAT,
    EventType.TRACK_SHUFFLE
  ].includes(e.eventType)) as any[]
  
  const searchEvents = events.filter(e => [
    EventType.SEARCH_QUERY, EventType.SEARCH_RESULT_CLICK, EventType.SEARCH_NO_RESULTS
  ].includes(e.eventType)) as any[]
  
  const performanceEvents = events.filter(e => [
    EventType.PAGE_LOAD_TIME, EventType.API_RESPONSE_TIME, EventType.AUDIO_BUFFER_TIME
  ].includes(e.eventType)) as any[]
  
  const errorEvents = events.filter(e => [
    EventType.ERROR_OCCURRED, EventType.API_ERROR
  ].includes(e.eventType)) as any[]
  
  // Count event types
  const eventTypes: Record<string, number> = {}
  events.forEach(event => {
    eventTypes[event.eventType] = (eventTypes[event.eventType] || 0) + 1
  })
  
  return {
    playbackStats: AnalyticsProcessor.processPlaybackEvents(playbackEvents),
    searchStats: AnalyticsProcessor.processSearchEvents(searchEvents),
    performanceStats: AnalyticsProcessor.processPerformanceEvents(performanceEvents),
    errorStats: {
      totalErrors: errorEvents.length,
      errorTypes: errorEvents.reduce((acc, event) => {
        const errorType = event.properties.errorType || 'unknown'
        acc[errorType] = (acc[errorType] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    },
    totalEvents: events.length,
    eventTypes
  }
}

function storeEvents(events: AnalyticsEvent[]): void {
  events.forEach(event => {
    const sessionId = event.sessionId
    if (!analyticsStorage.has(sessionId)) {
      analyticsStorage.set(sessionId, [])
    }
    analyticsStorage.get(sessionId)!.push(event)
    
    // Store session info
    if (!sessionStorage.has(sessionId)) {
      sessionStorage.set(sessionId, {
        userId: event.userId,
        deviceId: event.deviceId,
        startTime: event.timestamp
      })
    }
  })
}

function queryEvents(filters: {
  eventType?: string
  startDate?: Date
  endDate?: Date
  limit: number
  offset: number
}): { events: AnalyticsEvent[]; total: number } {
  let allEvents: AnalyticsEvent[] = []
  
  // Collect all events from storage
  for (const sessionEvents of analyticsStorage.values()) {
    allEvents.push(...sessionEvents)
  }
  
  // Apply filters
  if (filters.eventType) {
    allEvents = allEvents.filter(e => e.eventType === filters.eventType)
  }
  
  if (filters.startDate) {
    allEvents = allEvents.filter(e => e.timestamp >= filters.startDate!)
  }
  
  if (filters.endDate) {
    allEvents = allEvents.filter(e => e.timestamp <= filters.endDate!)
  }
  
  // Sort by timestamp (newest first)
  allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  
  const total = allEvents.length
  const events = allEvents.slice(filters.offset, filters.offset + filters.limit)
  
  return { events, total }
}

// API route handlers
export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    const url = new URL(request.url)
    
    // Clean up expired rate limits periodically
    if (Math.random() < 0.1) { // 10% chance
      cleanupExpiredRateLimits()
    }
    
    // Check rate limit
    const rateLimit = checkRateLimit(clientIP)
    if (!rateLimit.allowed) {
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Rate limit exceeded',
        details: 'Too many requests. Please try again later.'
      }
      
      return NextResponse.json(errorResponse, { 
        status: 429,
        headers: {
          'Retry-After': rateLimit.retryAfter?.toString() || '900',
          'X-RateLimit-Limit': RATE_LIMIT_CONFIG.requests.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(rateLimit.resetTime / 1000).toString()
        }
      })
    }
    
    // Parse and validate query parameters
    const queryParams = {
      type: url.searchParams.get('type') || 'collect',
      eventType: url.searchParams.get('eventType') || undefined,
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
      limit: parseInt(url.searchParams.get('limit') || '100'),
      offset: parseInt(url.searchParams.get('offset') || '0')
    }
    
    const queryValidation = analyticsQuerySchema.safeParse(queryParams)
    if (!queryValidation.success) {
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Invalid query parameters',
        details: queryValidation.error.errors.map(e => e.message).join(', ')
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }
    
    const { type } = queryValidation.data
    
    if (type === 'collect') {
      // Handle event collection
      const body = await request.json()
      const validation = analyticsRequestSchema.safeParse(body)
      
      if (!validation.success) {
        const errorResponse: ApiResponse = {
          success: false,
          error: 'Invalid request data',
          details: validation.error.errors.map(e => e.message).join(', ')
        }
        return NextResponse.json(errorResponse, { status: 400 })
      }
      
      const { events, sessionId, userId, deviceId, batchId } = validation.data
      
      // Add client information to events
      const enrichedEvents = events.map(event => ({
        ...event,
        sessionId: sessionId || event.sessionId,
        userId: userId || event.userId,
        deviceId: deviceId || event.deviceId,
        userAgent: request.headers.get('user-agent') || undefined,
        ipAddress: clientIP,
        platform: 'web' as const,
        timestamp: new Date()
      }))
      
      // Store events
      storeEvents(enrichedEvents)
      
      // Process events for real-time analytics
      const stats = processEvents(enrichedEvents)
      
      const responseData = {
        batchId: batchId || `batch_${Date.now()}`,
        eventsProcessed: enrichedEvents.length,
        sessionId: enrichedEvents[0]?.sessionId,
        stats: {
          playback: stats.playbackStats,
          search: stats.searchStats,
          performance: stats.performanceStats,
          errors: stats.errorStats
        },
        rateLimit: {
          remaining: rateLimit.remaining,
          resetTime: rateLimit.resetTime
        }
      }
      
      const response: ApiResponse<typeof responseData> = {
        success: true,
        data: responseData,
        timestamp: new Date().toISOString()
      }
      
      return NextResponse.json(response, { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': RATE_LIMIT_CONFIG.requests.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(rateLimit.resetTime / 1000).toString()
        }
      })
    } else if (type === 'query') {
      // Handle event querying
      const { eventType, startDate, endDate, limit, offset } = queryValidation.data
      
      const filters = {
        eventType,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit,
        offset
      }
      
      const { events, total } = queryEvents(filters)
      
      const responseData = {
        events: events.map(event => ({
          id: `${event.sessionId}_${event.timestamp.getTime()}`,
          eventType: event.eventType,
          timestamp: event.timestamp.toISOString(),
          sessionId: event.sessionId,
          userId: event.userId,
          deviceId: event.deviceId,
          properties: event.properties
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        },
        filters: {
          eventType,
          startDate,
          endDate
        }
      }
      
      const response: ApiResponse<typeof responseData> = {
        success: true,
        data: responseData,
        timestamp: new Date().toISOString()
      }
      
      return NextResponse.json(response, { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json'
        }
      })
    } else if (type === 'stats') {
      // Handle analytics statistics
      const allEvents: AnalyticsEvent[] = []
      for (const sessionEvents of analyticsStorage.values()) {
        allEvents.push(...sessionEvents)
      }
      
      const stats = processEvents(allEvents)
      
      const responseData = {
        summary: {
          totalEvents: stats.totalEvents,
          totalSessions: analyticsStorage.size,
          eventTypes: stats.eventTypes,
          timeRange: {
            earliest: allEvents.length > 0 ? Math.min(...allEvents.map(e => e.timestamp.getTime())) : null,
            latest: allEvents.length > 0 ? Math.max(...allEvents.map(e => e.timestamp.getTime())) : null
          }
        },
        playback: stats.playbackStats,
        search: stats.searchStats,
        performance: stats.performanceStats,
        errors: stats.errorStats,
        sessions: Array.from(sessionStorage.entries()).map(([sessionId, info]) => ({
          sessionId,
          userId: info.userId,
          deviceId: info.deviceId,
          startTime: info.startTime.toISOString(),
          eventCount: analyticsStorage.get(sessionId)?.length || 0
        }))
      }
      
      const response: ApiResponse<typeof responseData> = {
        success: true,
        data: responseData,
        timestamp: new Date().toISOString()
      }
      
      return NextResponse.json(response, { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json'
        }
      })
    }
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Invalid request type',
      details: 'Type must be one of: collect, query, stats'
    }
    return NextResponse.json(errorResponse, { status: 400 })
    
  } catch (error) {
    console.error('Analytics API error:', error)
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Handle unsupported methods
export async function GET(request: NextRequest) {
  const errorResponse: ApiResponse = {
    success: false,
    error: 'Method not allowed',
    details: 'Only POST requests are supported for analytics collection'
  }
  
  return NextResponse.json(errorResponse, { status: 405 })
}

export async function PUT(request: NextRequest) {
  const errorResponse: ApiResponse = {
    success: false,
    error: 'Method not allowed',
    details: 'Only POST requests are supported for analytics collection'
  }
  
  return NextResponse.json(errorResponse, { status: 405 })
}

export async function DELETE(request: NextRequest) {
  const errorResponse: ApiResponse = {
    success: false,
    error: 'Method not allowed',
    details: 'Only POST requests are supported for analytics collection'
  }
  
  return NextResponse.json(errorResponse, { status: 405 })
}

export async function PATCH(request: NextRequest) {
  const errorResponse: ApiResponse = {
    success: false,
    error: 'Method not allowed',
    details: 'Only POST requests are supported for analytics collection'
  }
  
  return NextResponse.json(errorResponse, { status: 405 })
}
