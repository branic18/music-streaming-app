/**
 * Artist detail API endpoint
 * Provides detailed information about a specific artist
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Artist, Album, Track } from '@/lib/types'
import { streamingSDKManager, StreamingConfig } from '@/lib/audio/streaming-sdk'

// Validation schema for artist ID
const artistIdSchema = z.string().min(1).max(100)

// Mock artist data (in production, this would come from a database or external API)
const mockArtists: Record<string, Artist> = {
  'artist-1': {
    id: 'artist-1',
    name: 'Queen',
    followers: 50000000,
    genres: ['Rock', 'Progressive Rock'],
    artwork: '/queen-album-cover.png',
    verified: true,
    popularity: 95,
    images: ['/queen-album-cover.png']
  },
  'artist-2': {
    id: 'artist-2',
    name: 'Eagles',
    followers: 45000000,
    genres: ['Rock', 'Country Rock'],
    artwork: '/eagles-hotel-california-album-cover.jpg',
    verified: true,
    popularity: 92,
    images: ['/eagles-hotel-california-album-cover.jpg']
  },
  'artist-3': {
    id: 'artist-3',
    name: 'Led Zeppelin',
    followers: 60000000,
    genres: ['Rock', 'Hard Rock'],
    artwork: '/led-zeppelin-iv-inspired-cover.png',
    verified: true,
    popularity: 98,
    images: ['/led-zeppelin-iv-inspired-cover.png']
  }
}

// Mock albums for artists
const mockArtistAlbums: Record<string, Album[]> = {
  'artist-1': [
    {
      id: 'album-1',
      title: 'A Night at the Opera',
      artist: 'Queen',
      artists: ['Queen'],
      year: 1975,
      trackCount: 12,
      artwork: '/queen-album-cover.png',
      duration: 2130,
      genres: ['Rock', 'Progressive Rock'],
      label: 'EMI',
      releaseDate: new Date('1975-10-31'),
      albumType: 'album'
    },
    {
      id: 'album-1-2',
      title: 'News of the World',
      artist: 'Queen',
      artists: ['Queen'],
      year: 1977,
      trackCount: 11,
      artwork: '/queen-album-cover.png',
      duration: 1980,
      genres: ['Rock', 'Progressive Rock'],
      label: 'EMI',
      releaseDate: new Date('1977-10-28'),
      albumType: 'album'
    }
  ],
  'artist-2': [
    {
      id: 'album-2',
      title: 'Hotel California',
      artist: 'Eagles',
      artists: ['Eagles'],
      year: 1976,
      trackCount: 9,
      artwork: '/eagles-hotel-california-album-cover.jpg',
      duration: 2346,
      genres: ['Rock', 'Country Rock'],
      label: 'Asylum Records',
      releaseDate: new Date('1976-12-08'),
      albumType: 'album'
    }
  ],
  'artist-3': [
    {
      id: 'album-3',
      title: 'Led Zeppelin IV',
      artist: 'Led Zeppelin',
      artists: ['Led Zeppelin'],
      year: 1971,
      trackCount: 8,
      artwork: '/led-zeppelin-iv-inspired-cover.png',
      duration: 2892,
      genres: ['Rock', 'Hard Rock'],
      label: 'Atlantic Records',
      releaseDate: new Date('1971-11-08'),
      albumType: 'album'
    }
  ]
}

// Mock top tracks for artists
const mockArtistTracks: Record<string, Track[]> = {
  'artist-1': [
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
      id: 'track-1-2',
      title: 'We Will Rock You',
      artists: ['Queen'],
      albumId: 'album-1-2',
      album: 'News of the World',
      durationMs: 122000,
      artwork: '/queen-album-cover.png',
      territories: ['US', 'UK', 'CA'],
      downloadable: true,
      lyricsAvailable: true,
      explicit: false,
      popularity: 93,
      genres: ['Rock'],
      releaseDate: new Date('1977-10-28'),
      isrc: 'GBUM71029603',
      previewUrl: 'https://example.com/preview/we-will-rock-you.mp3'
    }
  ],
  'artist-2': [
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
    }
  ],
  'artist-3': [
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
  ]
}

// Streaming SDK configuration
const getStreamingConfig = (): StreamingConfig => {
  return {
    provider: (process.env.STREAMING_PROVIDER as any) || 'mock',
    apiKey: process.env.STREAMING_API_KEY,
    clientId: process.env.STREAMING_CLIENT_ID,
    clientSecret: process.env.STREAMING_CLIENT_SECRET,
    redirectUri: process.env.STREAMING_REDIRECT_URI,
    accessToken: process.env.STREAMING_ACCESS_TOKEN,
    refreshToken: process.env.STREAMING_REFRESH_TOKEN,
    quality: 'high',
    enableDRM: true,
    enableOffline: true,
    maxBitrate: 320,
    bufferSize: 1024 * 1024 // 1MB
  }
}

// API route handler
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const artistId = params.id

    // Validate artist ID
    const validationResult = artistIdSchema.safeParse(artistId)
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid artist ID',
        details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 })
    }

    try {
      // Try to get artist from streaming SDK first
      const config = getStreamingConfig()
      if (!streamingSDKManager.getConfig()) {
        await streamingSDKManager.initialize(config)
      }

      const sdk = streamingSDKManager.getSDK()
      const artist = await sdk.getArtist(artistId)
      const albums = mockArtistAlbums[artistId] || []
      const topTracks = mockArtistTracks[artistId] || []

      return NextResponse.json({
        success: true,
        data: {
          artist,
          albums,
          topTracks
        },
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.warn('Streaming SDK artist fetch failed, falling back to mock data:', error)
      
      // Fallback to mock data
      const artist = mockArtists[artistId]
      if (!artist) {
        return NextResponse.json({
          success: false,
          error: 'Artist not found',
          details: `No artist found with ID: ${artistId}`
        }, { status: 404 })
      }

      const albums = mockArtistAlbums[artistId] || []
      const topTracks = mockArtistTracks[artistId] || []

      return NextResponse.json({
        success: true,
        data: {
          artist,
          albums,
          topTracks
        },
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Artist detail API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed',
    details: 'Only GET requests are supported for artist details'
  }, { status: 405 })
}
