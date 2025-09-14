/**
 * Lyrics provider integration system
 * Supports multiple lyrics providers with fallback and caching
 */

import { Lyrics, LyricsLine, LyricsProvider, LyricsProviderConfig } from '@/lib/types'

// Provider configurations
const PROVIDER_CONFIGS: Record<string, LyricsProviderConfig> = {
  musixmatch: {
    name: 'Musixmatch',
    baseUrl: 'https://api.musixmatch.com/ws/1.1',
    apiKey: process.env.MUSIXMATCH_API_KEY || '',
    rateLimit: {
      requests: 2000,
      window: 24 * 60 * 60 * 1000, // 24 hours
      burst: 10
    },
    priority: 1,
    enabled: true
  },
  genius: {
    name: 'Genius',
    baseUrl: 'https://api.genius.com',
    apiKey: process.env.GENIUS_API_KEY || '',
    rateLimit: {
      requests: 1000,
      window: 24 * 60 * 60 * 1000, // 24 hours
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
      window: 60 * 60 * 1000, // 1 hour
      burst: 100
    },
    priority: 3,
    enabled: true
  },
  local: {
    name: 'Local Database',
    baseUrl: '',
    apiKey: '',
    rateLimit: {
      requests: 1000000,
      window: 60 * 1000, // 1 minute
      burst: 1000
    },
    priority: 0, // Highest priority for local
    enabled: true
  }
}

// Rate limiting storage
interface RateLimitEntry {
  count: number
  resetTime: number
  burstCount: number
  burstResetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Cache storage
const lyricsCache = new Map<string, { lyrics: Lyrics; timestamp: number }>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

// Mock local lyrics database
const localLyricsDatabase: Record<string, Lyrics> = {
  'track-1': {
    id: 'lyrics-track-1',
    trackId: 'track-1',
    provider: 'local',
    language: 'en',
    isExplicit: false,
    hasTimeSync: true,
    lines: [
      { timeMs: 0, text: 'Is this the real life?' },
      { timeMs: 3000, text: 'Is this just fantasy?' },
      { timeMs: 6000, text: 'Caught in a landslide' },
      { timeMs: 9000, text: 'No escape from reality' },
      { timeMs: 12000, text: 'Open your eyes' },
      { timeMs: 15000, text: 'Look up to the skies and see' },
      { timeMs: 18000, text: "I'm just a poor boy" },
      { timeMs: 21000, text: "I need no sympathy" },
      { timeMs: 24000, text: 'Because I\'m easy come, easy go' },
      { timeMs: 27000, text: 'Little high, little low' },
      { timeMs: 30000, text: 'Any way the wind blows' },
      { timeMs: 33000, text: "Doesn't really matter to me" }
    ],
    copyright: '© 1975 Queen Productions Ltd.',
    syncType: 'line',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  'track-2': {
    id: 'lyrics-track-2',
    trackId: 'track-2',
    provider: 'local',
    language: 'en',
    isExplicit: false,
    hasTimeSync: true,
    lines: [
      { timeMs: 0, text: 'On a dark desert highway' },
      { timeMs: 4000, text: 'Cool wind in my hair' },
      { timeMs: 8000, text: 'Warm smell of colitas' },
      { timeMs: 12000, text: 'Rising up through the air' },
      { timeMs: 16000, text: 'Up ahead in the distance' },
      { timeMs: 20000, text: 'I saw a shimmering light' },
      { timeMs: 24000, text: 'My head grew heavy and my sight grew dim' },
      { timeMs: 28000, text: 'I had to stop for the night' }
    ],
    copyright: '© 1976 Eagles',
    syncType: 'line',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  'track-3': {
    id: 'lyrics-track-3',
    trackId: 'track-3',
    provider: 'local',
    language: 'en',
    isExplicit: false,
    hasTimeSync: true,
    lines: [
      { timeMs: 0, text: 'There\'s a lady who\'s sure' },
      { timeMs: 5000, text: 'All that glitters is gold' },
      { timeMs: 10000, text: 'And she\'s buying a stairway to heaven' },
      { timeMs: 15000, text: 'When she gets there she knows' },
      { timeMs: 20000, text: 'If the stores are all closed' },
      { timeMs: 25000, text: 'With a word she can get what she came for' },
      { timeMs: 30000, text: 'Ooh, ooh, ooh, ooh' },
      { timeMs: 35000, text: 'And she\'s buying a stairway to heaven' }
    ],
    copyright: '© 1971 Led Zeppelin',
    syncType: 'line',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
}

// Rate limiting utility functions
function getRateLimitKey(provider: string): string {
  return `lyrics:${provider}`
}

function checkRateLimit(
  provider: string,
  config: LyricsProviderConfig
): { allowed: boolean; remaining: number; resetTime: number; retryAfter?: number } {
  const key = getRateLimitKey(provider)
  const now = Date.now()
  const entry = rateLimitStore.get(key)
  
  if (!entry) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.rateLimit.window,
      burstCount: 1,
      burstResetTime: now + 1000 // 1 second burst window
    }
    rateLimitStore.set(key, newEntry)
    
    return {
      allowed: true,
      remaining: config.rateLimit.requests - 1,
      resetTime: newEntry.resetTime
    }
  }
  
  // Check if window has expired
  if (now > entry.resetTime) {
    entry.count = 1
    entry.resetTime = now + config.rateLimit.window
    entry.burstCount = 1
    entry.burstResetTime = now + 1000
    
    return {
      allowed: true,
      remaining: config.rateLimit.requests - 1,
      resetTime: entry.resetTime
    }
  }
  
  // Check burst limit
  if (now < entry.burstResetTime) {
    if (entry.burstCount >= config.rateLimit.burst) {
      return {
        allowed: false,
        remaining: config.rateLimit.requests - entry.count,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.burstResetTime - now) / 1000)
      }
    }
    entry.burstCount++
  } else {
    entry.burstCount = 1
    entry.burstResetTime = now + 1000
  }
  
