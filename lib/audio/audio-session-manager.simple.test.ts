/**
 * Simplified unit tests for audio session manager
 */

import { AudioSessionManager, AudioSessionState, AudioDeviceType, Platform } from './audio-session-manager'

// Mock MediaDevices API
const mockMediaDevices = {
  enumerateDevices: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}

// Mock AudioContext
const mockAudioContext = {
  state: 'running',
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}

// Mock MediaSession API
const mockMediaSession = {
  metadata: null,
  playbackState: 'none',
  setActionHandler: jest.fn()
}

// Mock navigator
Object.defineProperty(navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true
})

Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
  writable: true
})

// Mock window
Object.defineProperty(window, 'AudioContext', {
  value: jest.fn(() => mockAudioContext),
  writable: true
})

Object.defineProperty(window, 'webkitAudioContext', {
  value: jest.fn(() => mockAudioContext),
  writable: true
})

Object.defineProperty(navigator, 'mediaSession', {
  value: mockMediaSession,
  writable: true
})

// Mock document
Object.defineProperty(document, 'hidden', {
  value: false,
  writable: true
})

Object.defineProperty(document, 'addEventListener', {
  value: jest.fn(),
  writable: true
})

// Mock window events
Object.defineProperty(window, 'addEventListener', {
  value: jest.fn(),
  writable: true
})

