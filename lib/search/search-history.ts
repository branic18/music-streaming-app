/**
 * Search history management utility
 * Handles storing, retrieving, and managing search history
 */

import { SearchHistoryEntry, SearchFilters } from './types'

// Search history configuration
const SEARCH_HISTORY_CONFIG = {
  MAX_ENTRIES: 50,
  STORAGE_KEY: 'music-streaming-search-history',
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 100
} as const

// Search history manager class
export class SearchHistoryManager {
  private history: SearchHistoryEntry[] = []
  private storageKey: string

  constructor(storageKey: string = SEARCH_HISTORY_CONFIG.STORAGE_KEY) {
    this.storageKey = storageKey
    this.loadFromStorage()
  }

  /**
   * Add a new search to history
   */
  addSearch(
    query: string, 
    resultCount: number = 0, 
    filters?: SearchFilters
  ): void {
    // Validate query
    if (!this.isValidQuery(query)) {
      return
    }

    // Remove existing entry with same query
    this.removeSearch(query)

    // Create new entry
    const entry: SearchHistoryEntry = {
      id: this.generateId(),
      query: query.trim(),
      timestamp: new Date(),
      resultCount,
      filters
    }

    // Add to beginning of history
    this.history.unshift(entry)

    // Limit history size
    if (this.history.length > SEARCH_HISTORY_CONFIG.MAX_ENTRIES) {
      this.history = this.history.slice(0, SEARCH_HISTORY_CONFIG.MAX_ENTRIES)
    }

    // Save to storage
    this.saveToStorage()
  }

  /**
   * Get search history
   */
  getHistory(limit?: number): SearchHistoryEntry[] {
    return limit ? this.history.slice(0, limit) : [...this.history]
  }

  /**
   * Get recent searches (last 24 hours)
   */
  getRecentSearches(limit: number = 10): SearchHistoryEntry[] {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return this.history
      .filter(entry => entry.timestamp > oneDayAgo)
      .slice(0, limit)
  }

  /**
   * Get popular searches (most searched queries)
   */
  getPopularSearches(limit: number = 10): SearchHistoryEntry[] {
    const queryCounts = new Map<string, { entry: SearchHistoryEntry; count: number }>()
    
    // Count occurrences of each query
    this.history.forEach(entry => {
      const existing = queryCounts.get(entry.query)
      if (existing) {
        existing.count++
        // Keep the most recent entry
        if (entry.timestamp > existing.entry.timestamp) {
          existing.entry = entry
        }
      } else {
        queryCounts.set(entry.query, { entry, count: 1 })
      }
    })

    // Sort by count and return top entries
    return Array.from(queryCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(item => item.entry)
  }

  /**
   * Search history by query
   */
  searchHistory(query: string, limit: number = 10): SearchHistoryEntry[] {
    const normalizedQuery = query.toLowerCase().trim()
    if (!normalizedQuery) {
      return this.getHistory(limit)
    }

    return this.history
      .filter(entry => 
        entry.query.toLowerCase().includes(normalizedQuery)
      )
      .slice(0, limit)
  }

  /**
   * Remove a specific search from history
   */
  removeSearch(query: string): boolean {
    const initialLength = this.history.length
    this.history = this.history.filter(entry => 
      entry.query.toLowerCase() !== query.toLowerCase()
    )
    
    if (this.history.length !== initialLength) {
      this.saveToStorage()
      return true
    }
    
    return false
  }

  /**
   * Clear all search history
   */
  clearHistory(): void {
    this.history = []
    this.saveToStorage()
  }

  /**
   * Clear old search history (older than specified days)
   */
  clearOldHistory(daysOld: number = 30): number {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)
    const initialLength = this.history.length
    
    this.history = this.history.filter(entry => entry.timestamp > cutoffDate)
    
    const removedCount = initialLength - this.history.length
    if (removedCount > 0) {
      this.saveToStorage()
    }
    
    return removedCount
  }

  /**
   * Get search statistics
   */
  getStats(): {
    totalSearches: number
    uniqueQueries: number
    averageResultsPerSearch: number
    mostSearchedQuery: string | null
    oldestSearch: Date | null
    newestSearch: Date | null
  } {
    if (this.history.length === 0) {
      return {
        totalSearches: 0,
        uniqueQueries: 0,
        averageResultsPerSearch: 0,
        mostSearchedQuery: null,
        oldestSearch: null,
        newestSearch: null
      }
    }

    const uniqueQueries = new Set(this.history.map(entry => entry.query))
    const totalResults = this.history.reduce((sum, entry) => sum + entry.resultCount, 0)
    
    // Find most searched query
    const queryCounts = new Map<string, number>()
    this.history.forEach(entry => {
      queryCounts.set(entry.query, (queryCounts.get(entry.query) || 0) + 1)
    })
    
    const mostSearchedQuery = Array.from(queryCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null

    return {
      totalSearches: this.history.length,
      uniqueQueries: uniqueQueries.size,
      averageResultsPerSearch: totalResults / this.history.length,
      mostSearchedQuery,
      oldestSearch: this.history[this.history.length - 1]?.timestamp || null,
      newestSearch: this.history[0]?.timestamp || null
    }
  }

  /**
   * Validate search query
   */
  private isValidQuery(query: string): boolean {
    const trimmed = query.trim()
    return (
      trimmed.length >= SEARCH_HISTORY_CONFIG.MIN_QUERY_LENGTH &&
      trimmed.length <= SEARCH_HISTORY_CONFIG.MAX_QUERY_LENGTH
    )
  }

  /**
   * Generate unique ID for history entry
   */
  private generateId(): string {
    return `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Load history from localStorage
   */
  private loadFromStorage(): void {
    try {
      if (typeof window === 'undefined') return
      
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        this.history = parsed.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }))
      }
    } catch (error) {
      console.warn('Failed to load search history from storage:', error)
      this.history = []
    }
  }

  /**
   * Save history to localStorage
   */
  private saveToStorage(): void {
    try {
      if (typeof window === 'undefined') return
      
      localStorage.setItem(this.storageKey, JSON.stringify(this.history))
    } catch (error) {
      console.warn('Failed to save search history to storage:', error)
    }
  }
}

// Global search history manager instance
export const searchHistoryManager = new SearchHistoryManager()

// Export configuration
export { SEARCH_HISTORY_CONFIG }
