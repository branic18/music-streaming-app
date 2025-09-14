"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { SimpleAudioPlayer } from "@/components/simple-audio-player"
import { SearchInterface } from "@/components/search-interface-simple"
import { QueueManager } from "@/components/queue-manager"
import { PlaylistManager } from "@/components/playlist-manager"
import { LibraryManager } from "@/components/library-manager"
import { DownloadsManager } from "@/components/downloads-manager"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Heart } from "lucide-react"
import type { Track, Album, Playlist, DownloadItem } from "@/lib/types"

// Mock data for demonstration - updated to match new type definitions
const mockTrack: Track = {
  id: "1",
  title: "Bohemian Rhapsody",
  artists: ["Queen"],
  albumId: "album-1",
  album: "A Night at the Opera",
  durationMs: 355000, // Converted to milliseconds
  artwork: "/queen-bohemian-rhapsody-album-cover.png",
  territories: ["US", "CA", "GB"],
  downloadable: true,
  lyricsAvailable: true,
  explicit: false,
  popularity: 95,
  genres: ["Rock", "Progressive Rock"],
  releaseDate: new Date("1975-10-31"),
  isrc: "GBUM71029601",
  previewUrl: "/audio/bohemian-rhapsody.mp3",
  externalUrls: {
    spotify: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
  },
}

const recentlyPlayed: Track[] = [
  {
    id: "1",
    title: "Bohemian Rhapsody",
    artists: ["Queen"],
    albumId: "album-1",
    album: "A Night at the Opera",
    durationMs: 355000,
    artwork: "/queen-album-cover.png",
    territories: ["US", "CA", "GB"],
    explicit: false,
    downloadable: true,
    lyricsAvailable: true,
    popularity: 95,
    genres: ["Rock", "Progressive Rock"],
    previewUrl: "/audio/bohemian-rhapsody.mp3",
  },
  {
    id: "2",
    title: "Hotel California",
    artists: ["Eagles"],
    albumId: "album-2",
    album: "Hotel California",
    durationMs: 391000,
    artwork: "/eagles-hotel-california-album-cover.jpg",
    territories: ["US", "CA"],
    explicit: false,
    downloadable: false,
    lyricsAvailable: false,
    popularity: 92,
    genres: ["Rock", "Country Rock"],
    previewUrl: "/audio/hotel-california.mp3",
  },
  {
    id: "3",
    title: "Stairway to Heaven",
    artists: ["Led Zeppelin"],
    albumId: "album-3",
    album: "Led Zeppelin IV",
    durationMs: 482000,
    artwork: "/led-zeppelin-iv-inspired-cover.png",
    territories: ["US", "CA", "GB"],
    explicit: false,
    downloadable: true,
    lyricsAvailable: false,
    popularity: 94,
    genres: ["Rock", "Hard Rock"],
    previewUrl: "/audio/stairway-to-heaven.mp3",
  },
]

const mockQueue: Track[] = [
  {
    id: "4",
    title: "Sweet Child O' Mine",
    artists: ["Guns N' Roses"],
    albumId: "album-4",
    album: "Appetite for Destruction",
    durationMs: 356000,
    artwork: "/guns-n-roses-album.jpg",
    territories: ["US", "CA", "GB"],
    explicit: false,
    downloadable: true,
    lyricsAvailable: false,
    popularity: 89,
    genres: ["Rock", "Hard Rock"],
    previewUrl: "/audio/hotel-california.mp3", // Using available audio file
  },
  {
    id: "5",
    title: "Smells Like Teen Spirit",
    artists: ["Nirvana"],
    albumId: "album-5",
    album: "Nevermind",
    durationMs: 301000,
    artwork: "/nirvana-album.jpg",
    territories: ["US", "CA", "GB"],
    explicit: true,
    downloadable: false,
    lyricsAvailable: true,
    popularity: 88,
    genres: ["Grunge", "Alternative Rock"],
    previewUrl: "/audio/stairway-to-heaven.mp3", // Using available audio file
  },
  {
    id: "6",
    title: "Thunderstruck",
    artists: ["AC/DC"],
    albumId: "album-6",
    album: "The Razors Edge",
    durationMs: 292000,
    artwork: "/acdc-album.jpg",
    territories: ["US", "CA", "GB"],
    explicit: false,
    downloadable: true,
    lyricsAvailable: false,
    popularity: 87,
    genres: ["Rock", "Hard Rock"],
    previewUrl: "/audio/bohemian-rhapsody.mp3", // Using available audio file
  },
]

