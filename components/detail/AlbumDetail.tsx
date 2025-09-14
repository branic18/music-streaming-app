/**
 * Album detail component
 */

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Heart, MoreHorizontal, Clock, Music, Calendar, Disc } from 'lucide-react'
import { Album, Track } from '@/lib/types'

interface AlbumDetailProps {
  albumId: string
  onTrackSelect: (track: Track) => void
  onPlayTrack: (track: Track) => void
  className?: string
}

interface AlbumDetailData {
  album: Album
  tracks: Track[]
}

export function AlbumDetail({ albumId, onTrackSelect, onPlayTrack, className = '' }: AlbumDetailProps) {
  const [data, setData] = useState<AlbumDetailData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAlbumDetail = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/albums/${albumId}`)
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to fetch album details')
        }

        setData(result.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch album details')
      } finally {
        setIsLoading(false)
      }
    }

    if (albumId) {
      fetchAlbumDetail()
    }
  }, [albumId])

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center gap-6">
          <div className="w-48 h-48 bg-muted rounded-lg animate-pulse" />
          <div className="flex-1 space-y-4">
            <div className="h-8 bg-muted rounded animate-pulse" />
            <div className="h-6 bg-muted rounded animate-pulse w-1/2" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <Disc className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Error loading album</h3>
        <p className="text-muted-foreground">{error}</p>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <Disc className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Album not found</h3>
        <p className="text-muted-foreground">The requested album could not be found.</p>
      </Card>
    )
  }

  const { album, tracks } = data

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Album Header */}
      <div className="flex items-center gap-6">
        <img
          src={album.artwork || "/placeholder.svg"}
          alt={`${album.title} cover`}
          className="w-48 h-48 rounded-lg object-cover shadow-lg"
        />
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-bold">{album.title}</h1>
            <p className="text-xl text-muted-foreground">{album.artist}</p>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {album.year}
            </div>
            <div className="flex items-center gap-1">
              <Music className="h-4 w-4" />
              {album.trackCount} tracks
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDuration(album.duration)}
            </div>
          </div>

          {album.genres && album.genres.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {album.genres.map((genre) => (
                <Badge key={genre} variant="secondary">
                  {genre}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button size="lg" className="gap-2">
              <Play className="h-5 w-5" />
              Play Album
            </Button>
            <Button variant="outline" size="lg">
              <Heart className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Album Tracks */}
      {tracks.length > 0 && (
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Tracks</h2>
          <div className="space-y-2">
            {tracks.map((track, index) => (
              <div
                key={track.id}
                className="flex items-center gap-4 p-3 rounded-md hover:bg-accent/50 transition-colors"
              >
                <div className="w-8 text-center text-sm text-muted-foreground">
                  {index + 1}
                </div>
                <img
                  src={track.artwork || album.artwork || "/placeholder.svg"}
                  alt={`${track.title} cover`}
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
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
