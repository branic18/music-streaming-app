/**
 * Custom hook for infinite scroll search with pagination
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { searchCache } from '@/lib/search/search-cache'
import { SearchResults, SearchOptions } from '@/lib/search/types'

interface UseInfiniteSearchOptions {
  debounceMs?: number
  cacheTTL?: number
  enableCache?: boolean
  pageSize?: number
  enableInfiniteScroll?: boolean
}

interface UseInfiniteSearchReturn {
  searchResults: SearchResults | null
  isLoading: boolean
  isLoadingMore: boolean
  error: string | null
  hasMore: boolean
  performSearch: (options: SearchOptions) => void
  loadMore: () => void
  clearResults: () => void
  clearError: () => void
  resetPagination: () => void
}

export function useInfiniteSearch(
  options: UseInfiniteSearchOptions = {}
): UseInfiniteSearchReturn {
  const {
    debounceMs = 300,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    enableCache = true,
    pageSize = 20,
    enableInfiniteScroll = true
  } = options

  const [searchResults, setSearchResults] = useState<SearchResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [currentOffset, setCurrentOffset] = useState(0)
  const [currentSearchOptions, setCurrentSearchOptions] = useState<SearchOptions | null>(null)
  
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

    // Reset pagination
    setCurrentOffset(0)
    setCurrentSearchOptions(searchOptions)

    // Check cache first
    if (enableCache) {
      const cachedResults = searchCache.get({ ...searchOptions, offset: 0 })
      if (cachedResults) {
        setSearchResults(cachedResults)
        setHasMore(cachedResults.pagination.hasNext)
        return
      }
    }

    // Debounce the search
    timeoutRef.current = setTimeout(async () => {
      if (!searchOptions.query.trim()) {
        setSearchResults(null)
        setIsLoading(false)
        setHasMore(false)
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
          limit: pageSize.toString(),
          offset: '0'
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
          searchCache.set({ ...searchOptions, offset: 0 }, results, cacheTTL)
        }

        setSearchResults(results)
        setHasMore(results.pagination.hasNext)
        setCurrentOffset(pageSize)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was aborted, don't update state
          return
        }
        
        setError(err instanceof Error ? err.message : 'Search failed')
        setSearchResults(null)
        setHasMore(false)
      } finally {
        setIsLoading(false)
      }
    }, debounceMs)
  }, [debounceMs, cacheTTL, enableCache, pageSize])

  const loadMore = useCallback(async () => {
    if (!currentSearchOptions || !hasMore || isLoadingMore) {
      return
    }

    setIsLoadingMore(true)
    setError(null)

    try {
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController()

      const params = new URLSearchParams({
        query: currentSearchOptions.query.trim(),
        type: currentSearchOptions.type || 'all',
        sortBy: currentSearchOptions.sortBy || 'relevance',
        sortOrder: currentSearchOptions.sortOrder || 'desc',
        limit: pageSize.toString(),
        offset: currentOffset.toString()
      })

      // Add filters to search parameters
      if (currentSearchOptions.filters) {
        const { filters } = currentSearchOptions
        
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
        throw new Error(`Load more failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Load more failed')
      }

      const newResults = data.data as SearchResults

      // Merge with existing results
      setSearchResults(prev => {
        if (!prev) return newResults

        return {
          ...newResults,
          tracks: [...prev.tracks, ...newResults.tracks],
          albums: [...prev.albums, ...newResults.albums],
          artists: [...prev.artists, ...newResults.artists],
          playlists: [...prev.playlists, ...newResults.playlists],
          totalResults: newResults.totalResults,
          pagination: newResults.pagination
        }
      })

      setHasMore(newResults.pagination.hasNext)
      setCurrentOffset(prev => prev + pageSize)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was aborted, don't update state
        return
      }
      
      setError(err instanceof Error ? err.message : 'Load more failed')
    } finally {
      setIsLoadingMore(false)
    }
  }, [currentSearchOptions, hasMore, isLoadingMore, currentOffset, pageSize])

  const clearResults = useCallback(() => {
    setSearchResults(null)
    setError(null)
    setHasMore(false)
    setCurrentOffset(0)
    setCurrentSearchOptions(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const resetPagination = useCallback(() => {
    setCurrentOffset(0)
    setHasMore(false)
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
    isLoadingMore,
    error,
    hasMore,
    performSearch,
    loadMore,
    clearResults,
    clearError,
    resetPagination
  }
}
