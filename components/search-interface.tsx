"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Search, Play, Heart, MoreHorizontal, User, Disc, Loader2, Filter, ChevronDown } from "lucide-react"
import { Track, Album, Artist, Playlist } from "@/lib/types"
import { useInfiniteSearch } from "@/hooks/use-infinite-search"
import { useSearchSuggestions } from "@/hooks/use-search-suggestions"
import { useSearchHistory } from "@/hooks/use-search-history"
import { SearchResults, SearchFilters, SearchOptions, SearchSuggestion } from "@/lib/search/types"
import { SearchSuggestions } from "@/components/search/SearchSuggestions"
import { RecentSearches } from "@/components/search/RecentSearches"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"

// API response type
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

interface SearchInterfaceProps {
  onTrackSelect: (track: Track) => void
  onPlayTrack: (track: Track) => void
}

export function SearchInterface({ onTrackSelect, onPlayTrack }: SearchInterfaceProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [sortBy, setSortBy] = useState("relevance")
  const [filters, setFilters] = useState<SearchFilters>({})
  const [showFilters, setShowFilters] = useState(false)

  // Use the infinite search hook
  const { searchResults, isLoading, isFetchingMore, error, hasMore, performSearch, loadMore } = useInfiniteSearch({
    initialLimit: 20,
    cacheTTL: 5 * 60 * 1000, // 5 minutes
    enableCache: true
  })

  // Use infinite scroll hook
  const { loadMoreRef } = useInfiniteScroll(loadMore, {
    threshold: 200,
    enabled: hasMore && !isLoading && !isFetchingMore
  })

  // Use the search suggestions hook
  const { 
    suggestions, 
    isLoading: suggestionsLoading, 
    showSuggestions, 
    setShowSuggestions 
  } = useSearchSuggestions(searchQuery, {
    debounceMs: 200,
    minQueryLength: 2,
    maxSuggestions: 10,
    enableSuggestions: true
  })

  // Use the search history hook
  const {
    recentSearches,
    popularSearches,
    addSearch,
    removeSearch,
    clearHistory
  } = useSearchHistory({
    maxRecentSearches: 10,
    maxPopularSearches: 10,
    autoSave: true
  })

  // Available genres for filtering
  const availableGenres = [
    'Rock', 'Pop', 'Hip-Hop', 'R&B', 'Country', 'Jazz', 'Classical', 'Electronic',
    'Alternative', 'Indie', 'Folk', 'Blues', 'Reggae', 'Punk', 'Metal', 'Grunge'
  ]

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatFollowers = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  const hasResults = searchResults && (
    searchResults.tracks.length > 0 || 
    searchResults.albums.length > 0 || 
    searchResults.artists.length > 0 ||
    searchResults.playlists.length > 0
  )

  // Perform search when query, tab, sort, or filters change
  useEffect(() => {
    if (searchQuery.trim()) {
      const searchOptions: SearchOptions = {
        query: searchQuery,
        type: activeTab as any,
        sortBy: sortBy as any,
        sortOrder: 'desc',
        limit: 20,
        offset: 0,
        filters
      }
      performSearch(searchOptions)
    }
  }, [searchQuery, activeTab, sortBy, filters, performSearch])

  // Save search to history when results are received
  useEffect(() => {
    if (searchQuery.trim() && searchResults) {
      const totalResults = searchResults.totalResults
      addSearch(searchQuery, totalResults, filters)
    }
  }, [searchQuery, searchResults, filters, addSearch])

  // Filter helper functions
  const updateGenreFilter = (genre: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      genre: checked 
        ? [...(prev.genre || []), genre]
        : (prev.genre || []).filter(g => g !== genre)
    }))
  }

  const updateYearFilter = (field: 'from' | 'to', value: number | undefined) => {
    setFilters(prev => ({
      ...prev,
      year: {
        ...prev.year,
        [field]: value
      }
    }))
  }

  const updateDurationFilter = (field: 'min' | 'max', value: number | undefined) => {
    setFilters(prev => ({
      ...prev,
      duration: {
        ...prev.duration,
        [field]: value
      }
    }))
  }

  const updatePopularityFilter = (field: 'min' | 'max', value: number | undefined) => {
    setFilters(prev => ({
      ...prev,
      popularity: {
        ...prev.popularity,
        [field]: value
      }
    }))
  }

  const clearFilters = () => {
    setFilters({})
  }

  const hasActiveFilters = () => {
    return !!(
      filters.genre?.length ||
      filters.year?.from ||
      filters.year?.to ||
      filters.duration?.min ||
      filters.duration?.max ||
      filters.explicit !== undefined ||
      filters.downloadable !== undefined ||
      filters.popularity?.min ||
      filters.popularity?.max
    )
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.text)
    setShowSuggestions(false)
  }

  // Handle history search selection
  const handleHistorySearchSelect = (query: string) => {
    setSearchQuery(query)
    setShowSuggestions(false)
  }

  const renderTrackResults = () => {
    const tracks = searchResults?.tracks || []
    
    return (
    <div className="space-y-2">
        {tracks.map((track, index) => (
        <Card key={track.id} className="p-4 hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-8 text-center text-sm text-muted-foreground">{index + 1}</div>
            <img
              src={track.artwork || "/placeholder.svg"}
                alt={`${track.album || 'Album'} cover`}
              className="w-12 h-12 rounded-md object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium truncate">{track.title}</h4>
                {track.explicit && (
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    E
                  </Badge>
                )}
              </div>
                <p className="text-sm text-muted-foreground truncate">
                  {Array.isArray(track.artists) ? track.artists.join(', ') : track.artists}
                </p>
            </div>
              <p className="text-sm text-muted-foreground hidden md:block truncate max-w-32">
                {track.album || 'Unknown Album'}
              </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => onPlayTrack(track)}>
                <Play className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Heart className="h-4 w-4" />
              </Button>
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {formatTime(track.durationMs)}
                </span>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
  }

  const renderAlbumResults = () => {
    const albums = searchResults?.albums || []

    return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {albums.map((album) => (
        <Card key={album.id} className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
          <img
            src={album.artwork || "/placeholder.svg"}
            alt={`${album.title} cover`}
            className="w-full aspect-square rounded-md object-cover mb-3"
          />
          <h4 className="font-medium truncate">{album.title}</h4>
          <p className="text-sm text-muted-foreground truncate">{album.artist}</p>
          <p className="text-xs text-muted-foreground">
            {album.year} • {album.trackCount} tracks
          </p>
        </Card>
      ))}
    </div>
  )
  }

  const renderArtistResults = () => {
    const artists = searchResults?.artists || []

    return (
    <div className="space-y-4">
        {artists.map((artist) => (
        <Card key={artist.id} className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-4">
            <img
              src={artist.artwork || "/placeholder.svg"}
              alt={`${artist.name} photo`}
              className="w-16 h-16 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium truncate">{artist.name}</h4>
                {artist.verified && (
                  <Badge variant="secondary" className="text-xs">
                    ✓
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{formatFollowers(artist.followers)} followers</p>
              <div className="flex gap-1 mt-1">
                  {artist.genres?.slice(0, 3).map((genre) => (
                  <Badge key={genre} variant="outline" className="text-xs">
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>
            <Button variant="outline" size="sm">
              Follow
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="What do you want to listen to?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            className="pl-10 h-12 text-lg"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          
          {/* Search Suggestions Dropdown */}
          <SearchSuggestions
            suggestions={suggestions}
            isLoading={suggestionsLoading}
            showSuggestions={showSuggestions && searchQuery.length >= 2}
            onSuggestionSelect={handleSuggestionSelect}
            onClose={() => setShowSuggestions(false)}
          />
        </div>

        {searchQuery && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="popularity">Popularity</SelectItem>
                  <SelectItem value="recent">Recent</SelectItem>
                  <SelectItem value="duration">Duration</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
              
              <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                    {hasActiveFilters() && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                        {Object.values(filters).filter(Boolean).length}
                      </Badge>
                    )}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <Card className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Genre Filter */}
                      <div>
                        <h4 className="font-medium mb-3">Genres</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {availableGenres.map((genre) => (
                            <div key={genre} className="flex items-center space-x-2">
                              <Checkbox
                                id={`genre-${genre}`}
                                checked={filters.genre?.includes(genre) || false}
                                onCheckedChange={(checked) => updateGenreFilter(genre, !!checked)}
                              />
                              <label
                                htmlFor={`genre-${genre}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {genre}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Year Filter */}
                      <div>
                        <h4 className="font-medium mb-3">Release Year</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm text-muted-foreground">From</label>
                            <Input
                              type="number"
                              placeholder="1900"
                              min="1900"
                              max={new Date().getFullYear()}
                              value={filters.year?.from || ''}
                              onChange={(e) => updateYearFilter('from', e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground">To</label>
                            <Input
                              type="number"
                              placeholder={new Date().getFullYear().toString()}
                              min="1900"
                              max={new Date().getFullYear()}
                              value={filters.year?.to || ''}
                              onChange={(e) => updateYearFilter('to', e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Duration Filter */}
                      <div>
                        <h4 className="font-medium mb-3">Duration (minutes)</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm text-muted-foreground">Min</label>
                            <Input
                              type="number"
                              placeholder="0"
                              min="0"
                              value={filters.duration?.min || ''}
                              onChange={(e) => updateDurationFilter('min', e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground">Max</label>
                            <Input
                              type="number"
                              placeholder="10"
                              min="0"
                              value={filters.duration?.max || ''}
                              onChange={(e) => updateDurationFilter('max', e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Popularity Filter */}
                      <div>
                        <h4 className="font-medium mb-3">Popularity</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm text-muted-foreground">Min (0-100)</label>
                            <Slider
                              value={[filters.popularity?.min || 0]}
                              onValueChange={([value]) => updatePopularityFilter('min', value)}
                              max={100}
                              step={1}
                              className="w-full"
                            />
                            <div className="text-xs text-muted-foreground text-center">
                              {filters.popularity?.min || 0}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground">Max (0-100)</label>
                            <Slider
                              value={[filters.popularity?.max || 100]}
                              onValueChange={([value]) => updatePopularityFilter('max', value)}
                              max={100}
                              step={1}
                              className="w-full"
                            />
                            <div className="text-xs text-muted-foreground text-center">
                              {filters.popularity?.max || 100}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Boolean Filters */}
                      <div>
                        <h4 className="font-medium mb-3">Options</h4>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="explicit"
                              checked={filters.explicit === true}
                              onCheckedChange={(checked) => setFilters(prev => ({ ...prev, explicit: checked ? true : undefined }))}
                            />
                            <label htmlFor="explicit" className="text-sm">Explicit content only</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="downloadable"
                              checked={filters.downloadable === true}
                              onCheckedChange={(checked) => setFilters(prev => ({ ...prev, downloadable: checked ? true : undefined }))}
                            />
                            <label htmlFor="downloadable" className="text-sm">Downloadable only</label>
                          </div>
                        </div>
                      </div>

                      {/* Clear Filters */}
                      <div className="flex items-end">
                        <Button variant="outline" onClick={clearFilters} disabled={!hasActiveFilters()}>
                          Clear Filters
                        </Button>
                      </div>
                    </div>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        )}
      </div>

      {/* Search Results */}
      {error ? (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Search Error</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      ) : searchQuery && hasResults ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="tracks">Songs ({searchResults?.tracks.length || 0})</TabsTrigger>
            <TabsTrigger value="albums">Albums ({searchResults?.albums.length || 0})</TabsTrigger>
            <TabsTrigger value="artists">Artists ({searchResults?.artists.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-8">
            {searchResults?.tracks && searchResults.tracks.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Disc className="h-5 w-5" />
                  Songs
                </h3>
                <div className="space-y-2">
                  {searchResults.tracks.slice(0, 5).map((track, index) => (
                    <Card key={track.id} className="p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-8 text-center text-sm text-muted-foreground">{index + 1}</div>
                        <img
                          src={track.artwork || "/placeholder.svg"}
                          alt={`${track.album || 'Album'} cover`}
                          className="w-12 h-12 rounded-md object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">{track.title}</h4>
                            {track.explicit && (
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                E
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {Array.isArray(track.artists) ? track.artists.join(', ') : track.artists}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => onPlayTrack(track)}>
                            <Play className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {formatTime(track.durationMs)}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {searchResults?.albums && searchResults.albums.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Disc className="h-5 w-5" />
                  Albums
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {searchResults.albums.slice(0, 5).map((album) => (
                    <Card key={album.id} className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                      <img
                        src={album.artwork || "/placeholder.svg"}
                        alt={`${album.title} cover`}
                        className="w-full aspect-square rounded-md object-cover mb-3"
                      />
                      <h4 className="font-medium truncate">{album.title}</h4>
                      <p className="text-sm text-muted-foreground truncate">{album.artist}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {searchResults?.artists && searchResults.artists.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Artists
                </h3>
                <div className="space-y-4">
                  {searchResults.artists.slice(0, 3).map((artist) => (
                    <Card key={artist.id} className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-4">
                        <img
                          src={artist.artwork || "/placeholder.svg"}
                          alt={`${artist.name} photo`}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">{artist.name}</h4>
                            {artist.verified && (
                              <Badge variant="secondary" className="text-xs">
                                ✓
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{formatFollowers(artist.followers)} followers</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tracks">{renderTrackResults()}</TabsContent>

          <TabsContent value="albums">{renderAlbumResults()}</TabsContent>

          <TabsContent value="artists">{renderArtistResults()}</TabsContent>
        </Tabs>
        
        {/* Infinite scroll trigger and loading indicator */}
        {hasResults && (
          <div className="mt-8">
            {isFetchingMore && (
              <div className="flex justify-center items-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                <span className="text-muted-foreground">Loading more results...</span>
              </div>
            )}
            {hasMore && !isFetchingMore && (
              <div ref={loadMoreRef} className="h-4" />
            )}
            {!hasMore && hasResults && (
              <div className="text-center py-4 text-muted-foreground">
                <p>You've reached the end of the results</p>
              </div>
            )}
          </div>
        )}
      ) : searchQuery && !hasResults && !isLoading ? (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No results found</h3>
          <p className="text-muted-foreground">Try searching for something else or check your spelling.</p>
        </div>
      ) : !searchQuery ? (
        <div className="space-y-6">
          <div className="text-center py-8">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Search for music</h3>
          <p className="text-muted-foreground">Find your favorite songs, albums, and artists.</p>
        </div>
          
          {/* Recent Searches */}
          <RecentSearches
            recentSearches={recentSearches}
            popularSearches={popularSearches}
            onSearchSelect={handleHistorySearchSelect}
            onRemoveSearch={removeSearch}
            onClearHistory={clearHistory}
          />
        </div>
      ) : null}
    </div>
  )
}
