/**
 * Data validation schemas using Zod
 * Provides comprehensive validation for all entities in the music streaming app
 */

import { z } from 'zod'

// Base schemas for common patterns
const idSchema = z.string().min(1, 'ID cannot be empty')
const urlSchema = z.string().url('Must be a valid URL')
const dateSchema = z.string().datetime('Must be a valid ISO datetime string')
const positiveNumberSchema = z.number().positive('Must be a positive number')
const nonNegativeNumberSchema = z.number().min(0, 'Must be a non-negative number')

// Artist schema
export const artistSchema = z.object({
  id: idSchema,
  name: z.string().min(1, 'Artist name cannot be empty').max(200, 'Artist name too long'),
  artwork: urlSchema.optional(),
  genre: z.string().max(100, 'Genre name too long').optional(),
  followerCount: nonNegativeNumberSchema.optional(),
  isLiked: z.boolean().optional(),
  addedAt: dateSchema.optional(),
})

// Album schema
export const albumSchema = z.object({
  id: idSchema,
  title: z.string().min(1, 'Album title cannot be empty').max(200, 'Album title too long'),
  artists: z.array(artistSchema).min(1, 'Album must have at least one artist'),
  artwork: urlSchema.optional(),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Release date must be in YYYY-MM-DD format').optional(),
  genre: z.string().max(100, 'Genre name too long').optional(),
  trackCount: positiveNumberSchema.optional(),
  durationMs: nonNegativeNumberSchema.optional(),
  isLiked: z.boolean().optional(),
  addedAt: dateSchema.optional(),
})

// Track schema
export const trackSchema = z.object({
  id: idSchema,
  title: z.string().min(1, 'Track title cannot be empty').max(200, 'Track title too long'),
  artists: z.array(artistSchema).min(1, 'Track must have at least one artist'),
  album: albumSchema.optional(),
  durationMs: positiveNumberSchema,
  artwork: urlSchema.optional(),
  audioUrl: urlSchema.optional(),
  genre: z.string().max(100, 'Genre name too long').optional(),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Release date must be in YYYY-MM-DD format').optional(),
  trackNumber: positiveNumberSchema.optional(),
  discNumber: positiveNumberSchema.optional(),
  isExplicit: z.boolean().optional(),
  isLiked: z.boolean().optional(),
  playCount: nonNegativeNumberSchema.optional(),
  lastPlayed: dateSchema.nullable().optional(),
  addedAt: dateSchema.optional(),
})

// Playlist schema
export const playlistSchema = z.object({
  id: idSchema,
  name: z.string().min(1, 'Playlist name cannot be empty').max(200, 'Playlist name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  artwork: urlSchema.optional(),
  trackCount: nonNegativeNumberSchema.optional(),
  durationMs: nonNegativeNumberSchema.optional(),
  isPublic: z.boolean().optional(),
  isLiked: z.boolean().optional(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
})

// Queue schema
export const queueSchema = z.object({
  id: idSchema,
  name: z.string().min(1, 'Queue name cannot be empty').max(200, 'Queue name too long'),
  tracks: z.array(trackSchema),
  currentIndex: z.number().int().min(0, 'Current index must be non-negative'),
  shuffleMode: z.boolean().optional(),
  repeatMode: z.enum(['none', 'one', 'all']).optional(),
  history: z.array(trackSchema).optional(),
})

// Library item schema
export const libraryItemSchema = z.object({
  id: idSchema,
  type: z.enum(['track', 'album', 'artist', 'playlist']),
  item: z.union([trackSchema, albumSchema, artistSchema, playlistSchema]),
  addedAt: dateSchema,
})

// Lyrics schema
export const lyricsSchema = z.object({
  id: idSchema,
  trackId: idSchema,
  text: z.string().min(1, 'Lyrics text cannot be empty'),
  language: z.string().length(2, 'Language must be a 2-character code').optional(),
  isSynced: z.boolean().optional(),
})

// Download item schema
export const downloadItemSchema = z.object({
  id: idSchema,
  trackId: idSchema,
  status: z.enum(['pending', 'downloading', 'completed', 'failed', 'cancelled']),
  progress: z.number().min(0).max(100, 'Progress must be between 0 and 100'),
  downloadedAt: dateSchema.optional(),
  filePath: z.string().min(1, 'File path cannot be empty').optional(),
  fileSize: nonNegativeNumberSchema.optional(),
})

// Audio settings schemas
export const eqSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  low: z.number().min(-12).max(12, 'EQ value must be between -12 and 12').optional(),
  mid: z.number().min(-12).max(12, 'EQ value must be between -12 and 12').optional(),
  high: z.number().min(-12).max(12, 'EQ value must be between -12 and 12').optional(),
  preset: z.enum(['flat', 'pop', 'rock', 'jazz', 'classical', 'vocal', 'bass', 'treble']).optional(),
})

