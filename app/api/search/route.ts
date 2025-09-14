/**
 * Search API endpoint with full-text search across songs, albums, and artists
 * Provides comprehensive search functionality with filtering, sorting, and pagination
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { searchQuerySchema, apiResponseSchema, paginationSchema } from '@/lib/validation/schemas'
import { Track, Album, Artist, Playlist, ApiResponse, PaginationInfo } from '@/lib/types'

// Search result types
export interface SearchResult {
  tracks: Track[]
  albums: Album[]
  artists: Artist[]
  playlists: Playlist[]
  totalResults: number
  pagination: PaginationInfo
}

export interface SearchFilters {
  genre?: string[]
  year?: {
    from?: number
    to?: number
  }
  duration?: {
    min?: number
    max?: number
  }
  explicit?: boolean
  downloadable?: boolean
  popularity?: {
    min?: number
    max?: number
  }
}

export interface SearchOptions {
  query: string
  type?: 'all' | 'tracks' | 'albums' | 'artists' | 'playlists'
  limit?: number
  offset?: number
  sortBy?: 'relevance' | 'popularity' | 'recent' | 'duration' | 'name'
  sortOrder?: 'asc' | 'desc'
  filters?: SearchFilters
}

// Import streaming SDK for real API integration
import { streamingSDKManager, StreamingConfig } from '@/lib/audio/streaming-sdk'

// Fallback mock data for development/testing when streaming SDK is not available
const mockTracks: Track[] = [
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
  },
  {
    id: 'track-4',
    title: 'Sweet Child O\' Mine',
    artists: ['Guns N\' Roses'],
    albumId: 'album-4',
    album: 'Appetite for Destruction',
    durationMs: 356000,
    artwork: '/guns-n-roses-album.jpg',
    territories: ['US', 'UK', 'CA'],
    downloadable: true,
    lyricsAvailable: true,
    explicit: true,
    popularity: 94,
    genres: ['Rock', 'Hard Rock'],
    releaseDate: new Date('1987-07-21'),
    isrc: 'USRC18707840',
    previewUrl: 'https://example.com/preview/sweet-child-o-mine.mp3'
  },
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
]

const mockAlbums: Album[] = [
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
  },
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
  },
  {
    id: 'album-4',
    title: 'Appetite for Destruction',
    artist: 'Guns N\' Roses',
    artists: ['Guns N\' Roses'],
    year: 1987,
    trackCount: 12,
    artwork: '/guns-n-roses-album.jpg',
    duration: 2136,
    genres: ['Rock', 'Hard Rock'],
    label: 'Geffen Records',
    releaseDate: new Date('1987-07-21'),
    albumType: 'album'
  },
  {
    id: 'album-5',
    title: 'Nevermind',
    artist: 'Nirvana',
    artists: ['Nirvana'],
    year: 1991,
    trackCount: 12,
    artwork: '/nirvana-album.jpg',
    duration: 1806,
    genres: ['Grunge', 'Alternative Rock'],
    label: 'DGC Records',
    releaseDate: new Date('1991-09-10'),
    albumType: 'album'
  }
]

const mockArtists: Artist[] = [
  {
    id: 'artist-1',
    name: 'Queen',
    followers: 50000000,
    genres: ['Rock', 'Progressive Rock'],
    artwork: '/queen-album-cover.png',
    verified: true,
    popularity: 95,
    images: ['/queen-album-cover.png']
  },
  {
    id: 'artist-2',
    name: 'Eagles',
    followers: 45000000,
    genres: ['Rock', 'Country Rock'],
    artwork: '/eagles-hotel-california-album-cover.jpg',
    verified: true,
    popularity: 92,
    images: ['/eagles-hotel-california-album-cover.jpg']
  },
  {
    id: 'artist-3',
    name: 'Led Zeppelin',
    followers: 60000000,
    genres: ['Rock', 'Hard Rock'],
    artwork: '/led-zeppelin-iv-inspired-cover.png',
    verified: true,
    popularity: 98,
    images: ['/led-zeppelin-iv-inspired-cover.png']
  },
  {
    id: 'artist-4',
    name: 'Guns N\' Roses',
    followers: 40000000,
    genres: ['Rock', 'Hard Rock'],
    artwork: '/guns-n-roses-album.jpg',
    verified: true,
    popularity: 94,
    images: ['/guns-n-roses-album.jpg']
  },
  {
    id: 'artist-5',
    name: 'Nirvana',
    followers: 35000000,
    genres: ['Grunge', 'Alternative Rock'],
    artwork: '/nirvana-album.jpg',
    verified: true,
    popularity: 96,
    images: ['/nirvana-album.jpg']
  }
]

const mockPlaylists: Playlist[] = [
  {
    id: 'playlist-1',
    name: 'Classic Rock Hits',
    description: 'The greatest classic rock songs of all time',
    trackIds: ['track-1', 'track-2', 'track-3'],
    tracks: mockTracks.slice(0, 3),
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
    tracks: [mockTracks[4]],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    ownerType: 'anonymous',
    isPublic: true,
    artwork: '/nirvana-album.jpg',
    totalDuration: 301000,
    totalTracks: 1
  }
]

// Search utility functions
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, '').trim()
}

function calculateRelevanceScore(item: any, query: string): number {
  const normalizedQuery = normalizeText(query)
  const searchableText = normalizeText(
    `${item.title || item.name} ${item.artists?.join(' ') || item.artist || ''} ${item.album || ''} ${item.genres?.join(' ') || ''}`
  )
  
  // Exact match gets highest score
  if (searchableText.includes(normalizedQuery)) {
    return 100
  }
  
  // Partial match gets medium score
  const words = normalizedQuery.split(' ')
  const matchedWords = words.filter(word => searchableText.includes(word))
  const matchRatio = matchedWords.length / words.length
  
  return Math.round(matchRatio * 80)
}

function filterItems<T extends Track | Album | Artist | Playlist>(
  items: T[],
  query: string,
  filters?: SearchFilters
): T[] {
  const normalizedQuery = normalizeText(query)
  
  return items.filter(item => {
    // Text search
    const searchableText = normalizeText(
      `${item.title || item.name} ${item.artists?.join(' ') || item.artist || ''} ${item.album || ''} ${item.genres?.join(' ') || ''}`
    )
    
    const matchesQuery = searchableText.includes(normalizedQuery)
    
    if (!matchesQuery) return false
    
    // Apply filters
    if (filters) {
      // Genre filter - check if any of the selected genres match
      if (filters.genre && filters.genre.length > 0 && item.genres) {
        const hasMatchingGenre = filters.genre.some(selectedGenre =>
          item.genres!.some(itemGenre =>
            normalizeText(itemGenre).includes(normalizeText(selectedGenre))
          )
        )
        if (!hasMatchingGenre) return false
      }
      
      // Year filter - check if year is within range
      if (filters.year && 'year' in item) {
        const itemYear = item.year
        if (filters.year.from && itemYear < filters.year.from) return false
        if (filters.year.to && itemYear > filters.year.to) return false
      }
      
      // Duration filter - check if duration is within range
      if (filters.duration && 'durationMs' in item) {
        const durationMinutes = (item as any).durationMs / (1000 * 60)
        if (filters.duration.min && durationMinutes < filters.duration.min) return false
        if (filters.duration.max && durationMinutes > filters.duration.max) return false
      }
      
      // Explicit content filter
      if (filters.explicit !== undefined && 'explicit' in item && item.explicit !== filters.explicit) {
        return false
      }
      
      // Downloadable filter
      if (filters.downloadable !== undefined && 'downloadable' in item && item.downloadable !== filters.downloadable) {
        return false
      }
      
      // Popularity filter
      if (filters.popularity && 'popularity' in item) {
        const popularity = (item as any).popularity || 0
        if (filters.popularity.min && popularity < filters.popularity.min) return false
        if (filters.popularity.max && popularity > filters.popularity.max) return false
      }
    }
    
    return true
  })
}

function sortItems<T extends Track | Album | Artist | Playlist>(
  items: T[],
  sortBy: string,
  sortOrder: 'asc' | 'desc',
  query: string
): T[] {
  return items.sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'relevance':
        comparison = calculateRelevanceScore(b, query) - calculateRelevanceScore(a, query)
        break
      case 'popularity':
        comparison = (b.popularity || 0) - (a.popularity || 0)
        break
      case 'recent':
        const aDate = 'releaseDate' in a ? a.releaseDate : 'createdAt' in a ? a.createdAt : new Date(0)
        const bDate = 'releaseDate' in b ? b.releaseDate : 'createdAt' in b ? b.createdAt : new Date(0)
        comparison = new Date(bDate).getTime() - new Date(aDate).getTime()
        break
      case 'duration':
        const aDuration = 'durationMs' in a ? a.durationMs : 'duration' in a ? a.duration * 1000 : 0
        const bDuration = 'durationMs' in b ? b.durationMs : 'duration' in b ? b.duration * 1000 : 0
        comparison = aDuration - bDuration
        break
      case 'name':
        const aName = a.title || a.name
        const bName = b.title || b.name
        comparison = aName.localeCompare(bName)
        break
      default:
        comparison = calculateRelevanceScore(b, query) - calculateRelevanceScore(a, query)
    }
    
    return sortOrder === 'asc' ? -comparison : comparison
  })
}

function paginateItems<T>(items: T[], offset: number, limit: number): { items: T[], total: number } {
  const total = items.length
  const paginatedItems = items.slice(offset, offset + limit)
  
  return { items: paginatedItems, total }
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

// Main search function with real API integration
async function performSearch(options: SearchOptions): Promise<SearchResult> {
  const {
    query,
    type = 'all',
    limit = 20,
    offset = 0,
    sortBy = 'relevance',
    sortOrder = 'desc',
    filters
  } = options

  try {
    // Initialize streaming SDK if not already done
    const config = getStreamingConfig()
    if (!streamingSDKManager.getConfig()) {
      await streamingSDKManager.initialize(config)
    }

    const sdk = streamingSDKManager.getSDK()
    
    // Determine search types for streaming API
    const searchTypes: string[] = []
    if (type === 'all') {
      searchTypes.push('track', 'album', 'artist', 'playlist')
    } else {
      searchTypes.push(type)
    }

    // Perform search using streaming SDK
    const streamingResults = await sdk.search(query, searchTypes, limit, offset)
    
    // Apply additional filtering and sorting if needed
    let tracks = streamingResults.tracks || []
    let albums = streamingResults.albums || []
    let artists = streamingResults.artists || []
    let playlists = streamingResults.playlists || []

    // Apply filters if provided
    if (filters) {
      tracks = filterItems(tracks, query, filters)
      albums = filterItems(albums, query, filters)
      artists = filterItems(artists, query, filters)
      playlists = filterItems(playlists, query, filters)
    }

    // Apply sorting
    tracks = sortItems(tracks, sortBy, sortOrder, query)
    albums = sortItems(albums, sortBy, sortOrder, query)
    artists = sortItems(artists, sortBy, sortOrder, query)
    playlists = sortItems(playlists, sortBy, sortOrder, query)

    // Calculate total results
    const totalResults = tracks.length + albums.length + artists.length + playlists.length

    // Create pagination info
    const pagination: PaginationInfo = {
      offset,
      limit,
      total: totalResults,
      hasNext: streamingResults.hasMore || (offset + limit < totalResults),
      hasPrevious: offset > 0
    }

    return {
      tracks,
      albums,
      artists,
      playlists,
      totalResults,
      pagination
    }

  } catch (error) {
    console.warn('Streaming SDK search failed, falling back to mock data:', error)
    
    // Fallback to mock data if streaming SDK fails
    return performMockSearch(options)
  }
}

// Fallback mock search function
async function performMockSearch(options: SearchOptions): Promise<SearchResult> {
  const {
    query,
    type = 'all',
    limit = 20,
    offset = 0,
    sortBy = 'relevance',
    sortOrder = 'desc',
    filters
  } = options

  let tracks: Track[] = []
  let albums: Album[] = []
  let artists: Artist[] = []
  let playlists: Playlist[] = []

  // Search tracks
  if (type === 'all' || type === 'tracks') {
    const filteredTracks = filterItems(mockTracks, query, filters)
    const sortedTracks = sortItems(filteredTracks, sortBy, sortOrder, query)
    const paginatedTracks = paginateItems(sortedTracks, offset, limit)
    tracks = paginatedTracks.items
  }

  // Search albums
  if (type === 'all' || type === 'albums') {
    const filteredAlbums = filterItems(mockAlbums, query, filters)
    const sortedAlbums = sortItems(filteredAlbums, sortBy, sortOrder, query)
    const paginatedAlbums = paginateItems(sortedAlbums, offset, limit)
    albums = paginatedAlbums.items
  }

  // Search artists
  if (type === 'all' || type === 'artists') {
    const filteredArtists = filterItems(mockArtists, query, filters)
    const sortedArtists = sortItems(filteredArtists, sortBy, sortOrder, query)
    const paginatedArtists = paginateItems(sortedArtists, offset, limit)
    artists = paginatedArtists.items
  }

  // Search playlists
  if (type === 'all' || type === 'playlists') {
    const filteredPlaylists = filterItems(mockPlaylists, query, filters)
    const sortedPlaylists = sortItems(filteredPlaylists, sortBy, sortOrder, query)
    const paginatedPlaylists = paginateItems(sortedPlaylists, offset, limit)
    playlists = paginatedPlaylists.items
  }

  // Calculate total results
  const totalResults = tracks.length + albums.length + artists.length + playlists.length

  // Create pagination info
  const pagination: PaginationInfo = {
    offset,
    limit,
    total: totalResults,
    hasNext: offset + limit < totalResults,
    hasPrevious: offset > 0
  }

  return {
    tracks,
    albums,
    artists,
    playlists,
    totalResults,
    pagination
  }
}

// API route handler
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = {
      query: searchParams.get('query') || '',
      type: searchParams.get('type') as any || 'all',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      sortBy: searchParams.get('sortBy') as any || 'relevance',
      sortOrder: searchParams.get('sortOrder') as any || 'desc',
      filters: (() => {
        const filters: any = {}
        
        if (searchParams.get('genre')) {
          filters.genre = searchParams.get('genre')!.split(',')
        }
        
        const yearFrom = searchParams.get('yearFrom')
        const yearTo = searchParams.get('yearTo')
        if (yearFrom || yearTo) {
          filters.year = {}
          if (yearFrom) filters.year.from = parseInt(yearFrom)
          if (yearTo) filters.year.to = parseInt(yearTo)
        }
        
        const durationMin = searchParams.get('durationMin')
        const durationMax = searchParams.get('durationMax')
        if (durationMin || durationMax) {
          filters.duration = {}
          if (durationMin) filters.duration.min = parseInt(durationMin)
          if (durationMax) filters.duration.max = parseInt(durationMax)
        }
        
        if (searchParams.get('explicit')) {
          filters.explicit = searchParams.get('explicit') === 'true'
        }
        
        if (searchParams.get('downloadable')) {
          filters.downloadable = searchParams.get('downloadable') === 'true'
        }
        
        const popularityMin = searchParams.get('popularityMin')
        const popularityMax = searchParams.get('popularityMax')
        if (popularityMin || popularityMax) {
          filters.popularity = {}
          if (popularityMin) filters.popularity.min = parseInt(popularityMin)
          if (popularityMax) filters.popularity.max = parseInt(popularityMax)
        }
        
        return Object.keys(filters).length > 0 ? filters : undefined
      })()
    }

    // Validate query parameters
    const validationResult = searchQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Invalid query parameters',
        details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const validatedParams = validationResult.data

    // Perform search
    const searchResults = await performSearch(validatedParams)

    // Create successful response
    const response: ApiResponse<SearchResult> = {
      success: true,
      data: searchResults,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Search API error:', error)
    
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
    details: 'Only GET requests are supported for search'
  }
  
  return NextResponse.json(errorResponse, { status: 405 })
}

export async function PUT(request: NextRequest) {
  const errorResponse: ApiResponse = {
    success: false,
    error: 'Method not allowed',
    details: 'Only GET requests are supported for search'
  }
  
  return NextResponse.json(errorResponse, { status: 405 })
}

export async function DELETE(request: NextRequest) {
  const errorResponse: ApiResponse = {
    success: false,
    error: 'Method not allowed',
    details: 'Only GET requests are supported for search'
  }
  
  return NextResponse.json(errorResponse, { status: 405 })
}
