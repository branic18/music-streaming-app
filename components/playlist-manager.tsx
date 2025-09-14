"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Plus,
  Play,
  Pause,
  MoreHorizontal,
  Edit,
  Trash2,
  Share,
  Copy,
  Download,
  Heart,
  Clock,
  Music,
  ListMusic,
  GripVertical,
  Shuffle,
  Lock,
  Globe,
} from "lucide-react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"

interface Track {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  artwork: string
  explicit?: boolean
  downloadable?: boolean
  lyricsAvailable?: boolean
}

interface Playlist {
  id: string
  name: string
  description?: string
  tracks: Track[]
  createdAt: Date
  updatedAt: Date
  isPublic: boolean
  shareToken?: string
  artwork?: string
}

interface PlaylistManagerProps {
  playlists: Playlist[]
  currentTrack: Track | null
  isPlaying: boolean
  onCreatePlaylist: (name: string, description?: string) => void
  onUpdatePlaylist: (id: string, updates: Partial<Playlist>) => void
  onDeletePlaylist: (id: string) => void
  onPlayPlaylist: (playlist: Playlist) => void
  onTrackSelect: (track: Track) => void
  onPlayPause: () => void
  onAddToQueue: (tracks: Track[]) => void
  onRemoveFromPlaylist: (playlistId: string, trackId: string) => void
  onReorderPlaylistTracks: (playlistId: string, startIndex: number, endIndex: number) => void
  onSharePlaylist: (playlistId: string) => string
}

