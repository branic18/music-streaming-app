/**
 * Audio playback controller with streaming SDK integration
 * Provides unified interface for play, pause, seek, volume, and navigation controls
 */

import { Track, PlaybackState, AudioSettings } from '@/lib/types'
import { AudioPlaybackEngine } from './playback-engine'
import { StreamingSDKWrapper } from './streaming-sdk-wrapper'
import { errorHandler } from '@/lib/error/error-handler'

// Playback control events
export interface PlaybackControlEvent {
  type: 'play' | 'pause' | 'seek' | 'volumeChange' | 'trackChange' | 'error' | 'stateChange'
  data?: any
  timestamp: number
}

// Playback control configuration
export interface PlaybackControlConfig {
  enableCrossfade: boolean
  enableGapless: boolean
  defaultVolume: number
  maxVolume: number
  seekStep: number // Seconds
  volumeStep: number // 0-1
  preloadNext: boolean
  bufferSize: number // Seconds
}

// Playback control state
export interface PlaybackControlState {
  isPlaying: boolean
  isPaused: boolean
  isBuffering: boolean
  currentTrack: Track | null
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  playbackRate: number
  isLoading: boolean
  error: string | null
}

// Playback controller class
export class PlaybackController {
  private audioEngine: AudioPlaybackEngine
  private streamingSDK: StreamingSDKWrapper
  private config: PlaybackControlConfig
  private state: PlaybackControlState
  private eventListeners: Map<string, ((event: PlaybackControlEvent) => void)[]> = new Map()
  private currentStreamUrl: string | null = null
  private isInitialized = false

  constructor(
    audioEngine: AudioPlaybackEngine,
    streamingSDK: StreamingSDKWrapper,
    config?: Partial<PlaybackControlConfig>
  ) {
    this.audioEngine = audioEngine
    this.streamingSDK = streamingSDK
    
    // Default configuration
    this.config = {
      enableCrossfade: true,
      enableGapless: true,
      defaultVolume: 0.7,
      maxVolume: 1.0,
      seekStep: 10,
      volumeStep: 0.1,
      preloadNext: true,
      bufferSize: 30,
      ...config
    }

    // Initial state
    this.state = {
      isPlaying: false,
      isPaused: false,
      isBuffering: false,
      currentTrack: null,
      currentTime: 0,
      duration: 0,
      volume: this.config.defaultVolume,
      isMuted: false,
      playbackRate: 1.0,
      isLoading: false,
      error: null
    }

    this.setupEventListeners()
  }

  /**
   * Initialize the playback controller
   */
  async initialize(): Promise<void> {
    try {
      await this.audioEngine.initialize()
      this.audioEngine.setVolume(this.state.volume)
      this.isInitialized = true
      this.emit('stateChange', { state: this.state })
    } catch (error) {
      this.state.error = (error as Error).message
      this.emit('error', { error: (error as Error).message })
      throw error
    }
  }