export const crossfadeSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  duration: z.number().min(0).max(10000, 'Crossfade duration must be between 0 and 10000ms').optional(),
  fadeIn: z.boolean().optional(),
  fadeOut: z.boolean().optional(),
  curve: z.enum(['linear', 'exponential', 'logarithmic', 's-curve']).optional(),
})

export const gaplessSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  preloadNext: z.boolean().optional(),
  preloadDuration: z.number().min(1000).max(30000, 'Preload duration must be between 1000 and 30000ms').optional(),
  bufferSize: z.number().min(10).max(60, 'Buffer size must be between 10 and 60 seconds').optional(),
})

export const normalizationSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  targetLufs: z.number().min(-23).max(-1, 'Target LUFS must be between -23 and -1').optional(),
  preventClipping: z.boolean().optional(),
})

export const spatialSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  mode: z.enum(['stereo', 'mono', 'surround']).optional(),
  intensity: z.number().min(0).max(1, 'Intensity must be between 0 and 1').optional(),
})

export const advancedSettingsSchema = z.object({
  sampleRate: z.number().int().min(8000).max(192000, 'Sample rate must be between 8000 and 192000 Hz').optional(),
  bitDepth: z.number().int().min(8).max(32, 'Bit depth must be between 8 and 32 bits').optional(),
  bufferSize: z.number().int().min(256).max(16384, 'Buffer size must be between 256 and 16384 samples').optional(),
  latency: z.number().min(0).max(1000, 'Latency must be between 0 and 1000ms').optional(),
})

export const audioSettingsSchema = z.object({
  volume: z.number().min(0).max(1, 'Volume must be between 0 and 1'),
  muted: z.boolean().optional(),
  eq: eqSettingsSchema.optional(),
  crossfade: crossfadeSettingsSchema.optional(),
  gapless: gaplessSettingsSchema.optional(),
  normalization: normalizationSettingsSchema.optional(),
  spatial: spatialSettingsSchema.optional(),
  advanced: advancedSettingsSchema.optional(),
})

// Consent preferences schema
export const consentPreferencesSchema = z.object({
  analytics: z.boolean(),
  personalization: z.boolean(),
  marketing: z.boolean(),
  dataSharing: z.boolean(),
  updatedAt: dateSchema,
})

// Error log schema
export const errorLogSchema = z.object({
  id: idSchema,
  timestamp: dateSchema,
  level: z.enum(['error', 'warn', 'info', 'debug']),
  message: z.string().min(1, 'Error message cannot be empty'),
  stack: z.string().optional(),
  context: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
})

// App error schema
export const appErrorSchema = z.object({
  id: idSchema,
  code: z.string().min(1, 'Error code cannot be empty'),
  message: z.string().min(1, 'Error message cannot be empty'),
  category: z.enum(['network', 'audio', 'storage', 'validation', 'permission', 'unknown']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  timestamp: dateSchema,
  context: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  stack: z.string().optional(),
})

// Performance metric schema
export const performanceMetricSchema = z.object({
  id: idSchema,
  type: z.enum(['timing', 'counter', 'gauge', 'histogram', 'custom']),
  category: z.enum(['audio', 'ui', 'network', 'storage', 'rendering', 'memory', 'user_interaction', 'system']),
  name: z.string().min(1, 'Metric name cannot be empty'),
  value: z.number(),
  unit: z.string().min(1, 'Unit cannot be empty'),
  timestamp: dateSchema,
  context: z.object({
    userId: z.string().optional(),
    sessionId: z.string().optional(),
    component: z.string().optional(),
    action: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }).optional(),
})

// Search query schema
export const searchQuerySchema = z.object({
  query: z.string().min(1, 'Search query cannot be empty').max(200, 'Search query too long'),
  type: z.enum(['all', 'tracks', 'albums', 'artists', 'playlists']).optional(),
  limit: z.number().int().min(1).max(100, 'Limit must be between 1 and 100').optional(),
  offset: z.number().int().min(0, 'Offset must be non-negative').optional(),
  sortBy: z.enum(['relevance', 'popularity', 'recent', 'duration', 'name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  filters: z.object({
    genre: z.string().optional(),
    year: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
    duration: z.object({
      min: z.number().min(0).optional(),
      max: z.number().min(0).optional(),
    }).optional(),
    explicit: z.boolean().optional(),
  }).optional(),
})

// Playlist share token schema
export const playlistShareTokenSchema = z.object({
  token: z.string().min(1, 'Token cannot be empty'),
  playlistId: idSchema,
  expiresAt: dateSchema,
  createdAt: dateSchema,
  accessCount: nonNegativeNumberSchema.optional(),
  maxAccess: z.number().int().min(1).optional(),
})

// API response schemas
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }).optional(),
  metadata: z.object({
    timestamp: dateSchema,
    requestId: z.string().optional(),
    version: z.string().optional(),
  }).optional(),
})

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1'),
  limit: z.number().int().min(1).max(100, 'Limit must be between 1 and 100'),
  total: z.number().int().min(0, 'Total must be non-negative'),
  totalPages: z.number().int().min(0, 'Total pages must be non-negative'),
})

