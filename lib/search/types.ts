/**
 * Search-related type definitions
 */

import { Track, Album, Artist, Playlist } from '@/lib/types'

// Search result types
export interface SearchResults {
  tracks: Track[]
  albums: Album[]
  artists: Artist[]
  playlists: Playlist[]
  totalResults: number
  pagination: {
    offset: number
    limit: number
    total: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

// Search filters
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

// Search options
export interface SearchOptions {
  query: string
  type?: 'all' | 'tracks' | 'albums' | 'artists' | 'playlists'
  limit?: number
  offset?: number
  sortBy?: 'relevance' | 'popularity' | 'recent' | 'duration' | 'name'
  sortOrder?: 'asc' | 'desc'
  filters?: SearchFilters
}

// Search suggestion
export interface SearchSuggestion {
  id: string
  text: string
  type: 'track' | 'album' | 'artist' | 'playlist' | 'genre'
  popularity?: number
}

// Search history entry
export interface SearchHistoryEntry {
  id: string
  query: string
  timestamp: Date
  resultCount: number
  filters?: SearchFilters
}
