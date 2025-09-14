/**
 * Simplified unit tests for audio settings manager
 */

import { AudioSettingsManager } from './audio-settings'
import type { AudioSettings, EQSettings, CrossfadeSettings, GaplessSettings } from '@/lib/types'

// Mock localStorage functions
jest.mock('@/lib/storage/localStorage', () => ({
  saveAudioSettings: jest.fn(),
  loadAudioSettings: jest.fn(() => null),
  saveEQSettings: jest.fn(),
  loadEQSettings: jest.fn(() => null),
  saveCrossfadeSettings: jest.fn(),
  loadCrossfadeSettings: jest.fn(() => null),
  saveGaplessSettings: jest.fn(),
  loadGaplessSettings: jest.fn(() => null),
  STORAGE_KEYS: {
    AUDIO: 'streamcast_audio',
    EQ: 'streamcast_eq',
    CROSSFADE: 'streamcast_crossfade',
    GAPLESS: 'streamcast_gapless',
  },
}))

describe('AudioSettingsManager', () => {
  let settingsManager: AudioSettingsManager

  beforeEach(() => {
    jest.clearAllMocks()
    settingsManager = new AudioSettingsManager({
      autoSave: false, // Disable auto-save for tests
      validateSettings: true,
    })
  })

  afterEach(() => {
    settingsManager.destroy()
  })

  describe('Initialization', () => {
    it('should initialize with default settings', async () => {
      await settingsManager.initialize()
      
      const settings = settingsManager.getSettings()
      
      expect(settings.volume).toBe(0.8)
      expect(settings.muted).toBe(false)
      expect(settings.eq.enabled).toBe(false)
      expect(settings.crossfade.enabled).toBe(false)
      expect(settings.gapless.enabled).toBe(true)
    })

    it('should accept custom configuration', () => {
      const customManager = new AudioSettingsManager({
        autoSave: true,
        saveInterval: 1000,
        validateSettings: false,
      })

      const config = customManager.getConfig()
      
      expect(config.autoSave).toBe(true)
      expect(config.saveInterval).toBe(1000)
      expect(config.validateSettings).toBe(false)
    })
  })

  describe('Settings Updates', () => {
    beforeEach(async () => {
      await settingsManager.initialize()
    })

    it('should update general settings', async () => {
      await settingsManager.updateSettings({
        volume: 0.5,
        muted: true,
      })

      const settings = settingsManager.getSettings()
      
      expect(settings.volume).toBe(0.5)
      expect(settings.muted).toBe(true)
    })

    it('should update EQ settings', async () => {
      const eqSettings: Partial<EQSettings> = {
        enabled: true,
        low: 3,
        mid: -1,
        high: 2,
        preset: 'bass',
      }

      await settingsManager.updateEQSettings(eqSettings)

      const settings = settingsManager.getSettings()
      
      expect(settings.eq.enabled).toBe(true)
      expect(settings.eq.low).toBe(3)
      expect(settings.eq.mid).toBe(-1)
      expect(settings.eq.high).toBe(2)
      expect(settings.eq.preset).toBe('bass')
    })

    it('should update crossfade settings', async () => {
      const crossfadeSettings: Partial<CrossfadeSettings> = {
        enabled: true,
        duration: 5000,
        fadeIn: true,
        fadeOut: false,
        curve: 'exponential',
      }

      await settingsManager.updateCrossfadeSettings(crossfadeSettings)

      const settings = settingsManager.getSettings()
      
      expect(settings.crossfade.enabled).toBe(true)
      expect(settings.crossfade.duration).toBe(5000)
      expect(settings.crossfade.fadeIn).toBe(true)
      expect(settings.crossfade.fadeOut).toBe(false)
      expect(settings.crossfade.curve).toBe('exponential')
    })

    it('should update gapless settings', async () => {
      const gaplessSettings: Partial<GaplessSettings> = {
        enabled: false,
        preloadNext: false,
        preloadDuration: 15000,
        bufferSize: 45,
      }

      await settingsManager.updateGaplessSettings(gaplessSettings)

      const settings = settingsManager.getSettings()
      
      expect(settings.gapless.enabled).toBe(false)
      expect(settings.gapless.preloadNext).toBe(false)
      expect(settings.gapless.preloadDuration).toBe(15000)
      expect(settings.gapless.bufferSize).toBe(45)
    })
  })

  describe('Settings Validation', () => {
    beforeEach(async () => {
      await settingsManager.initialize()
    })

    it('should validate volume range', async () => {
      await settingsManager.updateSettings({ volume: 1.5 })
      expect(settingsManager.getSettings().volume).toBe(1)

      await settingsManager.updateSettings({ volume: -0.5 })
      expect(settingsManager.getSettings().volume).toBe(0)
    })

    it('should validate EQ range', async () => {
      await settingsManager.updateEQSettings({ low: 15 })
      expect(settingsManager.getSettings().eq.low).toBe(12)

      await settingsManager.updateEQSettings({ low: -15 })
      expect(settingsManager.getSettings().eq.low).toBe(-12)
    })

    it('should validate crossfade duration', async () => {
      await settingsManager.updateCrossfadeSettings({ duration: 15000 })
      expect(settingsManager.getSettings().crossfade.duration).toBe(10000)

      await settingsManager.updateCrossfadeSettings({ duration: -1000 })
      expect(settingsManager.getSettings().crossfade.duration).toBe(0)
    })

    it('should validate gapless settings', async () => {
      await settingsManager.updateGaplessSettings({ preloadDuration: 50000 })
      expect(settingsManager.getSettings().gapless.preloadDuration).toBe(30000)

      await settingsManager.updateGaplessSettings({ bufferSize: 100 })
      expect(settingsManager.getSettings().gapless.bufferSize).toBe(60)
    })
  })

  describe('Reset Functionality', () => {
    beforeEach(async () => {
      await settingsManager.initialize()
    })

    it('should reset all settings to defaults', async () => {
      // Modify settings
      await settingsManager.updateSettings({ volume: 0.3, muted: true })
      await settingsManager.updateEQSettings({ enabled: true, low: 5 })

      // Reset to defaults
      await settingsManager.resetToDefaults()

      const settings = settingsManager.getSettings()
      
      expect(settings.volume).toBe(0.8)
      expect(settings.muted).toBe(false)
      expect(settings.eq.enabled).toBe(false)
      expect(settings.eq.low).toBe(0)
    })

    it('should reset specific category', async () => {
      // Modify EQ settings
      await settingsManager.updateEQSettings({ enabled: true, low: 5, preset: 'bass' })

      // Reset EQ category
      await settingsManager.resetCategory('eq')

      const settings = settingsManager.getSettings()
      
      expect(settings.eq.enabled).toBe(false)
      expect(settings.eq.low).toBe(0)
      expect(settings.eq.preset).toBe('flat')
    })
  })

  describe('Export/Import', () => {
    beforeEach(async () => {
      await settingsManager.initialize()
    })

    it('should export settings', async () => {
      const exported = await settingsManager.exportSettings()
      const parsed = JSON.parse(exported)
      
      expect(parsed.version).toBe('1.0')
      expect(parsed.settings).toBeDefined()
      expect(parsed.exportedAt).toBeDefined()
    })

    it('should import settings', async () => {
      const testSettings = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        settings: {
          volume: 0.6,
          muted: true,
          eq: {
            enabled: true,
            low: 2,
            mid: 0,
            high: 1,
            preset: 'rock',
          },
        },
      }

      await settingsManager.importSettings(JSON.stringify(testSettings))

      const settings = settingsManager.getSettings()
      
      expect(settings.volume).toBe(0.6)
      expect(settings.muted).toBe(true)
      expect(settings.eq.enabled).toBe(true)
      expect(settings.eq.low).toBe(2)
      expect(settings.eq.preset).toBe('rock')
    })

    it('should handle invalid import data', async () => {
      await expect(settingsManager.importSettings('invalid-json')).rejects.toThrow()
    })
  })

  describe('Statistics', () => {
    beforeEach(async () => {
      await settingsManager.initialize()
    })

    it('should get settings statistics', () => {
      const stats = settingsManager.getSettingsStats()
      
      expect(stats.isInitialized).toBe(true)
      expect(stats.hasCustomSettings).toBe(false) // Default settings
      expect(stats.lastModified).toBeDefined()
      expect(stats.settingsSize).toBeGreaterThan(0)
      expect(stats.categories.eq).toBe(false)
      expect(stats.categories.crossfade).toBe(false)
      expect(stats.categories.gapless).toBe(false)
    })

    it('should detect custom settings', async () => {
      await settingsManager.updateSettings({ volume: 0.5 })
      
      const stats = settingsManager.getSettingsStats()
      
      expect(stats.hasCustomSettings).toBe(true)
    })
  })

  describe('Event Listeners', () => {
    beforeEach(async () => {
      await settingsManager.initialize()
    })

    it('should add and remove event listeners', () => {
      const listener = jest.fn()
      
      settingsManager.addEventListener('test', listener)
      expect(settingsManager['listeners'].has('test')).toBe(true)
      
      settingsManager.removeEventListener('test')
      expect(settingsManager['listeners'].has('test')).toBe(false)
    })
  })

  describe('Configuration', () => {
    it('should update configuration', () => {
      settingsManager.updateConfig({
        autoSave: true,
        saveInterval: 5000,
      })

      const config = settingsManager.getConfig()
      
      expect(config.autoSave).toBe(true)
      expect(config.saveInterval).toBe(5000)
    })

    it('should get current configuration', () => {
      const config = settingsManager.getConfig()
      
      expect(config.autoSave).toBe(false)
      expect(config.validateSettings).toBe(true)
      expect(config.defaultSettings).toBeDefined()
    })
  })
})
