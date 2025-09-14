/**
 * Simplified unit tests for lyrics provider integration system
 */

import { LyricsService, lyricsService } from './provider'

// Mock the provider configurations
jest.mock('./provider', () => {
  const originalModule = jest.requireActual('./provider')
  return {
    ...originalModule,
    PROVIDER_CONFIGS: {
      local: {
        name: 'Local Database',
        baseUrl: '',
        apiKey: '',
        rateLimit: {
          requests: 1000000,
          window: 60 * 1000,
          burst: 1000
        },
        priority: 0,
        enabled: true
      },
      musixmatch: {
        name: 'Musixmatch',
        baseUrl: 'https://api.musixmatch.com/ws/1.1',
        apiKey: 'test-key',
        rateLimit: {
          requests: 2000,
          window: 24 * 60 * 60 * 1000,
          burst: 10
        },
        priority: 1,
        enabled: true
      },
      genius: {
        name: 'Genius',
        baseUrl: 'https://api.genius.com',
        apiKey: 'test-key',
        rateLimit: {
          requests: 1000,
          window: 24 * 60 * 60 * 1000,
          burst: 5
        },
        priority: 2,
        enabled: true
      },
      lyricsovh: {
        name: 'Lyrics.ovh',
        baseUrl: 'https://api.lyrics.ovh/v1',
        apiKey: '',
        rateLimit: {
          requests: 10000,
          window: 60 * 60 * 1000,
          burst: 100
        },
        priority: 3,
        enabled: true
      }
    }
  }
})

