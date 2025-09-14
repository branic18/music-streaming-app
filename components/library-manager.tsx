"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Heart,
  Play,
  Pause,
  MoreHorizontal,
  Plus,
  Search,
  Download,
  Upload,
  Music,
  Disc,
  Clock,
  Filter,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
} from "lucide-react"

interface Track {
  id: string
  title: string
  artists: string[]
  album?: string
  durationMs: number
  artwork: string
  explicit?: boolean
  downloadable?: boolean
  lyricsAvailable?: boolean
  likedAt?: Date
}

interface Album {
  id: string
  title: string
  artist: string
  year: number
  trackCount: number
  artwork: string
  duration: number
  likedAt?: Date
}

interface LibraryManagerProps {
  likedTracks: Track[]
  likedAlbums: Album[]
  currentTrack: Track | null
  isPlaying: boolean
  onTrackSelect: (track: Track) => void
  onPlayPause: () => void
  onLikeTrack: (track: Track) => void
  onUnlikeTrack: (trackId: string) => void
  onLikeAlbum: (album: Album) => void
  onUnlikeAlbum: (albumId: string) => void
  onAddToQueue: (tracks: Track[]) => void
  onAddToPlaylist?: (track: Track) => void
  onExportLibrary: () => void
  onImportLibrary: (file: File) => void
}

