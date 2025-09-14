/**
 * Audio playback engine with crossfade and gapless playback support
 * Handles audio streaming, buffering, and advanced playback features
 */

import type { Track, AudioSettings, PlaybackState } from '@/lib/types'

// Audio context and nodes
interface AudioNodes {
  source: AudioBufferSourceNode | null
  gain: GainNode
  crossfadeGain: GainNode
  analyser: AnalyserNode
  compressor: DynamicsCompressorNode
  eq: BiquadFilterNode[]
}

// Playback events
export interface PlaybackEvent {
  type: 'play' | 'pause' | 'stop' | 'seek' | 'trackChange' | 'error' | 'buffering' | 'ready'
  data?: any
  timestamp: number
}

// Crossfade configuration
interface CrossfadeConfig {
  duration: number // in milliseconds
  curve: 'linear' | 'exponential' | 'logarithmic'
  overlap: boolean
}

// Gapless playback configuration
interface GaplessConfig {
  enabled: boolean
  preloadNext: boolean
  bufferSize: number
  fadeInDuration: number
  fadeOutDuration: number
}

// Audio engine state
interface AudioEngineState {
  isInitialized: boolean
  isPlaying: boolean
  isPaused: boolean
  isBuffering: boolean
  currentTrack: Track | null
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  playbackRate: number
  crossfadeActive: boolean
  gaplessActive: boolean
}

export class AudioPlaybackEngine {
  private audioContext: AudioContext | null = null
  private nodes: AudioNodes | null = null
  private state: AudioEngineState
  private crossfadeConfig: CrossfadeConfig
  private gaplessConfig: GaplessConfig
  private eventListeners: Map<string, ((event: PlaybackEvent) => void)[]> = new Map()
  private animationFrame: number | null = null
  private updateInterval: NodeJS.Timeout | null = null
  private nextTrackBuffer: AudioBuffer | null = null
  private crossfadeTimer: NodeJS.Timeout | null = null

  constructor() {
    this.state = {
      isInitialized: false,
      isPlaying: false,
      isPaused: false,
      isBuffering: false,
      currentTrack: null,
      currentTime: 0,
      duration: 0,
      volume: 1.0,
      isMuted: false,
      playbackRate: 1.0,
      crossfadeActive: false,
      gaplessActive: false,
    }

    this.crossfadeConfig = {
      duration: 3000, // 3 seconds default
      curve: 'exponential',
      overlap: true,
    }

    this.gaplessConfig = {
      enabled: true,
      preloadNext: true,
      bufferSize: 10, // seconds
      fadeInDuration: 500, // milliseconds
      fadeOutDuration: 500, // milliseconds
    }
  }

  /**
   * Initialize the audio engine
   */
  async initialize(): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Resume context if suspended (required for user interaction)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      // Create audio nodes
      this.nodes = this.createAudioNodes()
      
      // Connect the audio graph
      this.connectAudioGraph()

      this.state.isInitialized = true
      this.emit('ready', { audioContext: this.audioContext })
      