const mockPlaylists: Playlist[] = [
  {
    id: "1",
    name: "Rock Classics",
    description: "The best rock songs of all time",
    trackIds: ["1", "2"],
    tracks: [
      {
        id: "1",
        title: "Bohemian Rhapsody",
        artists: ["Queen"],
        albumId: "album-1",
        album: "A Night at the Opera",
        durationMs: 355000,
        artwork: "/queen-album-cover.png",
        territories: ["US", "CA", "GB"],
        explicit: false,
        downloadable: true,
        lyricsAvailable: true,
        popularity: 95,
        genres: ["Rock", "Progressive Rock"],
      },
      {
        id: "2",
        title: "Hotel California",
        artists: ["Eagles"],
        albumId: "album-2",
        album: "Hotel California",
        durationMs: 391000,
        artwork: "/eagles-hotel-california-album-cover.jpg",
        territories: ["US", "CA"],
        explicit: false,
        downloadable: false,
        lyricsAvailable: false,
        popularity: 92,
        genres: ["Rock", "Country Rock"],
      },
    ],
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20"),
    ownerType: "anonymous",
    isPublic: true,
    shareToken: "abc123",
    totalDuration: 746000, // 12:26
    totalTracks: 2,
  },
  {
    id: "2",
    name: "Chill Vibes",
    description: "Perfect for relaxing",
    trackIds: ["3"],
    tracks: [
      {
        id: "3",
        title: "Stairway to Heaven",
        artists: ["Led Zeppelin"],
        albumId: "album-3",
        album: "Led Zeppelin IV",
        durationMs: 482000,
        artwork: "/led-zeppelin-iv-inspired-cover.png",
        territories: ["US", "CA", "GB"],
        explicit: false,
        downloadable: true,
        lyricsAvailable: false,
        popularity: 94,
        genres: ["Rock", "Hard Rock"],
      },
    ],
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01"),
    ownerType: "anonymous",
    isPublic: false,
    totalDuration: 482000, // 8:02
    totalTracks: 1,
  },
]

const mockLikedTracks: (Track & { likedAt: Date })[] = [
  {
    id: "1",
    title: "Bohemian Rhapsody",
    artists: ["Queen"],
    albumId: "album-1",
    album: "A Night at the Opera",
    durationMs: 355000,
    artwork: "/queen-album-cover.png",
    territories: ["US", "CA", "GB"],
    explicit: false,
    downloadable: true,
    lyricsAvailable: true,
    popularity: 95,
    genres: ["Rock", "Progressive Rock"],
    previewUrl: "/audio/bohemian-rhapsody.mp3",
    likedAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    title: "Hotel California",
    artists: ["Eagles"],
    albumId: "album-2",
    album: "Hotel California",
    durationMs: 391000,
    artwork: "/eagles-hotel-california-album-cover.jpg",
    territories: ["US", "CA"],
    explicit: false,
    downloadable: false,
    lyricsAvailable: false,
    popularity: 92,
    genres: ["Rock", "Country Rock"],
    previewUrl: "/audio/hotel-california.mp3",
    likedAt: new Date("2024-01-20"),
  },
  {
    id: "3",
    title: "Stairway to Heaven",
    artists: ["Led Zeppelin"],
    albumId: "album-3",
    album: "Led Zeppelin IV",
    durationMs: 482000,
    artwork: "/led-zeppelin-iv-inspired-cover.png",
    territories: ["US", "CA", "GB"],
    explicit: false,
    downloadable: true,
    lyricsAvailable: false,
    popularity: 94,
    genres: ["Rock", "Hard Rock"],
    previewUrl: "/audio/stairway-to-heaven.mp3",
    likedAt: new Date("2024-02-01"),
  },
  {
    id: "4",
    title: "Sweet Child O' Mine",
    artists: ["Guns N' Roses"],
    albumId: "album-4",
    album: "Appetite for Destruction",
    durationMs: 356000,
    artwork: "/guns-n-roses-album.jpg",
    territories: ["US", "CA", "GB"],
    explicit: false,
    downloadable: true,
    lyricsAvailable: false,
    popularity: 89,
    genres: ["Rock", "Hard Rock"],
    previewUrl: "/audio/bohemian-rhapsody.mp3", // Using available audio file
    likedAt: new Date("2024-02-05"),
  },
]

