/**
 * Custom hook for audio session management
 * Provides reactive access to audio session state, device management, and restrictions
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  AudioSessionManager,
  AudioSessionState,
  AudioSessionEvent,
  AudioSessionInterruptionEvent,
  AudioDeviceChangeEvent,
  AudioDeviceInfo,
  AudioSessionConfig,
  Platform
} from '@/lib/audio/audio-session-manager'

// Hook options
export interface UseAudioSessionOptions {
  // Initial configuration
  config?: Partial<AudioSessionConfig>
  
  // Event callbacks
  onStateChange?: (state: AudioSessionState) => void
  onInterruption?: (event: AudioSessionInterruptionEvent) => void
  onDeviceChange?: (event: AudioDeviceChangeEvent) => void
  onError?: (error: string) => void
  
  // Auto-initialize
  autoInitialize?: boolean
}

// Hook return type
export interface UseAudioSessionReturn {
  // State
  state: AudioSessionState
  currentDevice: AudioDeviceInfo | null
  availableDevices: AudioDeviceInfo[]
  platform: Platform
  isInitialized: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  initialize: () => Promise<void>
  destroy: () => void
  updateConfig: (config: Partial<AudioSessionConfig>) => void
  setMediaSessionMetadata: (metadata: {
    title?: string
    artist?: string
    album?: string
    artwork?: MediaImage[]
  }) => void
  setMediaSessionPlaybackState: (state: 'playing' | 'paused' | 'none') => void
  
  // Device management
  isDeviceAllowed: (device: AudioDeviceInfo) => boolean
  getDeviceRestrictions: (device: AudioDeviceInfo) => AudioDeviceInfo['restrictions']
  
  // Utilities
  canPlay: () => boolean
  canPause: () => boolean
  canSeek: () => boolean
  canChangeVolume: () => boolean
  supportsHighQuality: () => boolean
  supportsSpatialAudio: () => boolean
}

export function useAudioSession(options: UseAudioSessionOptions = {}): UseAudioSessionReturn {
  const {
    config,
    onStateChange,
    onInterruption,
    onDeviceChange,
    onError,
    autoInitialize = true
  } = options

  // Session manager reference
  const sessionManagerRef = useRef<AudioSessionManager | null>(null)
  
  // State
  const [state, setState] = useState<AudioSessionState>('inactive')
  const [currentDevice, setCurrentDevice] = useState<AudioDeviceInfo | null>(null)
  const [availableDevices, setAvailableDevices] = useState<AudioDeviceInfo[]>([])
  const [platform, setPlatform] = useState<Platform>('unknown')
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize session manager
  const initialize = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Create session manager if not exists
      if (!sessionManagerRef.current) {
        sessionManagerRef.current = new AudioSessionManager(config)
      }

      // Set up event listeners
      setupEventListeners()

      // Initialize the session manager
      await sessionManagerRef.current.initialize()

      // Update state
      setState(sessionManagerRef.current.getState())
      setCurrentDevice(sessionManagerRef.current.getCurrentDevice())
      setAvailableDevices(sessionManagerRef.current.getAvailableDevices())
      setPlatform(sessionManagerRef.current.getPlatform())
      setIsInitialized(true)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize audio session'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [config, onError])

  // Set up event listeners
  const setupEventListeners = useCallback(() => {
    if (!sessionManagerRef.current) return

    const manager = sessionManagerRef.current

    // State change events
    manager.on('stateChange', (event: AudioSessionEvent) => {
      setState(event.data.state)
      onStateChange?.(event.data.state)
    })

    // Interruption events
    manager.on('interruption', (event: AudioSessionInterruptionEvent) => {
      onInterruption?.(event)
    })

    // Device change events
    manager.on('deviceChange', (event: AudioDeviceChangeEvent) => {
      setCurrentDevice(event.data.currentDevice)
      setAvailableDevices(manager.getAvailableDevices())
      onDeviceChange?.(event)
    })

    // Error events
    manager.on('error', (event: AudioSessionEvent) => {
      const errorMessage = event.data?.message || 'Audio session error'
      setError(errorMessage)
      onError?.(errorMessage)
    })

  }, [onStateChange, onInterruption, onDeviceChange, onError])

  // Destroy session manager
  const destroy = useCallback(() => {
    if (sessionManagerRef.current) {
      sessionManagerRef.current.destroy()
      sessionManagerRef.current = null
    }
    
    setState('inactive')
    setCurrentDevice(null)
    setAvailableDevices([])
    setIsInitialized(false)
    setError(null)
  }, [])

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<AudioSessionConfig>) => {
    if (sessionManagerRef.current) {
      sessionManagerRef.current.updateConfig(newConfig)
      setAvailableDevices(sessionManagerRef.current.getAvailableDevices())
    }
  }, [])

  // Set media session metadata
  const setMediaSessionMetadata = useCallback((metadata: {
    title?: string
    artist?: string
    album?: string
    artwork?: MediaImage[]
  }) => {
    if (sessionManagerRef.current) {
      sessionManagerRef.current.setMediaSessionMetadata(metadata)
    }
  }, [])

  // Set media session playback state
  const setMediaSessionPlaybackState = useCallback((playbackState: 'playing' | 'paused' | 'none') => {
    if (sessionManagerRef.current) {
      sessionManagerRef.current.setMediaSessionPlaybackState(playbackState)
    }
  }, [])

  // Check if device is allowed
  const isDeviceAllowed = useCallback((device: AudioDeviceInfo): boolean => {
    if (!sessionManagerRef.current) return true
    return sessionManagerRef.current.isDeviceAllowed(device)
  }, [])

  // Get device restrictions
  const getDeviceRestrictions = useCallback((device: AudioDeviceInfo): AudioDeviceInfo['restrictions'] => {
    return device.restrictions || {}
  }, [])

  // Utility functions
  const canPlay = useCallback((): boolean => {
    return currentDevice?.capabilities.canPlay ?? true
  }, [currentDevice])

  const canPause = useCallback((): boolean => {
    return currentDevice?.capabilities.canPause ?? true
  }, [currentDevice])

  const canSeek = useCallback((): boolean => {
    return currentDevice?.capabilities.canSeek ?? true
  }, [currentDevice])

  const canChangeVolume = useCallback((): boolean => {
    return currentDevice?.capabilities.canChangeVolume ?? true
  }, [currentDevice])

  const supportsHighQuality = useCallback((): boolean => {
    return currentDevice?.capabilities.supportsHighQuality ?? true
  }, [currentDevice])

  const supportsSpatialAudio = useCallback((): boolean => {
    return currentDevice?.capabilities.supportsSpatialAudio ?? false
  }, [currentDevice])

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInitialize) {
      initialize()
    }

    return () => {
      destroy()
    }
  }, [autoInitialize, initialize, destroy])

  // Update available devices when current device changes
  useEffect(() => {
    if (sessionManagerRef.current && isInitialized) {
      setAvailableDevices(sessionManagerRef.current.getAvailableDevices())
    }
  }, [currentDevice, isInitialized])

  return {
    // State
    state,
    currentDevice,
    availableDevices,
    platform,
    isInitialized,
    isLoading,
    error,
    
    // Actions
    initialize,
    destroy,
    updateConfig,
    setMediaSessionMetadata,
    setMediaSessionPlaybackState,
    
    // Device management
    isDeviceAllowed,
    getDeviceRestrictions,
    
    // Utilities
    canPlay,
    canPause,
    canSeek,
    canChangeVolume,
    supportsHighQuality,
    supportsSpatialAudio
  }
}

export default useAudioSession
