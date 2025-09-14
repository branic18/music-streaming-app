"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Play,
  Pause,
  MoreHorizontal,
  Heart,
  Plus,
  Trash2,
  GripVertical,
  Clock,
  Shuffle,
  RotateCcw,
  ListMusic,
  Music,
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

interface QueueManagerProps {
  currentTrack: Track | null
  queue: Track[]
  history: Track[]
  isPlaying: boolean
  onTrackSelect: (track: Track) => void
  onPlayPause: () => void
  onRemoveFromQueue: (trackId: string) => void
  onReorderQueue: (startIndex: number, endIndex: number) => void
  onClearQueue: () => void
  onShuffleQueue: () => void
  onAddToPlaylist?: (track: Track) => void
  onLikeTrack?: (track: Track) => void
}

export function QueueManager({
  currentTrack,
  queue,
  history,
  isPlaying,
  onTrackSelect,
  onPlayPause,
  onRemoveFromQueue,
  onReorderQueue,
  onClearQueue,
  onShuffleQueue,
  onAddToPlaylist,
  onLikeTrack,
}: QueueManagerProps) {
  const [activeTab, setActiveTab] = useState<"queue" | "history">("queue")

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

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const startIndex = result.source.index
    const endIndex = result.destination.index

    if (startIndex !== endIndex) {
      onReorderQueue(startIndex, endIndex)
    }
  }

  const renderTrackItem = (track: Track, index: number, isCurrentTrack = false, isDraggable = false) => (
    <Card
      key={track.id}
      className={`p-3 transition-colors ${isCurrentTrack ? "bg-accent border-primary" : "hover:bg-accent/50"}`}
    >
      <div className="flex items-center gap-3">
        {isDraggable && (
          <div className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        <div className="w-8 text-center text-sm text-muted-foreground">
          {isCurrentTrack ? (
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
            <h4 className={`font-medium truncate ${isCurrentTrack ? "text-primary" : ""}`}>{track.title}</h4>
            {track.explicit && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                E
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
        </div>

        <span className="text-sm text-muted-foreground">{formatTime(track.duration)}</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isCurrentTrack && (
              <>
                <DropdownMenuItem onClick={() => onTrackSelect(track)}>
                  <Play className="mr-2 h-4 w-4" />
                  Play now
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {onLikeTrack && (
              <DropdownMenuItem onClick={() => onLikeTrack(track)}>
                <Heart className="mr-2 h-4 w-4" />
                Like
              </DropdownMenuItem>
            )}
            {onAddToPlaylist && (
              <DropdownMenuItem onClick={() => onAddToPlaylist(track)}>
                <Plus className="mr-2 h-4 w-4" />
                Add to playlist
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onRemoveFromQueue(track.id)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Remove from queue
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  )

  const renderQueueContent = () => {
    if (queue.length === 0) {
      return (
        <div className="text-center py-12">
          <ListMusic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Your queue is empty</h3>
          <p className="text-muted-foreground">Add songs to your queue to see them here.</p>
        </div>
      )
    }

    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="queue">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
              {queue.map((track, index) => (
                <Draggable key={track.id} draggableId={track.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={snapshot.isDragging ? "opacity-50" : ""}
                    >
                      {renderTrackItem(track, index, false, true)}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    )
  }

  const renderHistoryContent = () => {
    if (history.length === 0) {
      return (
        <div className="text-center py-12">
          <RotateCcw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No listening history</h3>
          <p className="text-muted-foreground">Your recently played tracks will appear here.</p>
        </div>
      )
    }

    return <div className="space-y-2">{history.map((track, index) => renderTrackItem(track, index))}</div>
  }

  return (
    <div className="space-y-6">
      {/* Queue Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Queue</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onShuffleQueue} disabled={queue.length === 0}>
              <Shuffle className="mr-2 h-4 w-4" />
              Shuffle
            </Button>
            <Button variant="outline" size="sm" onClick={onClearQueue} disabled={queue.length === 0}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-4">
          <Button
            variant={activeTab === "queue" ? "default" : "ghost"}
            onClick={() => setActiveTab("queue")}
            className="flex items-center gap-2"
          >
            <ListMusic className="h-4 w-4" />
            Up Next ({queue.length})
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "ghost"}
            onClick={() => setActiveTab("history")}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            History ({history.length})
          </Button>
        </div>

        {/* Queue Stats */}
        {activeTab === "queue" && queue.length > 0 && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Music className="h-4 w-4" />
              {queue.length} {queue.length === 1 ? "song" : "songs"}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatTotalTime(getTotalDuration(queue))}
            </div>
          </div>
        )}
      </div>

      {/* Currently Playing */}
      {currentTrack && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Now Playing
          </h3>
          {renderTrackItem(currentTrack, 0, true)}
        </div>
      )}

      {currentTrack && (activeTab === "queue" ? queue.length > 0 : history.length > 0) && <Separator />}

      {/* Queue/History Content */}
      <div>
        {activeTab === "queue" && (
          <>
            {queue.length > 0 && (
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <ListMusic className="h-5 w-5" />
                Next in Queue
              </h3>
            )}
            <ScrollArea className="h-[calc(100vh-400px)]">{renderQueueContent()}</ScrollArea>
          </>
        )}

        {activeTab === "history" && (
          <>
            {history.length > 0 && (
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Recently Played
              </h3>
            )}
            <ScrollArea className="h-[calc(100vh-400px)]">{renderHistoryContent()}</ScrollArea>
          </>
        )}
      </div>
    </div>
  )
}