// Paginated response schema
export const paginatedResponseSchema = z.object({
  data: z.array(z.any()),
  pagination: paginationSchema,
})

// Export all schemas
export const schemas = {
  // Core entities
  artist: artistSchema,
  album: albumSchema,
  track: trackSchema,
  playlist: playlistSchema,
  queue: queueSchema,
  libraryItem: libraryItemSchema,
  lyrics: lyricsSchema,
  downloadItem: downloadItemSchema,
  
  // Settings
  audioSettings: audioSettingsSchema,
  eqSettings: eqSettingsSchema,
  crossfadeSettings: crossfadeSettingsSchema,
  gaplessSettings: gaplessSettingsSchema,
  normalizationSettings: normalizationSettingsSchema,
  spatialSettings: spatialSettingsSchema,
  advancedSettings: advancedSettingsSchema,
  consentPreferences: consentPreferencesSchema,
  
  // System
  errorLog: errorLogSchema,
  appError: appErrorSchema,
  performanceMetric: performanceMetricSchema,
  
  // API
  searchQuery: searchQuerySchema,
  playlistShareToken: playlistShareTokenSchema,
  apiResponse: apiResponseSchema,
  pagination: paginationSchema,
  paginatedResponse: paginatedResponseSchema,
}

// Type exports for TypeScript
export type ArtistInput = z.input<typeof artistSchema>
export type ArtistOutput = z.output<typeof artistSchema>
export type AlbumInput = z.input<typeof albumSchema>
export type AlbumOutput = z.output<typeof albumSchema>
export type TrackInput = z.input<typeof trackSchema>
export type TrackOutput = z.output<typeof trackSchema>
export type PlaylistInput = z.input<typeof playlistSchema>
export type PlaylistOutput = z.output<typeof playlistSchema>
export type QueueInput = z.input<typeof queueSchema>
export type QueueOutput = z.output<typeof queueSchema>
export type LibraryItemInput = z.input<typeof libraryItemSchema>
export type LibraryItemOutput = z.output<typeof libraryItemSchema>
export type LyricsInput = z.input<typeof lyricsSchema>
export type LyricsOutput = z.output<typeof lyricsSchema>
export type DownloadItemInput = z.input<typeof downloadItemSchema>
export type DownloadItemOutput = z.output<typeof downloadItemSchema>
export type AudioSettingsInput = z.input<typeof audioSettingsSchema>
export type AudioSettingsOutput = z.output<typeof audioSettingsSchema>
export type ConsentPreferencesInput = z.input<typeof consentPreferencesSchema>
export type ConsentPreferencesOutput = z.output<typeof consentPreferencesSchema>
export type ErrorLogInput = z.input<typeof errorLogSchema>
export type ErrorLogOutput = z.output<typeof errorLogSchema>
export type AppErrorInput = z.input<typeof appErrorSchema>
export type AppErrorOutput = z.output<typeof appErrorSchema>
export type PerformanceMetricInput = z.input<typeof performanceMetricSchema>
export type PerformanceMetricOutput = z.output<typeof performanceMetricSchema>
export type SearchQueryInput = z.input<typeof searchQuerySchema>
export type SearchQueryOutput = z.output<typeof searchQuerySchema>

// Search suggestions schema
export const suggestionsQuerySchema = z.object({
  query: z.string().min(1).max(100),
  limit: z.number().min(1).max(20).optional().default(10)
})

export type SuggestionsQueryInput = z.input<typeof suggestionsQuerySchema>
export type SuggestionsQueryOutput = z.output<typeof suggestionsQuerySchema>
export type PlaylistShareTokenInput = z.input<typeof playlistShareTokenSchema>
export type PlaylistShareTokenOutput = z.output<typeof playlistShareTokenSchema>
export type ApiResponseInput = z.input<typeof apiResponseSchema>
export type ApiResponseOutput = z.output<typeof apiResponseSchema>
export type PaginationInput = z.input<typeof paginationSchema>
export type PaginationOutput = z.output<typeof paginationSchema>
export type PaginatedResponseInput = z.input<typeof paginatedResponseSchema>
export type PaginatedResponseOutput = z.output<typeof paginatedResponseSchema>
