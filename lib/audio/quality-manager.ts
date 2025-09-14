/**
 * Audio quality selection and bitrate management system
 * Handles different audio qualities, bitrates, and format selection
 */

import { Track } from '@/lib/types'
import { errorHandler } from '@/lib/error/error-handler'

// Audio quality levels
export type AudioQuality = 'low' | 'medium' | 'high' | 'lossless' | 'auto'

// Audio formats
export type AudioFormat = 'mp3' | 'aac' | 'flac' | 'ogg' | 'wav' | 'm4a'

// Quality configuration
export interface QualityConfig {
  level: AudioQuality
  bitrate: number // kbps
  sampleRate: number // Hz
  channels: number
  format: AudioFormat
  codec: string
  description: string
  fileSizeEstimate: number // bytes per minute
  bandwidthRequired: number // kbps
  isLossless: boolean
  isSupported: boolean
}

// Quality settings
export interface QualitySettings {
  preferredQuality: AudioQuality
  fallbackQuality: AudioQuality
  autoQualityEnabled: boolean
  dataSaverMode: boolean
  wifiOnlyLossless: boolean
  cellularQuality: AudioQuality
  wifiQuality: AudioQuality
  maxBitrate: number // kbps
  minBitrate: number // kbps
  adaptiveBitrate: boolean
  qualityChangeThreshold: number // ms
}

// Network conditions
export interface NetworkConditions {
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown'
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown'
  downlink: number // Mbps
  rtt: number // ms
  saveData: boolean
  isOnline: boolean
}

// Quality change event
export interface QualityChangeEvent {
  type: 'qualityChanged' | 'bitrateChanged' | 'formatChanged' | 'networkChanged' | 'error'
  data?: any
  timestamp: number
}

// Quality manager class
export class QualityManager {
  private qualityConfigs: Map<AudioQuality, QualityConfig> = new Map()
  private currentSettings: QualitySettings
  private currentNetworkConditions: NetworkConditions
  private eventListeners: Map<string, ((event: QualityChangeEvent) => void)[]> = new Map()
  private isInitialized = false
  private networkMonitor: any = null
  private qualityChangeTimer: number | null = null

  constructor(initialSettings?: Partial<QualitySettings>) {
    // Default quality settings
    this.currentSettings = {
      preferredQuality: 'high',
      fallbackQuality: 'medium',
      autoQualityEnabled: true,
      dataSaverMode: false,
      wifiOnlyLossless: true,
      cellularQuality: 'medium',
      wifiQuality: 'high',
      maxBitrate: 320,
      minBitrate: 128,
      adaptiveBitrate: true,
      qualityChangeThreshold: 2000,
      ...initialSettings
    }

    // Initialize network conditions
    this.currentNetworkConditions = {
      connectionType: 'unknown',
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
      saveData: false,
      isOnline: navigator.onLine
    }

    this.initializeQualityConfigs()
  }

  /**
   * Initialize the quality manager
   */
  async initialize(): Promise<void> {
    try {
      // Initialize quality configurations
      this.initializeQualityConfigs()
      
      // Start network monitoring
      await this.startNetworkMonitoring()
      
      // Apply initial quality based on network conditions
      await this.applyOptimalQuality()
      
      this.isInitialized = true
      console.log('Quality manager initialized successfully')
    } catch (error) {
      errorHandler.handleError(error as Error, {
        component: 'QualityManager',
        action: 'initialize'
      })
      throw error
    }
  }

  /**
   * Get available quality options for a track
   */
  getAvailableQualities(track: Track): QualityConfig[] {
    const availableQualities: QualityConfig[] = []
    
    // Check which qualities are available for this track
    for (const [quality, config] of this.qualityConfigs) {
      if (this.isQualityAvailableForTrack(track, quality)) {
        availableQualities.push(config)
      }
    }
    
    return availableQualities.sort((a, b) => b.bitrate - a.bitrate)
  }