  // Check main rate limit
  if (entry.count >= config.rateLimit.requests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000)
    }
  }
  
  entry.count++
  
  return {
    allowed: true,
    remaining: config.rateLimit.requests - entry.count,
    resetTime: entry.resetTime
  }
}

// Cache utility functions
function getCachedLyrics(trackId: string): Lyrics | null {
  const cached = lyricsCache.get(trackId)
  if (!cached) return null
  
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    lyricsCache.delete(trackId)
    return null
  }
  
  return cached.lyrics
}

function setCachedLyrics(trackId: string, lyrics: Lyrics): void {
  lyricsCache.set(trackId, {
    lyrics,
    timestamp: Date.now()
  })
}

// Provider implementations
class LocalLyricsProvider {
  async getLyrics(trackId: string): Promise<Lyrics | null> {
    return localLyricsDatabase[trackId] || null
  }
  
  async searchLyrics(query: string): Promise<Lyrics[]> {
    const results: Lyrics[] = []
    for (const lyrics of Object.values(localLyricsDatabase)) {
      if (lyrics.lines.some(line => 
        line.text.toLowerCase().includes(query.toLowerCase())
      )) {
        results.push(lyrics)
      }
    }
    return results
  }
}

class MusixmatchProvider {
  private config = PROVIDER_CONFIGS.musixmatch
  
  async getLyrics(trackId: string, trackTitle: string, artistName: string): Promise<Lyrics | null> {
    if (!this.config.apiKey) {
      throw new Error('Musixmatch API key not configured')
    }
    
    const rateLimit = checkRateLimit('musixmatch', this.config)
    if (!rateLimit.allowed) {
      throw new Error(`Rate limit exceeded for Musixmatch. Retry after ${rateLimit.retryAfter} seconds`)
    }
    
    try {
      // Mock API call - in real implementation, this would call the actual API
      const mockLyrics: Lyrics = {
        id: `musixmatch-${trackId}`,
        trackId,
        provider: 'musixmatch',
        language: 'en',
        isExplicit: false,
        hasTimeSync: true,
        lines: [
          { timeMs: 0, text: `[Musixmatch] ${trackTitle} by ${artistName}` },
          { timeMs: 5000, text: 'This is a mock response from Musixmatch' },
          { timeMs: 10000, text: 'In a real implementation, this would be' },
          { timeMs: 15000, text: 'the actual lyrics from the API' }
        ],
        copyright: '© Musixmatch',
        syncType: 'line',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      return mockLyrics
    } catch (error) {
      console.error('Musixmatch API error:', error)
      return null
    }
  }
}

class GeniusProvider {
  private config = PROVIDER_CONFIGS.genius
  
  async getLyrics(trackId: string, trackTitle: string, artistName: string): Promise<Lyrics | null> {
    if (!this.config.apiKey) {
      throw new Error('Genius API key not configured')
    }
    
    const rateLimit = checkRateLimit('genius', this.config)
    if (!rateLimit.allowed) {
      throw new Error(`Rate limit exceeded for Genius. Retry after ${rateLimit.retryAfter} seconds`)
    }
    
    try {
      // Mock API call - in real implementation, this would call the actual API
      const mockLyrics: Lyrics = {
        id: `genius-${trackId}`,
        trackId,
        provider: 'genius',
        language: 'en',
        isExplicit: false,
        hasTimeSync: false,
        lines: [
          { timeMs: 0, text: `[Genius] ${trackTitle} by ${artistName}` },
          { timeMs: 0, text: 'This is a mock response from Genius' },
          { timeMs: 0, text: 'Genius typically provides unsynced lyrics' },
          { timeMs: 0, text: 'with rich annotations and context' }
        ],
        copyright: '© Genius',
        syncType: 'unsynced',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      return mockLyrics
    } catch (error) {
      console.error('Genius API error:', error)
      return null
    }
  }
}

class LyricsOvhProvider {
  private config = PROVIDER_CONFIGS.lyricsovh
  
