/**
 * Custom hook for managing search history
 */

import { useState, useEffect, useCallback } from 'react'
import { searchHistoryManager, SearchHistoryEntry } from '@/lib/search/search-history'
import { SearchFilters } from '@/lib/search/types'

interface UseSearchHistoryOptions {
  maxRecentSearches?: number
  maxPopularSearches?: number
  autoSave?: boolean
}

interface UseSearchHistoryReturn {
  recentSearches: SearchHistoryEntry[]
  popularSearches: SearchHistoryEntry[]
  allHistory: SearchHistoryEntry[]
  addSearch: (query: string, resultCount?: number, filters?: SearchFilters) => void
  removeSearch: (query: string) => void
  clearHistory: () => void
  searchHistory: (query: string, limit?: number) => SearchHistoryEntry[]
  getStats: () => {
    totalSearches: number
    uniqueQueries: number
    averageResultsPerSearch: number
    mostSearchedQuery: string | null
    oldestSearch: Date | null
    newestSearch: Date | null
  }
}

export function useSearchHistory(
  options: UseSearchHistoryOptions = {}
): UseSearchHistoryReturn {
  const {
    maxRecentSearches = 10,
    maxPopularSearches = 10,
    autoSave = true
  } = options

  const [recentSearches, setRecentSearches] = useState<SearchHistoryEntry[]>([])
  const [popularSearches, setPopularSearches] = useState<SearchHistoryEntry[]>([])
  const [allHistory, setAllHistory] = useState<SearchHistoryEntry[]>([])

  // Load initial data
  useEffect(() => {
    updateHistoryData()
  }, [])

  const updateHistoryData = useCallback(() => {
    setRecentSearches(searchHistoryManager.getRecentSearches(maxRecentSearches))
    setPopularSearches(searchHistoryManager.getPopularSearches(maxPopularSearches))
    setAllHistory(searchHistoryManager.getHistory())
  }, [maxRecentSearches, maxPopularSearches])

  const addSearch = useCallback((
    query: string, 
    resultCount: number = 0, 
    filters?: SearchFilters
  ) => {
    if (autoSave) {
      searchHistoryManager.addSearch(query, resultCount, filters)
      updateHistoryData()
    }
  }, [autoSave, updateHistoryData])

  const removeSearch = useCallback((query: string) => {
    searchHistoryManager.removeSearch(query)
    updateHistoryData()
  }, [updateHistoryData])

  const clearHistory = useCallback(() => {
    searchHistoryManager.clearHistory()
    updateHistoryData()
  }, [updateHistoryData])

  const searchHistory = useCallback((query: string, limit: number = 10) => {
    return searchHistoryManager.searchHistory(query, limit)
  }, [])

  const getStats = useCallback(() => {
    return searchHistoryManager.getStats()
  }, [])

  return {
    recentSearches,
    popularSearches,
    allHistory,
    addSearch,
    removeSearch,
    clearHistory,
    searchHistory,
    getStats
  }
}
