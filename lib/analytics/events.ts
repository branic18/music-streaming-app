/**
 * Analytics event tracking system
 * Handles collection, validation, and processing of analytics events
 */

import { z } from 'zod'

// Event type definitions
export const EventType = {
  // User interaction events
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_REGISTER: 'user_register',
  
  // Playback events
  TRACK_PLAY: 'track_play',
  TRACK_PAUSE: 'track_pause',
  TRACK_SKIP: 'track_skip',
  TRACK_SEEK: 'track_seek',
  TRACK_FINISH: 'track_finish',
  TRACK_REPEAT: 'track_repeat',
  TRACK_SHUFFLE: 'track_shuffle',
  
  // Search events
  SEARCH_QUERY: 'search_query',
  SEARCH_RESULT_CLICK: 'search_result_click',
  SEARCH_NO_RESULTS: 'search_no_results',
  
  // Playlist events
  PLAYLIST_CREATE: 'playlist_create',
  PLAYLIST_ADD_TRACK: 'playlist_add_track',
  PLAYLIST_REMOVE_TRACK: 'playlist_remove_track',
  PLAYLIST_DELETE: 'playlist_delete',
  PLAYLIST_SHARE: 'playlist_share',
  PLAYLIST_VIEW: 'playlist_view',
  
  // Library events
  LIBRARY_ADD: 'library_add',
  LIBRARY_REMOVE: 'library_remove',
  LIBRARY_DOWNLOAD: 'library_download',
  
  // UI events
  PAGE_VIEW: 'page_view',
  BUTTON_CLICK: 'button_click',
  MODAL_OPEN: 'modal_open',
  MODAL_CLOSE: 'modal_close',
  
  // Error events
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',
  
  // Performance events
  PAGE_LOAD_TIME: 'page_load_time',
  API_RESPONSE_TIME: 'api_response_time',
  AUDIO_BUFFER_TIME: 'audio_buffer_time',
  
  // Feature usage events
  FEATURE_USAGE: 'feature_usage',
  SETTINGS_CHANGE: 'settings_change',
  
  // Offline events
  OFFLINE_DOWNLOAD: 'offline_download',
  OFFLINE_PLAY: 'offline_play',
  OFFLINE_SYNC: 'offline_sync'
} as const

export type EventType = typeof EventType[keyof typeof EventType]

// Event schemas
export const BaseEventSchema = z.object({
  eventType: z.nativeEnum(EventType),
  timestamp: z.date(),
  sessionId: z.string().uuid(),
  userId: z.string().optional(),
  deviceId: z.string().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().ip().optional(),
  country: z.string().length(2).optional(),
  language: z.string().length(2).optional(),
  platform: z.enum(['web', 'ios', 'android', 'desktop']).optional(),
  version: z.string().optional(),
  properties: z.record(z.any()).optional()
})

export const PlaybackEventSchema = BaseEventSchema.extend({
  eventType: z.enum([
    EventType.TRACK_PLAY,
    EventType.TRACK_PAUSE,
    EventType.TRACK_SKIP,
    EventType.TRACK_SEEK,
    EventType.TRACK_FINISH,
    EventType.TRACK_REPEAT,
    EventType.TRACK_SHUFFLE
  ]),
  properties: z.object({
    trackId: z.string(),
    trackTitle: z.string(),
    artistName: z.string(),
    albumName: z.string().optional(),
    duration: z.number().positive().optional(),
    position: z.number().nonnegative().optional(),
    quality: z.enum(['low', 'medium', 'high', 'lossless']).optional(),
    source: z.enum(['streaming', 'offline', 'local']).optional(),
    volume: z.number().min(0).max(100).optional(),
    crossfade: z.boolean().optional(),
    gapless: z.boolean().optional()
  })
})

export const SearchEventSchema = BaseEventSchema.extend({
  eventType: z.enum([
    EventType.SEARCH_QUERY,
    EventType.SEARCH_RESULT_CLICK,
    EventType.SEARCH_NO_RESULTS
  ]),
  properties: z.object({
    query: z.string(),
    resultCount: z.number().nonnegative().optional(),
    resultType: z.enum(['tracks', 'albums', 'artists', 'playlists']).optional(),
    selectedResultId: z.string().optional(),
    selectedResultType: z.enum(['track', 'album', 'artist', 'playlist']).optional(),
    searchTime: z.number().positive().optional(),
    filters: z.record(z.any()).optional()
  })
})

