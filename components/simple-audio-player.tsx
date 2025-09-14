"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, Volume2, Heart, Shuffle, SkipBack, SkipForward, Repeat, Mic, List, Monitor, Maximize2 } from "lucide-react"

interface SimpleAudioPlayerProps {
  currentTrack: any
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
  onLikeTrack?: (track: any) => void
  onUnlikeTrack?: (trackId: string) => void
  isTrackLiked?: (trackId: string) => boolean
}

export function SimpleAudioPlayer({
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
  onLikeTrack,
  onUnlikeTrack,
  isTrackLiked,
}: SimpleAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [audioReady, setAudioReady] = useState(false)

  // Control audio playback
  useEffect(() => {
    if (audioRef.current && currentTrack?.previewUrl && audioReady) {
      if (isPlaying) {
        console.log('Playing audio:', audioRef.current.src)
        // Small delay to ensure audio is loaded
        const playAudio = async () => {
          try {
            await audioRef.current!.play()
          } catch (error) {
            console.error('Audio play error:', error)
          }
        }
        playAudio()
      } else {
        console.log('Pausing audio')
        audioRef.current.pause()
      }
    }
  }, [isPlaying, currentTrack, audioReady])

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
      setAudioReady(false)
      // Pause current playback
      audioRef.current.pause()
      // Set new source
      audioRef.current.src = currentTrack.previewUrl
      // Load the new audio
      audioRef.current.load()
      // Reset current time
      audioRef.current.currentTime = 0
    } else {
      console.log('No audio source available:', currentTrack?.previewUrl)
      setAudioReady(false)
    }
  }, [currentTrack])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 h-20 z-50">
      {error && (
        <div className="absolute top-0 left-0 right-0 p-2 bg-red-500/10 border-b border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between h-full px-4">
        {/* Left Section - Track Info */}
        <div className="flex items-center gap-4 min-w-0 flex-1 max-w-[30%]">
          <img
            src={currentTrack?.artwork || "/placeholder.svg"}
            alt={currentTrack?.title || "Track"}
            className="w-14 h-14 rounded object-cover"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-white text-sm font-medium truncate">
              {currentTrack?.title || "No track selected"}
            </h4>
            <p className="text-gray-400 text-sm truncate">
              {Array.isArray(currentTrack?.artists) ? currentTrack.artists.join(', ') : currentTrack?.artists || "Unknown artist"}
            </p>
          </div>
          {currentTrack && onLikeTrack && onUnlikeTrack && isTrackLiked && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => isTrackLiked(currentTrack.id) ? onUnlikeTrack(currentTrack.id) : onLikeTrack(currentTrack)}
              className={`h-8 w-8 p-0 hover:bg-gray-800 ${isTrackLiked(currentTrack.id) ? 'text-green-500' : 'text-gray-400'}`}
            >
              <Heart className={`h-4 w-4 ${isTrackLiked(currentTrack.id) ? 'fill-current' : ''}`} />
            </Button>
          )}
        </div>

        {/* Center Section - Playback Controls */}
        <div className="flex flex-col items-center gap-2 flex-1 max-w-[40%]">
          {/* Control Buttons */}
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-transparent"
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onPrevious}
              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-transparent"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onPlayPause}
              className="h-10 w-10 rounded-full bg-white text-black hover:scale-105 transition-transform"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onNext}
              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-transparent"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-transparent"
            >
              <Repeat className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center gap-2 w-full">
            <span className="text-gray-400 text-xs w-10 text-right">{formatTime(currentTime)}</span>
            <div className="flex-1 relative">
              <input
                type="range"
                min="0"
                max={currentTrack?.durationMs ? currentTrack.durationMs / 1000 : 100}
                value={currentTime}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #1db954 0%, #1db954 ${(currentTime / (currentTrack?.durationMs ? currentTrack.durationMs / 1000 : 100)) * 100}%, #535353 ${(currentTime / (currentTrack?.durationMs ? currentTrack.durationMs / 1000 : 100)) * 100}%, #535353 100%)`
                }}
              />
            </div>
            <span className="text-gray-400 text-xs w-10">{formatTime(currentTrack?.durationMs ? currentTrack.durationMs / 1000 : 0)}</span>
          </div>
        </div>

        {/* Right Section - Additional Controls */}
        <div className="flex items-center gap-2 min-w-0 flex-1 max-w-[30%] justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-transparent"
          >
            <Mic className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-transparent"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-transparent"
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-gray-400" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => onVolumeChange(parseInt(e.target.value))}
              className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #1db954 0%, #1db954 ${volume}%, #535353 ${volume}%, #535353 100%)`
              }}
            />
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-transparent"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio
        key={currentTrack?.id || 'no-track'}
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) {
            onSeek(audioRef.current.currentTime)
          }
        }}
        onEnded={() => {
          onNext()
        }}
        onError={(e) => {
          console.error('Audio error:', e)
        }}
        onLoadStart={() => {
          console.log('Audio loading started for:', audioRef.current?.src)
        }}
        onCanPlay={() => {
          console.log('Audio can play:', audioRef.current?.src)
          setAudioReady(true)
        }}
        onLoadedData={() => {
          console.log('Audio data loaded for:', audioRef.current?.src)
          setAudioReady(true)
        }}
        onLoadedMetadata={() => {
          console.log('Audio metadata loaded for:', audioRef.current?.src)
        }}
      />
    </div>
  )
}
