/**
 * Audio settings management system
 * Handles EQ, crossfade, gapless playback, and other audio preferences
 */

import type { AudioSettings, EQSettings, CrossfadeSettings, GaplessSettings } from '@/lib/types'
import { 
  saveAudioSettings, 
  loadAudioSettings, 
  saveEQSettings, 
  loadEQSettings,
  saveCrossfadeSettings,
  loadCrossfadeSettings,
  saveGaplessSettings,
  loadGaplessSettings,
  STORAGE_KEYS
} from '@/lib/storage/localStorage'

export interface AudioSettingsManagerConfig {
  autoSave: boolean
  saveInterval: number
  validateSettings: boolean
  defaultSettings: AudioSettings
}

export interface AudioSettingsChangeEvent {
  type: 'audio' | 'eq' | 'crossfade' | 'gapless' | 'all'
  settings: Partial<AudioSettings>
  previousSettings: Partial<AudioSettings>
  timestamp: number
}

export class AudioSettingsManager {
  private config: AudioSettingsManagerConfig
  private currentSettings: AudioSettings
  private saveTimer: NodeJS.Timeout | null = null
  private listeners: Map<string, (event: AudioSettingsChangeEvent) => void> = new Map()
  private isInitialized: boolean = false

  constructor(config: Partial<AudioSettingsManagerConfig> = {}) {
    this.config = {
      autoSave: true,
      saveInterval: 2000, // 2 seconds
      validateSettings: true,
      defaultSettings: this.getDefaultSettings(),
      ...config,
    }

    this.currentSettings = { ...this.config.defaultSettings }
  }

  /**
   * Initialize the settings manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Load settings from storage
      const savedSettings = await this.loadSettingsFromStorage()
      if (savedSettings) {
        this.currentSettings = this.mergeWithDefaults(savedSettings)
      }

      // Start auto-save if enabled
      if (this.config.autoSave) {
        this.startAutoSave()
      }

      this.isInitialized = true
      this.emitChangeEvent('all', this.currentSettings, {})

    } catch (error) {
      console.error('Failed to initialize audio settings:', error)
      // Continue with default settings
      this.isInitialized = true
    }
  }

  /**
   * Get current audio settings
   */
  getSettings(): AudioSettings {
    return { ...this.currentSettings }
  }

  /**
   * Update audio settings
   */
  async updateSettings(updates: Partial<AudioSettings>): Promise<void> {
    const previousSettings = { ...this.currentSettings }
    
    // Validate settings if enabled
    if (this.config.validateSettings) {
      const validatedUpdates = this.validateSettings(updates)
      this.currentSettings = { ...this.currentSettings, ...validatedUpdates }
    } else {
      this.currentSettings = { ...this.currentSettings, ...updates }
    }

    // Emit change event
    this.emitChangeEvent('audio', updates, previousSettings)

    // Auto-save if enabled
    if (this.config.autoSave) {
      this.debouncedSave()
    }
  }

  /**
   * Update EQ settings
   */
  async updateEQSettings(eqSettings: Partial<EQSettings>): Promise<void> {
    const previousSettings = { ...this.currentSettings }
    
    // Validate EQ settings
    const validatedEQ = this.config.validateSettings 
      ? this.validateSettings({ eq: eqSettings }).eq || eqSettings
      : eqSettings

    this.currentSettings.eq = {
      ...this.currentSettings.eq,
      ...validatedEQ,
    }

    this.emitChangeEvent('eq', { eq: this.currentSettings.eq }, previousSettings)

    if (this.config.autoSave) {
      this.debouncedSave()
    }
  }

  /**
   * Update crossfade settings
   */
  async updateCrossfadeSettings(crossfadeSettings: Partial<CrossfadeSettings>): Promise<void> {
    const previousSettings = { ...this.currentSettings }
    
    // Validate crossfade settings
    const validatedCrossfade = this.config.validateSettings 
      ? this.validateSettings({ crossfade: crossfadeSettings }).crossfade || crossfadeSettings
      : crossfadeSettings

    this.currentSettings.crossfade = {
      ...this.currentSettings.crossfade,
      ...validatedCrossfade,
    }

    this.emitChangeEvent('crossfade', { crossfade: this.currentSettings.crossfade }, previousSettings)

    if (this.config.autoSave) {
      this.debouncedSave()
    }
  }