export const PlaylistEventSchema = BaseEventSchema.extend({
  eventType: z.enum([
    EventType.PLAYLIST_CREATE,
    EventType.PLAYLIST_ADD_TRACK,
    EventType.PLAYLIST_REMOVE_TRACK,
    EventType.PLAYLIST_DELETE,
    EventType.PLAYLIST_SHARE,
    EventType.PLAYLIST_VIEW
  ]),
  properties: z.object({
    playlistId: z.string(),
    playlistName: z.string().optional(),
    trackId: z.string().optional(),
    trackCount: z.number().nonnegative().optional(),
    isPublic: z.boolean().optional(),
    shareToken: z.string().optional(),
    shareExpiry: z.date().optional()
  })
})

export const LibraryEventSchema = BaseEventSchema.extend({
  eventType: z.enum([
    EventType.LIBRARY_ADD,
    EventType.LIBRARY_REMOVE,
    EventType.LIBRARY_DOWNLOAD
  ]),
  properties: z.object({
    trackId: z.string(),
    trackTitle: z.string(),
    artistName: z.string(),
    albumName: z.string().optional(),
    downloadSize: z.number().positive().optional(),
    downloadTime: z.number().positive().optional(),
    storageUsed: z.number().nonnegative().optional()
  })
})

export const UIEventSchema = BaseEventSchema.extend({
  eventType: z.enum([
    EventType.PAGE_VIEW,
    EventType.BUTTON_CLICK,
    EventType.MODAL_OPEN,
    EventType.MODAL_CLOSE
  ]),
  properties: z.object({
    page: z.string().optional(),
    component: z.string().optional(),
    action: z.string().optional(),
    modalType: z.string().optional(),
    duration: z.number().positive().optional()
  })
})

export const ErrorEventSchema = BaseEventSchema.extend({
  eventType: z.enum([
    EventType.ERROR_OCCURRED,
    EventType.API_ERROR
  ]),
  properties: z.object({
    errorType: z.string(),
    errorMessage: z.string(),
    errorCode: z.string().optional(),
    stackTrace: z.string().optional(),
    component: z.string().optional(),
    apiEndpoint: z.string().optional(),
    statusCode: z.number().optional(),
    retryCount: z.number().nonnegative().optional()
  })
})

export const PerformanceEventSchema = BaseEventSchema.extend({
  eventType: z.enum([
    EventType.PAGE_LOAD_TIME,
    EventType.API_RESPONSE_TIME,
    EventType.AUDIO_BUFFER_TIME
  ]),
  properties: z.object({
    metric: z.string(),
    value: z.number().positive(),
    unit: z.enum(['ms', 's', 'bytes', 'mb']),
    component: z.string().optional(),
    apiEndpoint: z.string().optional(),
    bufferSize: z.number().positive().optional()
  })
})

export const FeatureUsageEventSchema = BaseEventSchema.extend({
  eventType: z.enum([
    EventType.FEATURE_USAGE,
    EventType.SETTINGS_CHANGE
  ]),
  properties: z.object({
    feature: z.string(),
    action: z.string(),
    value: z.any().optional(),
    previousValue: z.any().optional(),
    setting: z.string().optional()
  })
})

export const OfflineEventSchema = BaseEventSchema.extend({
  eventType: z.enum([
    EventType.OFFLINE_DOWNLOAD,
    EventType.OFFLINE_PLAY,
    EventType.OFFLINE_SYNC
  ]),
  properties: z.object({
    trackId: z.string(),
    trackTitle: z.string(),
    artistName: z.string(),
    downloadSize: z.number().positive().optional(),
    downloadTime: z.number().positive().optional(),
    storageUsed: z.number().nonnegative().optional(),
    syncStatus: z.enum(['success', 'failed', 'partial']).optional()
  })
})

// Union type for all event schemas
export const EventSchema = z.discriminatedUnion('eventType', [
  PlaybackEventSchema,
  SearchEventSchema,
  PlaylistEventSchema,
  LibraryEventSchema,
  UIEventSchema,
  ErrorEventSchema,
  PerformanceEventSchema,
  FeatureUsageEventSchema,
  OfflineEventSchema
])

