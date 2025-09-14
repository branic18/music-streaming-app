/**
 * Artist detail component
 */

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, Heart, MoreHorizontal, Users, Music, Disc, User } from 'lucide-react'
import { Artist, Album, Track } from '@/lib/types'

interface ArtistDetailProps {
  artistId: string
  onTrackSelect: (track: Track) => void
  onPlayTrack: (track: Track) => void
  onAlbumSelect: (album: Album) => void
  className?: string
}

interface ArtistDetailData {
  artist: Artist
  albums: Album[]
  topTracks: Track[]
}

export function ArtistDetail({ 
  artistId, 
  onTrackSelect, 
  onPlayTrack, 
  onAlbumSelect, 
  className = '' 
}: ArtistDetailProps) {
  const [data, setData] = useState<ArtistDetailData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchArtistDetail = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/artists/${artistId}`)
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to fetch artist details')
        }

        setData(result.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch artist details')
      } finally {
        setIsLoading(false)
      }
    }

    if (artistId) {
      fetchArtistDetail()
    }
  }, [artistId])

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

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center gap-6">
          <div className="w-48 h-48 bg-muted rounded-full animate-pulse" />
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
        <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Error loading artist</h3>
        <p className="text-muted-foreground">{error}</p>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Artist not found</h3>
        <p className="text-muted-foreground">The requested artist could not be found.</p>
      </Card>
    )
  }

  const { artist, albums, topTracks } = data

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Artist Header */}
      <div className="flex items-center gap-6">
        <img
          src={artist.artwork || "/placeholder.svg"}
          alt={`${artist.name} photo`}
          className="w-48 h-48 rounded-full object-cover shadow-lg"
        />
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{artist.name}</h1>
            {artist.verified && (
              <Badge variant="secondary" className="text-sm">
                ✓ Verified
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {formatFollowers(artist.followers)} followers
            </div>
            <div className="flex items-center gap-1">
              <Music className="h-4 w-4" />
              {topTracks.length} popular tracks
            </div>
            <div className="flex items-center gap-1">
              <Disc className="h-4 w-4" />
              {albums.length} albums
            </div>
          </div>

          {artist.genres && artist.genres.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {artist.genres.map((genre) => (
                <Badge key={genre} variant="secondary">
                  {genre}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button size="lg" className="gap-2">
              <Play className="h-5 w-5" />
              Play Popular
            </Button>
            <Button variant="outline" size="lg">
              <Heart className="h-5 w-5" />
              Follow
            </Button>
            <Button variant="outline" size="lg">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Artist Content */}
      <Tabs defaultValue="popular" className="w-full">
        <TabsList>
          <TabsTrigger value="popular">Popular</TabsTrigger>
          <TabsTrigger value="albums">Albums</TabsTrigger>
        </TabsList>

        <TabsContent value="popular" className="space-y-4">
          <Card className="p-4">
            <h2 className="text-xl font-semibold mb-4">Popular Tracks</h2>
            <div className="space-y-2">
              {topTracks.map((track, index) => (
                <div
                  key={track.id}
                  className="flex items-center gap-4 p-3 rounded-md hover:bg-accent/50 transition-colors"
                >
                  <div className="w-8 text-center text-sm text-muted-foreground">
                    {index + 1}
                  </div>
                  <img
                    src={track.artwork || "/placeholder.svg"}
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
                      {track.album || 'Unknown Album'}
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
        </TabsContent>

        <TabsContent value="albums" className="space-y-4">
          <Card className="p-4">
            <h2 className="text-xl font-semibold mb-4">Albums</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {albums.map((album) => (
                <div
                  key={album.id}
                  onClick={() => onAlbumSelect(album)}
                  className="cursor-pointer group"
                >
                  <img
                    src={album.artwork || "/placeholder.svg"}
                    alt={`${album.title} cover`}
                    className="w-full aspect-square rounded-md object-cover mb-3 group-hover:scale-105 transition-transform"
                  />
                  <h4 className="font-medium truncate">{album.title}</h4>
                  <p className="text-sm text-muted-foreground truncate">{album.year}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
