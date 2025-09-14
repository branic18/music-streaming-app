/**
 * Search suggestions dropdown component
 */

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Music, Disc, User, Tag } from 'lucide-react'
import { SearchSuggestion } from '@/lib/search/types'

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[]
  isLoading: boolean
  showSuggestions: boolean
  onSuggestionSelect: (suggestion: SearchSuggestion) => void
  onClose: () => void
  className?: string
}

export function SearchSuggestions({
  suggestions,
  isLoading,
  showSuggestions,
  onSuggestionSelect,
  onClose,
  className = ''
}: SearchSuggestionsProps) {
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!showSuggestions) return

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setSelectedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          event.preventDefault()
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
          break
        case 'Enter':
          event.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            onSuggestionSelect(suggestions[selectedIndex])
          }
          break
        case 'Escape':
          event.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showSuggestions, selectedIndex, suggestions, onSuggestionSelect, onClose])

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [suggestions])

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSuggestions, onClose])

  if (!showSuggestions) {
    return null
  }

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'track':
        return <Music className="h-4 w-4" />
      case 'album':
        return <Disc className="h-4 w-4" />
      case 'artist':
        return <User className="h-4 w-4" />
      case 'playlist':
        return <Disc className="h-4 w-4" />
      case 'genre':
        return <Tag className="h-4 w-4" />
      default:
        return <Music className="h-4 w-4" />
    }
  }

  const getSuggestionTypeColor = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'track':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'album':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'artist':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'playlist':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'genre':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <Card 
      ref={suggestionsRef}
      className={`absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto shadow-lg ${className}`}
    >
      <div className="p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading suggestions...</span>
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-1">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                onClick={() => onSuggestionSelect(suggestion)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors ${
                  index === selectedIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                }`}
              >
                <div className="flex-shrink-0 text-muted-foreground">
                  {getSuggestionIcon(suggestion.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{suggestion.text}</div>
                </div>
                <div className="flex-shrink-0">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getSuggestionTypeColor(suggestion.type)}`}
                  >
                    {suggestion.type}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No suggestions found
          </div>
        )}
      </div>
    </Card>
  )
}
