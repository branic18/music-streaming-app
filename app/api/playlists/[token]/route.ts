/**
 * Shared playlist retrieval endpoint with rate limiting
 * Handles retrieving shared playlists by token with comprehensive rate limiting
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { apiResponseSchema } from '@/lib/validation/schemas'
import { Playlist, ApiResponse, PlaylistShareToken } from '@/lib/types'

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  // Per IP rate limits
  IP_LIMITS: {
    requests: 100, // requests per window
    window: 15 * 60 * 1000, // 15 minutes in milliseconds
    burst: 10 // burst requests allowed
  },
  // Per token rate limits
  TOKEN_LIMITS: {
    requests: 50, // requests per window
    window: 5 * 60 * 1000, // 5 minutes in milliseconds
    burst: 5 // burst requests allowed
  },
  // Global rate limits
  GLOBAL_LIMITS: {
    requests: 1000, // requests per window
    window: 60 * 1000, // 1 minute in milliseconds
    burst: 50 // burst requests allowed
  }
}

// Rate limiting storage (in production, this would be Redis or similar)
interface RateLimitEntry {
  count: number
  resetTime: number
  burstCount: number
  burstResetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Share token storage (imported from share API)
const shareTokens = new Map<string, PlaylistShareToken>()

// Mock playlist data (same as in share API)
const mockPlaylists: Playlist[] = [
  {
    id: 'playlist-1',
    name: 'Classic Rock Hits',
    description: 'The greatest classic rock songs of all time',
    trackIds: ['track-1', 'track-2', 'track-3'],
    tracks: [
      {
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
      {
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
      {
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
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ownerType: 'anonymous',
    isPublic: true,
    artwork: '/playlist-cover-.jpg',
    totalDuration: 1228000,
    totalTracks: 3
  },
  {
    id: 'playlist-2',
    name: '90s Alternative',
    description: 'The best alternative rock from the 90s',
    trackIds: ['track-5'],
    tracks: [
      {
        id: 'track-5',
        title: 'Smells Like Teen Spirit',
        artists: ['Nirvana'],
        albumId: 'album-5',
        album: 'Nevermind',
        durationMs: 301000,
        artwork: '/nirvana-album.jpg',
        territories: ['US', 'UK', 'CA'],
        downloadable: true,
        lyricsAvailable: true,
        explicit: false,
        popularity: 96,
        genres: ['Grunge', 'Alternative Rock'],
        releaseDate: new Date('1991-09-10'),
        isrc: 'USRC19107841',
        previewUrl: 'https://example.com/preview/smells-like-teen-spirit.mp3'
      }
    ],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    ownerType: 'anonymous',
    isPublic: true,
    artwork: '/nirvana-album.jpg',
    totalDuration: 301000,
    totalTracks: 1
  }
]

// Rate limiting utility functions
function getClientIP(request: NextRequest): string {
  // Try to get real IP from headers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()
  
  // Fallback to a default IP for testing
  return '127.0.0.1'
}

function getRateLimitKey(type: 'ip' | 'token' | 'global', identifier: string): string {
  return `${type}:${identifier}`
}

function checkRateLimit(
  key: string, 
  limits: { requests: number; window: number; burst: number }
): { allowed: boolean; remaining: number; resetTime: number; retryAfter?: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)
  
  if (!entry) {
    // First request
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + limits.window,
      burstCount: 1,
      burstResetTime: now + 1000 // 1 second burst window
    }
    rateLimitStore.set(key, newEntry)
    
    return {
      allowed: true,
      remaining: limits.requests - 1,
      resetTime: newEntry.resetTime
    }
  }
  
  // Check if window has expired
  if (now > entry.resetTime) {
    // Reset the window
    entry.count = 1
    entry.resetTime = now + limits.window
    entry.burstCount = 1
    entry.burstResetTime = now + 1000
    
    return {
      allowed: true,
      remaining: limits.requests - 1,
      resetTime: entry.resetTime
    }
  }
  
  // Check burst limit (short-term protection)
  if (now < entry.burstResetTime) {
    if (entry.burstCount >= limits.burst) {
      return {
        allowed: false,
        remaining: limits.requests - entry.count,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.burstResetTime - now) / 1000)
      }
    }
    entry.burstCount++
  } else {
    // Reset burst window
    entry.burstCount = 1
    entry.burstResetTime = now + 1000
  }
  
  // Check main rate limit
  if (entry.count >= limits.requests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000)
    }
  }
  
  // Increment counter
  entry.count++
  
  return {
    allowed: true,
    remaining: limits.requests - entry.count,
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
function findPlaylistById(playlistId: string): Playlist | null {
  return mockPlaylists.find(playlist => playlist.id === playlistId) || null
}

function validateToken(token: string): { valid: boolean; shareToken?: PlaylistShareToken; error?: string } {
  const shareToken = shareTokens.get(token)
  
  if (!shareToken) {
    return { valid: false, error: 'Invalid or non-existent token' }
  }
  
  if (new Date(shareToken.expiresAt) < new Date()) {
    return { valid: false, error: 'Token has expired' }
  }
  
  if (shareToken.maxAccess && shareToken.accessCount >= shareToken.maxAccess) {
    return { valid: false, error: 'Token access limit reached' }
  }
  
  return { valid: true, shareToken }
}

function incrementTokenAccess(token: string): void {
  const shareToken = shareTokens.get(token)
  if (shareToken) {
    shareToken.accessCount++
    shareTokens.set(token, shareToken)
  }
}

// API route handler
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    const clientIP = getClientIP(request)
    
    // Clean up expired rate limits periodically
    if (Math.random() < 0.1) { // 10% chance
      cleanupExpiredRateLimits()
    }
    
    // Check global rate limit
    const globalKey = getRateLimitKey('global', 'all')
    const globalLimit = checkRateLimit(globalKey, RATE_LIMIT_CONFIG.GLOBAL_LIMITS)
    
    if (!globalLimit.allowed) {
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Rate limit exceeded',
        details: 'Global rate limit exceeded. Please try again later.'
      }
      
      return NextResponse.json(errorResponse, { 
        status: 429,
        headers: {
          'Retry-After': globalLimit.retryAfter?.toString() || '60',
          'X-RateLimit-Limit': RATE_LIMIT_CONFIG.GLOBAL_LIMITS.requests.toString(),
          'X-RateLimit-Remaining': globalLimit.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(globalLimit.resetTime / 1000).toString()
        }
      })
    }
    
    // Check IP-based rate limit
    const ipKey = getRateLimitKey('ip', clientIP)
    const ipLimit = checkRateLimit(ipKey, RATE_LIMIT_CONFIG.IP_LIMITS)
    
    if (!ipLimit.allowed) {
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Rate limit exceeded',
        details: 'Too many requests from your IP address. Please try again later.'
      }
      
      return NextResponse.json(errorResponse, { 
        status: 429,
        headers: {
          'Retry-After': ipLimit.retryAfter?.toString() || '900',
          'X-RateLimit-Limit': RATE_LIMIT_CONFIG.IP_LIMITS.requests.toString(),
          'X-RateLimit-Remaining': ipLimit.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(ipLimit.resetTime / 1000).toString()
        }
      })
    }
    
    // Check token-based rate limit
    const tokenKey = getRateLimitKey('token', token)
    const tokenLimit = checkRateLimit(tokenKey, RATE_LIMIT_CONFIG.TOKEN_LIMITS)
    
    if (!tokenLimit.allowed) {
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Rate limit exceeded',
        details: 'Too many requests for this share token. Please try again later.'
      }
      
      return NextResponse.json(errorResponse, { 
        status: 429,
        headers: {
          'Retry-After': tokenLimit.retryAfter?.toString() || '300',
          'X-RateLimit-Limit': RATE_LIMIT_CONFIG.TOKEN_LIMITS.requests.toString(),
          'X-RateLimit-Remaining': tokenLimit.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(tokenLimit.resetTime / 1000).toString()
        }
      })
    }
    
    // Validate token
    const tokenValidation = validateToken(token)
    if (!tokenValidation.valid) {
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Invalid token',
        details: tokenValidation.error
      }
      return NextResponse.json(errorResponse, { status: 404 })
    }
    
    const shareToken = tokenValidation.shareToken!
    
    // Find playlist
    const playlist = findPlaylistById(shareToken.playlistId)
    if (!playlist) {
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Playlist not found',
        details: 'The playlist associated with this token no longer exists'
      }
      return NextResponse.json(errorResponse, { status: 404 })
    }
    
    // Increment access count
    incrementTokenAccess(token)
    
    // Prepare response data
    const responseData = {
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        artwork: playlist.artwork,
        trackCount: playlist.trackIds.length,
        totalDuration: playlist.totalDuration,
        createdAt: playlist.createdAt.toISOString(),
        updatedAt: playlist.updatedAt.toISOString(),
        tracks: playlist.tracks?.map(track => ({
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
          previewUrl: track.previewUrl,
          downloadable: shareToken.allowDownload ? track.downloadable : false
        })) || []
      },
      shareInfo: {
        token: shareToken.token,
        expiresAt: shareToken.expiresAt,
        accessCount: shareToken.accessCount + 1, // +1 because we just incremented
        maxAccess: shareToken.maxAccess,
        isPublic: shareToken.isPublic,
        allowDownload: shareToken.allowDownload,
        allowComments: shareToken.allowComments,
        createdAt: shareToken.createdAt
      },
      rateLimit: {
        global: {
          remaining: globalLimit.remaining,
          resetTime: globalLimit.resetTime
        },
        ip: {
          remaining: ipLimit.remaining,
          resetTime: ipLimit.resetTime
        },
        token: {
          remaining: tokenLimit.remaining,
          resetTime: tokenLimit.resetTime
        }
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
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Content-Type': 'application/json',
        'X-RateLimit-Limit-Global': RATE_LIMIT_CONFIG.GLOBAL_LIMITS.requests.toString(),
        'X-RateLimit-Remaining-Global': globalLimit.remaining.toString(),
        'X-RateLimit-Reset-Global': Math.ceil(globalLimit.resetTime / 1000).toString(),
        'X-RateLimit-Limit-IP': RATE_LIMIT_CONFIG.IP_LIMITS.requests.toString(),
        'X-RateLimit-Remaining-IP': ipLimit.remaining.toString(),
        'X-RateLimit-Reset-IP': Math.ceil(ipLimit.resetTime / 1000).toString(),
        'X-RateLimit-Limit-Token': RATE_LIMIT_CONFIG.TOKEN_LIMITS.requests.toString(),
        'X-RateLimit-Remaining-Token': tokenLimit.remaining.toString(),
        'X-RateLimit-Reset-Token': Math.ceil(tokenLimit.resetTime / 1000).toString()
      }
    })
    
  } catch (error) {
    console.error('Shared playlist retrieval API error:', error)
    
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
    details: 'Only GET requests are supported for playlist retrieval'
  }
  
  return NextResponse.json(errorResponse, { status: 405 })
}

export async function PUT(request: NextRequest) {
  const errorResponse: ApiResponse = {
    success: false,
    error: 'Method not allowed',
    details: 'Only GET requests are supported for playlist retrieval'
  }
  
  return NextResponse.json(errorResponse, { status: 405 })
}

export async function DELETE(request: NextRequest) {
  const errorResponse: ApiResponse = {
    success: false,
    error: 'Method not allowed',
    details: 'Only GET requests are supported for playlist retrieval'
  }
  
  return NextResponse.json(errorResponse, { status: 405 })
}

export async function PATCH(request: NextRequest) {
  const errorResponse: ApiResponse = {
    success: false,
    error: 'Method not allowed',
    details: 'Only GET requests are supported for playlist retrieval'
  }
  
  return NextResponse.json(errorResponse, { status: 405 })
}
