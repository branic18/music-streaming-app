/**
 * Core data type definitions for the Music Streaming MVP
 * Based on PRD requirements and existing component interfaces
 */

// ============================================================================
// CORE ENTITIES
// ============================================================================

/**
 * Track entity - represents a single audio track
 * Based on PRD requirements: id, title, artists, albumId, durationMs, artwork, territories, downloadable, lyricsAvailable, explicit, popularity
 */
export interface Track {
  id: string
  title: string
  artists: string[] // Changed from single artist to array as per PRD
  albumId: string // Changed from album name to albumId as per PRD
  album?: string // Keep album name for display purposes
  durationMs: number // Changed from duration (seconds) to durationMs as per PRD
  artwork: string
  territories: string[] // Available territories for licensing
  downloadable: boolean
  lyricsAvailable: boolean
  explicit: boolean
  popularity: number
  // Additional fields for enhanced functionality
  genres?: string[]
  releaseDate?: Date
  isrc?: string // International Standard Recording Code
  previewUrl?: string // 30-second preview URL
  externalUrls?: Record<string, string> // Links to external services
}

/**
 * Album entity - represents a collection of tracks
 */
export interface Album {
  id: string
  title: string
  artist: string
  artists?: string[] // Support for multiple artists
  year: number
  trackCount: number
  artwork: string
  duration: number // Total duration in seconds
  // Additional fields
  genres?: string[]
  label?: string
  releaseDate?: Date
  albumType?: 'album' | 'single' | 'compilation' | 'ep'
  externalUrls?: Record<string, string>
}

/**
 * Artist entity - represents a musical artist
 */
export interface Artist {
  id: string
  name: string
  followers: number
  genres: string[]
  artwork: string
  verified: boolean
  // Additional fields
  popularity?: number
  externalUrls?: Record<string, string>
  images?: string[] // Multiple artist images
}

/**
 * Playlist entity - represents a user-created or curated playlist
 * Based on PRD requirements: id, name, description, trackIds[], createdAt, updatedAt, ownerType=anonymous, shareToken?, isPublic
 */
export interface Playlist {
  id: string
  name: string
  description?: string
  trackIds: string[] // Array of track IDs as per PRD
  tracks?: Track[] // Full track objects for convenience
  createdAt: Date
  updatedAt: Date
  ownerType: 'anonymous' | 'user' // As per PRD requirement
  shareToken?: string
  isPublic: boolean
  artwork?: string
  // Additional fields
  totalDuration?: number
  totalTracks?: number
  externalUrls?: Record<string, string>
}

/**
 * Queue state - represents the current playback queue
 * Based on PRD requirements: nowPlaying, upNext[], history[]; persisted per device
 */
export interface Queue {
  nowPlaying: Track | null
  upNext: Track[]
  history: Track[]
  // Additional queue management
  shuffleMode: boolean
  repeatMode: 'off' | 'all' | 'one'
  currentTime: number
  volume: number
  isPlaying: boolean
  isBuffering: boolean
  lastUpdated: Date
}

/**
 * Library item - represents saved/liked content
 */
export interface LibraryItem {
  id: string
  type: 'track' | 'album' | 'artist' | 'playlist'
  itemId: string // Reference to the actual item
  addedAt: Date
  // Additional metadata
  source?: 'user' | 'recommendation' | 'import'
  tags?: string[]
}

/**
 * Lyrics entity - represents track lyrics
 */
export interface Lyrics {
  trackId: string
  static?: string // Static lyrics text
  synced?: Array<{
    time: number // Time in seconds
    text: string
  }>
  provider?: string // Lyrics provider name
  language?: string
  copyright?: string
  lastUpdated?: Date
}

// ============================================================================
// DOWNLOAD & OFFLINE ENTITIES
// ============================================================================

/**
 * Download item - represents a track being downloaded for offline use
 */
export interface DownloadItem {
  id: string
  track: Track
  status: 'queued' | 'downloading' | 'completed' | 'failed' | 'paused' | 'cancelled'
  progress: number // 0-100
  downloadedAt?: Date
  fileSize: number // Size in bytes
  quality: 'low' | 'medium' | 'high' | 'lossless'
  error?: string
  retryCount: number
  maxRetries: number
  // License and security
  licenseExpiry?: Date
  encrypted: boolean
  checksum?: string // For integrity verification
}

