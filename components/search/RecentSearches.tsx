/**
 * Recent searches component
 */

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, X, TrendingUp, History } from 'lucide-react'
import { SearchHistoryEntry } from '@/lib/search/search-history'

interface RecentSearchesProps {
  recentSearches: SearchHistoryEntry[]
  popularSearches: SearchHistoryEntry[]
  onSearchSelect: (query: string) => void
  onRemoveSearch: (query: string) => void
  onClearHistory: () => void
  className?: string
}

export function RecentSearches({
  recentSearches,
  popularSearches,
  onSearchSelect,
  onRemoveSearch,
  onClearHistory,
  className = ''
}: RecentSearchesProps) {
  const [activeTab, setActiveTab] = useState<'recent' | 'popular'>('recent')

  const formatTimeAgo = (date: Date): string => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) {
      return 'Just now'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes}m ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours}h ago`
    } else {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days}d ago`
    }
  }

  const renderSearchItem = (entry: SearchHistoryEntry, showTime: boolean = true) => (
    <div
      key={entry.id}
      className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors group"
    >
      <button
        onClick={() => onSearchSelect(entry.query)}
        className="flex-1 flex items-center gap-3 text-left min-w-0"
      >
        <div className="flex-shrink-0 text-muted-foreground">
          {showTime ? <Clock className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{entry.query}</div>
          {showTime && (
            <div className="text-xs text-muted-foreground">
              {formatTimeAgo(entry.timestamp)}
            </div>
          )}
        </div>
        {entry.resultCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {entry.resultCount} results
          </Badge>
        )}
      </button>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation()
          onRemoveSearch(entry.query)
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )

  const hasRecentSearches = recentSearches.length > 0
  const hasPopularSearches = popularSearches.length > 0

  if (!hasRecentSearches && !hasPopularSearches) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No search history</h3>
        <p className="text-muted-foreground">
          Start searching to see your recent searches here.
        </p>
      </Card>
    )
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Recent Searches</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearHistory}
          className="text-xs"
        >
          Clear All
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-4">
        <Button
          variant={activeTab === 'recent' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('recent')}
          className="text-xs"
        >
          Recent
          {hasRecentSearches && (
            <Badge variant="secondary" className="ml-1 h-4 w-4 rounded-full p-0 text-xs">
              {recentSearches.length}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeTab === 'popular' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('popular')}
          className="text-xs"
        >
          Popular
          {hasPopularSearches && (
            <Badge variant="secondary" className="ml-1 h-4 w-4 rounded-full p-0 text-xs">
              {popularSearches.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Search Results */}
      <div className="space-y-1">
        {activeTab === 'recent' ? (
          hasRecentSearches ? (
            recentSearches.map(entry => renderSearchItem(entry, true))
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No recent searches
            </div>
          )
        ) : (
          hasPopularSearches ? (
            popularSearches.map(entry => renderSearchItem(entry, false))
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No popular searches
            </div>
          )
        )}
      </div>
    </Card>
  )
}
