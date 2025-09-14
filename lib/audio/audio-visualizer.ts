/**
 * Audio visualization and spectrum analyzer
 * Provides real-time audio analysis and visualization capabilities
 */

import type { AudioSettings } from '@/lib/types'

export interface AudioVisualizerConfig {
  fftSize: number
  smoothingTimeConstant: number
  minDecibels: number
  maxDecibels: number
  frequencyBinCount: number
  sampleRate: number
  updateInterval: number
}

export interface FrequencyData {
  frequencies: Float32Array
  timeDomain: Float32Array
  frequencyBins: number[]
  peakFrequencies: number[]
  averageLevel: number
  peakLevel: number
  rms: number
}

export interface VisualizationData {
  frequencyData: FrequencyData
  waveform: Float32Array
  spectrum: number[]
  bars: number[]
  peaks: number[]
  timestamp: number
}

export interface VisualizerEvent {
  type: 'data' | 'error' | 'start' | 'stop' | 'config'
  data?: VisualizationData
  error?: string
  timestamp: number
}

export class AudioVisualizer {
  private config: AudioVisualizerConfig
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private frequencyArray: Float32Array | null = null
  private timeDomainArray: Float32Array | null = null
  private isRunning: boolean = false
  private animationFrame: number | null = null
  private listeners: Map<string, (event: VisualizerEvent) => void> = new Map()
  private audioSource: MediaElementAudioSourceNode | AudioBufferSourceNode | null = null
  private gainNode: GainNode | null = null

  constructor(config: Partial<AudioVisualizerConfig> = {}) {
    this.config = {
      fftSize: 2048,
      smoothingTimeConstant: 0.8,
      minDecibels: -90,
      maxDecibels: -10,
      frequencyBinCount: 1024,
      sampleRate: 44100,
      updateInterval: 16, // ~60fps
      ...config,
    }
  }