  async getLyrics(trackId: string, trackTitle: string, artistName: string): Promise<Lyrics | null> {
    const rateLimit = checkRateLimit('lyricsovh', this.config)
    if (!rateLimit.allowed) {
      throw new Error(`Rate limit exceeded for Lyrics.ovh. Retry after ${rateLimit.retryAfter} seconds`)
    }
    
    try {
      // Mock API call - in real implementation, this would call the actual API
      const mockLyrics: Lyrics = {
        id: `lyricsovh-${trackId}`,
        trackId,
        provider: 'lyricsovh',
        language: 'en',
        isExplicit: false,
        hasTimeSync: false,
        lines: [
          { timeMs: 0, text: `[Lyrics.ovh] ${trackTitle} by ${artistName}` },
          { timeMs: 0, text: 'This is a mock response from Lyrics.ovh' },
          { timeMs: 0, text: 'Lyrics.ovh provides free lyrics' },
          { timeMs: 0, text: 'without time synchronization' }
        ],
        copyright: '© Lyrics.ovh',
        syncType: 'unsynced',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      return mockLyrics
    } catch (error) {
      console.error('Lyrics.ovh API error:', error)
      return null
    }
  }
}

// Main lyrics service
export class LyricsService {
  private providers: Record<string, any> = {
    local: new LocalLyricsProvider(),
    musixmatch: new MusixmatchProvider(),
    genius: new GeniusProvider(),
    lyricsovh: new LyricsOvhProvider()
  }
  
  private getEnabledProviders(): string[] {
    return Object.entries(PROVIDER_CONFIGS)
      .filter(([_, config]) => config.enabled)
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([name]) => name)
  }
  
  async getLyrics(
    trackId: string, 
    trackTitle?: string, 
    artistName?: string,
    preferredProvider?: string
  ): Promise<Lyrics | null> {
    // Check cache first
    const cached = getCachedLyrics(trackId)
    if (cached) {
      return cached
    }
    
    const providers = this.getEnabledProviders()
    
    // If preferred provider is specified, try it first
    if (preferredProvider && providers.includes(preferredProvider)) {
      try {
        const lyrics = await this.tryProvider(preferredProvider, trackId, trackTitle, artistName)
        if (lyrics) {
          setCachedLyrics(trackId, lyrics)
          return lyrics
        }
      } catch (error) {
        console.warn(`Preferred provider ${preferredProvider} failed:`, error)
      }
    }
    
    // Try all providers in priority order
    for (const providerName of providers) {
      if (preferredProvider && providerName === preferredProvider) {
        continue // Already tried
      }
      
      try {
        const lyrics = await this.tryProvider(providerName, trackId, trackTitle, artistName)
        if (lyrics) {
          setCachedLyrics(trackId, lyrics)
          return lyrics
        }
      } catch (error) {
        console.warn(`Provider ${providerName} failed:`, error)
        continue
      }
    }
    
    return null
  }
  
  private async tryProvider(
    providerName: string, 
    trackId: string, 
    trackTitle?: string, 
    artistName?: string
  ): Promise<Lyrics | null> {
    const provider = this.providers[providerName]
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`)
    }
    
    if (providerName === 'local') {
      return await provider.getLyrics(trackId)
    } else {
      if (!trackTitle || !artistName) {
        throw new Error(`Provider ${providerName} requires track title and artist name`)
      }
      return await provider.getLyrics(trackId, trackTitle, artistName)
    }
  }
  
  async searchLyrics(query: string, provider?: string): Promise<Lyrics[]> {
    if (provider && this.providers[provider]) {
      if (provider === 'local') {
        return await this.providers[provider].searchLyrics(query)
      }
      // Other providers would need search implementation
      return []
    }
    
    // Search all providers
    const results: Lyrics[] = []
    for (const providerName of this.getEnabledProviders()) {
      if (providerName === 'local') {
        const providerResults = await this.providers[providerName].searchLyrics(query)
        results.push(...providerResults)
      }
    }
    
    return results
  }
  
  getProviderStatus(): Record<string, { enabled: boolean; rateLimit: any }> {
    const status: Record<string, { enabled: boolean; rateLimit: any }> = {}
    
    for (const [name, config] of Object.entries(PROVIDER_CONFIGS)) {
      const rateLimit = checkRateLimit(name, config)
      status[name] = {
        enabled: config.enabled,
        rateLimit: {
          remaining: rateLimit.remaining,
          resetTime: rateLimit.resetTime,
          allowed: rateLimit.allowed
        }
      }
    }
    
    return status
  }
  
  clearCache(): void {
    lyricsCache.clear()
  }
  
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: lyricsCache.size,
      entries: Array.from(lyricsCache.keys())
    }
  }
}

// Export singleton instance
export const lyricsService = new LyricsService()

// Export types and utilities
export { LyricsProvider, LyricsProviderConfig, PROVIDER_CONFIGS }
