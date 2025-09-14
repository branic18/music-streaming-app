"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Heart,
  MoreHorizontal,
  Settings,
  Mic2,
  AlertCircle,
  WifiOff,
  Download,
} from "lucide-react"

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

interface Lyrics {
  static?: string
  synced?: Array<{
    time: number
    text: string
  }>
}

interface AudioPlayerProps {
  currentTrack: Track | null
  isPlaying: boolean
  onPlayPause: () => void
  onNext: () => void
  onPrevious: () => void
  onSeek: (time: number) => void
  currentTime: number
  volume: number
  onVolumeChange: (volume: number) => void
  isOnline?: boolean
  error?: string | null
  isBuffering?: boolean
}

// Mock lyrics data
const mockLyrics: Record<string, Lyrics> = {
  "1": {
    static: `Is this the real life?
Is this just fantasy?
Caught in a landslide
No escape from reality
Open your eyes
Look up to the skies and see
I'm just a poor boy, I need no sympathy
Because I'm easy come, easy go
Little high, little low
Any way the wind blows doesn't really matter to me, to me

Mama, just killed a man
Put a gun against his head
Pulled my trigger, now he's dead
Mama, life had just begun
But now I've gone and thrown it all away

Mama, ooh
Didn't mean to make you cry
If I'm not back again this time tomorrow
Carry on, carry on as if nothing really matters`,
    synced: [
      { time: 0, text: "Is this the real life?" },
      { time: 4, text: "Is this just fantasy?" },
      { time: 8, text: "Caught in a landslide" },
      { time: 12, text: "No escape from reality" },
      { time: 16, text: "Open your eyes" },
      { time: 20, text: "Look up to the skies and see" },
      { time: 24, text: "I'm just a poor boy, I need no sympathy" },
      { time: 28, text: "Because I'm easy come, easy go" },
      { time: 32, text: "Little high, little low" },
      { time: 36, text: "Any way the wind blows doesn't really matter to me, to me" },
    ],
  },
}

