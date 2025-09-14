/**
 * Advanced crossfade and gapless playback engine
 * Provides sophisticated audio transitions and seamless playback
 */

import { Track } from '@/lib/types'
import { errorHandler } from '@/lib/error/error-handler'

// Crossfade configuration
export interface CrossfadeConfig {
  enabled: boolean
  duration: number // Duration in milliseconds
  curve: 'linear' | 'exponential' | 'logarithmic' | 's-curve' | 'custom'
  customCurve?: (t: number) => number // Custom curve function (0-1 input, 0-1 output)
  fadeInDuration: number // Fade in duration in milliseconds
  fadeOutDuration: number // Fade out duration in milliseconds
  preloadNext: boolean // Preload next track for seamless transition
  overlapThreshold: number // Minimum overlap time in milliseconds
  volumeCurve: 'linear' | 'exponential' | 'logarithmic'
}

// Gapless configuration
export interface GaplessConfig {
  enabled: boolean
  preloadDuration: number // How much of next track to preload in milliseconds
  bufferSize: number // Audio buffer size in seconds
  crossfadeThreshold: number // When to start crossfade in milliseconds
  seamlessThreshold: number // When to start seamless transition in milliseconds
  fadeInDuration: number // Fade in duration for gapless
  fadeOutDuration: number // Fade out duration for gapless
}

// Audio transition types
export type TransitionType = 'crossfade' | 'gapless' | 'fade' | 'cut' | 'none'

// Transition state
export interface TransitionState {
  type: TransitionType
  isActive: boolean
  progress: number // 0-1
  startTime: number
  duration: number
  currentTrack: Track | null
  nextTrack: Track | null
  fadeInProgress: number // 0-1
  fadeOutProgress: number // 0-1
}

// Audio buffer for gapless playback
export interface AudioBuffer {
  track: Track
  audioBuffer: AudioBuffer | null
  isLoaded: boolean
  isPlaying: boolean
  startTime: number
  endTime: number
  volume: number
  gainNode: GainNode | null
  sourceNode: AudioBufferSourceNode | null
}

// Crossfade engine events
export interface CrossfadeEvent {
  type: 'transitionStart' | 'transitionProgress' | 'transitionComplete' | 'trackChange' | 'error'
  data?: any
  timestamp: number
}

// Crossfade engine class
export class CrossfadeEngine {
  private audioContext: AudioContext | null = null
  private crossfadeConfig: CrossfadeConfig
  private gaplessConfig: GaplessConfig
  private transitionState: TransitionState
  private audioBuffers: Map<string, AudioBuffer> = new Map()
  private eventListeners: Map<string, ((event: CrossfadeEvent) => void)[]> = new Map()
  private isInitialized = false
  private currentTrackId: string | null = null
  private nextTrackId: string | null = null
  private transitionTimer: number | null = null
  private animationFrame: number | null = null

  constructor(
    crossfadeConfig?: Partial<CrossfadeConfig>,
    gaplessConfig?: Partial<GaplessConfig>
  ) {
    // Default crossfade configuration
    this.crossfadeConfig = {
      enabled: true,
      duration: 3000, // 3 seconds
      curve: 'exponential',
      fadeInDuration: 1500, // 1.5 seconds
      fadeOutDuration: 1500, // 1.5 seconds
      preloadNext: true,
      overlapThreshold: 500, // 0.5 seconds
      volumeCurve: 'exponential',
      ...crossfadeConfig
    }

    // Default gapless configuration
    this.gaplessConfig = {
      enabled: true,
      preloadDuration: 5000, // 5 seconds
      bufferSize: 10, // 10 seconds
      crossfadeThreshold: 2000, // 2 seconds
      seamlessThreshold: 1000, // 1 second
      fadeInDuration: 500, // 0.5 seconds
      fadeOutDuration: 500, // 0.5 seconds
      ...gaplessConfig
    }

    // Initial transition state
    this.transitionState = {
      type: 'none',
      isActive: false,
      progress: 0,
      startTime: 0,
      duration: 0,
      currentTrack: null,
      nextTrack: null,
      fadeInProgress: 0,
      fadeOutProgress: 0
    }
  }