export type BaseEvent = z.infer<typeof BaseEventSchema>
export type PlaybackEvent = z.infer<typeof PlaybackEventSchema>
export type SearchEvent = z.infer<typeof SearchEventSchema>
export type PlaylistEvent = z.infer<typeof PlaylistEventSchema>
export type LibraryEvent = z.infer<typeof LibraryEventSchema>
export type UIEvent = z.infer<typeof UIEventSchema>
export type ErrorEvent = z.infer<typeof ErrorEventSchema>
export type PerformanceEvent = z.infer<typeof PerformanceEventSchema>
export type FeatureUsageEvent = z.infer<typeof FeatureUsageEventSchema>
export type OfflineEvent = z.infer<typeof OfflineEventSchema>
export type AnalyticsEvent = z.infer<typeof EventSchema>

// Event collection and processing
export class AnalyticsEventCollector {
  private events: AnalyticsEvent[] = []
  private maxBatchSize = 100
  private batchTimeout = 5000 // 5 seconds
  private batchTimer: NodeJS.Timeout | null = null
  private isProcessing = false

  constructor(
    private onBatchReady: (events: AnalyticsEvent[]) => Promise<void>,
    private options: {
      maxBatchSize?: number
      batchTimeout?: number
    } = {}
  ) {
    this.maxBatchSize = options.maxBatchSize || 100
    this.batchTimeout = options.batchTimeout || 5000
  }

  async collectEvent(eventData: Partial<AnalyticsEvent>): Promise<void> {
    try {
      // Add default values
      const event: AnalyticsEvent = {
        timestamp: new Date(),
        sessionId: this.generateSessionId(),
        ...eventData
      } as AnalyticsEvent

      // Validate event
      const validatedEvent = EventSchema.parse(event)
      
      // Add to batch
      this.events.push(validatedEvent)
      
      // Check if batch is ready
      if (this.events.length >= this.maxBatchSize) {
        await this.processBatch()
      } else if (!this.batchTimer) {
        // Start batch timer
        this.batchTimer = setTimeout(() => {
          this.processBatch()
        }, this.batchTimeout)
      }
    } catch (error) {
      console.error('Failed to collect analytics event:', error)
      // Don't throw - analytics failures shouldn't break the app
    }
  }

  async collectBatch(events: Partial<AnalyticsEvent>[]): Promise<void> {
    try {
      const validatedEvents: AnalyticsEvent[] = []
      
      for (const eventData of events) {
        const event: AnalyticsEvent = {
          timestamp: new Date(),
          sessionId: this.generateSessionId(),
          ...eventData
        } as AnalyticsEvent
        
        const validatedEvent = EventSchema.parse(event)
        validatedEvents.push(validatedEvent)
      }
      
      this.events.push(...validatedEvents)
      
      // Check if batch is ready
      if (this.events.length >= this.maxBatchSize) {
        await this.processBatch()
      }
    } catch (error) {
      console.error('Failed to collect analytics batch:', error)
    }
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.events.length === 0) {
      return
    }

    this.isProcessing = true
    
    try {
      // Clear batch timer
      if (this.batchTimer) {
        clearTimeout(this.batchTimer)
        this.batchTimer = null
      }

      // Process current batch
      const batch = [...this.events]
      this.events = []
      
      await this.onBatchReady(batch)
    } catch (error) {
      console.error('Failed to process analytics batch:', error)
      // Re-add events to retry later
      this.events.unshift(...this.events)
    } finally {
      this.isProcessing = false
    }
  }

  async flush(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }
    
    await this.processBatch()
  }

  private generateSessionId(): string {
    // Generate a simple UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  getEventCount(): number {
    return this.events.length
  }

  clear(): void {
    this.events = []
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }
  }
}

