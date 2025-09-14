/**
 * Playlist sharing API with token generation and validation
 * Handles creating shareable playlist links with secure tokens
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { playlistShareTokenSchema, apiResponseSchema } from '@/lib/validation/schemas'
import { Playlist, ApiResponse, PlaylistShareToken } from '@/lib/types'
import crypto from 'crypto'

// Share token storage (in production, this would be a database)
const shareTokens = new Map<string, PlaylistShareToken>()

// Share token configuration
const SHARE_TOKEN_LENGTH = 32
const DEFAULT_EXPIRY_HOURS = 24 * 7 // 7 days
const MAX_ACCESS_COUNT = 1000

// Share token request schema
const shareTokenRequestSchema = z.object({
  playlistId: z.string().min(1, 'Playlist ID is required'),
  expiresInHours: z.number().int().min(1).max(24 * 30, 'Expiry must be between 1 hour and 30 days').optional(),
  maxAccess: z.number().int().min(1).max(10000, 'Max access must be between 1 and 10000').optional(),
  isPublic: z.boolean().optional(),
  allowDownload: z.boolean().optional(),
  allowComments: z.boolean().optional()
})

// Share token response schema
const shareTokenResponseSchema = z.object({
  token: z.string(),
  shareUrl: z.string().url(),
  expiresAt: z.string().datetime(),
  maxAccess: z.number().int().optional(),
  accessCount: z.number().int(),
  createdAt: z.string().datetime()
})

// Mock playlist data (in production, this would come from a database)
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

// Utility functions
function generateSecureToken(length: number = SHARE_TOKEN_LENGTH): string {
  return crypto.randomBytes(length).toString('hex')
}

function createShareUrl(token: string, baseUrl: string = 'http://localhost:3000'): string {
  return `${baseUrl}/playlist/${token}`
}

function isTokenExpired(token: PlaylistShareToken): boolean {
  return new Date(token.expiresAt) < new Date()
}

function isTokenAccessLimitReached(token: PlaylistShareToken): boolean {
  return token.maxAccess ? token.accessCount >= token.maxAccess : false
}

function validateToken(token: string): { valid: boolean; shareToken?: PlaylistShareToken; error?: string } {
  const shareToken = shareTokens.get(token)
  
  if (!shareToken) {
    return { valid: false, error: 'Invalid or non-existent token' }
  }
  
  if (isTokenExpired(shareToken)) {
    return { valid: false, error: 'Token has expired' }
  }
  
  if (isTokenAccessLimitReached(shareToken)) {
    return { valid: false, error: 'Token access limit reached' }
  }
  
  return { valid: true, shareToken }
}

function incrementAccessCount(token: string): void {
  const shareToken = shareTokens.get(token)
  if (shareToken) {
    shareToken.accessCount++
    shareTokens.set(token, shareToken)
  }
}

function findPlaylistById(playlistId: string): Playlist | null {
  return mockPlaylists.find(playlist => playlist.id === playlistId) || null
}

function cleanupExpiredTokens(): void {
  const now = new Date()
  for (const [token, shareToken] of shareTokens.entries()) {
    if (new Date(shareToken.expiresAt) < now) {
      shareTokens.delete(token)
    }
  }
}

// API route handlers
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    
    // Validate request body
    const validationResult = shareTokenRequestSchema.safeParse(body)
    if (!validationResult.success) {
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Invalid request parameters',
        details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const { playlistId, expiresInHours, maxAccess, isPublic, allowDownload, allowComments } = validationResult.data

    // Check if playlist exists
    const playlist = findPlaylistById(playlistId)
    if (!playlist) {
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Playlist not found',
        details: `No playlist found with ID: ${playlistId}`
      }
      return NextResponse.json(errorResponse, { status: 404 })
    }

    // Check if playlist is shareable
    if (!playlist.isPublic) {
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Playlist is not shareable',
        details: 'Only public playlists can be shared'
      }
      return NextResponse.json(errorResponse, { status: 403 })
    }

    // Generate secure token
    const token = generateSecureToken()
    
    // Calculate expiry date
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + (expiresInHours || DEFAULT_EXPIRY_HOURS))

    // Create share token
    const shareToken: PlaylistShareToken = {
      token,
      playlistId,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      accessCount: 0,
      maxAccess: maxAccess || MAX_ACCESS_COUNT,
      isPublic: isPublic ?? true,
      allowDownload: allowDownload ?? false,
      allowComments: allowComments ?? false,
      metadata: {
        playlistName: playlist.name,
        playlistDescription: playlist.description,
        trackCount: playlist.trackIds.length,
        totalDuration: playlist.totalDuration || 0,
        createdAt: playlist.createdAt.toISOString(),
        updatedAt: playlist.updatedAt.toISOString()
      }
    }

    // Store share token
    shareTokens.set(token, shareToken)

    // Clean up expired tokens
    cleanupExpiredTokens()

    // Create share URL
    const baseUrl = request.headers.get('origin') || 'http://localhost:3000'
    const shareUrl = createShareUrl(token, baseUrl)

    // Create response
    const responseData = {
      token: shareToken.token,
      shareUrl,
      expiresAt: shareToken.expiresAt,
      maxAccess: shareToken.maxAccess,
      accessCount: shareToken.accessCount,
      createdAt: shareToken.createdAt,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        trackCount: playlist.trackIds.length,
        totalDuration: playlist.totalDuration,
        artwork: playlist.artwork
      }
    }

    const response: ApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { 
      status: 201,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Playlist sharing API error:', error)
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const action = searchParams.get('action') || 'validate'

    if (!token) {
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Token is required',
        details: 'Please provide a token parameter'
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Validate token
    const validation = validateToken(token)
    if (!validation.valid) {
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Invalid token',
        details: validation.error
      }
      return NextResponse.json(errorResponse, { status: 404 })
    }

    const shareToken = validation.shareToken!

    // Handle different actions
    switch (action) {
      case 'validate':
        // Return token information
        const tokenInfo = {
          token: shareToken.token,
          playlistId: shareToken.playlistId,
          expiresAt: shareToken.expiresAt,
          accessCount: shareToken.accessCount,
          maxAccess: shareToken.maxAccess,
          isPublic: shareToken.isPublic,
          allowDownload: shareToken.allowDownload,
          allowComments: shareToken.allowComments,
          metadata: shareToken.metadata
        }

        const response: ApiResponse<typeof tokenInfo> = {
          success: true,
          data: tokenInfo,
          timestamp: new Date().toISOString()
        }

        return NextResponse.json(response, { status: 200 })

      case 'access':
        // Increment access count
        incrementAccessCount(token)
        
        const accessResponse: ApiResponse = {
          success: true,
          data: { message: 'Access recorded' },
          timestamp: new Date().toISOString()
        }

        return NextResponse.json(accessResponse, { status: 200 })

      case 'stats':
        // Return access statistics
        const stats = {
          accessCount: shareToken.accessCount,
          maxAccess: shareToken.maxAccess,
          remainingAccess: shareToken.maxAccess ? shareToken.maxAccess - shareToken.accessCount : null,
          expiresAt: shareToken.expiresAt,
          isExpired: isTokenExpired(shareToken),
          isAccessLimitReached: isTokenAccessLimitReached(shareToken)
        }

        const statsResponse: ApiResponse<typeof stats> = {
          success: true,
          data: stats,
          timestamp: new Date().toISOString()
        }

        return NextResponse.json(statsResponse, { status: 200 })

      default:
        const errorResponse: ApiResponse = {
          success: false,
          error: 'Invalid action',
          details: `Unknown action: ${action}. Valid actions are: validate, access, stats`
        }
        return NextResponse.json(errorResponse, { status: 400 })
    }

  } catch (error) {
    console.error('Playlist sharing API error:', error)
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Token is required',
        details: 'Please provide a token parameter'
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Check if token exists
    if (!shareTokens.has(token)) {
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Token not found',
        details: 'The provided token does not exist'
      }
      return NextResponse.json(errorResponse, { status: 404 })
    }

    // Delete token
    shareTokens.delete(token)

    const response: ApiResponse = {
      success: true,
      data: { message: 'Share token deleted successfully' },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Playlist sharing API error:', error)
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Handle unsupported methods
export async function PUT(request: NextRequest) {
  const errorResponse: ApiResponse = {
    success: false,
    error: 'Method not allowed',
    details: 'PUT method is not supported for playlist sharing'
  }
  
  return NextResponse.json(errorResponse, { status: 405 })
}

export async function PATCH(request: NextRequest) {
  const errorResponse: ApiResponse = {
    success: false,
    error: 'Method not allowed',
    details: 'PATCH method is not supported for playlist sharing'
  }
  
  return NextResponse.json(errorResponse, { status: 405 })
}