/**
 * Offline storage info - represents offline storage usage and management
 */
export interface OfflineStorageInfo {
  totalUsed: number // Total bytes used
  totalAvailable: number // Total bytes available
  downloadCount: number // Number of downloaded tracks
  lastCleanup?: Date
  quotaExceeded: boolean
}

// ============================================================================
// SEARCH & DISCOVERY ENTITIES
// ============================================================================

/**
 * Search result - represents a search result item
 */
export interface SearchResult {
  tracks: Track[]
  albums: Album[]
  artists: Artist[]
  playlists: Playlist[]
  total: number
  query: string
  filters?: SearchFilters
  sortBy?: string
  page: number
  limit: number
  hasMore: boolean
}

/**
 * Search filters - represents search filter options
 */
export interface SearchFilters {
  type?: 'tracks' | 'albums' | 'artists' | 'playlists' | 'all'
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

/**
 * Search suggestion - represents search autocomplete suggestions
 */
export interface SearchSuggestion {
  id: string
  text: string
  type: 'track' | 'album' | 'artist' | 'playlist' | 'genre'
  popularity?: number
}

// ============================================================================
// ANALYTICS & EVENTS
// ============================================================================

/**
 * Analytics event - represents a user interaction or system event
 * Based on PRD requirements: event timestamps, event types, anonymous session id; no PII
 */
export interface AnalyticsEvent {
  id: string
  type: string
  timestamp: Date
  sessionId: string // Anonymous session ID
  // Event-specific data (no PII)
  data?: Record<string, any>
  // Technical metadata
  userAgent?: string
  url?: string
  referrer?: string
  // Performance data
  loadTime?: number
  errorCode?: string
}

/**
 * Session data - represents a user session
 */
export interface Session {
  id: string
  startTime: Date
  lastActivity: Date
  events: AnalyticsEvent[]
  // Technical metadata
  userAgent: string
  screenResolution?: string
  timezone?: string
  language?: string
}

// ============================================================================
// PRIVACY & COMPLIANCE
// ============================================================================

/**
 * Consent preferences - represents user privacy consent
 */
export interface ConsentPreferences {
  analytics: boolean
  cookies: boolean
  storage: boolean
  personalization: boolean
  lastUpdated: Date
  version: string // Privacy policy version
}

/**
 * Privacy settings - represents user privacy configuration
 */
export interface PrivacySettings {
  consent: ConsentPreferences
  dataRetention: {
    analytics: number // Days to retain analytics data
    playlists: number // Days to retain playlist data
    downloads: number // Days to retain download data
  }
  shareData: boolean
  personalizedRecommendations: boolean
}

// ============================================================================
// AUDIO & PLAYBACK
// ============================================================================

/**
 * Audio settings - represents audio playback configuration
 */
export interface AudioSettings {
  crossfadeEnabled: boolean
  crossfadeDuration: number // Seconds
  gaplessEnabled: boolean
  normalizeVolume: boolean
  audioQuality: 'low' | 'medium' | 'high' | 'lossless'
  // Advanced settings
  replayGain: boolean
  loudnessNormalization: boolean
  dynamicRange: 'compressed' | 'standard' | 'extended'
}

/**
 * Playback state - represents current playback information
 */
export interface PlaybackState {
  track: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isBuffering: boolean
  isMuted: boolean
  repeatMode: 'off' | 'all' | 'one'
  shuffleMode: boolean
  // Error handling
  error?: string
  retryCount: number
}

// ============================================================================
// API & EXTERNAL SERVICES
// ============================================================================

/**
 * API response - represents a standard API response
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: Date
  requestId?: string
}

/**
 * Pagination info - represents pagination metadata
 */
export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

/**
 * External service configuration - represents third-party service settings
 */
export interface ExternalServiceConfig {
  name: string
  enabled: boolean
  apiKey?: string
  baseUrl: string
  rateLimit?: {
    requests: number
    window: number // Seconds
  }
  timeout: number // Milliseconds
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * App error - represents application errors
 */
export interface AppError {
  code: string
  message: string
  details?: string
  timestamp: Date
  stack?: string
  context?: Record<string, any>
  severity: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Network error - represents network-related errors
 */
export interface NetworkError extends AppError {
  statusCode?: number
  url?: string
  method?: string
  retryable: boolean
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Generic entity with common fields
 */
export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Entity with soft delete support
 */
export interface SoftDeleteEntity extends BaseEntity {
  deletedAt?: Date
  isDeleted: boolean
}

/**
 * Entity with versioning support
 */
export interface VersionedEntity extends BaseEntity {
  version: number
}

/**
 * Generic response wrapper
 */
export interface ResponseWrapper<T> {
  data: T
  meta?: {
    pagination?: PaginationInfo
    filters?: Record<string, any>
    sort?: Record<string, any>
  }
  errors?: AppError[]
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if an object is a Track
 */
export function isTrack(obj: any): obj is Track {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    Array.isArray(obj.artists) &&
    typeof obj.durationMs === 'number' &&
    typeof obj.artwork === 'string'
  )
}

/**
 * Type guard to check if an object is an Album
 */
export function isAlbum(obj: any): obj is Album {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.artist === 'string' &&
    typeof obj.year === 'number' &&
    typeof obj.trackCount === 'number'
  )
}

/**
 * Type guard to check if an object is an Artist
 */
export function isArtist(obj: any): obj is Artist {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.followers === 'number' &&
    Array.isArray(obj.genres) &&
    typeof obj.verified === 'boolean'
  )
}

/**
 * Type guard to check if an object is a Playlist
 */
export function isPlaylist(obj: any): obj is Playlist {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.trackIds) &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date &&
    typeof obj.isPublic === 'boolean'
  )
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default values for various entities
 */
export const DEFAULT_VALUES = {
  TRACK: {
    durationMs: 0,
    explicit: false,
    downloadable: false,
    lyricsAvailable: false,
    popularity: 0,
    territories: [],
    artists: [],
  } as Partial<Track>,
  
  ALBUM: {
    year: new Date().getFullYear(),
    trackCount: 0,
    duration: 0,
    genres: [],
  } as Partial<Album>,
  
  ARTIST: {
    followers: 0,
    genres: [],
    verified: false,
    popularity: 0,
  } as Partial<Artist>,
  
  PLAYLIST: {
    trackIds: [],
    isPublic: false,
    ownerType: 'anonymous' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Partial<Playlist>,
  
  QUEUE: {
    nowPlaying: null,
    upNext: [],
    history: [],
    shuffleMode: false,
    repeatMode: 'off' as const,
    currentTime: 0,
    volume: 75,
    isPlaying: false,
    isBuffering: false,
    lastUpdated: new Date(),
  } as Partial<Queue>,
  
  AUDIO_SETTINGS: {
    crossfadeEnabled: false,
    crossfadeDuration: 3,
    gaplessEnabled: true,
    normalizeVolume: true,
    audioQuality: 'high' as const,
    replayGain: false,
    loudnessNormalization: true,
    dynamicRange: 'standard' as const,
  } as Partial<AudioSettings>,
} as const

/**
 * Validation constraints
 */
export const VALIDATION_CONSTRAINTS = {
  TRACK: {
    TITLE_MAX_LENGTH: 200,
    ARTISTS_MAX_COUNT: 10,
    DURATION_MAX_MS: 3600000, // 1 hour
    POPULARITY_MIN: 0,
    POPULARITY_MAX: 100,
  },
  
  ALBUM: {
    TITLE_MAX_LENGTH: 200,
    YEAR_MIN: 1900,
    YEAR_MAX: new Date().getFullYear() + 1,
    TRACK_COUNT_MAX: 100,
  },
  
  ARTIST: {
    NAME_MAX_LENGTH: 100,
    GENRES_MAX_COUNT: 20,
    FOLLOWERS_MIN: 0,
  },
  
  PLAYLIST: {
    NAME_MAX_LENGTH: 100,
    DESCRIPTION_MAX_LENGTH: 500,
    TRACKS_MAX_COUNT: 1000,
  },
} as const
