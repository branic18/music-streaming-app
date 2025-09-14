/**
 * Custom hook for search suggestions and autocomplete
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { SearchSuggestion } from '@/lib/search/types'

interface UseSearchSuggestionsOptions {
  debounceMs?: number
  minQueryLength?: number
  maxSuggestions?: number
  enableSuggestions?: boolean
}

interface UseSearchSuggestionsReturn {
  suggestions: SearchSuggestion[]
  isLoading: boolean
  error: string | null
  showSuggestions: boolean
  setShowSuggestions: (show: boolean) => void
  clearSuggestions: () => void
  clearError: () => void
}

export function useSearchSuggestions(
  query: string,
  options: UseSearchSuggestionsOptions = {}
): UseSearchSuggestionsReturn {
  const {
    debounceMs = 200,
    minQueryLength = 2,
    maxSuggestions = 10,
    enableSuggestions = true
  } = options

  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const timeoutRef = useRef<NodeJS.Timeout>()
  const abortControllerRef = useRef<AbortController>()

  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!enableSuggestions || searchQuery.length < minQueryLength) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

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

    // Debounce the request
    timeoutRef.current = setTimeout(async () => {
      setIsLoading(true)

      try {
        // Create new abort controller for this request
        abortControllerRef.current = new AbortController()

        const params = new URLSearchParams({
          query: searchQuery,
          limit: maxSuggestions.toString()
        })

        const response = await fetch(`/api/search/suggestions?${params}`, {
          signal: abortControllerRef.current.signal
        })

        if (!response.ok) {
          throw new Error(`Suggestions request failed: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch suggestions')
        }

        setSuggestions(data.data.suggestions || [])
        setShowSuggestions(true)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was aborted, don't update state
          return
        }
        
        setError(err instanceof Error ? err.message : 'Failed to fetch suggestions')
        setSuggestions([])
        setShowSuggestions(false)
      } finally {
        setIsLoading(false)
      }
    }, debounceMs)
  }, [debounceMs, minQueryLength, maxSuggestions, enableSuggestions])

  // Fetch suggestions when query changes
  useEffect(() => {
    fetchSuggestions(query)
  }, [query, fetchSuggestions])

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
    setError(null)
    setShowSuggestions(false)
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
    suggestions,
    isLoading,
    error,
    showSuggestions,
    setShowSuggestions,
    clearSuggestions,
    clearError
  }
}
