/**
 * Simplified unit tests for DRM integration
 */

import { DRMIntegration, DRMIntegrationFactory, DRMPlaybackContext, DRMPlaybackResult } from './drm-integration'
import { LicenseManager, LicenseRequest, LicenseResponse, LicenseInfo, LicenseType, LicenseStatus, DRMProvider } from './license-manager'
import { PlaybackController } from '@/lib/audio/playback-controller'
import { Track } from '@/lib/types'

// Mock LicenseManager
jest.mock('./license-manager')
const MockLicenseManager = LicenseManager as jest.MockedClass<typeof LicenseManager>

// Mock PlaybackController
jest.mock('@/lib/audio/playback-controller')
const MockPlaybackController = PlaybackController as jest.MockedClass<typeof PlaybackController>

// Mock error handler
jest.mock('@/lib/error/error-handler', () => ({
  errorHandler: {
    handleError: jest.fn(),
  },
}))

describe('DRMIntegration', () => {
  let mockLicenseManager: jest.Mocked<LicenseManager>
  let mockPlaybackController: jest.Mocked<PlaybackController>
  let drmIntegration: DRMIntegration

  const mockTrack: Track = {
    id: 'track-1',
    title: 'Test Track',
    artists: [{ id: 'artist-1', name: 'Test Artist' }],
    album: {
      id: 'album-1',
      title: 'Test Album',
      artist: 'Test Artist',
      artwork: 'test-artwork.jpg',
      year: 2024,
      trackCount: 10
    },
    durationMs: 180000,
    artwork: 'test-artwork.jpg',
    previewUrl: 'test-preview.mp3'
  }

  const mockContext: DRMPlaybackContext = {
    trackId: 'track-1',
    userId: 'user-1',
    deviceId: 'device-1',
    region: 'US',
    quality: 'high',
    isOffline: false,
    licenseType: 'streaming'
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Create mock instances
    mockLicenseManager = {
      getLicense: jest.fn(),
      requestLicense: jest.fn(),
      validateLicense: jest.fn(),
      recordPlay: jest.fn(),
      revokeLicense: jest.fn(),
      getViolations: jest.fn().mockReturnValue([]),
      clearOldViolations: jest.fn()
    } as any

    mockPlaybackController = {
      play: jest.fn().mockResolvedValue(undefined),
      isReady: jest.fn().mockReturnValue(true)
    } as any

    drmIntegration = new DRMIntegration(mockLicenseManager, mockPlaybackController)
  })

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(drmIntegration.initialize()).resolves.not.toThrow()
      expect(drmIntegration.isReady()).toBe(true)
    })

    it('should throw error if not initialized', async () => {
      const context: DRMPlaybackContext = {
        trackId: 'track-1',
        userId: 'user-1',
        deviceId: 'device-1',
        region: 'US',
        quality: 'high',
        isOffline: false,
        licenseType: 'streaming'
      }

      await expect(drmIntegration.requestPlaybackPermission(context)).rejects.toThrow('DRM integration not initialized')
    })
  })

  describe('Playback Permission Requests', () => {
    beforeEach(async () => {
      await drmIntegration.initialize()
    })

    it('should grant permission for valid existing license', async () => {
      const mockLicense: LicenseInfo = {
        id: 'license-1',
        trackId: 'track-1',
        type: 'streaming' as LicenseType,
        status: 'valid' as LicenseStatus,
        provider: 'none' as DRMProvider,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        maxPlays: 10,
        currentPlays: 0,
        isOfflineAllowed: true,
        isSharingAllowed: false,
        isRecordingAllowed: false,
        qualityRestrictions: ['high'],
        regionRestrictions: ['US'],
        deviceRestrictions: [],
        metadata: {}
      }

      mockLicenseManager.getLicense.mockReturnValue(mockLicense)
      mockLicenseManager.validateLicense.mockResolvedValue({ valid: true })

      const result = await drmIntegration.requestPlaybackPermission(mockContext)

      expect(result.success).toBe(true)
      expect(result.canPlay).toBe(true)
      expect(mockLicenseManager.getLicense).toHaveBeenCalledWith('track-1')
      expect(mockLicenseManager.validateLicense).toHaveBeenCalledWith('track-1', {
        deviceId: 'device-1',
        userId: 'user-1',
        region: 'US',
        quality: 'high',
        isOffline: false
      })
    })

    it('should deny permission for invalid existing license', async () => {
      const mockLicense: LicenseInfo = {
        id: 'license-1',
        trackId: 'track-1',
        type: 'streaming' as LicenseType,
        status: 'expired' as LicenseStatus,
        provider: 'none' as DRMProvider,
        issuedAt: Date.now() - 3600000,
        expiresAt: Date.now() - 1000,
        maxPlays: 10,
        currentPlays: 0,
        isOfflineAllowed: true,
        isSharingAllowed: false,
        isRecordingAllowed: false,
        qualityRestrictions: ['high'],
        regionRestrictions: ['US'],
        deviceRestrictions: [],
        metadata: {}
      }

      mockLicenseManager.getLicense.mockReturnValue(mockLicense)
      mockLicenseManager.validateLicense.mockResolvedValue({
        valid: false,
        violation: {
          id: 'violation-1',
          type: 'license_expired',
          severity: 'high',
          trackId: 'track-1',
          userId: 'user-1',
          deviceId: 'device-1',
          timestamp: Date.now(),
          description: 'License expired',
          metadata: {}
        }
      })

      const result = await drmIntegration.requestPlaybackPermission(mockContext)

      expect(result.success).toBe(false)
      expect(result.canPlay).toBe(false)
      expect(result.violation?.type).toBe('license_expired')
    })

    it('should request new license when none exists', async () => {
      const mockLicenseResponse: LicenseResponse = {
        success: true,
        license: {
          id: 'license-1',
          trackId: 'track-1',
          type: 'streaming' as LicenseType,
          status: 'valid' as LicenseStatus,
          provider: 'none' as DRMProvider,
          issuedAt: Date.now(),
          expiresAt: Date.now() + 3600000,
          maxPlays: 10,
          currentPlays: 0,
          isOfflineAllowed: true,
          isSharingAllowed: false,
          isRecordingAllowed: false,
          qualityRestrictions: ['high'],
          regionRestrictions: ['US'],
          deviceRestrictions: [],
          metadata: {}
        }
      }

      mockLicenseManager.getLicense.mockReturnValue(null)
      mockLicenseManager.requestLicense.mockResolvedValue(mockLicenseResponse)

      const result = await drmIntegration.requestPlaybackPermission(mockContext)

      expect(result.success).toBe(true)
      expect(result.canPlay).toBe(true)
      expect(mockLicenseManager.requestLicense).toHaveBeenCalledWith({
        trackId: 'track-1',
        licenseType: 'streaming',
        deviceId: 'device-1',
        userId: 'user-1',
        region: 'US',
        quality: 'high',
        offlineRequested: false,
        metadata: expect.objectContaining({
          userAgent: expect.any(String),
          timestamp: expect.any(Number)
        })
      })
    })

    it('should handle license request failures', async () => {
      const mockLicenseResponse: LicenseResponse = {
        success: false,
        license: null,
        error: 'License server error',
        requiresPayment: true
      }

      mockLicenseManager.getLicense.mockReturnValue(null)
      mockLicenseManager.requestLicense.mockResolvedValue(mockLicenseResponse)

      const result = await drmIntegration.requestPlaybackPermission(mockContext)

      expect(result.success).toBe(false)
      expect(result.canPlay).toBe(false)
      expect(result.error).toBe('License server error')
      expect(result.requiresPayment).toBe(true)
    })
  })

  describe('Track Playback', () => {
    beforeEach(async () => {
      await drmIntegration.initialize()
    })

    it('should play track with valid license', async () => {
      const mockLicense: LicenseInfo = {
        id: 'license-1',
        trackId: 'track-1',
        type: 'streaming' as LicenseType,
        status: 'valid' as LicenseStatus,
        provider: 'none' as DRMProvider,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        maxPlays: 10,
        currentPlays: 0,
        isOfflineAllowed: true,
        isSharingAllowed: false,
        isRecordingAllowed: false,
        qualityRestrictions: ['high'],
        regionRestrictions: ['US'],
        deviceRestrictions: [],
        metadata: {}
      }

      mockLicenseManager.getLicense.mockReturnValue(mockLicense)
      mockLicenseManager.validateLicense.mockResolvedValue({ valid: true })
      mockPlaybackController.play.mockResolvedValue(undefined)
      mockLicenseManager.recordPlay.mockResolvedValue(undefined)

      const result = await drmIntegration.playTrack(mockTrack, mockContext)

      expect(result.success).toBe(true)
      expect(result.canPlay).toBe(true)
      expect(mockPlaybackController.play).toHaveBeenCalledWith(mockTrack)
      expect(mockLicenseManager.recordPlay).toHaveBeenCalledWith('track-1', {
        deviceId: 'device-1',
        userId: 'user-1',
        duration: 180000,
        quality: 'high'
      })
    })

    it('should block playback for invalid license', async () => {
      mockLicenseManager.getLicense.mockReturnValue(null)
      mockLicenseManager.requestLicense.mockResolvedValue({
        success: false,
        license: null,
        error: 'License denied'
      })

      const result = await drmIntegration.playTrack(mockTrack, mockContext)

      expect(result.success).toBe(false)
      expect(result.canPlay).toBe(false)
      expect(result.error).toBe('License denied')
      expect(mockPlaybackController.play).not.toHaveBeenCalled()
    })

    it('should handle playback errors', async () => {
      const mockLicense: LicenseInfo = {
        id: 'license-1',
        trackId: 'track-1',
        type: 'streaming' as LicenseType,
        status: 'valid' as LicenseStatus,
        provider: 'none' as DRMProvider,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        maxPlays: 10,
        currentPlays: 0,
        isOfflineAllowed: true,
        isSharingAllowed: false,
        isRecordingAllowed: false,
        qualityRestrictions: ['high'],
        regionRestrictions: ['US'],
        deviceRestrictions: [],
        metadata: {}
      }

      mockLicenseManager.getLicense.mockReturnValue(mockLicense)
      mockLicenseManager.validateLicense.mockResolvedValue({ valid: true })
      mockPlaybackController.play.mockRejectedValue(new Error('Playback failed'))

      const result = await drmIntegration.playTrack(mockTrack, mockContext)

      expect(result.success).toBe(false)
      expect(result.canPlay).toBe(false)
      expect(result.error).toBe('Playback failed')
    })
  })

  describe('Offline Playback', () => {
    beforeEach(async () => {
      await drmIntegration.initialize()
    })

    it('should check offline playback capability', async () => {
      const mockLicense: LicenseInfo = {
        id: 'license-1',
        trackId: 'track-1',
        type: 'streaming' as LicenseType,
        status: 'valid' as LicenseStatus,
        provider: 'none' as DRMProvider,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        maxPlays: 10,
        currentPlays: 0,
        isOfflineAllowed: true,
        isSharingAllowed: false,
        isRecordingAllowed: false,
        qualityRestrictions: ['high'],
        regionRestrictions: ['US'],
        deviceRestrictions: [],
        metadata: {}
      }

      mockLicenseManager.getLicense.mockReturnValue(mockLicense)
      mockLicenseManager.validateLicense.mockResolvedValue({ valid: true })

      const canPlayOffline = await drmIntegration.canPlayOffline('track-1', {
        trackId: 'track-1',
        userId: 'user-1',
        deviceId: 'device-1',
        region: 'US',
        quality: 'high',
        licenseType: 'streaming'
      })

      expect(canPlayOffline).toBe(true)
      expect(mockLicenseManager.validateLicense).toHaveBeenCalledWith('track-1', {
        trackId: 'track-1',
        userId: 'user-1',
        deviceId: 'device-1',
        region: 'US',
        quality: 'high',
        licenseType: 'streaming',
        isOffline: true
      })
    })

    it('should request offline download permission', async () => {
      const mockLicenseResponse: LicenseResponse = {
        success: true,
        license: {
          id: 'license-1',
          trackId: 'track-1',
          type: 'offline' as LicenseType,
          status: 'valid' as LicenseStatus,
          provider: 'none' as DRMProvider,
          issuedAt: Date.now(),
          expiresAt: Date.now() + 3600000,
          maxPlays: 10,
          currentPlays: 0,
          isOfflineAllowed: true,
          isSharingAllowed: false,
          isRecordingAllowed: false,
          qualityRestrictions: ['high'],
          regionRestrictions: ['US'],
          deviceRestrictions: [],
          metadata: {}
        }
      }

      mockLicenseManager.requestLicense.mockResolvedValue(mockLicenseResponse)

      const result = await drmIntegration.downloadForOffline(mockTrack, {
        trackId: 'track-1',
        userId: 'user-1',
        deviceId: 'device-1',
        region: 'US',
        quality: 'high'
      })

      expect(result.success).toBe(true)
      expect(result.canPlay).toBe(true)
      expect(mockLicenseManager.requestLicense).toHaveBeenCalledWith({
        trackId: 'track-1',
        licenseType: 'offline',
        deviceId: 'device-1',
        userId: 'user-1',
        region: 'US',
        quality: 'high',
        offlineRequested: true,
        metadata: expect.any(Object)
      })
    })
  })

  describe('License Management', () => {
    beforeEach(async () => {
      await drmIntegration.initialize()
    })

    it('should get license information', () => {
      const mockLicense: LicenseInfo = {
        id: 'license-1',
        trackId: 'track-1',
        type: 'streaming' as LicenseType,
        status: 'valid' as LicenseStatus,
        provider: 'none' as DRMProvider,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        maxPlays: 10,
        currentPlays: 0,
        isOfflineAllowed: true,
        isSharingAllowed: false,
        isRecordingAllowed: false,
        qualityRestrictions: ['high'],
        regionRestrictions: ['US'],
        deviceRestrictions: [],
        metadata: {}
      }

      mockLicenseManager.getLicense.mockReturnValue(mockLicense)

      const license = drmIntegration.getLicenseInfo('track-1')
      expect(license).toBe(mockLicense)
    })

    it('should get violations', () => {
      const mockViolations = [{
        id: 'violation-1',
        type: 'license_expired' as const,
        severity: 'high' as const,
        trackId: 'track-1',
        userId: 'user-1',
        deviceId: 'device-1',
        timestamp: Date.now(),
        description: 'License expired',
        metadata: {}
      }]

      mockLicenseManager.getViolations.mockReturnValue(mockViolations)

      const violations = drmIntegration.getViolations()
      expect(violations).toBe(mockViolations)
    })

    it('should clear old violations', () => {
      drmIntegration.clearOldViolations(3600000)
      expect(mockLicenseManager.clearOldViolations).toHaveBeenCalledWith(3600000)
    })

    it('should revoke license', async () => {
      mockLicenseManager.revokeLicense.mockResolvedValue(undefined)

      await drmIntegration.revokeLicense('track-1', 'User violation')
      expect(mockLicenseManager.revokeLicense).toHaveBeenCalledWith('track-1', 'User violation')
    })
  })

  describe('Event Handling', () => {
    beforeEach(async () => {
      await drmIntegration.initialize()
    })

    it('should handle events', () => {
      const callback = jest.fn()
      
      drmIntegration.on('licenseRequested', callback)
      drmIntegration.emit('licenseRequested', { context: mockContext })
      
      expect(callback).toHaveBeenCalledWith({
        type: 'licenseRequested',
        data: { context: mockContext },
        timestamp: expect.any(Number)
      })
    })

    it('should remove event listeners', () => {
      const callback = jest.fn()
      
      drmIntegration.on('licenseRequested', callback)
      drmIntegration.off('licenseRequested', callback)
      drmIntegration.emit('licenseRequested', { context: mockContext })
      
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('Context Management', () => {
    beforeEach(async () => {
      await drmIntegration.initialize()
    })

    it('should track current context', async () => {
      const mockLicense: LicenseInfo = {
        id: 'license-1',
        trackId: 'track-1',
        type: 'streaming' as LicenseType,
        status: 'valid' as LicenseStatus,
        provider: 'none' as DRMProvider,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        maxPlays: 10,
        currentPlays: 0,
        isOfflineAllowed: true,
        isSharingAllowed: false,
        isRecordingAllowed: false,
        qualityRestrictions: ['high'],
        regionRestrictions: ['US'],
        deviceRestrictions: [],
        metadata: {}
      }

      mockLicenseManager.getLicense.mockReturnValue(mockLicense)
      mockLicenseManager.validateLicense.mockResolvedValue({ valid: true })

      await drmIntegration.requestPlaybackPermission(mockContext)
      
      const currentContext = drmIntegration.getCurrentContext()
      expect(currentContext).toEqual(mockContext)
    })
  })
})

describe('DRMIntegrationFactory', () => {
  it('should create DRM integration instance', () => {
    const mockLicenseManager = {} as any
    const mockPlaybackController = {} as any

    const integration = DRMIntegrationFactory.create(mockLicenseManager, mockPlaybackController)
    expect(integration).toBeInstanceOf(DRMIntegration)
  })
})
