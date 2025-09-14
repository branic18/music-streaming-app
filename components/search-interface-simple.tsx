"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Play, Heart, MoreHorizontal, User, Disc, Loader2, Plus } from "lucide-react"
import { Track, Album, Artist } from "@/lib/types"
import { PlaylistSelectionDialog } from "@/components/playlist-selection-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Playlist {
  id: string
  name: string
  description?: string
  tracks: Track[]
  createdAt: Date
  updatedAt: Date
  isPublic: boolean
  trackCount: number
  shareToken?: string
  artwork?: string
}

interface SearchInterfaceProps {
  onTrackSelect: (track: Track) => void
  onPlayTrack: (track: Track) => void
  playlists?: Playlist[]
  onAddToPlaylist?: (playlistId: string, track: Track) => void
  onCreatePlaylist?: (name: string, description?: string) => void
}

export function SearchInterface({ 
  onTrackSelect, 
  onPlayTrack, 
  playlists = [], 
  onAddToPlaylist, 
  onCreatePlaylist 
}: SearchInterfaceProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<{
    tracks: Track[]
    albums: Album[]
    artists: Artist[]
  }>({
    tracks: [],
    albums: [],
    artists: []
  })
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)

  // Mock search data
  const mockTracks: Track[] = [
    {
      id: "search-1",
      title: "Bohemian Rhapsody",
      artists: ["Queen"],
      albumId: "album-1",
      album: "A Night at the Opera",
      durationMs: 355000,
      artwork: "/queen-bohemian-rhapsody-album-cover.png",
      territories: ["US", "UK", "CA"],
      downloadable: true,
      lyricsAvailable: true,
      explicit: false,
      popularity: 95,
      previewUrl: "/audio/bohemian-rhapsody.mp3"
    },
    {
      id: "search-2", 
      title: "Hotel California",
      artists: ["Eagles"],
      albumId: "album-2",
      album: "Hotel California",
      durationMs: 391000,
      artwork: "/eagles-hotel-california-album-cover.jpg",
      territories: ["US", "UK", "CA"],
      downloadable: true,
      lyricsAvailable: true,
      explicit: false,
      popularity: 90,
      previewUrl: "/audio/hotel-california.mp3"
    },
    {
      id: "search-3",
      title: "Stairway to Heaven", 
      artists: ["Led Zeppelin"],
      albumId: "album-3",
      album: "Led Zeppelin IV",
      durationMs: 482000,
      artwork: "/led-zeppelin-iv-inspired-cover.png",
      territories: ["US", "UK", "CA"],
      downloadable: true,
      lyricsAvailable: true,
      explicit: false,
      popularity: 88,
      previewUrl: "/audio/stairway-to-heaven.mp3"
    }
  ]

  const mockAlbums: Album[] = [
    {
      id: "album-1",
      title: "A Night at the Opera",
      artist: "Queen",
      year: 1975,
      trackCount: 12,
      artwork: "/queen-album-cover.png",
      duration: 2130
    },
    {
      id: "album-2",
      title: "Hotel California",
      artist: "Eagles", 
      year: 1976,
      trackCount: 9,
      artwork: "/eagles-hotel-california-album-cover.jpg",
      duration: 2346
    }
  ]

  const mockArtists: Artist[] = [
    {
      id: "artist-1",
      name: "Queen",
      followers: 50000000,
      genres: ["Rock", "Progressive Rock"],
      artwork: "/queen-album-cover.png",
      verified: true
    },
    {
      id: "artist-2", 
      name: "Eagles",
      followers: 30000000,
      genres: ["Rock", "Country Rock"],
      artwork: "/eagles-hotel-california-album-cover.jpg",
      verified: true
    }
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

  // Perform search
  useEffect(() => {
    if (searchQuery.trim()) {
      setIsLoading(true)
      // Simulate API delay
      setTimeout(() => {
        const filteredTracks = mockTracks.filter(track => 
          track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          track.artists.some(artist => artist.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        const filteredAlbums = mockAlbums.filter(album =>
          album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          album.artist.toLowerCase().includes(searchQuery.toLowerCase())
        )
        const filteredArtists = mockArtists.filter(artist =>
          artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          artist.genres.some(genre => genre.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        
        setSearchResults({
          tracks: filteredTracks,
          albums: filteredAlbums,
          artists: filteredArtists
        })
        setIsLoading(false)
      }, 500)
    } else {
      setSearchResults({ tracks: [], albums: [], artists: [] })
    }
  }, [searchQuery])

  const hasResults = searchResults.tracks.length > 0 || searchResults.albums.length > 0 || searchResults.artists.length > 0

  const handleAddToPlaylist = (track: Track) => {
    setSelectedTrack(track)
    setPlaylistDialogOpen(true)
  }

  const handlePlaylistSelection = (playlistId: string, track: Track) => {
    if (onAddToPlaylist) {
      onAddToPlaylist(playlistId, track)
    }
  }

  const handleCreatePlaylist = (name: string, description?: string) => {
    if (onCreatePlaylist) {
      onCreatePlaylist(name, description)
    }
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
            className="pl-10 h-12 text-lg"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Search Results */}
      {searchQuery && hasResults ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="tracks">Songs ({searchResults.tracks.length})</TabsTrigger>
            <TabsTrigger value="albums">Albums ({searchResults.albums.length})</TabsTrigger>
            <TabsTrigger value="artists">Artists ({searchResults.artists.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-8">
            {searchResults.tracks.length > 0 && (
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
                          <h4 className="font-medium truncate">{track.title}</h4>
                          <p className="text-sm text-muted-foreground truncate">
                            {Array.isArray(track.artists) ? track.artists.join(', ') : track.artists}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => onPlayTrack(track)}>
                            <Play className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onPlayTrack(track)}>
                                <Play className="mr-2 h-4 w-4" />
                                Play
                              </DropdownMenuItem>
                              {onAddToPlaylist && (
                                <DropdownMenuItem onClick={() => handleAddToPlaylist(track)}>
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add to playlist
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

            {searchResults.albums.length > 0 && (
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

            {searchResults.artists.length > 0 && (
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
                          <h4 className="font-medium truncate">{artist.name}</h4>
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
              </div>
            )}
          </TabsContent>

          <TabsContent value="tracks">
            <div className="space-y-2">
              {searchResults.tracks.map((track, index) => (
                <Card key={track.id} className="p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-8 text-center text-sm text-muted-foreground">{index + 1}</div>
                    <img
                      src={track.artwork || "/placeholder.svg"}
                      alt={`${track.album || 'Album'} cover`}
                      className="w-12 h-12 rounded-md object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{track.title}</h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {Array.isArray(track.artists) ? track.artists.join(', ') : track.artists}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => onPlayTrack(track)}>
                        <Play className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onPlayTrack(track)}>
                            <Play className="mr-2 h-4 w-4" />
                            Play
                          </DropdownMenuItem>
                          {onAddToPlaylist && (
                            <DropdownMenuItem onClick={() => handleAddToPlaylist(track)}>
                              <Plus className="mr-2 h-4 w-4" />
                              Add to playlist
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {formatTime(track.durationMs)}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="albums">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {searchResults.albums.map((album) => (
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
          </TabsContent>

          <TabsContent value="artists">
            <div className="space-y-4">
              {searchResults.artists.map((artist) => (
                <Card key={artist.id} className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <img
                      src={artist.artwork || "/placeholder.svg"}
                      alt={`${artist.name} photo`}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{artist.name}</h4>
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
          </TabsContent>
        </Tabs>
      ) : searchQuery && !hasResults && !isLoading ? (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No results found</h3>
          <p className="text-muted-foreground">Try searching for something else or check your spelling.</p>
        </div>
      ) : !searchQuery ? (
        <div className="text-center py-8">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Search for music</h3>
          <p className="text-muted-foreground">Find your favorite songs, albums, and artists.</p>
        </div>
      ) : null}

      {/* Playlist Selection Dialog */}
      <PlaylistSelectionDialog
        isOpen={playlistDialogOpen}
        onClose={() => setPlaylistDialogOpen(false)}
        track={selectedTrack}
        playlists={playlists}
        onAddToPlaylist={handlePlaylistSelection}
        onCreatePlaylist={handleCreatePlaylist}
      />
    </div>
  )
}
