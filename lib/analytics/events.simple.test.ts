/**
 * Simplified unit tests for analytics events system
 */

import { 
  AnalyticsEventCollector, 
  AnalyticsProcessor, 
  EventType,
  EventSchema,
  PlaybackEventSchema,
  SearchEventSchema,
  ErrorEventSchema,
  PerformanceEventSchema
} from './events'

describe('Analytics Events System', () => {
  describe('Event Schemas', () => {
    it('should validate playback events correctly', () => {
      const playbackEvent = {
        eventType: EventType.TRACK_PLAY,
        timestamp: new Date(),
        sessionId: 'test-session-123',
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
      }

      const result = PlaybackEventSchema.safeParse(playbackEvent)
      expect(result.success).toBe(true)
    })

    it('should validate search events correctly', () => {
      const searchEvent = {
        eventType: EventType.SEARCH_QUERY,
        timestamp: new Date(),
        sessionId: 'test-session-123',
        properties: {
          query: 'queen bohemian',
          resultCount: 15,
          resultType: 'tracks',
          searchTime: 250,
          filters: { genre: 'rock' }
        }
      }

      const result = SearchEventSchema.safeParse(searchEvent)
      expect(result.success).toBe(true)
    })

    it('should validate error events correctly', () => {
      const errorEvent = {
        eventType: EventType.ERROR_OCCURRED,
        timestamp: new Date(),
        sessionId: 'test-session-123',
        properties: {
          errorType: 'ValidationError',
          errorMessage: 'Invalid input data',
          errorCode: 'VALIDATION_FAILED',
          component: 'SearchForm',
          stackTrace: 'Error: Invalid input...'
        }
      }

      const result = ErrorEventSchema.safeParse(errorEvent)
      expect(result.success).toBe(true)
    })

    it('should validate performance events correctly', () => {
      const performanceEvent = {
        eventType: EventType.PAGE_LOAD_TIME,
        timestamp: new Date(),
        sessionId: 'test-session-123',
        properties: {
          metric: 'page_load',
          value: 1500,
          unit: 'ms',
          component: 'home'
        }
      }

      const result = PerformanceEventSchema.safeParse(performanceEvent)
      expect(result.success).toBe(true)
    })

    it('should reject invalid event types', () => {
      const invalidEvent = {
        eventType: 'invalid_event_type',
        timestamp: new Date(),
        sessionId: 'test-session-123',
        properties: {
          trackId: 'track-1',
          trackTitle: 'Test Track',
          artistName: 'Test Artist'
        }
      }

      const result = EventSchema.safeParse(invalidEvent)
      expect(result.success).toBe(false)
    })

    it('should reject events with missing required properties', () => {
      const incompleteEvent = {
        eventType: EventType.TRACK_PLAY,
        timestamp: new Date(),
        sessionId: 'test-session-123',
        properties: {
          trackId: 'track-1'
          // Missing required trackTitle and artistName
        }
      }

      const result = PlaybackEventSchema.safeParse(incompleteEvent)
      expect(result.success).toBe(false)
    })
  })

  describe('AnalyticsEventCollector', () => {
    let collector: AnalyticsEventCollector
    let mockOnBatchReady: jest.Mock

    beforeEach(() => {
      mockOnBatchReady = jest.fn()
      collector = new AnalyticsEventCollector(mockOnBatchReady, {
        maxBatchSize: 5,
        batchTimeout: 1000
      })
    })

    afterEach(() => {
      collector.clear()
    })

    it('should collect single events', async () => {
      const event = {
        eventType: EventType.TRACK_PLAY,
        properties: {
          trackId: 'track-1',
          trackTitle: 'Test Track',
          artistName: 'Test Artist'
        }
      }

      await collector.collectEvent(event)

      expect(collector.getEventCount()).toBe(1)
    })

    it('should collect batch events', async () => {
      const events = [
        {
          eventType: EventType.TRACK_PLAY,
          properties: {
            trackId: 'track-1',
            trackTitle: 'Test Track',
            artistName: 'Test Artist'
          }
        },
        {
          eventType: EventType.TRACK_PAUSE,
          properties: {
            trackId: 'track-1',
            trackTitle: 'Test Track',
            artistName: 'Test Artist'
          }
        }
      ]

      await collector.collectBatch(events)

      expect(collector.getEventCount()).toBe(2)
    })

    it('should process batch when max size is reached', async () => {
      const events = Array.from({ length: 5 }, (_, i) => ({
        eventType: EventType.TRACK_PLAY,
        properties: {
          trackId: `track-${i}`,
          trackTitle: `Test Track ${i}`,
          artistName: 'Test Artist'
        }
      }))

      for (const event of events) {
        await collector.collectEvent(event)
      }

      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockOnBatchReady).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ eventType: EventType.TRACK_PLAY })
      ]))
      expect(collector.getEventCount()).toBe(0)
    })

    it('should process batch after timeout', async () => {
      const event = {
        eventType: EventType.TRACK_PLAY,
        properties: {
          trackId: 'track-1',
          trackTitle: 'Test Track',
          artistName: 'Test Artist'
        }
      }

      await collector.collectEvent(event)

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100))

      expect(mockOnBatchReady).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ eventType: EventType.TRACK_PLAY })
      ]))
      expect(collector.getEventCount()).toBe(0)
    })

    it('should flush remaining events', async () => {
      const event = {
        eventType: EventType.TRACK_PLAY,
        properties: {
          trackId: 'track-1',
          trackTitle: 'Test Track',
          artistName: 'Test Artist'
        }
      }

      await collector.collectEvent(event)
      await collector.flush()

      expect(mockOnBatchReady).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ eventType: EventType.TRACK_PLAY })
      ]))
      expect(collector.getEventCount()).toBe(0)
    })

    it('should clear events', async () => {
      const event = {
        eventType: EventType.TRACK_PLAY,
        properties: {
          trackId: 'track-1',
          trackTitle: 'Test Track',
          artistName: 'Test Artist'
        }
      }

      await collector.collectEvent(event)
      collector.clear()

      expect(collector.getEventCount()).toBe(0)
    })

    it('should handle invalid events gracefully', async () => {
      const invalidEvent = {
        eventType: 'invalid_event_type',
        properties: {
          trackId: 'track-1'
        }
      }

      await collector.collectEvent(invalidEvent)

      expect(collector.getEventCount()).toBe(0)
      expect(mockOnBatchReady).not.toHaveBeenCalled()
    })
  })

  describe('AnalyticsProcessor', () => {
    it('should process playback events correctly', () => {
      const playbackEvents = [
        {
          eventType: EventType.TRACK_PLAY,
          timestamp: new Date(),
          sessionId: 'session-1',
          properties: {
            trackId: 'track-1',
            trackTitle: 'Track 1',
            artistName: 'Artist 1',
            duration: 300000
          }
        },
        {
          eventType: EventType.TRACK_PLAY,
          timestamp: new Date(),
          sessionId: 'session-1',
          properties: {
            trackId: 'track-2',
            trackTitle: 'Track 2',
            artistName: 'Artist 2',
            duration: 240000
          }
        },
        {
          eventType: EventType.TRACK_SKIP,
          timestamp: new Date(),
          sessionId: 'session-1',
          properties: {
            trackId: 'track-1',
            trackTitle: 'Track 1',
            artistName: 'Artist 1'
          }
        },
        {
          eventType: EventType.TRACK_FINISH,
          timestamp: new Date(),
          sessionId: 'session-1',
          properties: {
            trackId: 'track-2',
            trackTitle: 'Track 2',
            artistName: 'Artist 2',
            duration: 240000
          }
        }
      ] as any[]

      const result = AnalyticsProcessor.processPlaybackEvents(playbackEvents)

      expect(result.totalPlays).toBe(2)
      expect(result.totalSkips).toBe(1)
      expect(result.averagePlayTime).toBe(240000)
      expect(result.skipRate).toBe(50)
      expect(result.mostPlayedTracks).toHaveLength(2)
      expect(result.mostPlayedTracks[0]).toEqual({ trackId: 'track-1', count: 1 })
      expect(result.mostPlayedTracks[1]).toEqual({ trackId: 'track-2', count: 1 })
    })

    it('should process search events correctly', () => {
      const searchEvents = [
        {
          eventType: EventType.SEARCH_QUERY,
          timestamp: new Date(),
          sessionId: 'session-1',
          properties: {
            query: 'queen',
            resultCount: 10,
            resultType: 'tracks',
            searchTime: 200
          }
        },
        {
          eventType: EventType.SEARCH_QUERY,
          timestamp: new Date(),
          sessionId: 'session-1',
          properties: {
            query: 'beatles',
            resultCount: 5,
            resultType: 'tracks',
            searchTime: 150
          }
        },
        {
          eventType: EventType.SEARCH_RESULT_CLICK,
          timestamp: new Date(),
          sessionId: 'session-1',
          properties: {
            query: 'queen',
            selectedResultId: 'track-1',
            selectedResultType: 'track'
          }
        },
        {
          eventType: EventType.SEARCH_NO_RESULTS,
          timestamp: new Date(),
          sessionId: 'session-1',
          properties: {
            query: 'nonexistent',
            resultCount: 0
          }
        }
      ] as any[]

      const result = AnalyticsProcessor.processSearchEvents(searchEvents)

      expect(result.totalSearches).toBe(2)
      expect(result.averageResultCount).toBe(7.5)
      expect(result.noResultRate).toBe(50)
      expect(result.clickThroughRate).toBe(50)
      expect(result.popularQueries).toHaveLength(2)
      expect(result.popularQueries[0]).toEqual({ query: 'queen', count: 1 })
      expect(result.popularQueries[1]).toEqual({ query: 'beatles', count: 1 })
    })

    it('should process performance events correctly', () => {
      const performanceEvents = [
        {
          eventType: EventType.PAGE_LOAD_TIME,
          timestamp: new Date(),
          sessionId: 'session-1',
          properties: {
            metric: 'page_load',
            value: 1500,
            unit: 'ms',
            component: 'home'
          }
        },
        {
          eventType: EventType.PAGE_LOAD_TIME,
          timestamp: new Date(),
          sessionId: 'session-1',
          properties: {
            metric: 'page_load',
            value: 1200,
            unit: 'ms',
            component: 'search'
          }
        },
        {
          eventType: EventType.API_RESPONSE_TIME,
          timestamp: new Date(),
          sessionId: 'session-1',
          properties: {
            metric: 'api_response',
            value: 300,
            unit: 'ms',
            apiEndpoint: '/api/tracks'
          }
        },
        {
          eventType: EventType.API_RESPONSE_TIME,
          timestamp: new Date(),
          sessionId: 'session-1',
          properties: {
            metric: 'api_response',
            value: 500,
            unit: 'ms',
            apiEndpoint: '/api/search'
          }
        },
        {
          eventType: EventType.AUDIO_BUFFER_TIME,
          timestamp: new Date(),
          sessionId: 'session-1',
          properties: {
            metric: 'audio_buffer',
            value: 100,
            unit: 'ms',
            bufferSize: 1024
          }
        }
      ] as any[]

      const result = AnalyticsProcessor.processPerformanceEvents(performanceEvents)

      expect(result.averagePageLoadTime).toBe(1350)
      expect(result.averageApiResponseTime).toBe(400)
      expect(result.averageBufferTime).toBe(100)
      expect(result.slowestEndpoints).toHaveLength(2)
      expect(result.slowestEndpoints[0]).toEqual({ endpoint: '/api/search', averageTime: 500 })
      expect(result.slowestEndpoints[1]).toEqual({ endpoint: '/api/tracks', averageTime: 300 })
    })

    it('should handle empty event arrays', () => {
      const playbackResult = AnalyticsProcessor.processPlaybackEvents([])
      expect(playbackResult.totalPlays).toBe(0)
      expect(playbackResult.totalSkips).toBe(0)
      expect(playbackResult.averagePlayTime).toBe(0)
      expect(playbackResult.skipRate).toBe(0)
      expect(playbackResult.mostPlayedTracks).toHaveLength(0)

      const searchResult = AnalyticsProcessor.processSearchEvents([])
      expect(searchResult.totalSearches).toBe(0)
      expect(searchResult.averageResultCount).toBe(0)
      expect(searchResult.noResultRate).toBe(0)
      expect(searchResult.clickThroughRate).toBe(0)
      expect(searchResult.popularQueries).toHaveLength(0)

      const performanceResult = AnalyticsProcessor.processPerformanceEvents([])
      expect(performanceResult.averagePageLoadTime).toBe(0)
      expect(performanceResult.averageApiResponseTime).toBe(0)
      expect(performanceResult.averageBufferTime).toBe(0)
      expect(performanceResult.slowestEndpoints).toHaveLength(0)
    })

    it('should handle events with missing properties', () => {
      const playbackEvents = [
        {
          eventType: EventType.TRACK_PLAY,
          timestamp: new Date(),
          sessionId: 'session-1',
          properties: {
            trackId: 'track-1',
            trackTitle: 'Track 1',
            artistName: 'Artist 1'
            // Missing duration
          }
        },
        {
          eventType: EventType.TRACK_FINISH,
          timestamp: new Date(),
          sessionId: 'session-1',
          properties: {
            trackId: 'track-1',
            trackTitle: 'Track 1',
            artistName: 'Artist 1',
            duration: 300000
          }
        }
      ] as any[]

      const result = AnalyticsProcessor.processPlaybackEvents(playbackEvents)

      expect(result.totalPlays).toBe(1)
      expect(result.averagePlayTime).toBe(300000)
    })
  })

  describe('Event Type Constants', () => {
    it('should have all required event types', () => {
      expect(EventType.USER_LOGIN).toBe('user_login')
      expect(EventType.USER_LOGOUT).toBe('user_logout')
      expect(EventType.TRACK_PLAY).toBe('track_play')
      expect(EventType.TRACK_PAUSE).toBe('track_pause')
      expect(EventType.TRACK_SKIP).toBe('track_skip')
      expect(EventType.SEARCH_QUERY).toBe('search_query')
      expect(EventType.SEARCH_RESULT_CLICK).toBe('search_result_click')
      expect(EventType.PLAYLIST_CREATE).toBe('playlist_create')
      expect(EventType.PLAYLIST_ADD_TRACK).toBe('playlist_add_track')
      expect(EventType.LIBRARY_ADD).toBe('library_add')
      expect(EventType.PAGE_VIEW).toBe('page_view')
      expect(EventType.BUTTON_CLICK).toBe('button_click')
      expect(EventType.ERROR_OCCURRED).toBe('error_occurred')
      expect(EventType.API_ERROR).toBe('api_error')
      expect(EventType.PAGE_LOAD_TIME).toBe('page_load_time')
      expect(EventType.API_RESPONSE_TIME).toBe('api_response_time')
      expect(EventType.AUDIO_BUFFER_TIME).toBe('audio_buffer_time')
      expect(EventType.FEATURE_USAGE).toBe('feature_usage')
      expect(EventType.SETTINGS_CHANGE).toBe('settings_change')
      expect(EventType.OFFLINE_DOWNLOAD).toBe('offline_download')
      expect(EventType.OFFLINE_PLAY).toBe('offline_play')
      expect(EventType.OFFLINE_SYNC).toBe('offline_sync')
    })
  })
})