describe('AudioSessionManager', () => {
  let sessionManager: AudioSessionManager

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock device enumeration
    mockMediaDevices.enumerateDevices.mockResolvedValue([
      {
        deviceId: 'default',
        kind: 'audiooutput',
        label: 'Default Audio Device'
      },
      {
        deviceId: 'device-1',
        kind: 'audiooutput',
        label: 'AirPods Pro'
      },
      {
        deviceId: 'device-2',
        kind: 'audiooutput',
        label: 'Bluetooth Headphones'
      }
    ])

    sessionManager = new AudioSessionManager()
  })

  afterEach(() => {
    if (sessionManager) {
      sessionManager.destroy()
    }
  })

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await sessionManager.initialize()

      expect(sessionManager.getState()).toBe('active')
      expect(sessionManager.getPlatform()).toBe('ios')
      expect(sessionManager.getCurrentDevice()).toBeTruthy()
      expect(sessionManager.getAvailableDevices().length).toBeGreaterThan(0)
    })

    it('should detect platform correctly', () => {
      // Test iOS detection
      expect(sessionManager.getPlatform()).toBe('ios')

      // Test Android detection
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36',
        writable: true
      })
      
      const androidManager = new AudioSessionManager()
      expect(androidManager.getPlatform()).toBe('android')
      androidManager.destroy()

      // Test Web detection
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        writable: true
      })
      
      const webManager = new AudioSessionManager()
      expect(webManager.getPlatform()).toBe('web')
      webManager.destroy()
    })

    it('should handle initialization errors', async () => {
      mockMediaDevices.enumerateDevices.mockRejectedValue(new Error('Device enumeration failed'))

      await expect(sessionManager.initialize()).rejects.toThrow('Device enumeration failed')
    })
  })

  describe('Device Management', () => {
    beforeEach(async () => {
      await sessionManager.initialize()
    })

    it('should detect device types correctly', () => {
      const devices = sessionManager.getAvailableDevices()
      
      const airpodsDevice = devices.find(d => d.name.includes('AirPods'))
      expect(airpodsDevice?.type).toBe('airpods')

      const bluetoothDevice = devices.find(d => d.name.includes('Bluetooth'))
      expect(bluetoothDevice?.type).toBe('bluetooth')
    })

    it('should provide device capabilities', () => {
      const devices = sessionManager.getAvailableDevices()
      const device = devices[0]

      expect(device.capabilities).toHaveProperty('canPlay')
      expect(device.capabilities).toHaveProperty('canPause')
      expect(device.capabilities).toHaveProperty('canSeek')
      expect(device.capabilities).toHaveProperty('canChangeVolume')
      expect(device.capabilities).toHaveProperty('supportsHighQuality')
      expect(device.capabilities).toHaveProperty('supportsSpatialAudio')
    })

    it('should apply device restrictions', () => {
      const devices = sessionManager.getAvailableDevices()
      const bluetoothDevice = devices.find(d => d.type === 'bluetooth')

      if (bluetoothDevice) {
        expect(bluetoothDevice.restrictions.maxVolume).toBe(0.8)
        expect(bluetoothDevice.restrictions.allowedQualities).toContain('low')
        expect(bluetoothDevice.restrictions.allowedQualities).toContain('medium')
        expect(bluetoothDevice.restrictions.blockedFeatures).toContain('spatial_audio')
      }
    })

    it('should check device permissions', () => {
      const devices = sessionManager.getAvailableDevices()
      const device = devices[0]

      expect(sessionManager.isDeviceAllowed(device)).toBe(true)
    })

    it('should handle device changes', async () => {
      const deviceChangeHandler = jest.fn()
      sessionManager.on('deviceChange', deviceChangeHandler)

      // Simulate device change
      mockMediaDevices.enumerateDevices.mockResolvedValue([
        {
          deviceId: 'device-3',
          kind: 'audiooutput',
          label: 'New Device'
        }
      ])

      await sessionManager['updateDeviceList']()

      expect(deviceChangeHandler).toHaveBeenCalled()
    })
  })

  describe('Session State Management', () => {
    beforeEach(async () => {
      await sessionManager.initialize()
    })

    it('should track session state changes', () => {
      const stateChangeHandler = jest.fn()
      sessionManager.on('stateChange', stateChangeHandler)

      sessionManager['setState']('suspended')

      expect(stateChangeHandler).toHaveBeenCalledWith({
        type: 'stateChange',
        data: {
          state: 'suspended',
          previousState: 'active'
        },
        timestamp: expect.any(Number)
      })
    })

    it('should handle interruptions', () => {
      const interruptionHandler = jest.fn()
      sessionManager.on('interruption', interruptionHandler)

      sessionManager['emit']('interruption', {
        reason: 'phoneCall',
        type: 'began',
        options: { shouldPause: true }
      })

      expect(interruptionHandler).toHaveBeenCalledWith({
        type: 'interruption',
        data: {
          reason: 'phoneCall',
          type: 'began',
          options: { shouldPause: true }
        },
        timestamp: expect.any(Number)
      })
    })

    it('should handle page visibility changes', () => {
      const interruptionHandler = jest.fn()
      sessionManager.on('interruption', interruptionHandler)

      // Simulate page hidden
      sessionManager['handlePageHidden']()

      expect(interruptionHandler).toHaveBeenCalledWith({
        type: 'interruption',
        data: {
          reason: 'systemAction',
          type: 'began',
          options: { shouldPause: true }
        },
        timestamp: expect.any(Number)
      })

      // Simulate page visible
      sessionManager['handlePageVisible']()

      expect(interruptionHandler).toHaveBeenCalledWith({
        type: 'interruption',
        data: {
          reason: 'systemAction',
          type: 'ended',
          options: { shouldResume: true }
        },
        timestamp: expect.any(Number)
      })
    })
  })

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig = {
        deviceRestrictions: {
          allowBluetooth: false,
          requireHighQuality: true
        }
      }

      sessionManager.updateConfig(newConfig)
      const config = sessionManager.getConfig()

      expect(config.deviceRestrictions.allowBluetooth).toBe(false)
      expect(config.deviceRestrictions.requireHighQuality).toBe(true)
    })

    it('should apply device restrictions from config', () => {
      sessionManager.updateConfig({
        deviceRestrictions: {
          allowBluetooth: false,
          requireHighQuality: true
        }
      })

      const devices = sessionManager.getAvailableDevices()
      const bluetoothDevice = devices.find(d => d.type === 'bluetooth')

      if (bluetoothDevice) {
        expect(sessionManager.isDeviceAllowed(bluetoothDevice)).toBe(false)
      }
    })
  })

  describe('Media Session (Web)', () => {
    beforeEach(async () => {
      // Set up web platform
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        writable: true
      })

      const webManager = new AudioSessionManager()
      await webManager.initialize()
      sessionManager = webManager
    })

    it('should set media session metadata', () => {
      const metadata = {
        title: 'Test Track',
        artist: 'Test Artist',
        album: 'Test Album'
      }

      sessionManager.setMediaSessionMetadata(metadata)

      expect(mockMediaSession.metadata).toBeInstanceOf(MediaMetadata)
    })

    it('should set media session playback state', () => {
      sessionManager.setMediaSessionPlaybackState('playing')

      expect(mockMediaSession.playbackState).toBe('playing')
    })

    it('should set up media session action handlers', () => {
      expect(mockMediaSession.setActionHandler).toHaveBeenCalledWith('play', expect.any(Function))
      expect(mockMediaSession.setActionHandler).toHaveBeenCalledWith('pause', expect.any(Function))
      expect(mockMediaSession.setActionHandler).toHaveBeenCalledWith('stop', expect.any(Function))
      expect(mockMediaSession.setActionHandler).toHaveBeenCalledWith('previoustrack', expect.any(Function))
      expect(mockMediaSession.setActionHandler).toHaveBeenCalledWith('nexttrack', expect.any(Function))
    })
  })

  describe('Event System', () => {
    beforeEach(async () => {
      await sessionManager.initialize()
    })

    it('should add and remove event listeners', () => {
      const handler = jest.fn()
      
      sessionManager.on('stateChange', handler)
      sessionManager['emit']('stateChange', { state: 'active' })
      
      expect(handler).toHaveBeenCalled()

      sessionManager.off('stateChange', handler)
      sessionManager['emit']('stateChange', { state: 'suspended' })
      
      expect(handler).toHaveBeenCalledTimes(1) // Should not be called again
    })

    it('should handle event listener errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error')
      })

      sessionManager.on('stateChange', errorHandler)
      sessionManager['emit']('stateChange', { state: 'active' })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in event listener'),
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Cleanup', () => {
    it('should destroy resources properly', async () => {
      await sessionManager.initialize()
      
      sessionManager.destroy()

      expect(mockAudioContext.close).toHaveBeenCalled()
      expect(sessionManager.getState()).toBe('inactive')
      expect(sessionManager.getCurrentDevice()).toBe(null)
      expect(sessionManager.getAvailableDevices()).toEqual([])
    })
  })

  describe('Platform-Specific Features', () => {
    it('should set up iOS features', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        writable: true
      })

      const iosManager = new AudioSessionManager()
      await iosManager.initialize()

      expect(iosManager.getPlatform()).toBe('ios')
      iosManager.destroy()
    })

    it('should set up Android features', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36',
        writable: true
      })

      const androidManager = new AudioSessionManager()
      await androidManager.initialize()

      expect(androidManager.getPlatform()).toBe('android')
      androidManager.destroy()
    })

    it('should set up web features', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        writable: true
      })

      const webManager = new AudioSessionManager()
      await webManager.initialize()

      expect(webManager.getPlatform()).toBe('web')
      webManager.destroy()
    })
  })

  describe('Error Handling', () => {
    it('should handle device enumeration errors', async () => {
      mockMediaDevices.enumerateDevices.mockRejectedValue(new Error('Permission denied'))

      await expect(sessionManager.initialize()).rejects.toThrow('Permission denied')
    })

    it('should handle audio context errors', async () => {
      const AudioContextMock = jest.fn(() => {
        throw new Error('Audio context creation failed')
      })
      
      Object.defineProperty(window, 'AudioContext', {
        value: AudioContextMock,
        writable: true
      })

      const errorManager = new AudioSessionManager()
      await errorManager.initialize() // Should not throw

      errorManager.destroy()
    })

    it('should emit error events', () => {
      const errorHandler = jest.fn()
      sessionManager.on('error', errorHandler)

      sessionManager['error']('Test error', new Error('Test error details'))

      expect(errorHandler).toHaveBeenCalledWith({
        type: 'error',
        data: {
          message: 'Test error',
          error: expect.any(Error)
        },
        timestamp: expect.any(Number)
      })
    })
  })
})