  /**
   * Update gapless settings
   */
  async updateGaplessSettings(gaplessSettings: Partial<GaplessSettings>): Promise<void> {
    const previousSettings = { ...this.currentSettings }
    
    // Validate gapless settings
    const validatedGapless = this.config.validateSettings 
      ? this.validateSettings({ gapless: gaplessSettings }).gapless || gaplessSettings
      : gaplessSettings

    this.currentSettings.gapless = {
      ...this.currentSettings.gapless,
      ...validatedGapless,
    }

    this.emitChangeEvent('gapless', { gapless: this.currentSettings.gapless }, previousSettings)

    if (this.config.autoSave) {
      this.debouncedSave()
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetToDefaults(): Promise<void> {
    const previousSettings = { ...this.currentSettings }
    this.currentSettings = { ...this.config.defaultSettings }

    this.emitChangeEvent('all', this.currentSettings, previousSettings)

    if (this.config.autoSave) {
      await this.saveSettingsToStorage()
    }
  }

  /**
   * Reset specific setting category
   */
  async resetCategory(category: 'eq' | 'crossfade' | 'gapless'): Promise<void> {
    const previousSettings = { ...this.currentSettings }
    const defaultSettings = this.config.defaultSettings

    switch (category) {
      case 'eq':
        this.currentSettings.eq = { ...defaultSettings.eq }
        break
      case 'crossfade':
        this.currentSettings.crossfade = { ...defaultSettings.crossfade }
        break
      case 'gapless':
        this.currentSettings.gapless = { ...defaultSettings.gapless }
        break
    }

    this.emitChangeEvent(category, this.currentSettings, previousSettings)

    if (this.config.autoSave) {
      this.debouncedSave()
    }
  }

  /**
   * Export settings for backup
   */
  async exportSettings(): Promise<string> {
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: this.currentSettings,
    }, null, 2)
  }

  /**
   * Import settings from backup
   */
  async importSettings(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData)
      
      if (!data.settings) {
        throw new Error('Invalid settings data')
      }

      const previousSettings = { ...this.currentSettings }
      
      if (this.config.validateSettings) {
        this.currentSettings = this.mergeWithDefaults(data.settings)
      } else {
        this.currentSettings = { ...this.config.defaultSettings, ...data.settings }
      }

      this.emitChangeEvent('all', this.currentSettings, previousSettings)

