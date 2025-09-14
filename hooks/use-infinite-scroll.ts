/**
 * Custom hook for infinite scroll functionality
 */

import { useEffect, useCallback, useRef, useState } from 'react'

interface UseInfiniteScrollOptions {
  threshold?: number // Distance from bottom to trigger load more (in pixels)
  rootMargin?: string // Root margin for intersection observer
  enabled?: boolean // Whether infinite scroll is enabled
}

interface UseInfiniteScrollReturn {
  loadMoreRef: (node: HTMLElement | null) => void
  isIntersecting: boolean
}

export function useInfiniteScroll(
  onLoadMore: () => void,
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollReturn {
  const {
    threshold = 100,
    rootMargin = '0px',
    enabled = true
  } = options

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLElement | null>(null)
  const [isIntersecting, setIsIntersecting] = useState(false)

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries
    setIsIntersecting(entry.isIntersecting)
    
    if (entry.isIntersecting && enabled) {
      onLoadMore()
    }
  }, [onLoadMore, enabled])

  const setLoadMoreRef = useCallback((node: HTMLElement | null) => {
    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    loadMoreRef.current = node

    if (node && enabled) {
      // Create new intersection observer
      observerRef.current = new IntersectionObserver(handleIntersection, {
        threshold: 0,
        rootMargin: `${threshold}px ${rootMargin}`
      })

      observerRef.current.observe(node)
    }
  }, [handleIntersection, threshold, rootMargin, enabled])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  return {
    loadMoreRef: setLoadMoreRef,
    isIntersecting
  }
}