  /**
   * Get optimal quality for current conditions
   */
  getOptimalQuality(track: Track): QualityConfig {
    if (!this.currentSettings.autoQualityEnabled) {
      return this.qualityConfigs.get(this.currentSettings.preferredQuality)!
    }

    // Determine optimal quality based on network conditions
    let targetQuality: AudioQuality

    if (this.currentNetworkConditions.connectionType === 'wifi') {
      targetQuality = this.currentSettings.wifiQuality
    } else if (this.currentNetworkConditions.connectionType === 'cellular') {
      targetQuality = this.currentSettings.cellularQuality
    } else {
      targetQuality = this.currentSettings.preferredQuality
    }

    // Apply data saver mode
    if (this.currentSettings.dataSaverMode) {
      targetQuality = this.getLowerQuality(targetQuality)
    }

    // Check if lossless is allowed
    if (targetQuality === 'lossless' && this.currentSettings.wifiOnlyLossless && 
        this.currentNetworkConditions.connectionType !== 'wifi') {
      targetQuality = 'high'
    }

    // Check network bandwidth
    if (this.currentNetworkConditions.downlink > 0) {
      const requiredBandwidth = this.qualityConfigs.get(targetQuality)?.bandwidthRequired || 0
      if (this.currentNetworkConditions.downlink * 1000 < requiredBandwidth) {
        targetQuality = this.getLowerQuality(targetQuality)
      }
    }

    // Ensure quality is available for track
    const availableQualities = this.getAvailableQualities(track)
    const targetConfig = this.qualityConfigs.get(targetQuality)!
    
    if (!availableQualities.some(q => q.level === targetQuality)) {
      // Fallback to highest available quality
      return availableQualities[0] || this.qualityConfigs.get(this.currentSettings.fallbackQuality)!
    }

    return targetConfig
  }

