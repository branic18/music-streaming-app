"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Music, ListMusic } from "lucide-react"
import { Track } from "@/lib/types"

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

interface PlaylistSelectionDialogProps {
  isOpen: boolean
  onClose: () => void
  track: Track | null
  playlists: Playlist[]
  onAddToPlaylist: (playlistId: string, track: Track) => void
  onCreatePlaylist: (name: string, description?: string) => void
}

export function PlaylistSelectionDialog({
  isOpen,
  onClose,
  track,
  playlists,
  onAddToPlaylist,
  onCreatePlaylist,
}: PlaylistSelectionDialogProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("")

  const handleAddToPlaylist = (playlistId: string) => {
    if (track) {
      onAddToPlaylist(playlistId, track)
      onClose()
    }
  }

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      onCreatePlaylist(newPlaylistName.trim(), newPlaylistDescription.trim() || undefined)
      setNewPlaylistName("")
      setNewPlaylistDescription("")
      setShowCreateForm(false)
      onClose()
    }
  }

  const handleClose = () => {
    setShowCreateForm(false)
    setNewPlaylistName("")
    setNewPlaylistDescription("")
    onClose()
  }

  if (!track) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Playlist</DialogTitle>
          <DialogDescription>
            Add "{track.title}" by {Array.isArray(track.artists) ? track.artists.join(', ') : track.artists} to a playlist
          </DialogDescription>
        </DialogHeader>

        {!showCreateForm ? (
          <div className="space-y-4">
            {/* Existing Playlists */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Your Playlists</Label>
              {playlists.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ListMusic className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No playlists yet</p>
                  <p className="text-sm">Create your first playlist to get started</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {playlists.map((playlist) => (
                    <Card
                      key={playlist.id}
                      className="p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => handleAddToPlaylist(playlist.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
                          <Music className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{playlist.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {playlist.trackCount} track{playlist.trackCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Create New Playlist Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Playlist
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="playlist-name">Playlist Name</Label>
              <Input
                id="playlist-name"
                placeholder="My New Playlist"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="playlist-description">Description (optional)</Label>
              <Textarea
                id="playlist-description"
                placeholder="Describe your playlist..."
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {showCreateForm ? (
            <>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePlaylist} disabled={!newPlaylistName.trim()}>
                Create Playlist
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
