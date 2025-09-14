/**
 * Simplified unit tests for analytics data collection API endpoint
 */

import { NextRequest } from 'next/server'
import { POST, GET, PUT, DELETE, PATCH } from './route'
import { EventType } from '@/lib/analytics/events'

// Mock NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, options) => ({
      status: options?.status || 200,
      headers: options?.headers || {},
      json: () => Promise.resolve(data)
    }))
  }
}))

describe('Analytics API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/analytics', () => {
    it('should collect analytics events successfully', async () => {
      const mockEvents = [
        {
          eventType: EventType.TRACK_PLAY,
          properties: {
            trackId: 'track-1',
            trackTitle: 'Bohemian Rhapsody',
            artistName: 'Queen',
            albumName: 'A Night at the Opera',
            duration: 355000,
            position: 0,
            quality: 'high',
            source: 'streaming',
            volume: 80,
            crossfade: false,
            gapless: true
          }
        },
        {
          eventType: EventType.SEARCH_QUERY,
          properties: {
            query: 'queen bohemian',
            resultCount: 15,
            resultType: 'tracks',
            searchTime: 250
          }
        }
      ]

      const request = new NextRequest('http://localhost:3000/api/analytics?type=collect', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Test Browser)',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ events: mockEvents })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('eventsProcessed', 2)
      expect(data.data).toHaveProperty('sessionId')
      expect(data.data).toHaveProperty('stats')
      expect(data.data.stats).toHaveProperty('playback')
      expect(data.data.stats).toHaveProperty('search')
      expect(data.data.stats).toHaveProperty('performance')
      expect(data.data.stats).toHaveProperty('errors')
    })

    it('should include rate limit headers in response', async () => {
      const mockEvents = [
        {
          eventType: EventType.TRACK_PLAY,
          properties: {
            trackId: 'track-1',
            trackTitle: 'Test Track',
            artistName: 'Test Artist'
          }
        }
      ]

      const request = new NextRequest('http://localhost:3000/api/analytics?type=collect', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ events: mockEvents })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers).toHaveProperty('X-RateLimit-Limit')
      expect(response.headers).toHaveProperty('X-RateLimit-Remaining')
      expect(response.headers).toHaveProperty('X-RateLimit-Reset')
    })

    it('should include cache headers in response', async () => {
      const mockEvents = [
        {
          eventType: EventType.TRACK_PLAY,
          properties: {
            trackId: 'track-1',
            trackTitle: 'Test Track',
            artistName: 'Test Artist'
          }
        }
      ]

      const request = new NextRequest('http://localhost:3000/api/analytics?type=collect', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ events: mockEvents })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers).toHaveProperty('Cache-Control')
      expect(response.headers['Cache-Control']).toBe('no-cache')
    })

    it('should handle query type requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics?type=query&eventType=track_play&limit=10&offset=0', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ events: [] })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('events')
      expect(data.data).toHaveProperty('pagination')
      expect(data.data).toHaveProperty('filters')
      expect(Array.isArray(data.data.events)).toBe(true)
    })

    it('should handle stats type requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics?type=stats', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ events: [] })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('summary')
      expect(data.data).toHaveProperty('playback')
      expect(data.data).toHaveProperty('search')
      expect(data.data).toHaveProperty('performance')
      expect(data.data).toHaveProperty('errors')
      expect(data.data).toHaveProperty('sessions')
    })

    it('should return error for invalid request data', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics?type=collect', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ events: [] }) // Empty events array
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid request data')
    })

    it('should return error for invalid query parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics?type=invalid', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ events: [] })
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid query parameters')
    })

    it('should return error for invalid request type', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics?type=invalid', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ events: [] })
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid request type')
    })

    it('should handle playback events correctly', async () => {
      const mockEvents = [
        {
          eventType: EventType.TRACK_PLAY,
          properties: {
            trackId: 'track-1',
            trackTitle: 'Bohemian Rhapsody',
            artistName: 'Queen',
            duration: 355000,
            position: 0,
            quality: 'high',
            source: 'streaming'
          }
        },
        {
          eventType: EventType.TRACK_SKIP,
          properties: {
            trackId: 'track-1',
            trackTitle: 'Bohemian Rhapsody',
            artistName: 'Queen',
            position: 30000
          }
        }
      ]

      const request = new NextRequest('http://localhost:3000/api/analytics?type=collect', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ events: mockEvents })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.stats.playback).toHaveProperty('totalPlays', 1)
      expect(data.data.stats.playback).toHaveProperty('totalSkips', 1)
      expect(data.data.stats.playback).toHaveProperty('skipRate', 100)
    })

    it('should handle search events correctly', async () => {
      const mockEvents = [
        {
          eventType: EventType.SEARCH_QUERY,
          properties: {
            query: 'queen',
            resultCount: 10,
            resultType: 'tracks',
            searchTime: 200
          }
        },
        {
          eventType: EventType.SEARCH_RESULT_CLICK,
          properties: {
            query: 'queen',
            selectedResultId: 'track-1',
            selectedResultType: 'track'
          }
        }
      ]

      const request = new NextRequest('http://localhost:3000/api/analytics?type=collect', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ events: mockEvents })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.stats.search).toHaveProperty('totalSearches', 1)
      expect(data.data.stats.search).toHaveProperty('averageResultCount', 10)
      expect(data.data.stats.search).toHaveProperty('clickThroughRate', 100)
    })

    it('should handle performance events correctly', async () => {
      const mockEvents = [
        {
          eventType: EventType.PAGE_LOAD_TIME,
          properties: {
            metric: 'page_load',
            value: 1500,
            unit: 'ms',
            component: 'home'
          }
        },
        {
          eventType: EventType.API_RESPONSE_TIME,
          properties: {
            metric: 'api_response',
            value: 300,
            unit: 'ms',
            apiEndpoint: '/api/tracks'
          }
        }
      ]

      const request = new NextRequest('http://localhost:3000/api/analytics?type=collect', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ events: mockEvents })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.stats.performance).toHaveProperty('averagePageLoadTime', 1500)
      expect(data.data.stats.performance).toHaveProperty('averageApiResponseTime', 300)
    })

    it('should handle error events correctly', async () => {
      const mockEvents = [
        {
          eventType: EventType.ERROR_OCCURRED,
          properties: {
            errorType: 'ValidationError',
            errorMessage: 'Invalid input data',
            errorCode: 'VALIDATION_FAILED',
            component: 'SearchForm'
          }
        },
        {
          eventType: EventType.API_ERROR,
          properties: {
            errorType: 'NetworkError',
            errorMessage: 'Request timeout',
            apiEndpoint: '/api/tracks',
            statusCode: 408,
            retryCount: 3
          }
        }
      ]

      const request = new NextRequest('http://localhost:3000/api/analytics?type=collect', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ events: mockEvents })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.stats.errors).toHaveProperty('totalErrors', 2)
      expect(data.data.stats.errors).toHaveProperty('errorTypes')
      expect(data.data.stats.errors.errorTypes).toHaveProperty('ValidationError', 1)
      expect(data.data.stats.errors.errorTypes).toHaveProperty('NetworkError', 1)
    })

    it('should include session information in response', async () => {
      const mockEvents = [
        {
          eventType: EventType.TRACK_PLAY,
          properties: {
            trackId: 'track-1',
            trackTitle: 'Test Track',
            artistName: 'Test Artist'
          }
        }
      ]

      const request = new NextRequest('http://localhost:3000/api/analytics?type=collect', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ 
          events: mockEvents,
          sessionId: 'test-session-123',
          userId: 'user-456',
          deviceId: 'device-789'
        })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('sessionId', 'test-session-123')
    })

    it('should include rate limit information in response', async () => {
      const mockEvents = [
        {
          eventType: EventType.TRACK_PLAY,
          properties: {
            trackId: 'track-1',
            trackTitle: 'Test Track',
            artistName: 'Test Artist'
          }
        }
      ]

      const request = new NextRequest('http://localhost:3000/api/analytics?type=collect', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ events: mockEvents })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('rateLimit')
      expect(data.data.rateLimit).toHaveProperty('remaining')
      expect(data.data.rateLimit).toHaveProperty('resetTime')
    })

    it('should handle missing x-forwarded-for header', async () => {
      const mockEvents = [
        {
          eventType: EventType.TRACK_PLAY,
          properties: {
            trackId: 'track-1',
            trackTitle: 'Test Track',
            artistName: 'Test Artist'
          }
        }
      ]

      const request = new NextRequest('http://localhost:3000/api/analytics?type=collect', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ events: mockEvents })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should handle x-real-ip header', async () => {
      const mockEvents = [
        {
          eventType: EventType.TRACK_PLAY,
          properties: {
            trackId: 'track-1',
            trackTitle: 'Test Track',
            artistName: 'Test Artist'
          }
        }
      ]

      const request = new NextRequest('http://localhost:3000/api/analytics?type=collect', {
        method: 'POST',
        headers: {
          'x-real-ip': '10.0.0.1',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ events: mockEvents })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should handle cf-connecting-ip header', async () => {
      const mockEvents = [
        {
          eventType: EventType.TRACK_PLAY,
          properties: {
            trackId: 'track-1',
            trackTitle: 'Test Track',
            artistName: 'Test Artist'
          }
        }
      ]

      const request = new NextRequest('http://localhost:3000/api/analytics?type=collect', {
        method: 'POST',
        headers: {
          'cf-connecting-ip': '203.0.113.1',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ events: mockEvents })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should include timestamp in response', async () => {
      const mockEvents = [
        {
          eventType: EventType.TRACK_PLAY,
          properties: {
            trackId: 'track-1',
            trackTitle: 'Test Track',
            artistName: 'Test Artist'
          }
        }
      ]

      const request = new NextRequest('http://localhost:3000/api/analytics?type=collect', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ events: mockEvents })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.timestamp).toBeDefined()
      expect(new Date(data.timestamp)).toBeInstanceOf(Date)
    })
  })

  describe('Rate Limiting', () => {
    it('should handle rate limiting gracefully', async () => {
      const mockEvents = [
        {
          eventType: EventType.TRACK_PLAY,
          properties: {
            trackId: 'track-1',
            trackTitle: 'Test Track',
            artistName: 'Test Artist'
          }
        }
      ]

      const request = new NextRequest('http://localhost:3000/api/analytics?type=collect', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ events: mockEvents })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.rateLimit).toBeDefined()
    })

    it('should include rate limit information in response headers', async () => {
      const mockEvents = [
        {
          eventType: EventType.TRACK_PLAY,
          properties: {
            trackId: 'track-1',
            trackTitle: 'Test Track',
            artistName: 'Test Artist'
          }
        }
      ]

      const request = new NextRequest('http://localhost:3000/api/analytics?type=collect', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ events: mockEvents })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      
      // Check that rate limit headers are present
      expect(response.headers).toHaveProperty('X-RateLimit-Limit')
      expect(response.headers).toHaveProperty('X-RateLimit-Remaining')
      expect(response.headers).toHaveProperty('X-RateLimit-Reset')
    })
  })

  describe('Unsupported HTTP methods', () => {
    it('should return 405 for GET requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics', { method: 'GET' })
      const response = await GET(request)

      expect(response.status).toBe(405)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Method not allowed')
    })

    it('should return 405 for PUT requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics', { method: 'PUT' })
      const response = await PUT(request)

      expect(response.status).toBe(405)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Method not allowed')
    })

    it('should return 405 for DELETE requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics', { method: 'DELETE' })
      const response = await DELETE(request)

      expect(response.status).toBe(405)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Method not allowed')
    })

    it('should return 405 for PATCH requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics', { method: 'PATCH' })
      const response = await PATCH(request)

      expect(response.status).toBe(405)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Method not allowed')
    })
  })

  describe('Error handling', () => {
    it('should handle malformed requests gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics?type=collect', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'content-type': 'application/json'
        },
        body: 'invalid json'
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('Response structure', () => {
    it('should return properly structured response for collect type', async () => {
      const mockEvents = [
        {
          eventType: EventType.TRACK_PLAY,
          properties: {
            trackId: 'track-1',
            trackTitle: 'Test Track',
            artistName: 'Test Artist'
          }
        }
      ]

      const request = new NextRequest('http://localhost:3000/api/analytics?type=collect', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ events: mockEvents })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      
      // Check top-level structure
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')
      expect(data).toHaveProperty('timestamp')
      
      // Check data structure
      expect(data.data).toHaveProperty('batchId')
      expect(data.data).toHaveProperty('eventsProcessed')
      expect(data.data).toHaveProperty('sessionId')
      expect(data.data).toHaveProperty('stats')
      expect(data.data).toHaveProperty('rateLimit')
      
      // Check stats structure
      expect(data.data.stats).toHaveProperty('playback')
      expect(data.data.stats).toHaveProperty('search')
      expect(data.data.stats).toHaveProperty('performance')
      expect(data.data.stats).toHaveProperty('errors')
    })

    it('should return properly structured response for query type', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics?type=query', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ events: [] })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      
      // Check top-level structure
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')
      expect(data).toHaveProperty('timestamp')
      
      // Check data structure
      expect(data.data).toHaveProperty('events')
      expect(data.data).toHaveProperty('pagination')
      expect(data.data).toHaveProperty('filters')
      
      // Check pagination structure
      expect(data.data.pagination).toHaveProperty('total')
      expect(data.data.pagination).toHaveProperty('limit')
      expect(data.data.pagination).toHaveProperty('offset')
      expect(data.data.pagination).toHaveProperty('hasMore')
      
      // Check filters structure
      expect(data.data.filters).toHaveProperty('eventType')
      expect(data.data.filters).toHaveProperty('startDate')
      expect(data.data.filters).toHaveProperty('endDate')
    })

    it('should return properly structured response for stats type', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics?type=stats', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ events: [] })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      
      // Check top-level structure
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')
      expect(data).toHaveProperty('timestamp')
      
      // Check data structure
      expect(data.data).toHaveProperty('summary')
      expect(data.data).toHaveProperty('playback')
      expect(data.data).toHaveProperty('search')
      expect(data.data).toHaveProperty('performance')
      expect(data.data).toHaveProperty('errors')
      expect(data.data).toHaveProperty('sessions')
      
      // Check summary structure
      expect(data.data.summary).toHaveProperty('totalEvents')
      expect(data.data.summary).toHaveProperty('totalSessions')
      expect(data.data.summary).toHaveProperty('eventTypes')
      expect(data.data.summary).toHaveProperty('timeRange')
    })
  })
})