      if (this.config.autoSave) {
        await this.saveSettingsToStorage()
      }

    } catch (error) {
      console.error('Failed to import settings:', error)
      throw error
    }
  }

  /**
   * Get settings statistics
   */
  getSettingsStats(): {
    isInitialized: boolean
    hasCustomSettings: boolean
    lastModified: Date | null
    settingsSize: number
    categories: {
      eq: boolean
      crossfade: boolean
      gapless: boolean
    }
  } {
    const defaultSettings = this.config.defaultSettings
    const hasCustomSettings = JSON.stringify(this.currentSettings) !== JSON.stringify(defaultSettings)
    
    return {
      isInitialized: this.isInitialized,
      hasCustomSettings,
      lastModified: this.isInitialized ? new Date() : null,
      settingsSize: JSON.stringify(this.currentSettings).length,
      categories: {
        eq: JSON.stringify(this.currentSettings.eq) !== JSON.stringify(defaultSettings.eq),
        crossfade: JSON.stringify(this.currentSettings.crossfade) !== JSON.stringify(defaultSettings.crossfade),
        gapless: JSON.stringify(this.currentSettings.gapless) !== JSON.stringify(defaultSettings.gapless),
      },
    }
  }

  /**
   * Add event listener
   */
  addEventListener(eventType: string, listener: (event: AudioSettingsChangeEvent) => void): void {
    this.listeners.set(eventType, listener)
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType: string): void {
    this.listeners.delete(eventType)
  }

  /**
   * Get default settings
   */
  private getDefaultSettings(): AudioSettings {
    return {
      volume: 0.8,
      muted: false,
      eq: {
        enabled: false,
        low: 0,
        mid: 0,
        high: 0,
        preset: 'flat',
      },
      crossfade: {
        enabled: false,
        duration: 3000,
        fadeIn: true,
        fadeOut: true,
        curve: 'linear',
      },
      gapless: {
        enabled: true,
        preloadNext: true,
        preloadDuration: 10000,
        bufferSize: 30,
      },
      normalization: {
        enabled: true,
        targetLufs: -14,
        preventClipping: true,
      },
      spatial: {
        enabled: false,
        mode: 'stereo',
        intensity: 0.5,
      },
      advanced: {
        sampleRate: 44100,
        bitDepth: 16,
        channels: 2,
        bufferSize: 4096,
        latency: 'low',
      },
    }
  }

  /**
   * Validate settings
   */
  private validateSettings(settings: Partial<AudioSettings>): Partial<AudioSettings> {
    const validated: Partial<AudioSettings> = {}

    // Validate volume
    if (settings.volume !== undefined) {
      validated.volume = Math.max(0, Math.min(1, settings.volume))
    }

    // Validate muted
    if (settings.muted !== undefined) {
      validated.muted = Boolean(settings.muted)
    }

    // Validate EQ settings
    if (settings.eq) {
      validated.eq = {
        enabled: Boolean(settings.eq.enabled),
        low: Math.max(-12, Math.min(12, settings.eq.low || 0)),
        mid: Math.max(-12, Math.min(12, settings.eq.mid || 0)),
        high: Math.max(-12, Math.min(12, settings.eq.high || 0)),
        preset: settings.eq.preset || 'flat',
      }
    }

    // Validate crossfade settings
    if (settings.crossfade) {
      validated.crossfade = {
        enabled: Boolean(settings.crossfade.enabled),
        duration: Math.max(0, Math.min(10000, settings.crossfade.duration || 3000)),
        fadeIn: Boolean(settings.crossfade.fadeIn),
        fadeOut: Boolean(settings.crossfade.fadeOut),
        curve: settings.crossfade.curve || 'linear',
      }
    }

    // Validate gapless settings
    if (settings.gapless) {
      validated.gapless = {
        enabled: Boolean(settings.gapless.enabled),
        preloadNext: Boolean(settings.gapless.preloadNext),
        preloadDuration: Math.max(1000, Math.min(30000, settings.gapless.preloadDuration || 10000)),
        bufferSize: Math.max(10, Math.min(60, settings.gapless.bufferSize || 30)),
      }
    }

    // Validate normalization settings
    if (settings.normalization) {
      validated.normalization = {
        enabled: Boolean(settings.normalization.enabled),
        targetLufs: Math.max(-23, Math.min(-1, settings.normalization.targetLufs || -14)),
        preventClipping: Boolean(settings.normalization.preventClipping),
      }
    }

    // Validate spatial settings
    if (settings.spatial) {
      validated.spatial = {
        enabled: Boolean(settings.spatial.enabled),
        mode: settings.spatial.mode || 'stereo',
        intensity: Math.max(0, Math.min(1, settings.spatial.intensity || 0.5)),
      }
    }

    // Validate advanced settings
    if (settings.advanced) {
      validated.advanced = {
        sampleRate: [44100, 48000, 88200, 96000].includes(settings.advanced.sampleRate || 44100) 
          ? settings.advanced.sampleRate 
          : 44100,
        bitDepth: [16, 24, 32].includes(settings.advanced.bitDepth || 16) 
          ? settings.advanced.bitDepth 
          : 16,
        channels: Math.max(1, Math.min(8, settings.advanced.channels || 2)),
        bufferSize: [1024, 2048, 4096, 8192].includes(settings.advanced.bufferSize || 4096)
          ? settings.advanced.bufferSize
          : 4096,
        latency: ['low', 'medium', 'high'].includes(settings.advanced.latency || 'low')
          ? settings.advanced.latency
          : 'low',
      }
    }

    return validated
  }

  /**
   * Merge settings with defaults
   */
  private mergeWithDefaults(settings: Partial<AudioSettings>): AudioSettings {
    const defaults = this.config.defaultSettings
    
    return {
      volume: settings.volume ?? defaults.volume,
      muted: settings.muted ?? defaults.muted,
      eq: { ...defaults.eq, ...settings.eq },
      crossfade: { ...defaults.crossfade, ...settings.crossfade },
      gapless: { ...defaults.gapless, ...settings.gapless },
      normalization: { ...defaults.normalization, ...settings.normalization },
      spatial: { ...defaults.spatial, ...settings.spatial },
      advanced: { ...defaults.advanced, ...settings.advanced },
    }
  }

  /**
   * Load settings from storage
   */
  private async loadSettingsFromStorage(): Promise<AudioSettings | null> {
    try {
      const audioSettings = loadAudioSettings()
      const eqSettings = loadEQSettings()
      const crossfadeSettings = loadCrossfadeSettings()
      const gaplessSettings = loadGaplessSettings()

      if (!audioSettings && !eqSettings && !crossfadeSettings && !gaplessSettings) {
        return null
      }

      return {
        volume: audioSettings?.volume ?? this.config.defaultSettings.volume,
        muted: audioSettings?.muted ?? this.config.defaultSettings.muted,
        eq: eqSettings ?? this.config.defaultSettings.eq,
        crossfade: crossfadeSettings ?? this.config.defaultSettings.crossfade,
        gapless: gaplessSettings ?? this.config.defaultSettings.gapless,
        normalization: audioSettings?.normalization ?? this.config.defaultSettings.normalization,
        spatial: audioSettings?.spatial ?? this.config.defaultSettings.spatial,
        advanced: audioSettings?.advanced ?? this.config.defaultSettings.advanced,
      }

    } catch (error) {
      console.error('Failed to load settings from storage:', error)
      return null
    }
  }

  /**
   * Save settings to storage
   */
  private async saveSettingsToStorage(): Promise<void> {
    try {
      // Save individual components
      saveAudioSettings({
        volume: this.currentSettings.volume,
        muted: this.currentSettings.muted,
        normalization: this.currentSettings.normalization,
        spatial: this.currentSettings.spatial,
        advanced: this.currentSettings.advanced,
      })

      saveEQSettings(this.currentSettings.eq)
      saveCrossfadeSettings(this.currentSettings.crossfade)
      saveGaplessSettings(this.currentSettings.gapless)

    } catch (error) {
      console.error('Failed to save settings to storage:', error)
      throw error
    }
  }

  /**
   * Debounced save
   */
  private debouncedSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }

    this.saveTimer = setTimeout(() => {
      this.saveSettingsToStorage().catch(error => {
        console.error('Auto-save failed:', error)
      })
    }, this.config.saveInterval)
  }

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer)
    }

    this.saveTimer = setInterval(() => {
      // Auto-save will be triggered by debouncedSave
    }, this.config.saveInterval)
  }

  /**
   * Stop auto-save timer
   */
  private stopAutoSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
  }

  /**
   * Emit change event
   */
  private emitChangeEvent(
    type: AudioSettingsChangeEvent['type'],
    settings: Partial<AudioSettings>,
    previousSettings: Partial<AudioSettings>
  ): void {
    const event: AudioSettingsChangeEvent = {
      type,
      settings,
      previousSettings,
      timestamp: Date.now(),
    }

    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in settings change listener:', error)
      }
    })
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AudioSettingsManagerConfig>): void {
    const oldAutoSave = this.config.autoSave
    this.config = { ...this.config, ...newConfig }

    if (oldAutoSave !== this.config.autoSave) {
      if (this.config.autoSave) {
        this.startAutoSave()
      } else {
        this.stopAutoSave()
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AudioSettingsManagerConfig {
    return { ...this.config }
  }

  /**
   * Force save current settings
   */
  async forceSave(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }

    await this.saveSettingsToStorage()
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    this.stopAutoSave()
    this.listeners.clear()
    this.isInitialized = false
  }
}

// Export singleton instance
export const audioSettingsManager = new AudioSettingsManager()