const mockLikedAlbums: (Album & { likedAt: Date })[] = [
  {
    id: "album-1",
    title: "A Night at the Opera",
    artist: "Queen",
    artists: ["Queen"],
    year: 1975,
    trackCount: 12,
    artwork: "/queen-album-cover.png",
    duration: 2580,
    genres: ["Rock", "Progressive Rock"],
    label: "EMI",
    releaseDate: new Date("1975-10-31"),
    albumType: "album",
    externalUrls: {
      spotify: "https://open.spotify.com/album/6X7kLmru2k3yYX7ILB3qsI",
    },
    likedAt: new Date("2024-01-15"),
  },
  {
    id: "album-2",
    title: "Hotel California",
    artist: "Eagles",
    artists: ["Eagles"],
    year: 1976,
    trackCount: 9,
    artwork: "/eagles-hotel-california-album-cover.jpg",
    duration: 2580,
    genres: ["Rock", "Country Rock"],
    label: "Asylum Records",
    releaseDate: new Date("1976-12-08"),
    albumType: "album",
    externalUrls: {
      spotify: "https://open.spotify.com/album/2o7KjiY6B4u3AwqWqVZvaI",
    },
    likedAt: new Date("2024-01-20"),
  },
]

const mockDownloads: DownloadItem[] = [
  {
    id: "1",
    track: {
      id: "1",
      title: "Bohemian Rhapsody",
      artists: ["Queen"],
      albumId: "album-1",
      album: "A Night at the Opera",
      durationMs: 355000,
      artwork: "/queen-album-cover.png",
      territories: ["US", "CA", "GB"],
      explicit: false,
      downloadable: true,
      lyricsAvailable: true,
      popularity: 95,
      genres: ["Rock", "Progressive Rock"],
    },
    status: "completed",
    progress: 100,
    downloadedAt: new Date("2024-01-15"),
    fileSize: 8500000, // ~8.5MB
    quality: "high",
    retryCount: 0,
    maxRetries: 3,
    licenseExpiry: new Date("2025-01-15"),
    encrypted: true,
    checksum: "abc123def456",
  },
  {
    id: "2",
    track: {
      id: "2",
      title: "Hotel California",
      artists: ["Eagles"],
      albumId: "album-2",
      album: "Hotel California",
      durationMs: 391000,
      artwork: "/eagles-hotel-california-album-cover.jpg",
      territories: ["US", "CA"],
      explicit: false,
      downloadable: true,
      lyricsAvailable: false,
      popularity: 92,
      genres: ["Rock", "Country Rock"],
    },
    status: "downloading",
    progress: 65,
    fileSize: 9200000, // ~9.2MB
    quality: "high",
    retryCount: 0,
    maxRetries: 3,
    licenseExpiry: new Date("2025-01-20"),
    encrypted: true,
    checksum: "def456ghi789",
  },
  {
    id: "3",
    track: {
      id: "4",
      title: "Sweet Child O' Mine",
      artists: ["Guns N' Roses"],
      albumId: "album-4",
      album: "Appetite for Destruction",
      durationMs: 356000,
      artwork: "/guns-n-roses-album.jpg",
      territories: ["US", "CA", "GB"],
      explicit: false,
      downloadable: true,
      lyricsAvailable: false,
      popularity: 89,
      genres: ["Rock", "Hard Rock"],
    },
    status: "queued",
    progress: 0,
    fileSize: 8800000, // ~8.8MB
    quality: "medium",
    retryCount: 0,
    maxRetries: 3,
    licenseExpiry: new Date("2025-02-05"),
    encrypted: true,
    checksum: "ghi789jkl012",
  },
  {
    id: "4",
    track: {
      id: "5",
      title: "Smells Like Teen Spirit",
      artists: ["Nirvana"],
      albumId: "album-5",
      album: "Nevermind",
      durationMs: 301000,
      artwork: "/nirvana-album.jpg",
      territories: ["US", "CA", "GB"],
      explicit: true,
      downloadable: true,
      lyricsAvailable: true,
      popularity: 88,
      genres: ["Grunge", "Alternative Rock"],
    },
    status: "failed",
    progress: 0,
    fileSize: 7200000, // ~7.2MB
    quality: "medium",
    error: "Network connection lost",
    retryCount: 2,
    maxRetries: 3,
    licenseExpiry: new Date("2025-02-10"),
    encrypted: true,
    checksum: "jkl012mno345",
  },
]