export function PlaylistManager({
  playlists,
  currentTrack,
  isPlaying,
  onCreatePlaylist,
  onUpdatePlaylist,
  onDeletePlaylist,
  onPlayPlaylist,
  onTrackSelect,
  onPlayPause,
  onAddToQueue,
  onRemoveFromPlaylist,
  onReorderPlaylistTracks,
  onSharePlaylist,
}: PlaylistManagerProps) {
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null)
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("")
  const [shareUrl, setShareUrl] = useState("")
  const [showShareDialog, setShowShareDialog] = useState(false)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getTotalDuration = (tracks: Track[]) => {
    return tracks.reduce((total, track) => total + track.duration, 0)
  }

  const formatTotalTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      onCreatePlaylist(newPlaylistName.trim(), newPlaylistDescription.trim() || undefined)
      setNewPlaylistName("")
      setNewPlaylistDescription("")
      setShowCreateDialog(false)
    }
  }

  const handleEditPlaylist = () => {
    if (editingPlaylist && newPlaylistName.trim()) {
      onUpdatePlaylist(editingPlaylist.id, {
        name: newPlaylistName.trim(),
        description: newPlaylistDescription.trim() || undefined,
      })
      setShowEditDialog(false)
      setEditingPlaylist(null)
      setNewPlaylistName("")
      setNewPlaylistDescription("")
    }
  }

  const handleSharePlaylist = (playlist: Playlist) => {
    const url = onSharePlaylist(playlist.id)
    setShareUrl(url)
    setShowShareDialog(true)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error("Failed to copy: ", err)
    }
  }

  const handleDragEnd = (result: DropResult, playlistId: string) => {
    if (!result.destination) return

    const startIndex = result.source.index
    const endIndex = result.destination.index

    if (startIndex !== endIndex) {
      onReorderPlaylistTracks(playlistId, startIndex, endIndex)
    }
  }

  const renderPlaylistGrid = () => {
    if (playlists.length === 0) {
      return (
        <div className="text-center py-12">
          <ListMusic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No playlists yet</h3>
          <p className="text-muted-foreground mb-4">Create your first playlist to get started.</p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Playlist
          </Button>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {playlists.map((playlist) => (
          <Card
            key={playlist.id}
            className="p-4 hover:bg-accent/50 transition-colors cursor-pointer group"
            onClick={() => setSelectedPlaylist(playlist)}
          >
            <div className="relative mb-3">
              <img
                src={
                  playlist.artwork ||
                  playlist.tracks[0]?.artwork ||
                  "/placeholder.svg?height=160&width=160&query=playlist+cover" ||
                  "/placeholder.svg"
                }
                alt={`${playlist.name} cover`}
                className="w-full aspect-square rounded-md object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                <Button
                  variant="default"
                  size="sm"
                  className="rounded-full h-12 w-12"
                  onClick={(e) => {
                    e.stopPropagation()
                    onPlayPlaylist(playlist)
                  }}
                >
                  <Play className="h-5 w-5" />
                </Button>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onPlayPlaylist(playlist)}>
                      <Play className="mr-2 h-4 w-4" />
                      Play
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAddToQueue(playlist.tracks)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add to queue
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingPlaylist(playlist)
                        setNewPlaylistName(playlist.name)
                        setNewPlaylistDescription(playlist.description || "")
                        setShowEditDialog(true)
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSharePlaylist(playlist)}>
                      <Share className="mr-2 h-4 w-4" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete playlist</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{playlist.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDeletePlaylist(playlist.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {playlist.isPublic && (
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="text-xs">
                    <Globe className="mr-1 h-3 w-3" />
                    Public
                  </Badge>
                </div>
              )}
            </div>
            <h4 className="font-medium truncate">{playlist.name}</h4>
            <p className="text-sm text-muted-foreground truncate">
              {playlist.tracks.length} {playlist.tracks.length === 1 ? "song" : "songs"}
            </p>
          </Card>
        ))}
      </div>
    )
  }

  const renderPlaylistDetail = (playlist: Playlist) => {
    return (
      <div className="space-y-6">
        {/* Playlist Header */}
        <div className="flex items-start gap-6">
          <img
            src={
              playlist.artwork ||
              playlist.tracks[0]?.artwork ||
              "/placeholder.svg?height=240&width=240&query=playlist+cover" ||
              "/placeholder.svg"
            }
            alt={`${playlist.name} cover`}
            className="w-60 h-60 rounded-lg object-cover shadow-lg"
          />
          <div className="flex-1 space-y-4">
            <div>
              <Badge variant="secondary" className="mb-2">
                Playlist
              </Badge>
              <h1 className="text-4xl font-bold mb-2">{playlist.name}</h1>
              {playlist.description && <p className="text-muted-foreground text-lg">{playlist.description}</p>}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Music className="h-4 w-4" />
                {playlist.tracks.length} {playlist.tracks.length === 1 ? "song" : "songs"}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTotalTime(getTotalDuration(playlist.tracks))}
              </div>
              <div className="flex items-center gap-1">
                {playlist.isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {playlist.isPublic ? "Public" : "Private"}
              </div>
              <span>Created {formatDate(playlist.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="lg" onClick={() => onPlayPlaylist(playlist)} disabled={playlist.tracks.length === 0}>
                <Play className="mr-2 h-5 w-5" />
                Play
              </Button>
              <Button variant="outline" size="lg" onClick={() => onAddToQueue(playlist.tracks)}>
                <Plus className="mr-2 h-5 w-5" />
                Add to queue
              </Button>
              <Button variant="outline" size="lg">
                <Shuffle className="mr-2 h-5 w-5" />
                Shuffle
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="lg">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingPlaylist(playlist)
                      setNewPlaylistName(playlist.name)
                      setNewPlaylistDescription(playlist.description || "")
                      setShowEditDialog(true)
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSharePlaylist(playlist)}>
                    <Share className="mr-2 h-4 w-4" />
                    Share playlist
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <Separator />

        {/* Track List */}
        <div>
          {playlist.tracks.length === 0 ? (
            <div className="text-center py-12">
              <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No songs in this playlist</h3>
              <p className="text-muted-foreground">Add songs from search or your library.</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={(result) => handleDragEnd(result, playlist.id)}>
              <Droppable droppableId={`playlist-${playlist.id}`}>
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1">
                    {playlist.tracks.map((track, index) => (
                      <Draggable key={track.id} draggableId={track.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`p-3 hover:bg-accent/50 transition-colors ${
                              snapshot.isDragging ? "opacity-50" : ""
                            } ${currentTrack?.id === track.id ? "bg-accent border-primary" : ""}`}
                          >
                            <div className="flex items-center gap-3">
                              <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
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
                                className="w-10 h-10 rounded object-cover"
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
                                </div>
                                <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                              </div>
                              <p className="text-sm text-muted-foreground hidden md:block truncate max-w-32">
                                {track.album}
                              </p>
                              <span className="text-sm text-muted-foreground">{formatTime(track.duration)}</span>
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
                                  <DropdownMenuItem>
                                    <Heart className="mr-2 h-4 w-4" />
                                    Like
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => onRemoveFromPlaylist(playlist.id, track.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove from playlist
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!selectedPlaylist ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold">Your Playlists</h2>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Playlist
            </Button>
          </div>

          {/* Playlist Grid */}
          {renderPlaylistGrid()}
        </>
      ) : (
        <>
          {/* Back Button */}
          <Button variant="ghost" onClick={() => setSelectedPlaylist(null)} className="mb-4">
            ← Back to Playlists
          </Button>

          {/* Playlist Detail */}
          {renderPlaylistDetail(selectedPlaylist)}
        </>
      )}

      {/* Create Playlist Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Playlist</DialogTitle>
            <DialogDescription>Give your playlist a name and description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="My Awesome Playlist"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
                placeholder="Describe your playlist..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePlaylist} disabled={!newPlaylistName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Playlist Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
            <DialogDescription>Update your playlist details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="My Awesome Playlist"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
                placeholder="Describe your playlist..."
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="public"
                checked={editingPlaylist?.isPublic || false}
                onCheckedChange={(checked) =>
                  editingPlaylist && onUpdatePlaylist(editingPlaylist.id, { isPublic: checked })
                }
              />
              <Label htmlFor="public">Make playlist public</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditPlaylist} disabled={!newPlaylistName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Playlist</DialogTitle>
            <DialogDescription>Anyone with this link can view and play your playlist.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Input value={shareUrl} readOnly className="flex-1" />
              <Button variant="outline" onClick={() => copyToClipboard(shareUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowShareDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