  /**
   * Initialize the audio visualizer
   */
  async initialize(): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.config.sampleRate,
      })

      // Create analyser node
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = this.config.fftSize
      this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant
      this.analyser.minDecibels = this.config.minDecibels
      this.analyser.maxDecibels = this.config.maxDecibels

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain()

      // Connect nodes
      this.gainNode.connect(this.analyser)
      this.analyser.connect(this.audioContext.destination)

      // Initialize data arrays
      const bufferLength = this.analyser.frequencyBinCount
      this.dataArray = new Uint8Array(bufferLength)
      this.frequencyArray = new Float32Array(bufferLength)
      this.timeDomainArray = new Float32Array(bufferLength)

      this.emitEvent('config', { timestamp: Date.now() })

    } catch (error) {
      console.error('Failed to initialize audio visualizer:', error)
      this.emitEvent('error', { 
        error: error.message, 
        timestamp: Date.now() 
      })
      throw error
    }
  }

  /**
   * Connect audio source to visualizer
   */
  connectAudioSource(source: HTMLAudioElement | AudioBuffer): void {
    if (!this.audioContext || !this.gainNode) {
      throw new Error('Visualizer not initialized')
    }

    // Disconnect existing source
    if (this.audioSource) {
      this.audioSource.disconnect()
    }

    if (source instanceof HTMLAudioElement) {
      // Connect HTML audio element
      this.audioSource = this.audioContext.createMediaElementSource(source)
      this.audioSource.connect(this.gainNode)
    } else if (source instanceof AudioBuffer) {
      // Connect audio buffer
      this.audioSource = this.audioContext.createBufferSource()
      this.audioSource.buffer = source
      this.audioSource.connect(this.gainNode)
    }

    this.emitEvent('config', { timestamp: Date.now() })
  }

  /**
   * Start visualization
   */
  start(): void {
    if (!this.analyser || this.isRunning) return

    this.isRunning = true
    this.emitEvent('start', { timestamp: Date.now() })
    this.visualize()
  }

  /**
   * Stop visualization
   */
  stop(): void {
    this.isRunning = false
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }

    this.emitEvent('stop', { timestamp: Date.now() })
  }

  /**
   * Set volume for visualization
   */
  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume))
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AudioVisualizerConfig>): void {
    this.config = { ...this.config, ...newConfig }

    if (this.analyser) {
      if (newConfig.fftSize) {
        this.analyser.fftSize = newConfig.fftSize
      }
      if (newConfig.smoothingTimeConstant !== undefined) {
        this.analyser.smoothingTimeConstant = newConfig.smoothingTimeConstant
      }
      if (newConfig.minDecibels !== undefined) {
        this.analyser.minDecibels = newConfig.minDecibels
      }
      if (newConfig.maxDecibels !== undefined) {
        this.analyser.maxDecibels = newConfig.maxDecibels
      }

      // Reinitialize data arrays if fftSize changed
      if (newConfig.fftSize) {
        const bufferLength = this.analyser.frequencyBinCount
        this.dataArray = new Uint8Array(bufferLength)
        this.frequencyArray = new Float32Array(bufferLength)
        this.timeDomainArray = new Float32Array(bufferLength)
      }
    }

    this.emitEvent('config', { timestamp: Date.now() })
  }

  /**
   * Get current configuration
   */
  getConfig(): AudioVisualizerConfig {
    return { ...this.config }
  }

  /**
   * Get frequency data
   */
  getFrequencyData(): FrequencyData | null {
    if (!this.analyser || !this.frequencyArray || !this.timeDomainArray) {
      return null
    }

    // Get frequency data
    this.analyser.getFloatFrequencyData(this.frequencyArray)
    this.analyser.getFloatTimeDomainData(this.timeDomainArray)

    // Calculate frequency bins
    const frequencyBins: number[] = []
    const nyquist = this.audioContext!.sampleRate / 2
    const binSize = nyquist / this.frequencyArray.length

    for (let i = 0; i < this.frequencyArray.length; i++) {
      frequencyBins.push(i * binSize)
    }

    // Find peak frequencies
    const peakFrequencies: number[] = []
    let maxValue = -Infinity
    let maxIndex = 0

    for (let i = 0; i < this.frequencyArray.length; i++) {
      if (this.frequencyArray[i] > maxValue) {
        maxValue = this.frequencyArray[i]
        maxIndex = i
      }
    }

    if (maxValue > this.config.minDecibels) {
      peakFrequencies.push(frequencyBins[maxIndex])
    }

    // Calculate average and peak levels
    let sum = 0
    let peak = -Infinity
    let rmsSum = 0

    for (let i = 0; i < this.frequencyArray.length; i++) {
      const value = this.frequencyArray[i]
      sum += value
      peak = Math.max(peak, value)
      rmsSum += value * value
    }

    const averageLevel = sum / this.frequencyArray.length
    const rms = Math.sqrt(rmsSum / this.frequencyArray.length)

    return {
      frequencies: this.frequencyArray,
      timeDomain: this.timeDomainArray,
      frequencyBins,
      peakFrequencies,
      averageLevel,
      peakLevel: peak,
      rms,
    }
  }

  /**
   * Get visualization data for rendering
   */
  getVisualizationData(): VisualizationData | null {
    const frequencyData = this.getFrequencyData()
    if (!frequencyData) return null

    // Convert frequency data to visualization format
    const spectrum: number[] = []
    const bars: number[] = []
    const peaks: number[] = []

    // Normalize frequency data for spectrum
    for (let i = 0; i < frequencyData.frequencies.length; i++) {
      const normalized = (frequencyData.frequencies[i] - this.config.minDecibels) / 
                        (this.config.maxDecibels - this.config.minDecibels)
      spectrum.push(Math.max(0, Math.min(1, normalized)))
    }

    // Create bar data (grouped frequency bins)
    const barCount = 64
    const binSize = Math.floor(frequencyData.frequencies.length / barCount)
    
    for (let i = 0; i < barCount; i++) {
      let sum = 0
      let count = 0
      
      for (let j = 0; j < binSize; j++) {
        const index = i * binSize + j
        if (index < frequencyData.frequencies.length) {
          sum += frequencyData.frequencies[index]
          count++
        }
      }
      
      const average = count > 0 ? sum / count : 0
      const normalized = (average - this.config.minDecibels) / 
                        (this.config.maxDecibels - this.config.minDecibels)
      bars.push(Math.max(0, Math.min(1, normalized)))
    }

    // Find peaks in the spectrum
    for (let i = 1; i < spectrum.length - 1; i++) {
      if (spectrum[i] > spectrum[i - 1] && spectrum[i] > spectrum[i + 1] && spectrum[i] > 0.7) {
        peaks.push(i / spectrum.length)
      }
    }

    return {
      frequencyData,
      waveform: frequencyData.timeDomain,
      spectrum,
      bars,
      peaks,
      timestamp: Date.now(),
    }
  }

  /**
   * Main visualization loop
   */
  private visualize(): void {
    if (!this.isRunning) return

    try {
      const data = this.getVisualizationData()
      if (data) {
        this.emitEvent('data', { data, timestamp: Date.now() })
      }
    } catch (error) {
      console.error('Visualization error:', error)
      this.emitEvent('error', { 
        error: error.message, 
        timestamp: Date.now() 
      })
    }

    this.animationFrame = requestAnimationFrame(() => {
      setTimeout(() => this.visualize(), this.config.updateInterval)
    })
  }

  /**
   * Add event listener
   */
  addEventListener(eventType: string, listener: (event: VisualizerEvent) => void): void {
    this.listeners.set(eventType, listener)
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType: string): void {
    this.listeners.delete(eventType)
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(type: VisualizerEvent['type'], data?: any): void {
    const event: VisualizerEvent = {
      type,
      ...data,
      timestamp: Date.now(),
    }

    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in visualizer event listener:', error)
      }
    })
  }

  /**
   * Get audio context state
   */
  getAudioContextState(): string | null {
    return this.audioContext?.state || null
  }

  /**
   * Resume audio context if suspended
   */
  async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  /**
   * Suspend audio context to save resources
   */
  async suspendAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'running') {
      await this.audioContext.suspend()
    }
  }

  /**
   * Check if visualizer is running
   */
  isActive(): boolean {
    return this.isRunning
  }

  /**
   * Get current sample rate
   */
  getSampleRate(): number {
    return this.audioContext?.sampleRate || this.config.sampleRate
  }

  /**
   * Get frequency bin count
   */
  getFrequencyBinCount(): number {
    return this.analyser?.frequencyBinCount || 0
  }

  /**
   * Destroy visualizer and cleanup resources
   */
  destroy(): void {
    this.stop()

    if (this.audioSource) {
      this.audioSource.disconnect()
      this.audioSource = null
    }

    if (this.gainNode) {
      this.gainNode.disconnect()
      this.gainNode = null
    }

    if (this.analyser) {
      this.analyser.disconnect()
      this.analyser = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.dataArray = null
    this.frequencyArray = null
    this.timeDomainArray = null
    this.listeners.clear()
  }
}

// Export singleton instance
export const audioVisualizer = new AudioVisualizer()