  /**
   * Set quality for playback
   */
  async setQuality(quality: AudioQuality, track?: Track): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Quality manager not initialized')
    }

    try {
      const config = this.qualityConfigs.get(quality)
      if (!config) {
        throw new Error(`Invalid quality level: ${quality}`)
      }

      if (!config.isSupported) {
        throw new Error(`Quality level not supported: ${quality}`)
      }

      // Check if quality is available for track
      if (track && !this.isQualityAvailableForTrack(track, quality)) {
        throw new Error(`Quality ${quality} not available for track: ${track.title}`)
      }

      // Update settings
      this.currentSettings.preferredQuality = quality
      
      // Emit quality change event
      this.emit('qualityChanged', { 
        quality, 
        config, 
        track,
        networkConditions: this.currentNetworkConditions 
      })

      console.log(`Quality changed to: ${quality} (${config.bitrate}kbps)`)
    } catch (error) {
      errorHandler.handleError(error as Error, {
        component: 'QualityManager',
        action: 'setQuality',
        metadata: { quality, trackId: track?.id }
      })
      throw error
    }
  }

  /**
   * Get current quality settings
   */
  getCurrentSettings(): QualitySettings {
    return { ...this.currentSettings }
  }

  /**
   * Update quality settings
   */
  updateSettings(newSettings: Partial<QualitySettings>): void {
    this.currentSettings = { ...this.currentSettings, ...newSettings }
    
    // Apply optimal quality if auto quality is enabled
    if (this.currentSettings.autoQualityEnabled) {
      this.applyOptimalQuality()
    }
  }

  /**
   * Get current network conditions
   */
  getNetworkConditions(): NetworkConditions {
    return { ...this.currentNetworkConditions }
  }

  /**
   * Get quality configuration for a specific quality level
   */
  getQualityConfig(quality: AudioQuality): QualityConfig | null {
    return this.qualityConfigs.get(quality) || null
  }

  /**
   * Get all available quality configurations
   */
  getAllQualityConfigs(): QualityConfig[] {
    return Array.from(this.qualityConfigs.values())
  }

  /**
   * Check if a quality is supported
   */
  isQualitySupported(quality: AudioQuality): boolean {
    const config = this.qualityConfigs.get(quality)
    return config ? config.isSupported : false
  }

  /**
   * Get estimated data usage for a track
   */
  getEstimatedDataUsage(track: Track, quality: AudioQuality): number {
    const config = this.qualityConfigs.get(quality)
    if (!config) {
      return 0
    }

    const durationMinutes = track.durationMs / (1000 * 60)
    return Math.round(config.fileSizeEstimate * durationMinutes)
  }

  /**
   * Get bandwidth recommendation
   */
  getBandwidthRecommendation(quality: AudioQuality): number {
    const config = this.qualityConfigs.get(quality)
    return config ? config.bandwidthRequired : 0
  }

  /**
   * Event handling
   */
  on(event: string, callback: (event: QualityChangeEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  off(event: string, callback: (event: QualityChangeEvent) => void): void {
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
      const qualityEvent: QualityChangeEvent = {
        type: event as any,
        data,
        timestamp: Date.now()
      }
      listeners.forEach(callback => callback(qualityEvent))
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    try {
      // Stop network monitoring
      if (this.networkMonitor) {
        this.networkMonitor.disconnect()
        this.networkMonitor = null
      }

      // Clear timers
      if (this.qualityChangeTimer) {
        clearTimeout(this.qualityChangeTimer)
        this.qualityChangeTimer = null
      }

      // Clear event listeners
      this.eventListeners.clear()

      this.isInitialized = false
      console.log('Quality manager destroyed')
    } catch (error) {
      errorHandler.handleError(error as Error, {
        component: 'QualityManager',
        action: 'destroy'
      })
    }
  }

  /**
   * Initialize quality configurations
   */
  private initializeQualityConfigs(): void {
    // Low quality - 128kbps MP3
    this.qualityConfigs.set('low', {
      level: 'low',
      bitrate: 128,
      sampleRate: 44100,
      channels: 2,
      format: 'mp3',
      codec: 'mp3',
      description: 'Low Quality (128kbps)',
      fileSizeEstimate: 960000, // ~960KB per minute
      bandwidthRequired: 128,
      isLossless: false,
      isSupported: this.isFormatSupported('mp3')
    })

    // Medium quality - 192kbps AAC
    this.qualityConfigs.set('medium', {
      level: 'medium',
      bitrate: 192,
      sampleRate: 44100,
      channels: 2,
      format: 'aac',
      codec: 'aac',
      description: 'Medium Quality (192kbps)',
      fileSizeEstimate: 1440000, // ~1.4MB per minute
      bandwidthRequired: 192,
      isLossless: false,
      isSupported: this.isFormatSupported('aac')
    })

    // High quality - 320kbps AAC
    this.qualityConfigs.set('high', {
      level: 'high',
      bitrate: 320,
      sampleRate: 44100,
      channels: 2,
      format: 'aac',
      codec: 'aac',
      description: 'High Quality (320kbps)',
      fileSizeEstimate: 2400000, // ~2.4MB per minute
      bandwidthRequired: 320,
      isLossless: false,
      isSupported: this.isFormatSupported('aac')
    })

    // Lossless quality - FLAC
    this.qualityConfigs.set('lossless', {
      level: 'lossless',
      bitrate: 1411,
      sampleRate: 44100,
      channels: 2,
      format: 'flac',
      codec: 'flac',
      description: 'Lossless Quality (FLAC)',
      fileSizeEstimate: 10500000, // ~10.5MB per minute
      bandwidthRequired: 1411,
      isLossless: true,
      isSupported: this.isFormatSupported('flac')
    })

    // Auto quality - dynamically selected
    this.qualityConfigs.set('auto', {
      level: 'auto',
      bitrate: 0, // Dynamic
      sampleRate: 44100,
      channels: 2,
      format: 'aac',
      codec: 'aac',
      description: 'Auto Quality',
      fileSizeEstimate: 0, // Dynamic
      bandwidthRequired: 0, // Dynamic
      isLossless: false,
      isSupported: true
    })
  }

  /**
   * Start network monitoring
   */
  private async startNetworkMonitoring(): Promise<void> {
    try {
      // Check if Network Information API is available
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        
        // Update network conditions
        this.updateNetworkConditions({
          connectionType: this.getConnectionType(connection.effectiveType),
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0,
          saveData: connection.saveData || false,
          isOnline: navigator.onLine
        })

        // Listen for network changes
        connection.addEventListener('change', () => {
          this.updateNetworkConditions({
            connectionType: this.getConnectionType(connection.effectiveType),
            effectiveType: connection.effectiveType || 'unknown',
            downlink: connection.downlink || 0,
            rtt: connection.rtt || 0,
            saveData: connection.saveData || false,
            isOnline: navigator.onLine
          })
        })
      }

      // Listen for online/offline events
      window.addEventListener('online', () => {
        this.updateNetworkConditions({
          ...this.currentNetworkConditions,
          isOnline: true
        })
      })

      window.addEventListener('offline', () => {
        this.updateNetworkConditions({
          ...this.currentNetworkConditions,
          isOnline: false
        })
      })
    } catch (error) {
      console.warn('Failed to start network monitoring:', error)
    }
  }

  /**
   * Update network conditions
   */
  private updateNetworkConditions(conditions: NetworkConditions): void {
    const previousConditions = { ...this.currentNetworkConditions }
    this.currentNetworkConditions = conditions

    // Emit network change event
    this.emit('networkChanged', { 
      previous: previousConditions, 
      current: conditions 
    })

    // Apply optimal quality if auto quality is enabled
    if (this.currentSettings.autoQualityEnabled) {
      this.applyOptimalQuality()
    }
  }

  /**
   * Apply optimal quality based on current conditions
   */
  private async applyOptimalQuality(): Promise<void> {
    if (this.qualityChangeTimer) {
      clearTimeout(this.qualityChangeTimer)
    }

    // Debounce quality changes
    this.qualityChangeTimer = window.setTimeout(() => {
      try {
        const optimalQuality = this.getOptimalQuality({} as Track)
        
        if (optimalQuality.level !== this.currentSettings.preferredQuality) {
          this.setQuality(optimalQuality.level)
        }
      } catch (error) {
        console.warn('Failed to apply optimal quality:', error)
      }
    }, this.currentSettings.qualityChangeThreshold)
  }

  /**
   * Check if a format is supported
   */
  private isFormatSupported(format: AudioFormat): boolean {
    const audio = new Audio()
    
    switch (format) {
      case 'mp3':
        return audio.canPlayType('audio/mpeg') !== ''
      case 'aac':
        return audio.canPlayType('audio/aac') !== '' || audio.canPlayType('audio/mp4') !== ''
      case 'flac':
        return audio.canPlayType('audio/flac') !== ''
      case 'ogg':
        return audio.canPlayType('audio/ogg') !== ''
      case 'wav':
        return audio.canPlayType('audio/wav') !== ''
      case 'm4a':
        return audio.canPlayType('audio/mp4') !== ''
      default:
        return false
    }
  }

  /**
   * Check if quality is available for a track
   */
  private isQualityAvailableForTrack(track: Track, quality: AudioQuality): boolean {
    // In a real implementation, this would check the track's available formats
    // For now, we'll assume all qualities are available
    const config = this.qualityConfigs.get(quality)
    return config ? config.isSupported : false
  }

  /**
   * Get lower quality level
   */
  private getLowerQuality(quality: AudioQuality): AudioQuality {
    const qualityOrder: AudioQuality[] = ['lossless', 'high', 'medium', 'low']
    const currentIndex = qualityOrder.indexOf(quality)
    
    if (currentIndex < qualityOrder.length - 1) {
      return qualityOrder[currentIndex + 1]
    }
    
    return quality
  }

  /**
   * Get connection type from effective type
   */
  private getConnectionType(effectiveType: string): 'wifi' | 'cellular' | 'ethernet' | 'unknown' {
    // This is a simplified mapping - in reality, you'd need more sophisticated detection
    if (effectiveType === '4g' || effectiveType === '3g' || effectiveType === '2g' || effectiveType === 'slow-2g') {
      return 'cellular'
    }
    
    // Default to unknown - would need additional detection for wifi/ethernet
    return 'unknown'
  }
}

// Quality manager factory
export class QualityManagerFactory {
  static create(initialSettings?: Partial<QualitySettings>): QualityManager {
    return new QualityManager(initialSettings)
  }
}

// Global quality manager instance
let globalQualityManager: QualityManager | null = null

export function getQualityManager(): QualityManager {
  if (!globalQualityManager) {
    throw new Error('Quality manager not initialized')
  }
  return globalQualityManager
}

export async function initializeQualityManager(initialSettings?: Partial<QualitySettings>): Promise<QualityManager> {
  globalQualityManager = QualityManagerFactory.create(initialSettings)
  await globalQualityManager.initialize()
  return globalQualityManager
}

// Export types and classes
export {
  QualityManager,
  QualityManagerFactory
}