export function AudioPlayer({
  currentTrack,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  currentTime,
  volume,
  onVolumeChange,
  isOnline = true,
  error = null,
  isBuffering = false,
}: AudioPlayerProps) {
  const [isShuffled, setIsShuffled] = useState(false)
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off")
  const [isLiked, setIsLiked] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [previousVolume, setPreviousVolume] = useState(volume)
  const [showSettings, setShowSettings] = useState(false)
  const [showLyrics, setShowLyrics] = useState(false)

  // Audio settings
  const [crossfadeEnabled, setCrossfadeEnabled] = useState(false)
  const [crossfadeDuration, setCrossfadeDuration] = useState(3)

  // Audio element ref
  const audioRef = useRef<HTMLAudioElement>(null)

  // Control audio playback
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        console.log('Playing audio:', audioRef.current.src)
        audioRef.current.play().catch(console.error)
      } else {
        console.log('Pausing audio')
        audioRef.current.pause()
      }
    }
  }, [isPlaying])

  // Update audio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
    }
  }, [volume])

  // Update audio source when track changes
  useEffect(() => {
    if (audioRef.current && currentTrack?.previewUrl) {
      console.log('Updating audio source to:', currentTrack.previewUrl)
      audioRef.current.src = currentTrack.previewUrl
      audioRef.current.load()
    } else {
      console.log('No audio source available:', currentTrack?.previewUrl)
    }
  }, [currentTrack])
  const [gaplessEnabled, setGaplessEnabled] = useState(true)
  const [normalizeVolume, setNormalizeVolume] = useState(true)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleMuteToggle = () => {
    if (isMuted) {
      onVolumeChange(previousVolume)
      setIsMuted(false)
    } else {
      setPreviousVolume(volume)
      onVolumeChange(0)
      setIsMuted(true)
    }
  }

  const getCurrentLyrics = () => {
    if (!currentTrack?.lyricsAvailable) return null
    return mockLyrics[currentTrack.id] || null
  }

  const renderLyricsContent = () => {
    const lyrics = getCurrentLyrics()
    if (!lyrics) {
      return (
        <div className="text-center py-8">
          <Mic2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No lyrics available for this track</p>
        </div>
      )
    }

    return (
      <Tabs defaultValue="synced" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="synced">Synced</TabsTrigger>
          <TabsTrigger value="static">Static</TabsTrigger>
        </TabsList>

        <TabsContent value="synced" className="mt-4">
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {lyrics.synced?.map((line, index) => (
                <div
                  key={index}
                  className={`p-2 rounded transition-colors ${
                    currentTime >= line.time &&
                    (index === lyrics.synced!.length - 1 || currentTime < lyrics.synced![index + 1].time)
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {line.text}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="static" className="mt-4">
          <ScrollArea className="h-96">
            <div className="whitespace-pre-line text-sm leading-relaxed">{lyrics.static}</div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    )
  }

  if (!currentTrack) {
    return (
      <Card className="fixed bottom-0 left-0 right-0 p-4 bg-sidebar border-t border-sidebar-border">
        <div className="flex items-center justify-center h-16">
          <p className="text-muted-foreground">No track selected</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="fixed bottom-0 left-0 right-0 p-4 bg-sidebar border-t border-sidebar-border">
      {/* Error Banner */}
      {error && (
        <div className="mb-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Track Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative">
            <img
              src={currentTrack.artwork || "/placeholder.svg?height=56&width=56&query=album+cover"}
              alt={`${currentTrack.album} cover`}
              className="w-14 h-14 rounded-md object-cover"
            />
            {!isOnline && (
              <div className="absolute -top-1 -right-1 bg-background rounded-full p-1">
                <WifiOff className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            {currentTrack.downloadable && (
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1">
                <Download className="h-3 w-3 text-primary" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium truncate text-sidebar-foreground">{currentTrack.title}</h4>
              {currentTrack.explicit && (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  E
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{currentTrack.artist}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLiked(!isLiked)}
            className="shrink-0 hover:bg-sidebar-accent"
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-primary text-primary" : ""}`} />
          </Button>
          {currentTrack.lyricsAvailable && (
            <Dialog open={showLyrics} onOpenChange={setShowLyrics}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="shrink-0 hover:bg-sidebar-accent">
                  <Mic2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {currentTrack.title} - {currentTrack.artist}
                  </DialogTitle>
                </DialogHeader>
                {renderLyricsContent()}
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Player Controls */}
        <div className="flex flex-col items-center gap-2 flex-1 max-w-md">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsShuffled(!isShuffled)}
              className={`hover:bg-sidebar-accent ${isShuffled ? "spotify-green" : ""}`}
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onPrevious} className="hover:bg-sidebar-accent">
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button
              className="h-10 w-10 rounded-full spotify-green-bg hover:scale-105 transition-transform"
              size="sm"
              onClick={onPlayPause}
              disabled={!!error}
            >
              {isBuffering ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-background border-t-transparent" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5 text-black" />
              ) : (
                <Play className="h-5 w-5 text-black" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={onNext} className="hover:bg-sidebar-accent">
              <SkipForward className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRepeatMode(repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off")}
              className={`hover:bg-sidebar-accent ${repeatMode !== "off" ? "spotify-green" : ""}`}
            >
              <Repeat className="h-4 w-4" />
              {repeatMode === "one" && <span className="text-xs ml-1">1</span>}
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-muted-foreground w-10 text-right">{formatTime(currentTime)}</span>
            <Slider
              value={[currentTime]}
              max={currentTrack.durationMs / 1000}
              step={1}
              onValueChange={([value]) => onSeek(value)}
              className="flex-1"
              disabled={!!error}
            />
            <span className="text-xs text-muted-foreground w-10">{formatTime(currentTrack.durationMs / 1000)}</span>
          </div>
        </div>

        {/* Volume & Settings */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleMuteToggle} className="hover:bg-sidebar-accent">
              {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={100}
              step={1}
              onValueChange={([value]) => {
                onVolumeChange(value)
                if (value > 0 && isMuted) {
                  setIsMuted(false)
                }
              }}
              className="w-24"
            />
          </div>

          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="hover:bg-sidebar-accent">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Audio Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="crossfade">Crossfade</Label>
                      <p className="text-sm text-muted-foreground">Smooth transition between tracks</p>
                    </div>
                    <Switch id="crossfade" checked={crossfadeEnabled} onCheckedChange={setCrossfadeEnabled} />
                  </div>

                  {crossfadeEnabled && (
                    <div>
                      <Label>Crossfade Duration: {crossfadeDuration}s</Label>
                      <Slider
                        value={[crossfadeDuration]}
                        max={12}
                        min={1}
                        step={1}
                        onValueChange={([value]) => setCrossfadeDuration(value)}
                        className="mt-2"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="gapless">Gapless Playback</Label>
                      <p className="text-sm text-muted-foreground">No silence between compatible tracks</p>
                    </div>
                    <Switch id="gapless" checked={gaplessEnabled} onCheckedChange={setGaplessEnabled} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="normalize">Normalize Volume</Label>
                      <p className="text-sm text-muted-foreground">Consistent volume across tracks</p>
                    </div>
                    <Switch id="normalize" checked={normalizeVolume} onCheckedChange={setNormalizeVolume} />
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" size="sm" className="hover:bg-sidebar-accent">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentTrack?.previewUrl}
        onTimeUpdate={() => {
          if (audioRef.current) {
            onSeek(audioRef.current.currentTime)
          }
        }}
        onEnded={() => {
          onNext()
        }}
        onLoadStart={() => {
          // Handle buffering state
        }}
        onCanPlay={() => {
          // Audio is ready to play
        }}
        onError={(e) => {
          console.error('Audio error:', e)
        }}
      />
    </Card>
  )
}
