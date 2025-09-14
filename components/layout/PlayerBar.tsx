/**
 * Music player control bar component
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { Avatar } from '@/components/ui/Avatar'
import { Track } from '@/lib/types'

export interface PlayerBarProps extends React.HTMLAttributes<HTMLDivElement> {
  track?: Track
  isPlaying?: boolean
  currentTime?: number
  duration?: number
  volume?: number
  isShuffled?: boolean
  repeatMode?: 'none' | 'one' | 'all'
  onPlayPause?: () => void
  onPrevious?: () => void
  onNext?: () => void
  onSeek?: (time: number) => void
  onVolumeChange?: (volume: number) => void
  onShuffleToggle?: () => void
  onRepeatToggle?: () => void
  onLikeToggle?: () => void
  onQueueToggle?: () => void
  liked?: boolean
}

const PlayerBar = React.forwardRef<HTMLDivElement, PlayerBarProps>(
  (
    {
      className,
      track,
      isPlaying = false,
      currentTime = 0,
      duration = 0,
      volume = 100,
      isShuffled = false,
      repeatMode = 'none',
      onPlayPause,
      onPrevious,
      onNext,
      onSeek,
      onVolumeChange,
      onShuffleToggle,
      onRepeatToggle,
      onLikeToggle,
      onQueueToggle,
      liked = false,
      ...props
    },
    ref
  ) => {
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTime = parseFloat(e.target.value)
      onSeek?.(newTime)
    }

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value)
      onVolumeChange?.(newVolume)
    }

    const getRepeatIcon = () => {
      switch (repeatMode) {
        case 'one':
          return (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
              <text x="12" y="16" fontSize="8" textAnchor="middle" fill="currentColor">1</text>
            </svg>
          )
        case 'all':
          return (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
            </svg>
          )
        default:
          return (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
          className
        )}
        {...props}
      >
        {/* Progress Bar */}
        <div className="h-1 w-full">
          <Progress
            value={(currentTime / duration) * 100}
            className="h-full rounded-none"
            variant="primary"
          />
        </div>

        <div className="container flex h-20 items-center justify-between px-4">
          {/* Track Info */}
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {track ? (
              <>
                <Avatar
                  src={track.artwork}
                  alt={track.title}
                  size="sm"
                  shape="square"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{track.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {track.artists.map(artist => artist.name).join(', ')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onLikeToggle}
                  className={cn(
                    'h-8 w-8',
                    liked && 'text-red-500 hover:text-red-600'
                  )}
                >
                  <svg
                    className="h-4 w-4"
                    fill={liked ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </Button>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No track selected</div>
            )}
          </div>

          {/* Player Controls */}
          <div className="flex flex-col items-center space-y-2">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onShuffleToggle}
                className={cn(
                  'h-8 w-8',
                  isShuffled && 'text-primary'
                )}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                </svg>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={onPrevious}
                className="h-8 w-8"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </Button>

              <Button
                variant="default"
                size="icon"
                onClick={onPlayPause}
                className="h-10 w-10"
              >
                {isPlaying ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={onNext}
                className="h-8 w-8"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={onRepeatToggle}
                className={cn(
                  'h-8 w-8',
                  repeatMode !== 'none' && 'text-primary'
                )}
              >
                {getRepeatIcon()}
              </Button>
            </div>

            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume and Queue Controls */}
          <div className="flex items-center space-x-2 min-w-0 flex-1 justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={onQueueToggle}
              className="h-8 w-8"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </Button>

            <div className="flex items-center space-x-2">
              <svg className="h-4 w-4 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-muted rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    )
  }
)

PlayerBar.displayName = 'PlayerBar'

export { PlayerBar }