export function LibraryManager({
  likedTracks,
  likedAlbums,
  currentTrack,
  isPlaying,
  onTrackSelect,
  onPlayPause,
  onLikeTrack,
  onUnlikeTrack,
  onLikeAlbum,
  onUnlikeAlbum,
  onAddToQueue,
  onAddToPlaylist,
  onExportLibrary,
  onImportLibrary,
}: LibraryManagerProps) {
  const [activeTab, setActiveTab] = useState<"tracks" | "albums">("tracks")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"recent" | "title" | "artist" | "duration">("recent")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [filterBy, setFilterBy] = useState<"all" | "downloadable" | "explicit">("all")

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  const getTotalDuration = (tracks: Track[]) => {
    return tracks.reduce((total, track) => total + (track.durationMs / 1000), 0)
  }

  const formatTotalTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onImportLibrary(file)
    }
  }

  const getFilteredAndSortedTracks = () => {
    const filtered = likedTracks.filter((track) => {
      const matchesSearch =
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artists.some(artist => artist.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (track.album && track.album.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesFilter =
        filterBy === "all" ||
        (filterBy === "downloadable" && track.downloadable) ||
        (filterBy === "explicit" && track.explicit)

      return matchesSearch && matchesFilter
    })

    return filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "recent":
          comparison = (b.likedAt?.getTime() || 0) - (a.likedAt?.getTime() || 0)
          break
        case "title":
          comparison = a.title.localeCompare(b.title)
          break
        case "artist":
          comparison = a.artists[0].localeCompare(b.artists[0])
          break
        case "duration":
          comparison = a.durationMs - b.durationMs
          break
      }

      return sortOrder === "desc" ? comparison : -comparison
    })
  }

  const getFilteredAndSortedAlbums = () => {
    const filtered = likedAlbums.filter((album) => {
      const matchesSearch =
        album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        album.artist.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesSearch
    })

    return filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "recent":
          comparison = (b.likedAt?.getTime() || 0) - (a.likedAt?.getTime() || 0)
          break
        case "title":
          comparison = a.title.localeCompare(b.title)
          break
        case "artist":
          comparison = a.artists[0].localeCompare(b.artists[0])
          break
        case "duration":
          comparison = a.durationMs - b.durationMs
          break
      }

      return sortOrder === "desc" ? comparison : -comparison
    })
  }

  const renderTracksList = () => {
    const tracks = getFilteredAndSortedTracks()

    if (tracks.length === 0) {
      return (
        <div className="text-center py-12">
          <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">{searchQuery ? "No tracks found" : "No liked tracks"}</h3>
          <p className="text-muted-foreground">
            {searchQuery ? "Try adjusting your search or filters." : "Start liking tracks to build your library."}
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-1">
        {tracks.map((track, index) => (
          <Card
            key={track.id}
            className={`p-3 hover:bg-accent/50 transition-colors ${
              currentTrack?.id === track.id ? "bg-accent border-primary" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 text-center text-sm text-muted-foreground">
                {currentTrack?.id === track.id ? (
                  <Button variant="ghost" size="sm" onClick={onPlayPause} className="h-6 w-6 p-0">
                    {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              <img
                src={track.artwork || "/placeholder.svg"}
                alt={`${track.album} cover`}
                className="w-12 h-12 rounded object-cover"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4
                    className={`font-medium truncate cursor-pointer hover:underline ${
                      currentTrack?.id === track.id ? "text-primary" : ""
                    }`}
                    onClick={() => onTrackSelect(track)}
                  >
                    {track.title}
                  </h4>
                  {track.explicit && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      E
                    </Badge>
                  )}
                  {track.downloadable && <Download className="h-3 w-3 text-primary" />}
                </div>
                <p className="text-sm text-muted-foreground truncate">{track.artists.join(', ')}</p>
              </div>

              <p className="text-sm text-muted-foreground hidden md:block truncate max-w-32">{track.album}</p>

              <p className="text-sm text-muted-foreground hidden lg:block">
                {track.likedAt && formatDate(track.likedAt)}
              </p>

              <span className="text-sm text-muted-foreground">{formatTime(track.durationMs)}</span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onTrackSelect(track)}>
                    <Play className="mr-2 h-4 w-4" />
                    Play
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddToQueue([track])}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add to queue
                  </DropdownMenuItem>
                  {onAddToPlaylist && (
                    <DropdownMenuItem onClick={() => onAddToPlaylist(track)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add to playlist
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onUnlikeTrack(track.id)} className="text-destructive">
                    <Heart className="mr-2 h-4 w-4" />
                    Remove from library
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  const renderAlbumsGrid = () => {
    const albums = getFilteredAndSortedAlbums()

    if (albums.length === 0) {
      return (
        <div className="text-center py-12">
          <Disc className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">{searchQuery ? "No albums found" : "No liked albums"}</h3>
          <p className="text-muted-foreground">
            {searchQuery ? "Try adjusting your search." : "Start liking albums to build your collection."}
          </p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {albums.map((album) => (
          <Card key={album.id} className="p-4 hover:bg-accent/50 transition-colors cursor-pointer group">
            <div className="relative mb-3">
              <img
                src={album.artwork || "/placeholder.svg"}
                alt={`${album.title} cover`}
                className="w-full aspect-square rounded-md object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                <Button
                  variant="default"
                  size="sm"
                  className="rounded-full h-12 w-12"
                  onClick={() => {
                    // Play album logic would go here
                    console.log("Play album:", album.title)
                  }}
                >
                  <Play className="h-5 w-5" />
                </Button>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Play className="mr-2 h-4 w-4" />
                      Play album
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Plus className="mr-2 h-4 w-4" />
                      Add to queue
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onUnlikeAlbum(album.id)} className="text-destructive">
                      <Heart className="mr-2 h-4 w-4" />
                      Remove from library
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
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

  const filteredTracks = getFilteredAndSortedTracks()
  const filteredAlbums = getFilteredAndSortedAlbums()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Liked Songs</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExportLibrary}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" asChild>
            <label htmlFor="import-library" className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              Import
              <input id="import-library" type="file" accept=".json" onChange={handleFileImport} className="hidden" />
            </label>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{likedTracks.length}</p>
              <p className="text-sm text-muted-foreground">Liked Songs</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Disc className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{likedAlbums.length}</p>
              <p className="text-sm text-muted-foreground">Liked Albums</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{formatTotalTime(getTotalDuration(likedTracks))}</p>
              <p className="text-sm text-muted-foreground">Total Time</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{likedTracks.filter((track) => track.downloadable).length}</p>
              <p className="text-sm text-muted-foreground">Available Offline</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search your library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
            <SelectTrigger className="w-40">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="downloadable">Available Offline</SelectItem>
              <SelectItem value="explicit">Explicit Only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently Added</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="artist">Artist</SelectItem>
              <SelectItem value="duration">Duration</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
            {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>
          {activeTab === "albums" && (
            <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}>
              {viewMode === "list" ? <Grid3X3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList>
          <TabsTrigger value="tracks">Songs ({filteredTracks.length})</TabsTrigger>
          <TabsTrigger value="albums">Albums ({filteredAlbums.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tracks" className="mt-6">
          <ScrollArea className="h-[calc(100vh-500px)]">{renderTracksList()}</ScrollArea>
        </TabsContent>

        <TabsContent value="albums" className="mt-6">
          <ScrollArea className="h-[calc(100vh-500px)]">{renderAlbumsGrid()}</ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
