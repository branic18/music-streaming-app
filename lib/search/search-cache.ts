/**
 * Search result caching utility
 * Provides in-memory caching for search results with TTL and cache invalidation
 */

import { SearchResults } from './types'

// Cache entry interface
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

// Search cache key interface
interface SearchCacheKey {
  query: string
  type: string
  sortBy: string
  sortOrder: string
  filters: Record<string, any>
  limit: number
  offset: number
}

// Search cache class
export class SearchCache {
  private cache = new Map<string, CacheEntry<SearchResults>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes default TTL

  constructor(defaultTTL?: number) {
    if (defaultTTL) {
      this.defaultTTL = defaultTTL
    }
  }

  /**
   * Generate cache key from search parameters
   */
  private generateKey(params: SearchCacheKey): string {
    const key = {
      query: params.query.toLowerCase().trim(),
      type: params.type,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      filters: this.normalizeFilters(params.filters),
      limit: params.limit,
      offset: params.offset
    }
    return JSON.stringify(key)
  }

  /**
   * Normalize filters for consistent cache keys
   */
  private normalizeFilters(filters: Record<string, any>): Record<string, any> {
    const normalized: Record<string, any> = {}
    
    // Sort arrays to ensure consistent keys
    Object.keys(filters).sort().forEach(key => {
      const value = filters[key]
      if (Array.isArray(value)) {
        normalized[key] = [...value].sort()
      } else if (typeof value === 'object' && value !== null) {
        normalized[key] = this.normalizeFilters(value)
      } else {
        normalized[key] = value
      }
    })
    
    return normalized
  }

  /**
   * Get cached search results
   */
  get(params: SearchCacheKey): SearchResults | null {
    const key = this.generateKey(params)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * Set search results in cache
   */
  set(params: SearchCacheKey, data: SearchResults, ttl?: number): void {
    const key = this.generateKey(params)
    const entry: CacheEntry<SearchResults> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    }

    this.cache.set(key, entry)
  }

  /**
   * Check if search results are cached and valid
   */
  has(params: SearchCacheKey): boolean {
    return this.get(params) !== null
  }

  /**
   * Clear specific cache entry
   */
  delete(params: SearchCacheKey): boolean {
    const key = this.generateKey(params)
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Clear expired cache entries
   */
  clearExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    entries: Array<{
      key: string
      age: number
      ttl: number
      expired: boolean
    }>
  } {
    const now = Date.now()
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.ttl,
      expired: now - entry.timestamp > entry.ttl
    }))

    return {
      size: this.cache.size,
      entries
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidatePattern(pattern: Partial<SearchCacheKey>): number {
    let invalidated = 0
    const patternKey = this.generateKey(pattern as SearchCacheKey)
    
    for (const [key] of this.cache.entries()) {
      if (key.includes(patternKey.replace(/[{}"]/g, ''))) {
        this.cache.delete(key)
        invalidated++
      }
    }
    
    return invalidated
  }
}

// Global search cache instance
export const searchCache = new SearchCache()

// Cache configuration
export const CACHE_CONFIG = {
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  MAX_ENTRIES: 100,
  CLEANUP_INTERVAL: 10 * 60 * 1000, // 10 minutes
} as const

// Auto-cleanup expired entries
setInterval(() => {
  searchCache.clearExpired()
}, CACHE_CONFIG.CLEANUP_INTERVAL)