export default function HomePage() {
  const [activeSection, setActiveSection] = useState("home")
  const [currentTrack, setCurrentTrack] = useState(mockTrack)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(75)
  const [isOnline, setIsOnline] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isBuffering, setIsBuffering] = useState(false)
  const [queue, setQueue] = useState(mockQueue)
  const [history, setHistory] = useState(recentlyPlayed.slice(0, 2))
  const [playlists, setPlaylists] = useState(mockPlaylists)
  const [likedTracks, setLikedTracks] = useState(mockLikedTracks)
  const [likedAlbums, setLikedAlbums] = useState(mockLikedAlbums)
  const [downloads, setDownloads] = useState(mockDownloads)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setError(null)
    }
    const handleOffline = () => {
      setIsOnline(false)
      setError("You're offline. Only downloaded tracks are available.")
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const handlePlayPause = () => {
    if (!isOnline && !currentTrack?.downloadable) {
      setError("This track is not available offline")
      return
    }

    if (isPlaying) {
      setIsPlaying(false)
      setError(null)
    } else {
      setIsBuffering(true)
      // Simulate loading time
      setTimeout(() => {
        setIsBuffering(false)
        setIsPlaying(true)
        setError(null)
      }, 1000)
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && !isBuffering) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= ((currentTrack?.durationMs || 0) / 1000)) {
            setIsPlaying(false)
            return 0
          }
          return prev + 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPlaying, isBuffering, currentTrack?.durationMs])

  const handleNext = () => {
    if (queue.length > 0) {
      const nextTrack = queue[0]
      setCurrentTrack(nextTrack)
      setQueue(queue.slice(1))
      if (currentTrack) {
        setHistory([currentTrack, ...history.slice(0, 9)]) // Keep last 10 tracks
      }
      setCurrentTime(0)
    }
  }

  const handlePrevious = () => {
    if (history.length > 0) {
      const previousTrack = history[0]
      setCurrentTrack(previousTrack)
      setHistory(history.slice(1))
      if (currentTrack) {
        setQueue([currentTrack, ...queue])
      }
      setCurrentTime(0)
    }
  }

  const handleSeek = (time: number) => {
    setCurrentTime(time)
  }

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
  }

  const handleTrackSelect = (track: any) => {
    if (currentTrack) {
      setHistory([currentTrack, ...history.slice(0, 9)])
    }
    setCurrentTrack(track)
    setCurrentTime(0)
    setIsPlaying(true)
  }

  const handleRemoveFromQueue = (trackId: string) => {
    setQueue(queue.filter((track) => track.id !== trackId))
  }

  const handleReorderQueue = (startIndex: number, endIndex: number) => {
    const newQueue = Array.from(queue)
    const [reorderedItem] = newQueue.splice(startIndex, 1)
    newQueue.splice(endIndex, 0, reorderedItem)
    setQueue(newQueue)
  }

  const handleClearQueue = () => {
    setQueue([])
  }

  const handleShuffleQueue = () => {
    const shuffled = [...queue].sort(() => Math.random() - 0.5)
    setQueue(shuffled)
  }

  const handleCreatePlaylist = (name: string, description?: string) => {
    const newPlaylist = {
      id: Date.now().toString(),
      name,
      description,
      tracks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: false,
    }
    setPlaylists([...playlists, newPlaylist])
  }

  const handleUpdatePlaylist = (id: string, updates: any) => {
    setPlaylists(
      playlists.map((playlist) => (playlist.id === id ? { ...playlist, ...updates, updatedAt: new Date() } : playlist)),
    )
  }

  const handleDeletePlaylist = (id: string) => {
    setPlaylists(playlists.filter((playlist) => playlist.id !== id))
  }

  const handlePlayPlaylist = (playlist: any) => {
    if (playlist.tracks.length > 0) {
      const firstTrack = playlist.tracks[0]
      setCurrentTrack(firstTrack)
      setQueue([...playlist.tracks.slice(1), ...queue])
      setCurrentTime(0)
      setIsPlaying(true)
    }
  }

  const handleAddToQueue = (tracks: any[]) => {
    setQueue([...queue, ...tracks])
  }

  const handleRemoveFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(
      playlists.map((playlist) =>
        playlist.id === playlistId
          ? {
              ...playlist,
              tracks: playlist.tracks.filter((track) => track.id !== trackId),
              updatedAt: new Date(),
            }
          : playlist,
      ),
    )
  }

  const handleReorderPlaylistTracks = (playlistId: string, startIndex: number, endIndex: number) => {
    setPlaylists(
      playlists.map((playlist) => {
        if (playlist.id === playlistId) {
          const newTracks = Array.from(playlist.tracks)
          const [reorderedItem] = newTracks.splice(startIndex, 1)
          newTracks.splice(endIndex, 0, reorderedItem)
          return { ...playlist, tracks: newTracks, updatedAt: new Date() }
        }
        return playlist
      }),
    )
  }

  const handleSharePlaylist = (playlistId: string) => {
    const playlist = playlists.find((p) => p.id === playlistId)
    if (playlist) {
      const shareToken = playlist.shareToken || Math.random().toString(36).substring(7)
      handleUpdatePlaylist(playlistId, { shareToken, isPublic: true })
      return `${window.location.origin}/playlist/${shareToken}`
    }
    return ""
  }

  const handleAddToPlaylist = (playlistId: string, track: Track) => {
    setPlaylists(
      playlists.map((playlist) =>
        playlist.id === playlistId
          ? {
              ...playlist,
              tracks: [...playlist.tracks, track],
              trackCount: playlist.trackCount + 1,
              updatedAt: new Date(),
            }
          : playlist,
      ),
    )
  }

  const handleLikeTrack = (track: any) => {
    const likedTrack = { ...track, likedAt: new Date() }
    setLikedTracks([likedTrack, ...likedTracks.filter((t) => t.id !== track.id)])
  }

  const handleUnlikeTrack = (trackId: string) => {
    setLikedTracks(likedTracks.filter((track) => track.id !== trackId))
  }

  const handleLikeAlbum = (album: any) => {
    const likedAlbum = { ...album, likedAt: new Date() }
    setLikedAlbums([likedAlbum, ...likedAlbums.filter((a) => a.id !== album.id)])
  }

  const handleUnlikeAlbum = (albumId: string) => {
    setLikedAlbums(likedAlbums.filter((album) => album.id !== albumId))
  }

  const handleExportLibrary = () => {
    const libraryData = {
      tracks: likedTracks,
      albums: likedAlbums,
      playlists: playlists,
      exportedAt: new Date().toISOString(),
    }

    const dataStr = JSON.stringify(libraryData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)

    const link = document.createElement("a")
    link.href = url
    link.download = `streamcast-library-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImportLibrary = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const libraryData = JSON.parse(e.target?.result as string)
        if (libraryData.tracks) {
          setLikedTracks(libraryData.tracks)
        }
        if (libraryData.albums) {
          setLikedAlbums(libraryData.albums)
        }
        if (libraryData.playlists) {
          setPlaylists(libraryData.playlists)
        }
      } catch (error) {
        console.error("Failed to import library:", error)
      }
    }
    reader.readAsText(file)
  }

  const handleStartDownload = (track: any, quality: string) => {
    const newDownload = {
      id: Date.now().toString(),
      track,
      status: "queued" as const,
      progress: 0,
      fileSize: Math.floor(Math.random() * 5000000) + 5000000, // Random size 5-10MB
      quality: quality as any,
    }
    setDownloads([...downloads, newDownload])

    // Simulate download progress
    setTimeout(() => {
      setDownloads((prev) => prev.map((d) => (d.id === newDownload.id ? { ...d, status: "downloading" as const } : d)))

      const interval = setInterval(() => {
        setDownloads((prev) =>
          prev.map((d) => {
            if (d.id === newDownload.id && d.status === "downloading") {
              const newProgress = Math.min(d.progress + Math.random() * 10, 100)
              if (newProgress >= 100) {
                clearInterval(interval)
                return {
                  ...d,
                  status: "completed" as const,
                  progress: 100,
                  downloadedAt: new Date(),
                }
              }
              return { ...d, progress: newProgress }
            }
            return d
          }),
        )
      }, 500)
    }, 1000)
  }

  const handlePauseDownload = (downloadId: string) => {
    setDownloads(downloads.map((d) => (d.id === downloadId ? { ...d, status: "paused" as const } : d)))
  }

  const handleResumeDownload = (downloadId: string) => {
    setDownloads(downloads.map((d) => (d.id === downloadId ? { ...d, status: "downloading" as const } : d)))
  }

  const handleCancelDownload = (downloadId: string) => {
    setDownloads(downloads.filter((d) => d.id !== downloadId))
  }

  const handleDeleteDownload = (downloadId: string) => {
    setDownloads(downloads.filter((d) => d.id !== downloadId))
  }

  const handleRetryDownload = (downloadId: string) => {
    setDownloads(
      downloads.map((d) =>
        d.id === downloadId ? { ...d, status: "queued" as const, progress: 0, error: undefined } : d,
      ),
    )
  }

  const handleClearCompleted = () => {
    setDownloads(downloads.filter((d) => d.status !== "completed"))
  }

  const formatTime = (time: number, isMilliseconds = false) => {
    const seconds = isMilliseconds ? Math.floor(time / 1000) : time
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) {
      return "Good morning"
    } else if (hour < 17) {
      return "Good afternoon"
    } else {
      return "Good evening"
    }
  }

  const isTrackLiked = (trackId: string) => {
    return likedTracks.some(track => track.id === trackId)
  }

  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold mb-6">{getGreeting()}</h2>

              {/* Recently Played */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Recently played</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentlyPlayed.map((track) => (
                    <Card key={track.id} className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-4">
                        <img
                          src={track.artwork || "/placeholder.svg"}
                          alt={`${track.album} cover`}
                          className="w-16 h-16 rounded-md object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{track.title}</h4>
                          <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => isTrackLiked(track.id) ? handleUnlikeTrack(track.id) : handleLikeTrack(track)}
                            className={`h-8 w-8 p-0 ${isTrackLiked(track.id) ? 'text-red-500 hover:text-red-600' : ''}`}
                          >
                            <Heart className={`h-4 w-4 ${isTrackLiked(track.id) ? 'fill-current' : ''}`} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleTrackSelect(track)}>
                            <Play className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Made for You */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Made for you</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i} className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                      <img
                        src={`/playlist-cover-.jpg?height=160&width=160&query=playlist+cover+${i + 1}`}
                        alt={`Playlist ${i + 1}`}
                        className="w-full aspect-square rounded-md object-cover mb-3"
                      />
                      <h4 className="font-medium truncate">Daily Mix {i + 1}</h4>
                      <p className="text-sm text-muted-foreground truncate">Made for you</p>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      case "search":
        return (
          <SearchInterface
            onTrackSelect={handleTrackSelect}
            onPlayTrack={handleTrackSelect}
            playlists={playlists}
            onAddToPlaylist={handleAddToPlaylist}
            onCreatePlaylist={handleCreatePlaylist}
          />
        )
      case "queue":
        return (
          <QueueManager
            currentTrack={currentTrack}
            queue={queue}
            history={history}
            isPlaying={isPlaying}
            onTrackSelect={handleTrackSelect}
            onPlayPause={handlePlayPause}
            onRemoveFromQueue={handleRemoveFromQueue}
            onReorderQueue={handleReorderQueue}
            onClearQueue={handleClearQueue}
            onShuffleQueue={handleShuffleQueue}
            onLikeTrack={handleLikeTrack}
          />
        )
      case "playlists":
        return (
          <PlaylistManager
            playlists={playlists}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onCreatePlaylist={handleCreatePlaylist}
            onUpdatePlaylist={handleUpdatePlaylist}
            onDeletePlaylist={handleDeletePlaylist}
            onPlayPlaylist={handlePlayPlaylist}
            onTrackSelect={handleTrackSelect}
            onPlayPause={handlePlayPause}
            onAddToQueue={handleAddToQueue}
            onRemoveFromPlaylist={handleRemoveFromPlaylist}
            onReorderPlaylistTracks={handleReorderPlaylistTracks}
            onSharePlaylist={handleSharePlaylist}
          />
        )
      case "library":
        return (
          <LibraryManager
            likedTracks={likedTracks}
            likedAlbums={likedAlbums}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onTrackSelect={handleTrackSelect}
            onPlayPause={handlePlayPause}
            onLikeTrack={handleLikeTrack}
            onUnlikeTrack={handleUnlikeTrack}
            onLikeAlbum={handleLikeAlbum}
            onUnlikeAlbum={handleUnlikeAlbum}
            onAddToQueue={handleAddToQueue}
            onExportLibrary={handleExportLibrary}
            onImportLibrary={handleImportLibrary}
          />
        )
      case "downloads":
        return (
          <DownloadsManager
            downloads={downloads}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            isOnline={isOnline}
            onTrackSelect={handleTrackSelect}
            onPlayPause={handlePlayPause}
            onStartDownload={handleStartDownload}
            onPauseDownload={handlePauseDownload}
            onResumeDownload={handleResumeDownload}
            onCancelDownload={handleCancelDownload}
            onDeleteDownload={handleDeleteDownload}
            onRetryDownload={handleRetryDownload}
            onClearCompleted={handleClearCompleted}
            onAddToQueue={handleAddToQueue}
          />
        )
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">
              {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} section coming soon...
            </p>
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Navigation activeSection={activeSection} onSectionChange={setActiveSection} />

      <main className="flex-1 overflow-auto pb-20">
        <div className="p-8">{renderContent()}</div>
      </main>

      <SimpleAudioPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSeek={handleSeek}
        currentTime={currentTime}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        isOnline={isOnline}
        error={error}
        isBuffering={isBuffering}
        onLikeTrack={handleLikeTrack}
        onUnlikeTrack={handleUnlikeTrack}
        isTrackLiked={isTrackLiked}
      />
    </div>
  )
}