  /**
   * Initialize the crossfade engine
   */
  async initialize(): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      this.isInitialized = true
      console.log('Crossfade engine initialized successfully')
    } catch (error) {
      errorHandler.handleError(error as Error, {
        component: 'CrossfadeEngine',
        action: 'initialize'
      })
      throw error
    }
  }

  /**
   * Load a track for playback
   */
  async loadTrack(track: Track, streamUrl: string): Promise<void> {
    if (!this.isInitialized || !this.audioContext) {
      throw new Error('Crossfade engine not initialized')
    }

    try {
      // Create audio buffer
      const audioBuffer: AudioBuffer = {
        track,
        audioBuffer: null,
        isLoaded: false,
        isPlaying: false,
        startTime: 0,
        endTime: 0,
        volume: 1,
        gainNode: null,
        sourceNode: null
      }

      // Load audio data
      const response = await fetch(streamUrl)
      const arrayBuffer = await response.arrayBuffer()
      const decodedAudioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      
      audioBuffer.audioBuffer = decodedAudioBuffer
      audioBuffer.isLoaded = true
      audioBuffer.endTime = decodedAudioBuffer.duration

      // Create gain node for volume control
      audioBuffer.gainNode = this.audioContext.createGain()
      audioBuffer.gainNode.connect(this.audioContext.destination)

      this.audioBuffers.set(track.id, audioBuffer)
      
      console.log(`Track loaded: ${track.title}`)
    } catch (error) {
      errorHandler.handleError(error as Error, {
        component: 'CrossfadeEngine',
        action: 'loadTrack',
        metadata: { trackId: track.id }
      })
      throw error
    }
  }

  /**
   * Start playing a track
   */
  async playTrack(track: Track, startTime: number = 0): Promise<void> {
    if (!this.isInitialized || !this.audioContext) {
      throw new Error('Crossfade engine not initialized')
    }

    try {
      const audioBuffer = this.audioBuffers.get(track.id)
      if (!audioBuffer || !audioBuffer.isLoaded) {
        throw new Error(`Track not loaded: ${track.title}`)
      }

      // Stop current track if playing
      if (this.currentTrackId) {
        await this.stopTrack(this.currentTrackId)
      }

      // Create source node
      audioBuffer.sourceNode = this.audioContext.createBufferSource()
      audioBuffer.sourceNode.buffer = audioBuffer.audioBuffer
      audioBuffer.sourceNode.connect(audioBuffer.gainNode!)

      // Set volume
      audioBuffer.gainNode!.gain.value = audioBuffer.volume

      // Start playback
      audioBuffer.sourceNode.start(0, startTime)
      audioBuffer.isPlaying = true
      audioBuffer.startTime = this.audioContext.currentTime - startTime

      this.currentTrackId = track.id
      this.transitionState.currentTrack = track

      this.emit('trackChange', { track, startTime })
      console.log(`Playing track: ${track.title}`)
    } catch (error) {
      errorHandler.handleError(error as Error, {
        component: 'CrossfadeEngine',
        action: 'playTrack',
        metadata: { trackId: track.id }
      })
      throw error
    }
  }

  /**
   * Start crossfade transition to next track
   */
  async startCrossfade(currentTrack: Track, nextTrack: Track): Promise<void> {
    if (!this.crossfadeConfig.enabled) {
      await this.playTrack(nextTrack)
      return
    }

    if (!this.isInitialized || !this.audioContext) {
      throw new Error('Crossfade engine not initialized')
    }

    try {
      // Load next track if not already loaded
      if (!this.audioBuffers.has(nextTrack.id)) {
        // This would normally load from streaming SDK
        throw new Error(`Next track not loaded: ${nextTrack.title}`)
      }

      const currentBuffer = this.audioBuffers.get(currentTrack.id)
      const nextBuffer = this.audioBuffers.get(nextTrack.id)

      if (!currentBuffer || !nextBuffer || !currentBuffer.isLoaded || !nextBuffer.isLoaded) {
        throw new Error('Required audio buffers not available')
      }

      // Start transition
      this.transitionState = {
        type: 'crossfade',
        isActive: true,
        progress: 0,
        startTime: this.audioContext.currentTime,
        duration: this.crossfadeConfig.duration / 1000, // Convert to seconds
        currentTrack,
        nextTrack,
        fadeInProgress: 0,
        fadeOutProgress: 0
      }

      // Start next track at low volume
      await this.playTrack(nextTrack)
      nextBuffer.volume = 0
      nextBuffer.gainNode!.gain.value = 0

      // Start crossfade animation
      this.startCrossfadeAnimation()

      this.emit('transitionStart', { type: 'crossfade', currentTrack, nextTrack })
      console.log(`Starting crossfade: ${currentTrack.title} -> ${nextTrack.title}`)
    } catch (error) {
      errorHandler.handleError(error as Error, {
        component: 'CrossfadeEngine',
        action: 'startCrossfade',
        metadata: { currentTrackId: currentTrack.id, nextTrackId: nextTrack.id }
      })
      throw error
    }
  }

  /**
   * Start gapless transition to next track
   */
  async startGaplessTransition(currentTrack: Track, nextTrack: Track): Promise<void> {
    if (!this.gaplessConfig.enabled) {
      await this.playTrack(nextTrack)
      return
    }

    if (!this.isInitialized || !this.audioContext) {
      throw new Error('Crossfade engine not initialized')
    }

    try {
      // Load next track if not already loaded
      if (!this.audioBuffers.has(nextTrack.id)) {
        throw new Error(`Next track not loaded: ${nextTrack.title}`)
      }

      const currentBuffer = this.audioBuffers.get(currentTrack.id)
      const nextBuffer = this.audioBuffers.get(nextTrack.id)

      if (!currentBuffer || !nextBuffer || !currentBuffer.isLoaded || !nextBuffer.isLoaded) {
        throw new Error('Required audio buffers not available')
      }

      // Calculate transition timing
      const currentTime = this.audioContext.currentTime
      const currentPlayTime = currentTime - currentBuffer.startTime
      const remainingTime = currentBuffer.endTime - currentPlayTime

      // Start transition
      this.transitionState = {
        type: 'gapless',
        isActive: true,
        progress: 0,
        startTime: currentTime,
        duration: Math.min(remainingTime, this.gaplessConfig.seamlessThreshold / 1000),
        currentTrack,
        nextTrack,
        fadeInProgress: 0,
        fadeOutProgress: 0
      }

      // Start next track seamlessly
      const nextStartTime = currentTime + (remainingTime - this.gaplessConfig.seamlessThreshold / 1000)
      await this.playTrack(nextTrack, nextStartTime)

      // Start gapless animation
      this.startGaplessAnimation()

      this.emit('transitionStart', { type: 'gapless', currentTrack, nextTrack })
      console.log(`Starting gapless transition: ${currentTrack.title} -> ${nextTrack.title}`)
    } catch (error) {
      errorHandler.handleError(error as Error, {
        component: 'CrossfadeEngine',
        action: 'startGaplessTransition',
        metadata: { currentTrackId: currentTrack.id, nextTrackId: nextTrack.id }
      })
      throw error
    }
  }

  /**
   * Stop a track
   */
  async stopTrack(trackId: string): Promise<void> {
    const audioBuffer = this.audioBuffers.get(trackId)
    if (!audioBuffer || !audioBuffer.isPlaying) {
      return
    }

    try {
      if (audioBuffer.sourceNode) {
        audioBuffer.sourceNode.stop()
        audioBuffer.sourceNode.disconnect()
        audioBuffer.sourceNode = null
      }

      audioBuffer.isPlaying = false

      if (trackId === this.currentTrackId) {
        this.currentTrackId = null
        this.transitionState.currentTrack = null
      }

      console.log(`Stopped track: ${trackId}`)
    } catch (error) {
      errorHandler.handleError(error as Error, {
        component: 'CrossfadeEngine',
        action: 'stopTrack',
        metadata: { trackId }
      })
    }
  }

  /**
   * Set volume for a track
   */
  setVolume(trackId: string, volume: number): void {
    const audioBuffer = this.audioBuffers.get(trackId)
    if (!audioBuffer || !audioBuffer.gainNode) {
      return
    }

    audioBuffer.volume = Math.max(0, Math.min(1, volume))
    audioBuffer.gainNode.gain.value = audioBuffer.volume
  }

  /**
   * Get current transition state
   */
  getTransitionState(): TransitionState {
    return { ...this.transitionState }
  }

  /**
   * Check if a track is loaded
   */
  isTrackLoaded(trackId: string): boolean {
    const audioBuffer = this.audioBuffers.get(trackId)
    return audioBuffer ? audioBuffer.isLoaded : false
  }

  /**
   * Check if a track is playing
   */
  isTrackPlaying(trackId: string): boolean {
    const audioBuffer = this.audioBuffers.get(trackId)
    return audioBuffer ? audioBuffer.isPlaying : false
  }

  /**
   * Get current track
   */
  getCurrentTrack(): Track | null {
    return this.transitionState.currentTrack
  }

  /**
   * Update crossfade configuration
   */
  updateCrossfadeConfig(config: Partial<CrossfadeConfig>): void {
    this.crossfadeConfig = { ...this.crossfadeConfig, ...config }
  }

  /**
   * Update gapless configuration
   */
  updateGaplessConfig(config: Partial<GaplessConfig>): void {
    this.gaplessConfig = { ...this.gaplessConfig, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): { crossfade: CrossfadeConfig; gapless: GaplessConfig } {
    return {
      crossfade: { ...this.crossfadeConfig },
      gapless: { ...this.gaplessConfig }
    }
  }

  /**
   * Event handling
   */
  on(event: string, callback: (event: CrossfadeEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  off(event: string, callback: (event: CrossfadeEvent) => void): void {
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
      const crossfadeEvent: CrossfadeEvent = {
        type: event as any,
        data,
        timestamp: Date.now()
      }
      listeners.forEach(callback => callback(crossfadeEvent))
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    try {
      // Stop all tracks
      for (const [trackId] of this.audioBuffers) {
        await this.stopTrack(trackId)
      }

      // Clear audio buffers
      this.audioBuffers.clear()

      // Cancel timers
      if (this.transitionTimer) {
        clearTimeout(this.transitionTimer)
        this.transitionTimer = null
      }

      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame)
        this.animationFrame = null
      }

      // Close audio context
      if (this.audioContext) {
        await this.audioContext.close()
        this.audioContext = null
      }

      // Clear event listeners
      this.eventListeners.clear()

      this.isInitialized = false
      console.log('Crossfade engine destroyed')
    } catch (error) {
      errorHandler.handleError(error as Error, {
        component: 'CrossfadeEngine',
        action: 'destroy'
      })
    }
  }

  /**
   * Start crossfade animation
   */
  private startCrossfadeAnimation(): void {
    const animate = () => {
      if (!this.transitionState.isActive || !this.audioContext) {
        return
      }

      const currentTime = this.audioContext.currentTime
      const elapsed = currentTime - this.transitionState.startTime
      const progress = Math.min(elapsed / this.transitionState.duration, 1)

      this.transitionState.progress = progress

      // Calculate fade curves
      this.transitionState.fadeOutProgress = this.calculateFadeCurve(progress, 'out')
      this.transitionState.fadeInProgress = this.calculateFadeCurve(progress, 'in')

      // Apply volume changes
      if (this.transitionState.currentTrack) {
        const currentBuffer = this.audioBuffers.get(this.transitionState.currentTrack.id)
        if (currentBuffer && currentBuffer.gainNode) {
          currentBuffer.gainNode.gain.value = 1 - this.transitionState.fadeOutProgress
        }
      }

      if (this.transitionState.nextTrack) {
        const nextBuffer = this.audioBuffers.get(this.transitionState.nextTrack.id)
        if (nextBuffer && nextBuffer.gainNode) {
          nextBuffer.gainNode.gain.value = this.transitionState.fadeInProgress
        }
      }

      this.emit('transitionProgress', { progress, fadeIn: this.transitionState.fadeInProgress, fadeOut: this.transitionState.fadeOutProgress })

      if (progress >= 1) {
        this.completeTransition()
      } else {
        this.animationFrame = requestAnimationFrame(animate)
      }
    }

    this.animationFrame = requestAnimationFrame(animate)
  }

  /**
   * Start gapless animation
   */
  private startGaplessAnimation(): void {
    const animate = () => {
      if (!this.transitionState.isActive || !this.audioContext) {
        return
      }

      const currentTime = this.audioContext.currentTime
      const elapsed = currentTime - this.transitionState.startTime
      const progress = Math.min(elapsed / this.transitionState.duration, 1)

      this.transitionState.progress = progress

      // Calculate fade curves for gapless
      this.transitionState.fadeOutProgress = this.calculateFadeCurve(progress, 'out')
      this.transitionState.fadeInProgress = this.calculateFadeCurve(progress, 'in')

      // Apply volume changes
      if (this.transitionState.currentTrack) {
        const currentBuffer = this.audioBuffers.get(this.transitionState.currentTrack.id)
        if (currentBuffer && currentBuffer.gainNode) {
          currentBuffer.gainNode.gain.value = 1 - this.transitionState.fadeOutProgress
        }
      }

      if (this.transitionState.nextTrack) {
        const nextBuffer = this.audioBuffers.get(this.transitionState.nextTrack.id)
        if (nextBuffer && nextBuffer.gainNode) {
          nextBuffer.gainNode.gain.value = this.transitionState.fadeInProgress
        }
      }

      this.emit('transitionProgress', { progress, fadeIn: this.transitionState.fadeInProgress, fadeOut: this.transitionState.fadeOutProgress })

      if (progress >= 1) {
        this.completeTransition()
      } else {
        this.animationFrame = requestAnimationFrame(animate)
      }
    }

    this.animationFrame = requestAnimationFrame(animate)
  }

  /**
   * Complete transition
   */
  private completeTransition(): void {
    if (!this.transitionState.isActive) {
      return
    }

    // Stop current track
    if (this.transitionState.currentTrack) {
      this.stopTrack(this.transitionState.currentTrack.id)
    }

    // Set next track as current
    if (this.transitionState.nextTrack) {
      this.currentTrackId = this.transitionState.nextTrack.id
      this.transitionState.currentTrack = this.transitionState.nextTrack
    }

    // Reset transition state
    this.transitionState = {
      type: 'none',
      isActive: false,
      progress: 0,
      startTime: 0,
      duration: 0,
      currentTrack: this.transitionState.currentTrack,
      nextTrack: null,
      fadeInProgress: 0,
      fadeOutProgress: 0
    }

    this.emit('transitionComplete', { track: this.transitionState.currentTrack })
    console.log('Transition completed')
  }

  /**
   * Calculate fade curve
   */
  private calculateFadeCurve(progress: number, direction: 'in' | 'out'): number {
    let curve: (t: number) => number

    switch (this.crossfadeConfig.curve) {
      case 'linear':
        curve = (t: number) => t
        break
      case 'exponential':
        curve = (t: number) => t * t
        break
      case 'logarithmic':
        curve = (t: number) => Math.sqrt(t)
        break
      case 's-curve':
        curve = (t: number) => t * t * (3 - 2 * t)
        break
      case 'custom':
        curve = this.crossfadeConfig.customCurve || ((t: number) => t)
        break
      default:
        curve = (t: number) => t
    }

    const result = curve(progress)
    return direction === 'out' ? 1 - result : result
  }
}

// Crossfade engine factory
export class CrossfadeEngineFactory {
  static create(
    crossfadeConfig?: Partial<CrossfadeConfig>,
    gaplessConfig?: Partial<GaplessConfig>
  ): CrossfadeEngine {
    return new CrossfadeEngine(crossfadeConfig, gaplessConfig)
  }
}

// Global crossfade engine instance
let globalCrossfadeEngine: CrossfadeEngine | null = null

export function getCrossfadeEngine(): CrossfadeEngine {
  if (!globalCrossfadeEngine) {
    throw new Error('Crossfade engine not initialized')
  }
  return globalCrossfadeEngine
}

export async function initializeCrossfadeEngine(
  crossfadeConfig?: Partial<CrossfadeConfig>,
  gaplessConfig?: Partial<GaplessConfig>
): Promise<CrossfadeEngine> {
  globalCrossfadeEngine = CrossfadeEngineFactory.create(crossfadeConfig, gaplessConfig)
  await globalCrossfadeEngine.initialize()
  return globalCrossfadeEngine
}

// Export types and classes
export {
  CrossfadeEngine,
  CrossfadeEngineFactory
}