      // Start update loop
      this.startUpdateLoop()
      
    } catch (error) {
      this.emit('error', { error: error.message })
      throw error
    }
  }

  /**
   * Create audio processing nodes
   */
  private createAudioNodes(): AudioNodes {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }

    const gain = this.audioContext.createGain()
    const crossfadeGain = this.audioContext.createGain()
    const analyser = this.audioContext.createAnalyser()
    const compressor = this.audioContext.createDynamicsCompressor()
    
    // Create EQ filters (3-band: bass, mid, treble)
    const eq = [
      this.audioContext.createBiquadFilter(), // Bass
      this.audioContext.createBiquadFilter(), // Mid
      this.audioContext.createBiquadFilter(), // Treble
    ]

    // Configure EQ filters
    eq[0].type = 'lowshelf'
    eq[0].frequency.setValueAtTime(250, this.audioContext.currentTime)
    
    eq[1].type = 'peaking'
    eq[1].frequency.setValueAtTime(1000, this.audioContext.currentTime)
    eq[1].Q.setValueAtTime(1, this.audioContext.currentTime)
    
    eq[2].type = 'highshelf'
    eq[2].frequency.setValueAtTime(4000, this.audioContext.currentTime)

    // Configure compressor
    compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime)
    compressor.knee.setValueAtTime(30, this.audioContext.currentTime)
    compressor.ratio.setValueAtTime(12, this.audioContext.currentTime)
    compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime)
    compressor.release.setValueAtTime(0.25, this.audioContext.currentTime)

    // Configure analyser
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.8

    return {
      source: null,
      gain,
      crossfadeGain,
      analyser,
      compressor,
      eq,
    }
  }

  /**
   * Connect the audio processing graph
   */
  private connectAudioGraph(): void {
    if (!this.nodes || !this.audioContext) return

    const { source, gain, crossfadeGain, analyser, compressor, eq } = this.nodes

    // Connect: source -> gain -> crossfadeGain -> eq[0] -> eq[1] -> eq[2] -> compressor -> analyser -> destination
    if (source) {
      source.connect(gain)
    }
    gain.connect(crossfadeGain)
    crossfadeGain.connect(eq[0])
    eq[0].connect(eq[1])
    eq[1].connect(eq[2])
    eq[2].connect(compressor)
    compressor.connect(analyser)
    analyser.connect(this.audioContext.destination)
  }

  /**
   * Load and play a track
   */
  async loadTrack(track: Track): Promise<void> {
    if (!this.audioContext || !this.nodes) {
      throw new Error('Audio engine not initialized')
    }

    try {
      this.state.isBuffering = true
      this.emit('buffering', { track })

      // Stop current playback
      await this.stop()

      // Load audio buffer
      const audioBuffer = await this.loadAudioBuffer(track)
      
      // Create new source node
      const source = this.audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.playbackRate.setValueAtTime(this.state.playbackRate, this.audioContext.currentTime)

      // Update nodes
      this.nodes.source = source
      this.connectAudioGraph()

      // Set up event handlers
      source.onended = () => {
        this.handleTrackEnd()
      }

      // Update state
      this.state.currentTrack = track
      this.state.duration = audioBuffer.duration
      this.state.currentTime = 0
      this.state.isBuffering = false

      this.emit('trackChange', { track, duration: this.state.duration })

    } catch (error) {
      this.state.isBuffering = false
      this.emit('error', { error: error.message, track })
      throw error
    }
  }

  /**
   * Load audio buffer from track
   */
  private async loadAudioBuffer(track: Track): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }

    try {
      // For now, we'll use a placeholder URL
      // In a real implementation, this would fetch from the streaming service
      const audioUrl = track.previewUrl || `/api/audio/${track.id}`
      
      const response = await fetch(audioUrl)
      if (!response.ok) {
        throw new Error(`Failed to load audio: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      return await this.audioContext.decodeAudioData(arrayBuffer)
      
    } catch (error) {
      throw new Error(`Failed to load audio buffer: ${error.message}`)
    }
  }

  /**
   * Play the current track
   */
  async play(): Promise<void> {
    if (!this.audioContext || !this.nodes?.source) {
      throw new Error('No track loaded')
    }

    try {
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      // Start playback
      this.nodes.source.start(0, this.state.currentTime)
      
      this.state.isPlaying = true
      this.state.isPaused = false
      
      this.emit('play', { track: this.state.currentTrack, time: this.state.currentTime })

    } catch (error) {
      this.emit('error', { error: error.message })
      throw error
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.nodes?.source || !this.state.isPlaying) return

    // Store current time
    this.state.currentTime = this.getCurrentTime()
    
    // Stop the source
    this.nodes.source.stop()
    this.nodes.source = null

    this.state.isPlaying = false
    this.state.isPaused = true

    this.emit('pause', { track: this.state.currentTrack, time: this.state.currentTime })
  }

  /**
   * Stop playback
   */
  async stop(): Promise<void> {
    if (this.nodes?.source) {
      try {
        this.nodes.source.stop()
      } catch (error) {
        // Source might already be stopped
      }
      this.nodes.source = null
    }

    this.state.isPlaying = false
    this.state.isPaused = false
    this.state.currentTime = 0

    this.emit('stop', { track: this.state.currentTrack })
  }

  /**
   * Seek to a specific time
   */
  async seek(time: number): Promise<void> {
    if (!this.state.currentTrack) return

    const wasPlaying = this.state.isPlaying
    
    if (wasPlaying) {
      this.pause()
    }

    this.state.currentTime = Math.max(0, Math.min(time, this.state.duration))

    if (wasPlaying) {
      await this.play()
    }

    this.emit('seek', { track: this.state.currentTrack, time: this.state.currentTime })
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    if (!this.nodes?.gain) return

    const clampedVolume = Math.max(0, Math.min(1, volume))
    this.state.volume = clampedVolume

    if (this.audioContext) {
      this.nodes.gain.gain.setValueAtTime(
        this.state.isMuted ? 0 : clampedVolume,
        this.audioContext.currentTime
      )
    }
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    if (!this.nodes?.gain) return

    this.state.isMuted = muted

    if (this.audioContext) {
      this.nodes.gain.gain.setValueAtTime(
        muted ? 0 : this.state.volume,
        this.audioContext.currentTime
      )
    }
  }

  /**
   * Set playback rate
   */
  setPlaybackRate(rate: number): void {
    if (!this.nodes?.source || !this.audioContext) return

    const clampedRate = Math.max(0.25, Math.min(4.0, rate))
    this.state.playbackRate = clampedRate

    this.nodes.source.playbackRate.setValueAtTime(
      clampedRate,
      this.audioContext.currentTime
    )
  }

  /**
   * Configure crossfade settings
   */
  configureCrossfade(config: Partial<CrossfadeConfig>): void {
    this.crossfadeConfig = { ...this.crossfadeConfig, ...config }
  }

  /**
   * Configure gapless playback settings
   */
  configureGapless(config: Partial<GaplessConfig>): void {
    this.gaplessConfig = { ...this.gaplessConfig, ...config }
  }

  /**
   * Apply audio settings
   */
  applyAudioSettings(settings: AudioSettings): void {
    this.setVolume(settings.volume / 100)
    this.setMuted(settings.isMuted)
    this.configureCrossfade({ duration: settings.crossfadeDuration })
    this.configureGapless({ enabled: settings.gaplessPlayback })
    this.setPlaybackRate(settings.playbackRate || 1.0)
    
    // Apply EQ settings
    if (settings.customEq && this.nodes) {
      this.nodes.eq[0].gain.setValueAtTime(settings.customEq.bass, this.audioContext!.currentTime)
      this.nodes.eq[1].gain.setValueAtTime(settings.customEq.mid, this.audioContext!.currentTime)
      this.nodes.eq[2].gain.setValueAtTime(settings.customEq.treble, this.audioContext!.currentTime)
    }
  }

  /**
   * Start crossfade to next track
   */
  async startCrossfade(nextTrack: Track): Promise<void> {
    if (!this.audioContext || !this.nodes || this.state.crossfadeActive) return

    try {
      this.state.crossfadeActive = true
      const crossfadeDuration = this.crossfadeConfig.duration / 1000 // Convert to seconds

      // Load next track
      const nextBuffer = await this.loadAudioBuffer(nextTrack)
      
      // Create new source for next track
      const nextSource = this.audioContext.createBufferSource()
      nextSource.buffer = nextBuffer
      nextSource.playbackRate.setValueAtTime(this.state.playbackRate, this.audioContext.currentTime)

      // Create gain node for next track
      const nextGain = this.audioContext.createGain()
      nextGain.gain.setValueAtTime(0, this.audioContext.currentTime)

      // Connect next track
      nextSource.connect(nextGain)
      nextGain.connect(this.nodes.crossfadeGain)

      // Start next track
      nextSource.start(0, 0)

      // Fade out current track
      this.nodes.gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + crossfadeDuration)
      
      // Fade in next track
      nextGain.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + crossfadeDuration)

      // Update state after crossfade
      setTimeout(() => {
        this.state.currentTrack = nextTrack
        this.state.duration = nextBuffer.duration
        this.state.currentTime = 0
        this.state.crossfadeActive = false
        
        // Replace current source
        if (this.nodes?.source) {
          this.nodes.source.disconnect()
        }
        this.nodes!.source = nextSource
        this.nodes!.gain = nextGain
        this.connectAudioGraph()

        this.emit('trackChange', { track: nextTrack, duration: this.state.duration })
      }, this.crossfadeConfig.duration)

    } catch (error) {
      this.state.crossfadeActive = false
      this.emit('error', { error: error.message })
      throw error
    }
  }

  /**
   * Preload next track for gapless playback
   */
  async preloadNextTrack(track: Track): Promise<void> {
    if (!this.gaplessConfig.preloadNext) return

    try {
      this.nextTrackBuffer = await this.loadAudioBuffer(track)
    } catch (error) {
      console.warn('Failed to preload next track:', error)
    }
  }

  /**
   * Get current playback time
   */
  getCurrentTime(): number {
    if (!this.audioContext || !this.nodes?.source) {
      return this.state.currentTime
    }

    // Calculate current time based on audio context time
    const elapsed = this.audioContext.currentTime - (this.nodes.source.startTime || 0)
    return Math.max(0, Math.min(elapsed, this.state.duration))
  }

  /**
   * Get current playback state
   */
  getPlaybackState(): PlaybackState {
    return {
      isPlaying: this.state.isPlaying,
      isPaused: this.state.isPaused,
      isBuffering: this.state.isBuffering,
      currentTrack: this.state.currentTrack,
      currentTime: this.getCurrentTime(),
      duration: this.state.duration,
      volume: this.state.volume,
      isMuted: this.state.isMuted,
      playbackRate: this.state.playbackRate,
      crossfadeActive: this.state.crossfadeActive,
      gaplessActive: this.state.gaplessActive,
    }
  }

  /**
   * Get audio analysis data
   */
  getAudioAnalysis(): {
    frequencyData: Uint8Array
    timeDomainData: Uint8Array
    volume: number
  } | null {
    if (!this.nodes?.analyser) return null

    const analyser = this.nodes.analyser
    const frequencyData = new Uint8Array(analyser.frequencyBinCount)
    const timeDomainData = new Uint8Array(analyser.frequencyBinCount)

    analyser.getByteFrequencyData(frequencyData)
    analyser.getByteTimeDomainData(timeDomainData)

    // Calculate average volume
    const volume = timeDomainData.reduce((sum, value) => sum + value, 0) / timeDomainData.length / 128

    return {
      frequencyData,
      timeDomainData,
      volume,
    }
  }

  /**
   * Handle track end
   */
  private handleTrackEnd(): void {
    this.state.isPlaying = false
    this.state.isPaused = false
    this.state.currentTime = this.state.duration

    this.emit('trackChange', { 
      track: this.state.currentTrack, 
      ended: true,
      time: this.state.currentTime 
    })
  }

  /**
   * Start update loop for time tracking
   */
  private startUpdateLoop(): void {
    this.updateInterval = setInterval(() => {
      if (this.state.isPlaying) {
        this.state.currentTime = this.getCurrentTime()
      }
    }, 100) // Update every 100ms
  }

  /**
   * Stop update loop
   */
  private stopUpdateLoop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }

  /**
   * Add event listener
   */
  on(event: string, callback: (event: PlaybackEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: (event: PlaybackEvent) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * Emit event
   */
  private emit(type: PlaybackEvent['type'], data?: any): void {
    const event: PlaybackEvent = {
      type,
      data,
      timestamp: Date.now(),
    }

    const listeners = this.eventListeners.get(type)
    if (listeners) {
      listeners.forEach(callback => callback(event))
    }
  }

  /**
   * Cleanup and destroy the audio engine
   */
  async destroy(): Promise<void> {
    await this.stop()
    this.stopUpdateLoop()

    if (this.audioContext) {
      await this.audioContext.close()
      this.audioContext = null
    }

    this.nodes = null
    this.state.isInitialized = false
    this.eventListeners.clear()
  }
}

// Export singleton instance
export const audioEngine = new AudioPlaybackEngine()
