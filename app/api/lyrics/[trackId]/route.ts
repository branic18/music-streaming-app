/**
 * Lyrics API endpoint with provider integration
 * Handles lyrics retrieval with multiple provider support and caching
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { apiResponseSchema } from '@/lib/validation/schemas'
import { ApiResponse, Track } from '@/lib/types'
import { lyricsService } from '@/lib/lyrics/provider'

// Request validation schemas
const lyricsRequestSchema = z.object({
  trackTitle: z.string().min(1, 'Track title is required').max(200, 'Track title too long').optional(),
  artistName: z.string().min(1, 'Artist name is required').max(200, 'Artist name too long').optional(),
  provider: z.enum(['local', 'musixmatch', 'genius', 'lyricsovh']).optional(),
  language: z.string().length(2, 'Language must be 2 characters').optional(),
  includeMetadata: z.boolean().optional(),
  forceRefresh: z.boolean().optional()
})

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  requests: 100, // requests per window
  window: 15 * 60 * 1000, // 15 minutes in milliseconds
  burst: 10 // burst requests allowed
}

// Rate limiting storage
interface RateLimitEntry {
  count: number
  resetTime: number
  burstCount: number
  burstResetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Mock track database for testing
const mockTracks: Record<string, Track> = {
  'track-1': {
    id: 'track-1',
    title: 'Bohemian Rhapsody',
    artists: ['Queen'],
    albumId: 'album-1',
    album: 'A Night at the Opera',
    durationMs: 355000,
    artwork: '/queen-bohemian-rhapsody-album-cover.png',
    territories: ['US', 'UK', 'CA'],
    downloadable: true,
    lyricsAvailable: true,
    explicit: false,
    popularity: 95,
    genres: ['Rock', 'Progressive Rock'],
    releaseDate: new Date('1975-10-31'),
    isrc: 'GBUM71029601',
    previewUrl: 'https://example.com/preview/bohemian-rhapsody.mp3'
  },
  'track-2': {
    id: 'track-2',
    title: 'Hotel California',
    artists: ['Eagles'],
    albumId: 'album-2',
    album: 'Hotel California',
    durationMs: 391000,
    artwork: '/eagles-hotel-california-album-cover.jpg',
    territories: ['US', 'UK', 'CA'],
    downloadable: true,
    lyricsAvailable: true,
    explicit: false,
    popularity: 92,
    genres: ['Rock', 'Country Rock'],
    releaseDate: new Date('1976-12-08'),
    isrc: 'USRC17607839',
    previewUrl: 'https://example.com/preview/hotel-california.mp3'
  },
  'track-3': {
    id: 'track-3',
    title: 'Stairway to Heaven',
    artists: ['Led Zeppelin'],
    albumId: 'album-3',
    album: 'Led Zeppelin IV',
    durationMs: 482000,
    artwork: '/led-zeppelin-iv-inspired-cover.png',
    territories: ['US', 'UK', 'CA'],
    downloadable: true,
    lyricsAvailable: true,
    explicit: false,
    popularity: 98,
    genres: ['Rock', 'Hard Rock'],
    releaseDate: new Date('1971-11-08'),
    isrc: 'GBUM71029602',
    previewUrl: 'https://example.com/preview/stairway-to-heaven.mp3'
  }
}

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

// Utility functions
function findTrackById(trackId: string): Track | null {
  return mockTracks[trackId] || null
}

// API route handler
export async function GET(
  request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  try {
    const { trackId } = params
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
      trackTitle: url.searchParams.get('trackTitle') || undefined,
      artistName: url.searchParams.get('artistName') || undefined,
      provider: url.searchParams.get('provider') || undefined,
      language: url.searchParams.get('language') || undefined,
      includeMetadata: url.searchParams.get('includeMetadata') === 'true',
      forceRefresh: url.searchParams.get('forceRefresh') === 'true'
    }
    
    const validation = lyricsRequestSchema.safeParse(queryParams)
    if (!validation.success) {
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Invalid request parameters',
        details: validation.error.errors.map(e => e.message).join(', ')
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }
    
    const { trackTitle, artistName, provider, language, includeMetadata, forceRefresh } = validation.data
    
    // Find track information
    const track = findTrackById(trackId)
    if (!track) {
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Track not found',
        details: 'The requested track does not exist'
      }
      return NextResponse.json(errorResponse, { status: 404 })
    }
    
    // Check if track has lyrics available
    if (!track.lyricsAvailable) {
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Lyrics not available',
        details: 'Lyrics are not available for this track'
      }
      return NextResponse.json(errorResponse, { status: 404 })
    }
    
    // Use track information if not provided in query
    const finalTrackTitle = trackTitle || track.title
    const finalArtistName = artistName || track.artists[0]
    
    // Get lyrics from service
    let lyrics
    try {
      lyrics = await lyricsService.getLyrics(
        trackId,
        finalTrackTitle,
        finalArtistName,
        provider
      )
    } catch (error) {
      console.error('Lyrics service error:', error)
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Lyrics service error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
      return NextResponse.json(errorResponse, { status: 500 })
    }
    
    if (!lyrics) {
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Lyrics not found',
        details: 'No lyrics found for this track from any provider'
      }
      return NextResponse.json(errorResponse, { status: 404 })
    }
    
    // Filter by language if specified
    if (language && lyrics.language !== language) {
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Language not available',
        details: `Lyrics in language '${language}' not available for this track`
      }
      return NextResponse.json(errorResponse, { status: 404 })
    }
    
    // Prepare response data
    const responseData = {
      lyrics: {
        id: lyrics.id,
        trackId: lyrics.trackId,
        provider: lyrics.provider,
        language: lyrics.language,
        isExplicit: lyrics.isExplicit,
        hasTimeSync: lyrics.hasTimeSync,
        syncType: lyrics.syncType,
        lines: lyrics.lines.map(line => ({
          timeMs: line.timeMs,
          text: line.text
        })),
        copyright: lyrics.copyright,
        createdAt: lyrics.createdAt.toISOString(),
        updatedAt: lyrics.updatedAt.toISOString()
      },
      track: includeMetadata ? {
        id: track.id,
        title: track.title,
        artists: track.artists,
        album: track.album,
        durationMs: track.durationMs,
        artwork: track.artwork,
        explicit: track.explicit,
        popularity: track.popularity,
        genres: track.genres,
        releaseDate: track.releaseDate?.toISOString(),
        previewUrl: track.previewUrl
      } : undefined,
      provider: {
        name: lyrics.provider,
        status: lyricsService.getProviderStatus()[lyrics.provider] || null
      },
      cache: {
        cached: !forceRefresh,
        timestamp: new Date().toISOString()
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
        'Cache-Control': forceRefresh ? 'no-cache' : 'public, max-age=3600', // Cache for 1 hour unless force refresh
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': RATE_LIMIT_CONFIG.requests.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(rateLimit.resetTime / 1000).toString(),
        'X-Lyrics-Provider': lyrics.provider,
        'X-Lyrics-Language': lyrics.language,
        'X-Lyrics-Sync': lyrics.hasTimeSync ? 'true' : 'false'
      }
    })
    
  } catch (error) {
    console.error('Lyrics API error:', error)
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Handle unsupported methods
export async function POST(request: NextRequest) {
  const errorResponse: ApiResponse = {
    success: false,
    error: 'Method not allowed',
    details: 'Only GET requests are supported for lyrics retrieval'
  }
  
  return NextResponse.json(errorResponse, { status: 405 })
}

export async function PUT(request: NextRequest) {
  const errorResponse: ApiResponse = {
    success: false,
    error: 'Method not allowed',
    details: 'Only GET requests are supported for lyrics retrieval'
  }
  
  return NextResponse.json(errorResponse, { status: 405 })
}

export async function DELETE(request: NextRequest) {
  const errorResponse: ApiResponse = {
    success: false,
    error: 'Method not allowed',
    details: 'Only GET requests are supported for lyrics retrieval'
  }
  
  return NextResponse.json(errorResponse, { status: 405 })
}

export async function PATCH(request: NextRequest) {
  const errorResponse: ApiResponse = {
    success: false,
    error: 'Method not allowed',
    details: 'Only GET requests are supported for lyrics retrieval'
  }
  
  return NextResponse.json(errorResponse, { status: 405 })
}