  /**
   * Play a track
   */
  async play(track?: Track): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Playback controller not initialized')
    }

    try {
      this.state.isLoading = true
      this.state.error = null
      this.emit('stateChange', { state: this.state })

      if (track && track.id !== this.state.currentTrack?.id) {
        await this.loadTrack(track)
      }

      if (this.state.currentTrack) {
        await this.audioEngine.play()
        this.state.isPlaying = true
        this.state.isPaused = false
        this.state.isBuffering = false
        this.emit('play', { track: this.state.currentTrack })
      }

      this.state.isLoading = false
      this.emit('stateChange', { state: this.state })
    } catch (error) {
      this.state.isLoading = false
      this.state.error = (error as Error).message
      this.emit('error', { error: (error as Error).message })
      throw error
    }
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Playback controller not initialized')
    }

    try {
      await this.audioEngine.pause()
      this.state.isPlaying = false
      this.state.isPaused = true
      this.emit('pause', { track: this.state.currentTrack })
      this.emit('stateChange', { state: this.state })
    } catch (error) {
      this.state.error = (error as Error).message
      this.emit('error', { error: (error as Error).message })
      throw error
    }
  }

  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Playback controller not initialized')
    }

    try {
      await this.audioEngine.resume()
      this.state.isPlaying = true
      this.state.isPaused = false
      this.emit('play', { track: this.state.currentTrack })
      this.emit('stateChange', { state: this.state })
    } catch (error) {
      this.state.error = (error as Error).message
      this.emit('error', { error: (error as Error).message })
      throw error
    }
  }

  /**
   * Stop playback
   */
  async stop(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Playback controller not initialized')
    }

    try {
      await this.audioEngine.stop()
      this.state.isPlaying = false
      this.state.isPaused = false
      this.state.currentTime = 0
      this.emit('stateChange', { state: this.state })
    } catch (error) {
      this.state.error = (error as Error).message
      this.emit('error', { error: (error as Error).message })
      throw error
    }
  }

  /**
   * Seek to a specific time
   */
  async seek(time: number): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Playback controller not initialized')
    }

    try {
      await this.audioEngine.seek(time)
      this.state.currentTime = time
      this.emit('seek', { time, track: this.state.currentTrack })
      this.emit('stateChange', { state: this.state })
    } catch (error) {
      this.state.error = (error as Error).message
      this.emit('error', { error: (error as Error).message })
      throw error
    }
  }

  /**
   * Seek forward by configured step
   */
  async seekForward(): Promise<void> {
    const newTime = Math.min(
      this.state.currentTime + this.config.seekStep,
      this.state.duration
    )
    await this.seek(newTime)
  }

  /**
   * Seek backward by configured step
   */
  async seekBackward(): Promise<void> {
    const newTime = Math.max(this.state.currentTime - this.config.seekStep, 0)
    await this.seek(newTime)
  }

  /**
   * Set volume
   */
  async setVolume(volume: number): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Playback controller not initialized')
    }

    try {
      const clampedVolume = Math.max(0, Math.min(volume, this.config.maxVolume))
      await this.audioEngine.setVolume(clampedVolume)
      this.state.volume = clampedVolume
      this.emit('volumeChange', { volume: clampedVolume })
      this.emit('stateChange', { state: this.state })
    } catch (error) {
      this.state.error = (error as Error).message
      this.emit('error', { error: (error as Error).message })
      throw error
    }
  }

  /**
   * Increase volume by configured step
   */
  async volumeUp(): Promise<void> {
    const newVolume = Math.min(
      this.state.volume + this.config.volumeStep,
      this.config.maxVolume
    )
    await this.setVolume(newVolume)
  }

  /**
   * Decrease volume by configured step
   */
  async volumeDown(): Promise<void> {
    const newVolume = Math.max(this.state.volume - this.config.volumeStep, 0)
    await this.setVolume(newVolume)
  }

  /**
   * Toggle mute
   */
  async toggleMute(): Promise<void> {
    if (this.state.isMuted) {
      await this.setVolume(this.state.volume)
    } else {
      await this.setVolume(0)
    }
    this.state.isMuted = !this.state.isMuted
    this.emit('stateChange', { state: this.state })
  }

  /**
   * Set playback rate
   */
  async setPlaybackRate(rate: number): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Playback controller not initialized')
    }

    try {
      await this.audioEngine.setPlaybackRate(rate)
      this.state.playbackRate = rate
      this.emit('stateChange', { state: this.state })
    } catch (error) {
      this.state.error = (error as Error).message
      this.emit('error', { error: (error as Error).message })
      throw error
    }
  }

  /**
   * Load a track for playback
   */
  async loadTrack(track: Track): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Playback controller not initialized')
    }

    try {
      this.state.isLoading = true
      this.state.error = null
      this.emit('stateChange', { state: this.state })

      // Get streaming info from SDK
      const streamingInfo = await this.streamingSDK.getTrackStream(track.id)
      
      // Load track in audio engine
      await this.audioEngine.loadTrack(track, streamingInfo.streamUrl)
      
      this.state.currentTrack = track
      this.state.duration = streamingInfo.duration
      this.state.currentTime = 0
      this.currentStreamUrl = streamingInfo.streamUrl
      
      this.emit('trackChange', { track, duration: this.state.duration })
      this.state.isLoading = false
      this.emit('stateChange', { state: this.state })
    } catch (error) {
      this.state.isLoading = false
      this.state.error = (error as Error).message
      this.emit('error', { error: (error as Error).message })
      throw error
    }
  }

  /**
   * Preload next track for gapless playback
   */
  async preloadNextTrack(track: Track): Promise<void> {
    if (!this.config.preloadNext) return

    try {
      const streamingInfo = await this.streamingSDK.getTrackStream(track.id)
      await this.audioEngine.preloadNextTrack(track, streamingInfo.streamUrl)
    } catch (error) {
      // Preload failures shouldn't stop playback
      errorHandler.handleError(error as Error, {
        component: 'PlaybackController',
        action: 'preloadNextTrack',
        metadata: { trackId: track.id }
      })
    }
  }

  /**
   * Apply audio settings
   */
  async applyAudioSettings(settings: AudioSettings): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Playback controller not initialized')
    }

    try {
      await this.audioEngine.applyAudioSettings(settings)
      this.emit('stateChange', { state: this.state })
    } catch (error) {
      this.state.error = (error as Error).message
      this.emit('error', { error: (error as Error).message })
      throw error
    }
  }

  /**
   * Get current playback state
   */
  getState(): PlaybackControlState {
    return { ...this.state }
  }

  /**
   * Get current track
   */
  getCurrentTrack(): Track | null {
    return this.state.currentTrack
  }

  /**
   * Check if a track is currently playing
   */
  isTrackPlaying(trackId: string): boolean {
    return this.state.isPlaying && this.state.currentTrack?.id === trackId
  }

  /**
   * Check if controller is ready
   */
  isReady(): boolean {
    return this.isInitialized && !this.state.isLoading
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PlaybackControlConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): PlaybackControlConfig {
    return { ...this.config }
  }

  /**
   * Event handling
   */
  on(event: string, callback: (event: PlaybackControlEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  off(event: string, callback: (event: PlaybackControlEvent) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const playbackEvent: PlaybackControlEvent = {
        type: event as any,
        data,
        timestamp: Date.now()
      }
      listeners.forEach(callback => callback(playbackEvent))
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    try {
      await this.audioEngine.destroy()
      this.eventListeners.clear()
      this.isInitialized = false
    } catch (error) {
      errorHandler.handleError(error as Error, {
        component: 'PlaybackController',
        action: 'destroy'
      })
    }
  }

  /**
   * Setup event listeners for audio engine
   */
  private setupEventListeners(): void {
    this.audioEngine.on('ready', () => {
      this.emit('stateChange', { state: this.state })
    })

    this.audioEngine.on('error', (event) => {
      this.state.error = event.data?.error || 'Unknown error'
      this.emit('error', event)
      this.emit('stateChange', { state: this.state })
    })

    this.audioEngine.on('trackChange', (event) => {
      this.state.currentTrack = event.data?.track || null
      this.state.duration = event.data?.duration || 0
      this.state.currentTime = 0
      this.emit('trackChange', event)
      this.emit('stateChange', { state: this.state })
    })

    this.audioEngine.on('timeUpdate', (event) => {
      this.state.currentTime = event.data?.currentTime || 0
      this.emit('stateChange', { state: this.state })
    })

    this.audioEngine.on('playbackStateChange', (event) => {
      this.state.isPlaying = event.data?.isPlaying || false
      this.state.isPaused = event.data?.isPaused || false
      this.state.isBuffering = event.data?.isBuffering || false
      this.emit('stateChange', { state: this.state })
    })

    this.audioEngine.on('volumeChange', (event) => {
      this.state.volume = event.data?.volume || this.state.volume
      this.emit('volumeChange', event)
      this.emit('stateChange', { state: this.state })
    })
  }
}

// Playback controller factory
export class PlaybackControllerFactory {
  static async create(
    streamingSDK: StreamingSDKWrapper,
    config?: Partial<PlaybackControlConfig>
  ): Promise<PlaybackController> {
    const audioEngine = new AudioPlaybackEngine()
    const controller = new PlaybackController(audioEngine, streamingSDK, config)
    await controller.initialize()
    return controller
  }
}

// Global playback controller manager
export class PlaybackControllerManager {
  private static instance: PlaybackControllerManager
  private controller: PlaybackController | null = null

  static getInstance(): PlaybackControllerManager {
    if (!PlaybackControllerManager.instance) {
      PlaybackControllerManager.instance = new PlaybackControllerManager()
    }
    return PlaybackControllerManager.instance
  }

  async initialize(
    streamingSDK: StreamingSDKWrapper,
    config?: Partial<PlaybackControlConfig>
  ): Promise<void> {
    if (this.controller) {
      await this.controller.destroy()
    }

    this.controller = await PlaybackControllerFactory.create(streamingSDK, config)
  }

  getController(): PlaybackController {
    if (!this.controller) {
      throw new Error('Playback controller not initialized')
    }
    return this.controller
  }

  async destroy(): Promise<void> {
    if (this.controller) {
      await this.controller.destroy()
      this.controller = null
    }
  }
}

// Export singleton instance
export const playbackControllerManager = PlaybackControllerManager.getInstance()

// Export types and classes
export {
  PlaybackController,
  PlaybackControllerFactory,
  PlaybackControllerManager
}