// Event processing utilities
export class AnalyticsProcessor {
  static processPlaybackEvents(events: PlaybackEvent[]): {
    totalPlays: number
    totalSkips: number
    averagePlayTime: number
    mostPlayedTracks: Array<{ trackId: string; count: number }>
    skipRate: number
  } {
    const playEvents = events.filter(e => e.eventType === EventType.TRACK_PLAY)
    const skipEvents = events.filter(e => e.eventType === EventType.TRACK_SKIP)
    const finishEvents = events.filter(e => e.eventType === EventType.TRACK_FINISH)
    
    const totalPlays = playEvents.length
    const totalSkips = skipEvents.length
    
    // Calculate average play time
    const playTimes = finishEvents
      .map(e => e.properties.duration || 0)
      .filter(duration => duration > 0)
    const averagePlayTime = playTimes.length > 0 
      ? playTimes.reduce((sum, time) => sum + time, 0) / playTimes.length 
      : 0
    
    // Find most played tracks
    const trackCounts = new Map<string, number>()
    playEvents.forEach(event => {
      const trackId = event.properties.trackId
      trackCounts.set(trackId, (trackCounts.get(trackId) || 0) + 1)
    })
    
    const mostPlayedTracks = Array.from(trackCounts.entries())
      .map(([trackId, count]) => ({ trackId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    const skipRate = totalPlays > 0 ? (totalSkips / totalPlays) * 100 : 0
    
    return {
      totalPlays,
      totalSkips,
      averagePlayTime,
      mostPlayedTracks,
      skipRate
    }
  }

  static processSearchEvents(events: SearchEvent[]): {
    totalSearches: number
    averageResultCount: number
    noResultRate: number
    popularQueries: Array<{ query: string; count: number }>
    clickThroughRate: number
  } {
    const searchEvents = events.filter(e => e.eventType === EventType.SEARCH_QUERY)
    const clickEvents = events.filter(e => e.eventType === EventType.SEARCH_RESULT_CLICK)
    const noResultEvents = events.filter(e => e.eventType === EventType.SEARCH_NO_RESULTS)
    
    const totalSearches = searchEvents.length
    const totalClicks = clickEvents.length
    const totalNoResults = noResultEvents.length
    
    // Calculate average result count
    const resultCounts = searchEvents
      .map(e => e.properties.resultCount || 0)
      .filter(count => count > 0)
    const averageResultCount = resultCounts.length > 0 
      ? resultCounts.reduce((sum, count) => sum + count, 0) / resultCounts.length 
      : 0
    
    // Find popular queries
    const queryCounts = new Map<string, number>()
    searchEvents.forEach(event => {
      const query = event.properties.query.toLowerCase()
      queryCounts.set(query, (queryCounts.get(query) || 0) + 1)
    })
    
    const popularQueries = Array.from(queryCounts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    const noResultRate = totalSearches > 0 ? (totalNoResults / totalSearches) * 100 : 0
    const clickThroughRate = totalSearches > 0 ? (totalClicks / totalSearches) * 100 : 0
    
    return {
      totalSearches,
      averageResultCount,
      noResultRate,
      popularQueries,
      clickThroughRate
    }
  }

  static processPerformanceEvents(events: PerformanceEvent[]): {
    averagePageLoadTime: number
    averageApiResponseTime: number
    averageBufferTime: number
    slowestEndpoints: Array<{ endpoint: string; averageTime: number }>
  } {
    const pageLoadEvents = events.filter(e => e.eventType === EventType.PAGE_LOAD_TIME)
    const apiEvents = events.filter(e => e.eventType === EventType.API_RESPONSE_TIME)
    const bufferEvents = events.filter(e => e.eventType === EventType.AUDIO_BUFFER_TIME)
    
    // Calculate averages
    const averagePageLoadTime = pageLoadEvents.length > 0 
      ? pageLoadEvents.reduce((sum, e) => sum + e.properties.value, 0) / pageLoadEvents.length 
      : 0
    
    const averageApiResponseTime = apiEvents.length > 0 
      ? apiEvents.reduce((sum, e) => sum + e.properties.value, 0) / apiEvents.length 
      : 0
    
    const averageBufferTime = bufferEvents.length > 0 
      ? bufferEvents.reduce((sum, e) => sum + e.properties.value, 0) / bufferEvents.length 
      : 0
    
    // Find slowest endpoints
    const endpointTimes = new Map<string, number[]>()
    apiEvents.forEach(event => {
      const endpoint = event.properties.apiEndpoint || 'unknown'
      if (!endpointTimes.has(endpoint)) {
        endpointTimes.set(endpoint, [])
      }
      endpointTimes.get(endpoint)!.push(event.properties.value)
    })
    
    const slowestEndpoints = Array.from(endpointTimes.entries())
      .map(([endpoint, times]) => ({
        endpoint,
        averageTime: times.reduce((sum, time) => sum + time, 0) / times.length
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10)
    
    return {
      averagePageLoadTime,
      averageApiResponseTime,
      averageBufferTime,
      slowestEndpoints
    }
  }
}

// Export singleton instance
export const analyticsEventCollector = new AnalyticsEventCollector(
  async (events: AnalyticsEvent[]) => {
    // This would typically send events to an analytics service
    console.log('Analytics batch ready:', events.length, 'events')
    // In a real implementation, this would send to your analytics backend
  }
)
