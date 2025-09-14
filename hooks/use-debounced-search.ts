/**
 * Custom hook for debounced search with caching
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { searchCache } from '@/lib/search/search-cache'
import { SearchResults, SearchOptions } from '@/lib/search/types'

interface UseDebouncedSearchOptions {
  debounceMs?: number
  cacheTTL?: number
  enableCache?: boolean
}

interface UseDebouncedSearchReturn {
  searchResults: SearchResults | null
  isLoading: boolean
  error: string | null
  performSearch: (options: SearchOptions) => void
  clearResults: () => void
  clearError: () => void
}

export function useDebouncedSearch(
  options: UseDebouncedSearchOptions = {}
): UseDebouncedSearchReturn {
  const {
    debounceMs = 300,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    enableCache = true
  } = options

  const [searchResults, setSearchResults] = useState<SearchResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const timeoutRef = useRef<NodeJS.Timeout>()
  const abortControllerRef = useRef<AbortController>()

  const performSearch = useCallback(async (searchOptions: SearchOptions) => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Clear error state
    setError(null)

    // Check cache first
    if (enableCache) {
      const cachedResults = searchCache.get(searchOptions)
      if (cachedResults) {
        setSearchResults(cachedResults)
        return
      }
    }

    // Debounce the search
    timeoutRef.current = setTimeout(async () => {
      if (!searchOptions.query.trim()) {
        setSearchResults(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        // Create new abort controller for this request
        abortControllerRef.current = new AbortController()

        const params = new URLSearchParams({
          query: searchOptions.query.trim(),
          type: searchOptions.type || 'all',
          sortBy: searchOptions.sortBy || 'relevance',
          sortOrder: searchOptions.sortOrder || 'desc',
          limit: (searchOptions.limit || 20).toString(),
          offset: (searchOptions.offset || 0).toString()
        })

        // Add filters to search parameters
        if (searchOptions.filters) {
          const { filters } = searchOptions
          
          if (filters.genre && filters.genre.length > 0) {
            params.append('genre', filters.genre.join(','))
          }
          if (filters.year?.from) {
            params.append('yearFrom', filters.year.from.toString())
          }
          if (filters.year?.to) {
            params.append('yearTo', filters.year.to.toString())
          }
          if (filters.duration?.min) {
            params.append('durationMin', filters.duration.min.toString())
          }
          if (filters.duration?.max) {
            params.append('durationMax', filters.duration.max.toString())
          }
          if (filters.explicit !== undefined) {
            params.append('explicit', filters.explicit.toString())
          }
          if (filters.downloadable !== undefined) {
            params.append('downloadable', filters.downloadable.toString())
          }
          if (filters.popularity?.min) {
            params.append('popularityMin', filters.popularity.min.toString())
          }
          if (filters.popularity?.max) {
            params.append('popularityMax', filters.popularity.max.toString())
          }
        }

        const response = await fetch(`/api/search?${params}`, {
          signal: abortControllerRef.current.signal
        })

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Search failed')
        }

        const results = data.data as SearchResults

        // Cache the results
        if (enableCache) {
          searchCache.set(searchOptions, results, cacheTTL)
        }

        setSearchResults(results)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was aborted, don't update state
          return
        }
        
        setError(err instanceof Error ? err.message : 'Search failed')
        setSearchResults(null)
      } finally {
        setIsLoading(false)
      }
    }, debounceMs)
  }, [debounceMs, cacheTTL, enableCache])

  const clearResults = useCallback(() => {
    setSearchResults(null)
    setError(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    searchResults,
    isLoading,
    error,
    performSearch,
    clearResults,
    clearError
  }
}
