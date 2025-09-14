/**
 * Custom hook for audio player state management
 * Provides unified interface for audio playback, queue management, and player controls
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Track, PlaybackState, AudioSettings, Queue } from '@/lib/types'
import { AudioPlaybackEngine } from '@/lib/audio/playback-engine'
import { PlaybackController } from '@/lib/audio/playback-controller'
import { StreamingSDKWrapper } from '@/lib/audio/streaming-sdk-wrapper'
import { QualityManager } from '@/lib/audio/quality-manager'
import { useAudioSettings } from './use-persistent-state'
import { useAudioQuality } from './use-audio-quality'

// Player state interface
export interface AudioPlayerState {
  // Playback state
  isPlaying: boolean
  isPaused: boolean
  isBuffering: boolean
  isLoading: boolean
  isInitialized: boolean
  
  // Current track info
  currentTrack: Track | null
  currentTime: number
  duration: number
  progress: number // 0-1
  
  // Audio settings
  volume: number
  isMuted: boolean
  playbackRate: number
  
  // Queue state
  queue: Queue
  currentIndex: number
  hasNext: boolean
  hasPrevious: boolean
  
  // Player modes
  repeatMode: 'off' | 'all' | 'one'
  shuffleMode: boolean
  
  // Error state
  error: string | null
  
  // Network state
  isOnline: boolean
  isOfflineMode: boolean
}

// Player actions interface
export interface AudioPlayerActions {
  // Playback controls
  play: () => Promise<void>
  pause: () => void
  stop: () => void
  togglePlayPause: () => Promise<void>
  
  // Navigation
  next: () => Promise<void>
  previous: () => Promise<void>
  seek: (time: number) => void
  seekRelative: (offset: number) => void
  
  // Volume controls
  setVolume: (volume: number) => void
  toggleMute: () => void
  setMuted: (muted: boolean) => void
  
  // Queue management
  setQueue: (queue: Queue) => void
  addToQueue: (tracks: Track[], position?: 'next' | 'end') => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
  playTrack: (track: Track, queue?: Queue) => Promise<void>
  
  // Player modes
  setRepeatMode: (mode: 'off' | 'all' | 'one') => void
  setShuffleMode: (enabled: boolean) => void
  toggleShuffle: () => void
  toggleRepeat: () => void
  
  // Settings
  setPlaybackRate: (rate: number) => void
  updateAudioSettings: (settings: Partial<AudioSettings>) => void
  
  // Quality management
  setQuality: (quality: string) => Promise<void>
  
  // Error handling
  clearError: () => void
  retry: () => Promise<void>
  
  // Lifecycle
  initialize: () => Promise<void>
  destroy: () => void
}

// Hook options
export interface UseAudioPlayerOptions {
  // Initial configuration
  initialVolume?: number
  initialRepeatMode?: 'off' | 'all' | 'one'
  initialShuffleMode?: boolean
  autoPlay?: boolean
  preloadNext?: boolean
  
  // Event callbacks
  onTrackChange?: (track: Track | null) => void
  onPlaybackStateChange?: (state: PlaybackState) => void
  onError?: (error: string) => void
  onQueueChange?: (queue: Queue) => void
  
  // Quality management
  enableQualityManagement?: boolean
  defaultQuality?: string
  
  // Advanced features
  enableCrossfade?: boolean
  enableGapless?: boolean
  enableAnalytics?: boolean
}

// Hook return type
export interface UseAudioPlayerReturn {
  state: AudioPlayerState
  actions: AudioPlayerActions
  isLoading: boolean
  error: string | null
}

export function useAudioPlayer(options: UseAudioPlayerOptions = {}): UseAudioPlayerReturn {
  const {
    initialVolume = 0.7,
    initialRepeatMode = 'off',
    initialShuffleMode = false,
    autoPlay = false,
    preloadNext = true,
    onTrackChange,
    onPlaybackStateChange,
    onError,
    onQueueChange,
    enableQualityManagement = true,
    defaultQuality = 'high',
    enableCrossfade = true,
    enableGapless = true,
    enableAnalytics = true
  } = options

  // Core audio components
  const audioEngineRef = useRef<AudioPlaybackEngine | null>(null)
  const playbackControllerRef = useRef<PlaybackController | null>(null)
  const streamingSDKRef = useRef<StreamingSDKWrapper | null>(null)
  const qualityManagerRef = useRef<QualityManager | null>(null)
  
  // Audio settings hook
  const { value: audioSettings, updateValue: updateAudioSettings } = useAudioSettings()
  
  // Quality management hook
  const qualityHook = useAudioQuality({
    qualityManager: qualityManagerRef.current!,
    currentTrack: null,
    onQualityChange: (quality) => {
      // Handle quality change
    },
    onNetworkChange: (conditions) => {
      // Handle network change
    }
  })

  // Player state
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isPaused: false,
    isBuffering: false,
    isLoading: false,
    isInitialized: false,
    currentTrack: null,
    currentTime: 0,
    duration: 0,
    progress: 0,
    volume: initialVolume,
    isMuted: false,
    playbackRate: 1.0,
    queue: {
      tracks: [],
      currentIndex: 0,
      repeatMode: initialRepeatMode,
      shuffleMode: initialShuffleMode,
      shuffleOrder: []
    },
    currentIndex: 0,
    hasNext: false,
    hasPrevious: false,
    repeatMode: initialRepeatMode,
    shuffleMode: initialShuffleMode,
    error: null,
    isOnline: navigator.onLine,
    isOfflineMode: false
  })

  // Initialize audio components
  const initializeAudioComponents = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      // Initialize streaming SDK
      if (!streamingSDKRef.current) {
        streamingSDKRef.current = new StreamingSDKWrapper()
        await streamingSDKRef.current.initialize()
      }

      // Initialize audio engine
      if (!audioEngineRef.current) {
        audioEngineRef.current = new AudioPlaybackEngine()
        await audioEngineRef.current.initialize()
      }

      // Initialize playback controller
      if (!playbackControllerRef.current) {
        playbackControllerRef.current = new PlaybackController(
          audioEngineRef.current,
          streamingSDKRef.current,
          {
            enableCrossfade,
            enableGapless,
            defaultVolume: initialVolume,
            preloadNext
          }
        )
        await playbackControllerRef.current.initialize()
      }

      // Initialize quality manager
      if (enableQualityManagement && !qualityManagerRef.current) {
        qualityManagerRef.current = new QualityManager()
        await qualityManagerRef.current.initialize()
      }

      // Set up event listeners
      setupEventListeners()

      setState(prev => ({ 
        ...prev, 
        isInitialized: true, 
        isLoading: false,
        volume: audioSettings.volume,
        isMuted: audioSettings.muted
      }))

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize audio player'
      setState(prev => ({ 
        ...prev, 
        error: errorMessage, 
        isLoading: false 
      }))
      onError?.(errorMessage)
    }
  }, [enableCrossfade, enableGapless, initialVolume, preloadNext, enableQualityManagement, audioSettings, onError])

  // Set up event listeners
  const setupEventListeners = useCallback(() => {
    if (!playbackControllerRef.current) return

    const controller = playbackControllerRef.current

    // Playback state changes
    controller.on('stateChange', (event) => {
      setState(prev => ({
        ...prev,
        isPlaying: event.data.isPlaying,
        isPaused: event.data.isPaused,
        isBuffering: event.data.isBuffering,
        currentTime: event.data.currentTime,
        duration: event.data.duration,
        progress: event.data.duration > 0 ? event.data.currentTime / event.data.duration : 0
      }))
      
      onPlaybackStateChange?.(event.data)
    })

    // Track changes
    controller.on('trackChange', (event) => {
      setState(prev => ({
        ...prev,
        currentTrack: event.data.track,
        currentTime: 0,
        duration: event.data.duration || 0,
        progress: 0
      }))
      
      onTrackChange?.(event.data.track)
    })

    // Errors
    controller.on('error', (event) => {
      setState(prev => ({ ...prev, error: event.data.message }))
      onError?.(event.data.message)
    })

    // Network status
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }))
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }))
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [onPlaybackStateChange, onTrackChange, onError])

  // Playback actions
  const play = useCallback(async () => {
    if (!playbackControllerRef.current) return
    
    try {
      await playbackControllerRef.current.play()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to play'
      setState(prev => ({ ...prev, error: errorMessage }))
      onError?.(errorMessage)
    }
  }, [onError])

  const pause = useCallback(() => {
    if (!playbackControllerRef.current) return
    playbackControllerRef.current.pause()
  }, [])

  const stop = useCallback(() => {
    if (!playbackControllerRef.current) return
    playbackControllerRef.current.stop()
  }, [])

  const togglePlayPause = useCallback(async () => {
    if (state.isPlaying) {
      pause()
    } else {
      await play()
    }
  }, [state.isPlaying, play, pause])

  // Navigation actions
  const next = useCallback(async () => {
    if (!playbackControllerRef.current) return
    
    try {
      await playbackControllerRef.current.next()
      updateQueueState()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to play next track'
      setState(prev => ({ ...prev, error: errorMessage }))
      onError?.(errorMessage)
    }
  }, [onError])

  const previous = useCallback(async () => {
    if (!playbackControllerRef.current) return
    
    try {
      await playbackControllerRef.current.previous()
      updateQueueState()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to play previous track'
      setState(prev => ({ ...prev, error: errorMessage }))
      onError?.(errorMessage)
    }
  }, [onError])

  const seek = useCallback((time: number) => {
    if (!playbackControllerRef.current) return
    playbackControllerRef.current.seek(time)
  }, [])

  const seekRelative = useCallback((offset: number) => {
    const newTime = Math.max(0, Math.min(state.duration, state.currentTime + offset))
    seek(newTime)
  }, [state.currentTime, state.duration, seek])

  // Volume actions
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    setState(prev => ({ ...prev, volume: clampedVolume }))
    
    if (playbackControllerRef.current) {
      playbackControllerRef.current.setVolume(clampedVolume)
    }
    
    updateAudioSettings({ volume: clampedVolume })
  }, [updateAudioSettings])

  const toggleMute = useCallback(() => {
    const newMuted = !state.isMuted
    setState(prev => ({ ...prev, isMuted: newMuted }))
    
    if (playbackControllerRef.current) {
      playbackControllerRef.current.setMuted(newMuted)
    }
    
    updateAudioSettings({ muted: newMuted })
  }, [state.isMuted, updateAudioSettings])

  const setMuted = useCallback((muted: boolean) => {
    setState(prev => ({ ...prev, isMuted: muted }))
    
    if (playbackControllerRef.current) {
      playbackControllerRef.current.setMuted(muted)
    }
    
    updateAudioSettings({ muted })
  }, [updateAudioSettings])

  // Queue management
  const updateQueueState = useCallback(() => {
    setState(prev => {
      const currentIndex = prev.queue.currentIndex
      const hasNext = currentIndex < prev.queue.tracks.length - 1 || prev.repeatMode === 'all'
      const hasPrevious = currentIndex > 0 || prev.repeatMode === 'all'
      
      return {
        ...prev,
        currentIndex,
        hasNext,
        hasPrevious
      }
    })
  }, [])

  const setQueue = useCallback((queue: Queue) => {
    setState(prev => ({ ...prev, queue }))
    updateQueueState()
    onQueueChange?.(queue)
  }, [onQueueChange, updateQueueState])

  const addToQueue = useCallback((tracks: Track[], position: 'next' | 'end' = 'end') => {
    setState(prev => {
      const newQueue = { ...prev.queue }
      
      if (position === 'next') {
        newQueue.tracks.splice(prev.currentIndex + 1, 0, ...tracks)
      } else {
        newQueue.tracks.push(...tracks)
      }
      
      return { ...prev, queue: newQueue }
    })
    
    updateQueueState()
  }, [updateQueueState])

  const removeFromQueue = useCallback((index: number) => {
    setState(prev => {
      const newQueue = { ...prev.queue }
      newQueue.tracks.splice(index, 1)
      
      // Adjust current index if necessary
      if (index < prev.currentIndex) {
        newQueue.currentIndex = prev.currentIndex - 1
      } else if (index === prev.currentIndex && newQueue.tracks.length > 0) {
        // If removing current track, stay at same index (next track moves up)
        newQueue.currentIndex = Math.min(prev.currentIndex, newQueue.tracks.length - 1)
      }
      
      return { ...prev, queue: newQueue }
    })
    
    updateQueueState()
  }, [updateQueueState])

  const clearQueue = useCallback(() => {
    setState(prev => ({
      ...prev,
      queue: {
        tracks: [],
        currentIndex: 0,
        repeatMode: prev.repeatMode,
        shuffleMode: prev.shuffleMode,
        shuffleOrder: []
      },
      currentIndex: 0,
      hasNext: false,
      hasPrevious: false
    }))
  }, [])

  const playTrack = useCallback(async (track: Track, queue?: Queue) => {
    if (!playbackControllerRef.current) return
    
    try {
      if (queue) {
        setQueue(queue)
      }
      
      await playbackControllerRef.current.playTrack(track)
      updateQueueState()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to play track'
      setState(prev => ({ ...prev, error: errorMessage }))
      onError?.(errorMessage)
    }
  }, [setQueue, updateQueueState, onError])

  // Player mode actions
  const setRepeatMode = useCallback((mode: 'off' | 'all' | 'one') => {
    setState(prev => ({
      ...prev,
      repeatMode: mode,
      queue: { ...prev.queue, repeatMode: mode }
    }))
  }, [])

  const setShuffleMode = useCallback((enabled: boolean) => {
    setState(prev => ({
      ...prev,
      shuffleMode: enabled,
      queue: { ...prev.queue, shuffleMode: enabled }
    }))
  }, [])

  const toggleShuffle = useCallback(() => {
    setShuffleMode(!state.shuffleMode)
  }, [state.shuffleMode, setShuffleMode])

  const toggleRepeat = useCallback(() => {
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one']
    const currentIndex = modes.indexOf(state.repeatMode)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    setRepeatMode(nextMode)
  }, [state.repeatMode, setRepeatMode])

  // Settings actions
  const setPlaybackRate = useCallback((rate: number) => {
    const clampedRate = Math.max(0.25, Math.min(4, rate))
    setState(prev => ({ ...prev, playbackRate: clampedRate }))
    
    if (playbackControllerRef.current) {
      playbackControllerRef.current.setPlaybackRate(clampedRate)
    }
  }, [])

  // Quality management
  const setQuality = useCallback(async (quality: string) => {
    if (qualityManagerRef.current && state.currentTrack) {
      try {
        await qualityManagerRef.current.setQuality(quality as any, state.currentTrack)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to set quality'
        setState(prev => ({ ...prev, error: errorMessage }))
        onError?.(errorMessage)
      }
    }
  }, [state.currentTrack, onError])

  // Error handling
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const retry = useCallback(async () => {
    if (state.currentTrack) {
      await playTrack(state.currentTrack)
    }
  }, [state.currentTrack, playTrack])

  // Lifecycle
  const destroy = useCallback(() => {
    if (playbackControllerRef.current) {
      playbackControllerRef.current.destroy()
    }
    if (audioEngineRef.current) {
      audioEngineRef.current.destroy()
    }
    if (streamingSDKRef.current) {
      streamingSDKRef.current.destroy()
    }
    if (qualityManagerRef.current) {
      qualityManagerRef.current.destroy()
    }
  }, [])

  // Initialize on mount
  useEffect(() => {
    initializeAudioComponents()
    
    return () => {
      destroy()
    }
  }, [initializeAudioComponents, destroy])

  // Memoized actions object
  const actions = useMemo<AudioPlayerActions>(() => ({
    // Playback controls
    play,
    pause,
    stop,
    togglePlayPause,
    
    // Navigation
    next,
    previous,
    seek,
    seekRelative,
    
    // Volume controls
    setVolume,
    toggleMute,
    setMuted,
    
    // Queue management
    setQueue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    playTrack,
    
    // Player modes
    setRepeatMode,
    setShuffleMode,
    toggleShuffle,
    toggleRepeat,
    
    // Settings
    setPlaybackRate,
    updateAudioSettings,
    
    // Quality management
    setQuality,
    
    // Error handling
    clearError,
    retry,
    
    // Lifecycle
    initialize: initializeAudioComponents,
    destroy
  }), [
    play, pause, stop, togglePlayPause,
    next, previous, seek, seekRelative,
    setVolume, toggleMute, setMuted,
    setQueue, addToQueue, removeFromQueue, clearQueue, playTrack,
    setRepeatMode, setShuffleMode, toggleShuffle, toggleRepeat,
    setPlaybackRate, updateAudioSettings,
    setQuality,
    clearError, retry,
    initializeAudioComponents, destroy
  ])

  return {
    state,
    actions,
    isLoading: state.isLoading,
    error: state.error
  }
}

export default useAudioPlayer