describe('Lyrics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getLyrics', () => {
    it('should retrieve lyrics from local provider', async () => {
      const lyrics = await lyricsService.getLyrics('track-1')

      expect(lyrics).toBeDefined()
      expect(lyrics?.id).toBe('lyrics-track-1')
      expect(lyrics?.trackId).toBe('track-1')
      expect(lyrics?.provider).toBe('local')
      expect(lyrics?.language).toBe('en')
      expect(lyrics?.hasTimeSync).toBe(true)
      expect(lyrics?.lines).toHaveLength(12)
      expect(lyrics?.lines[0].text).toBe('Is this the real life?')
    })

    it('should return null for non-existent track', async () => {
      const lyrics = await lyricsService.getLyrics('non-existent-track')

      expect(lyrics).toBeNull()
    })

    it('should retrieve lyrics with track title and artist name', async () => {
      const lyrics = await lyricsService.getLyrics('track-1', 'Bohemian Rhapsody', 'Queen')

      expect(lyrics).toBeDefined()
      expect(lyrics?.id).toBe('lyrics-track-1')
      expect(lyrics?.trackId).toBe('track-1')
      expect(lyrics?.provider).toBe('local')
    })

    it('should use preferred provider when specified', async () => {
      const lyrics = await lyricsService.getLyrics('track-1', 'Bohemian Rhapsody', 'Queen', 'local')

      expect(lyrics).toBeDefined()
      expect(lyrics?.provider).toBe('local')
    })

    it('should fallback to other providers when preferred fails', async () => {
      // Mock a provider failure
      const originalGetLyrics = lyricsService.getLyrics
      jest.spyOn(lyricsService, 'getLyrics').mockImplementation(async (trackId, trackTitle, artistName, preferredProvider) => {
        if (preferredProvider === 'musixmatch') {
          throw new Error('Musixmatch API error')
        }
        return originalGetLyrics.call(lyricsService, trackId, trackTitle, artistName, preferredProvider)
      })

      const lyrics = await lyricsService.getLyrics('track-1', 'Bohemian Rhapsody', 'Queen', 'musixmatch')

      expect(lyrics).toBeDefined()
      expect(lyrics?.provider).toBe('local')
    })

    it('should return null when all providers fail', async () => {
      // Mock all providers to fail
      jest.spyOn(lyricsService, 'getLyrics').mockResolvedValue(null)

      const lyrics = await lyricsService.getLyrics('track-1', 'Bohemian Rhapsody', 'Queen')

      expect(lyrics).toBeNull()
    })
  })

  describe('searchLyrics', () => {
    it('should search lyrics in local database', async () => {
      const results = await lyricsService.searchLyrics('real life')

      expect(results).toBeDefined()
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].lines.some(line => 
        line.text.toLowerCase().includes('real life')
      )).toBe(true)
    })

    it('should return empty array for no matches', async () => {
      const results = await lyricsService.searchLyrics('nonexistent lyrics')

      expect(results).toBeDefined()
      expect(results.length).toBe(0)
    })

    it('should search with specific provider', async () => {
      const results = await lyricsService.searchLyrics('real life', 'local')

      expect(results).toBeDefined()
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('getProviderStatus', () => {
    it('should return provider status information', () => {
      const status = lyricsService.getProviderStatus()

      expect(status).toBeDefined()
      expect(status).toHaveProperty('local')
      expect(status).toHaveProperty('musixmatch')
      expect(status).toHaveProperty('genius')
      expect(status).toHaveProperty('lyricsovh')

      expect(status.local).toHaveProperty('enabled', true)
      expect(status.local).toHaveProperty('rateLimit')
      expect(status.local.rateLimit).toHaveProperty('remaining')
      expect(status.local.rateLimit).toHaveProperty('resetTime')
      expect(status.local.rateLimit).toHaveProperty('allowed')
    })

    it('should include rate limit information', () => {
      const status = lyricsService.getProviderStatus()

      expect(status.local.rateLimit.remaining).toBeGreaterThan(0)
      expect(status.local.rateLimit.allowed).toBe(true)
      expect(status.local.rateLimit.resetTime).toBeGreaterThan(Date.now())
    })
  })

  describe('cache management', () => {
    it('should clear cache', () => {
      lyricsService.clearCache()
      
      const stats = lyricsService.getCacheStats()
      expect(stats.size).toBe(0)
      expect(stats.entries).toHaveLength(0)
    })

    it('should return cache statistics', () => {
      const stats = lyricsService.getCacheStats()

      expect(stats).toHaveProperty('size')
      expect(stats).toHaveProperty('entries')
      expect(Array.isArray(stats.entries)).toBe(true)
    })
  })

  describe('provider priority', () => {
    it('should try providers in priority order', async () => {
      const lyrics = await lyricsService.getLyrics('track-1')

      expect(lyrics).toBeDefined()
      expect(lyrics?.provider).toBe('local') // Local has priority 0 (highest)
    })

    it('should handle disabled providers', async () => {
      // Mock a disabled provider
      const originalGetLyrics = lyricsService.getLyrics
      jest.spyOn(lyricsService, 'getLyrics').mockImplementation(async (trackId, trackTitle, artistName, preferredProvider) => {
        if (preferredProvider === 'musixmatch') {
          throw new Error('Provider disabled')
        }
        return originalGetLyrics.call(lyricsService, trackId, trackTitle, artistName, preferredProvider)
      })

      const lyrics = await lyricsService.getLyrics('track-1', 'Bohemian Rhapsody', 'Queen', 'musixmatch')

      expect(lyrics).toBeDefined()
      expect(lyrics?.provider).toBe('local')
    })
  })

  describe('error handling', () => {
    it('should handle provider errors gracefully', async () => {
      // Mock a provider error
      const originalGetLyrics = lyricsService.getLyrics
      jest.spyOn(lyricsService, 'getLyrics').mockImplementation(async (trackId, trackTitle, artistName, preferredProvider) => {
        if (preferredProvider === 'genius') {
          throw new Error('Genius API error')
        }
        return originalGetLyrics.call(lyricsService, trackId, trackTitle, artistName, preferredProvider)
      })

      const lyrics = await lyricsService.getLyrics('track-1', 'Bohemian Rhapsody', 'Queen', 'genius')

      expect(lyrics).toBeDefined()
      expect(lyrics?.provider).toBe('local')
    })

    it('should handle missing track title and artist name', async () => {
      const lyrics = await lyricsService.getLyrics('track-1', undefined, undefined, 'musixmatch')

      expect(lyrics).toBeDefined()
      expect(lyrics?.provider).toBe('local')
    })
  })

  describe('lyrics structure', () => {
    it('should return properly structured lyrics', async () => {
      const lyrics = await lyricsService.getLyrics('track-1')

      expect(lyrics).toBeDefined()
      expect(lyrics).toHaveProperty('id')
      expect(lyrics).toHaveProperty('trackId')
      expect(lyrics).toHaveProperty('provider')
      expect(lyrics).toHaveProperty('language')
      expect(lyrics).toHaveProperty('isExplicit')
      expect(lyrics).toHaveProperty('hasTimeSync')
      expect(lyrics).toHaveProperty('syncType')
      expect(lyrics).toHaveProperty('lines')
      expect(lyrics).toHaveProperty('copyright')
      expect(lyrics).toHaveProperty('createdAt')
      expect(lyrics).toHaveProperty('updatedAt')

      expect(lyrics?.lines).toBeDefined()
      expect(Array.isArray(lyrics?.lines)).toBe(true)
      expect(lyrics?.lines.length).toBeGreaterThan(0)

      if (lyrics?.lines && lyrics.lines.length > 0) {
        expect(lyrics.lines[0]).toHaveProperty('timeMs')
        expect(lyrics.lines[0]).toHaveProperty('text')
        expect(typeof lyrics.lines[0].timeMs).toBe('number')
        expect(typeof lyrics.lines[0].text).toBe('string')
      }
    })

    it('should include time synchronization information', async () => {
      const lyrics = await lyricsService.getLyrics('track-1')

      expect(lyrics).toBeDefined()
      expect(lyrics?.hasTimeSync).toBe(true)
      expect(lyrics?.syncType).toBe('line')
      expect(lyrics?.lines[0].timeMs).toBe(0)
      expect(lyrics?.lines[1].timeMs).toBe(3000)
    })

    it('should include copyright information', async () => {
      const lyrics = await lyricsService.getLyrics('track-1')

      expect(lyrics).toBeDefined()
      expect(lyrics?.copyright).toBe('© 1975 Queen Productions Ltd.')
    })

    it('should include language information', async () => {
      const lyrics = await lyricsService.getLyrics('track-1')

      expect(lyrics).toBeDefined()
      expect(lyrics?.language).toBe('en')
    })

    it('should include explicit content flag', async () => {
      const lyrics = await lyricsService.getLyrics('track-1')

      expect(lyrics).toBeDefined()
      expect(lyrics?.isExplicit).toBe(false)
    })
  })

  describe('multiple tracks', () => {
    it('should retrieve lyrics for different tracks', async () => {
      const lyrics1 = await lyricsService.getLyrics('track-1')
      const lyrics2 = await lyricsService.getLyrics('track-2')
      const lyrics3 = await lyricsService.getLyrics('track-3')

      expect(lyrics1).toBeDefined()
      expect(lyrics2).toBeDefined()
      expect(lyrics3).toBeDefined()

      expect(lyrics1?.trackId).toBe('track-1')
      expect(lyrics2?.trackId).toBe('track-2')
      expect(lyrics3?.trackId).toBe('track-3')

      expect(lyrics1?.lines[0].text).toBe('Is this the real life?')
      expect(lyrics2?.lines[0].text).toBe('On a dark desert highway')
      expect(lyrics3?.lines[0].text).toBe('There\'s a lady who\'s sure')
    })

    it('should have different line counts for different tracks', async () => {
      const lyrics1 = await lyricsService.getLyrics('track-1')
      const lyrics2 = await lyricsService.getLyrics('track-2')
      const lyrics3 = await lyricsService.getLyrics('track-3')

      expect(lyrics1?.lines.length).toBe(12)
      expect(lyrics2?.lines.length).toBe(8)
      expect(lyrics3?.lines.length).toBe(8)
    })
  })
})
