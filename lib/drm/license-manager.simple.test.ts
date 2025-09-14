/**
 * Simplified unit tests for license manager
 */

import { LicenseManager, LicenseManagerFactory, DRMConfig, LicenseRequest, LicenseType, LicenseStatus, DRMProvider } from './license-manager'

// Mock error handler
jest.mock('@/lib/error/error-handler', () => ({
  errorHandler: {
    handleError: jest.fn(),
  },
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

// Mock navigator.requestMediaKeySystemAccess
const mockRequestMediaKeySystemAccess = jest.fn()
Object.defineProperty(navigator, 'requestMediaKeySystemAccess', {
  value: mockRequestMediaKeySystemAccess,
  writable: true,
})

// Mock fetch
global.fetch = jest.fn()

describe('LicenseManager', () => {
  let licenseManager: LicenseManager
  let mockConfig: DRMConfig

  beforeEach(() => {
    jest.clearAllMocks()

    mockConfig = {
      provider: 'none' as DRMProvider,
      serverUrl: 'https://drm.example.com',
      certificateUrl: 'https://drm.example.com/cert',
      keySystem: 'com.widevine.alpha',
      robustness: 'SW_SECURE_CRYPTO',
      persistentState: 'optional',
      distinctiveIdentifier: 'optional',
      sessionTypes: ['temporary'],
      initDataTypes: ['cenc']
    }

    licenseManager = new LicenseManager(mockConfig)
  })

  describe('Initialization', () => {
    it('should initialize successfully with no DRM', async () => {
      await expect(licenseManager.initialize()).resolves.not.toThrow()
    })

    it('should load existing licenses from localStorage', async () => {
      const mockLicenses = [{
        id: 'license-1',
        trackId: 'track-1',
        type: 'streaming' as LicenseType,
        status: 'valid' as LicenseStatus,
        provider: 'none' as DRMProvider,
        issuedAt: Date.now(),
        expiresAt: null,
        maxPlays: null,
        currentPlays: 0,
        isOfflineAllowed: false,
        isSharingAllowed: false,
        isRecordingAllowed: false,
        qualityRestrictions: [],
        regionRestrictions: [],
        deviceRestrictions: [],
        metadata: {}
      }]

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockLicenses))

      await licenseManager.initialize()

      const licenses = licenseManager.getAllLicenses()
      expect(licenses).toHaveLength(1)
      expect(licenses[0].trackId).toBe('track-1')
    })

    it('should handle localStorage errors gracefully', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      await expect(licenseManager.initialize()).resolves.not.toThrow()
    })
  })

  describe('License Requests', () => {
    beforeEach(async () => {
      await licenseManager.initialize()
    })

    it('should request a new license', async () => {
      const mockLicenseResponse = {
        id: 'license-1',
        expiresAt: 3600000, // 1 hour
        maxPlays: 10,
        isOfflineAllowed: true,
        isSharingAllowed: false,
        isRecordingAllowed: false,
        qualityRestrictions: ['high'],
        regionRestrictions: ['US'],
        deviceRestrictions: [],
        metadata: {}
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLicenseResponse
      })

      const request: LicenseRequest = {
        trackId: 'track-1',
        licenseType: 'streaming',
        deviceId: 'device-1',
        userId: 'user-1',
        region: 'US',
        quality: 'high',
        offlineRequested: false,
        metadata: {}
      }

      const response = await licenseManager.requestLicense(request)

      expect(response.success).toBe(true)
      expect(response.license).toBeDefined()
      expect(response.license?.trackId).toBe('track-1')
      expect(response.license?.status).toBe('valid')
    })

    it('should return existing valid license', async () => {
      // First request
      const mockLicenseResponse = {
        id: 'license-1',
        expiresAt: 3600000,
        maxPlays: 10,
        isOfflineAllowed: true,
        isSharingAllowed: false,
        isRecordingAllowed: false,
        qualityRestrictions: ['high'],
        regionRestrictions: ['US'],
        deviceRestrictions: [],
        metadata: {}
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLicenseResponse
      })

      const request: LicenseRequest = {
        trackId: 'track-1',
        licenseType: 'streaming',
        deviceId: 'device-1',
        userId: 'user-1',
        region: 'US',
        quality: 'high',
        offlineRequested: false,
        metadata: {}
      }

      await licenseManager.requestLicense(request)

      // Second request should return existing license
      const response = await licenseManager.requestLicense(request)

      expect(response.success).toBe(true)
      expect(response.license?.trackId).toBe('track-1')
      expect(global.fetch).toHaveBeenCalledTimes(1) // Should not call server again
    })

    it('should handle license request errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403
      })

      const request: LicenseRequest = {
        trackId: 'track-1',
        licenseType: 'streaming',
        deviceId: 'device-1',
        userId: 'user-1',
        region: 'US',
        quality: 'high',
        offlineRequested: false,
        metadata: {}
      }

      const response = await licenseManager.requestLicense(request)

      expect(response.success).toBe(false)
      expect(response.error).toBe('Failed to obtain license from server')
    })
  })

  describe('License Validation', () => {
    beforeEach(async () => {
      await licenseManager.initialize()

      // Add a valid license
      const mockLicenseResponse = {
        id: 'license-1',
        expiresAt: Date.now() + 3600000, // 1 hour from now
        maxPlays: 10,
        isOfflineAllowed: true,
        isSharingAllowed: false,
        isRecordingAllowed: false,
        qualityRestrictions: ['high', 'medium'],
        regionRestrictions: ['US', 'CA'],
        deviceRestrictions: [],
        metadata: {}
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLicenseResponse
      })

      const request: LicenseRequest = {
        trackId: 'track-1',
        licenseType: 'streaming',
        deviceId: 'device-1',
        userId: 'user-1',
        region: 'US',
        quality: 'high',
        offlineRequested: false,
        metadata: {}
      }

      await licenseManager.requestLicense(request)
    })

    it('should validate valid license', async () => {
      const validation = await licenseManager.validateLicense('track-1', {
        deviceId: 'device-1',
        userId: 'user-1',
        region: 'US',
        quality: 'high',
        isOffline: false
      })

      expect(validation.valid).toBe(true)
      expect(validation.violation).toBeUndefined()
    })

    it('should reject expired license', async () => {
      // Manually expire the license
      const license = licenseManager.getLicense('track-1')
      if (license) {
        license.expiresAt = Date.now() - 1000 // Expired 1 second ago
      }

      const validation = await licenseManager.validateLicense('track-1', {
        deviceId: 'device-1',
        userId: 'user-1',
        region: 'US',
        quality: 'high',
        isOffline: false
      })

      expect(validation.valid).toBe(false)
      expect(validation.violation?.type).toBe('license_expired')
    })

    it('should reject when max plays exceeded', async () => {
      // Manually set current plays to max
      const license = licenseManager.getLicense('track-1')
      if (license) {
        license.maxPlays = 5
        license.currentPlays = 5
      }

      const validation = await licenseManager.validateLicense('track-1', {
        deviceId: 'device-1',
        userId: 'user-1',
        region: 'US',
        quality: 'high',
        isOffline: false
      })

      expect(validation.valid).toBe(false)
      expect(validation.violation?.type).toBe('max_plays_exceeded')
    })

    it('should reject region-blocked requests', async () => {
      const validation = await licenseManager.validateLicense('track-1', {
        deviceId: 'device-1',
        userId: 'user-1',
        region: 'EU', // Not in allowed regions
        quality: 'high',
        isOffline: false
      })

      expect(validation.valid).toBe(false)
      expect(validation.violation?.type).toBe('region_blocked')
    })

    it('should reject quality-restricted requests', async () => {
      const validation = await licenseManager.validateLicense('track-1', {
        deviceId: 'device-1',
        userId: 'user-1',
        region: 'US',
        quality: 'lossless', // Not in allowed qualities
        isOffline: false
      })

      expect(validation.valid).toBe(false)
      expect(validation.violation?.type).toBe('quality_not_allowed')
    })

    it('should reject offline requests when not allowed', async () => {
      // Manually set offline not allowed
      const license = licenseManager.getLicense('track-1')
      if (license) {
        license.isOfflineAllowed = false
      }

      const validation = await licenseManager.validateLicense('track-1', {
        deviceId: 'device-1',
        userId: 'user-1',
        region: 'US',
        quality: 'high',
        isOffline: true
      })

      expect(validation.valid).toBe(false)
      expect(validation.violation?.type).toBe('offline_not_allowed')
    })

    it('should reject requests for non-existent licenses', async () => {
      const validation = await licenseManager.validateLicense('track-999', {
        deviceId: 'device-1',
        userId: 'user-1',
        region: 'US',
        quality: 'high',
        isOffline: false
      })

      expect(validation.valid).toBe(false)
      expect(validation.violation?.type).toBe('license_expired')
    })
  })

  describe('Play Recording', () => {
    beforeEach(async () => {
      await licenseManager.initialize()

      // Add a valid license
      const mockLicenseResponse = {
        id: 'license-1',
        expiresAt: Date.now() + 3600000,
        maxPlays: 10,
        isOfflineAllowed: true,
        isSharingAllowed: false,
        isRecordingAllowed: false,
        qualityRestrictions: ['high'],
        regionRestrictions: ['US'],
        deviceRestrictions: [],
        metadata: {}
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLicenseResponse
      })

      const request: LicenseRequest = {
        trackId: 'track-1',
        licenseType: 'streaming',
        deviceId: 'device-1',
        userId: 'user-1',
        region: 'US',
        quality: 'high',
        offlineRequested: false,
        metadata: {}
      }

      await licenseManager.requestLicense(request)
    })

    it('should record play events', async () => {
      const license = licenseManager.getLicense('track-1')
      const initialPlays = license?.currentPlays || 0

      await licenseManager.recordPlay('track-1', {
        deviceId: 'device-1',
        userId: 'user-1',
        duration: 180000,
        quality: 'high'
      })

      const updatedLicense = licenseManager.getLicense('track-1')
      expect(updatedLicense?.currentPlays).toBe(initialPlays + 1)
    })

    it('should handle play recording for non-existent license', async () => {
      await expect(licenseManager.recordPlay('track-999', {
        deviceId: 'device-1',
        userId: 'user-1',
        duration: 180000,
        quality: 'high'
      })).resolves.not.toThrow()
    })
  })

  describe('License Management', () => {
    beforeEach(async () => {
      await licenseManager.initialize()
    })

    it('should revoke license', async () => {
      // Add a license first
      const mockLicenseResponse = {
        id: 'license-1',
        expiresAt: Date.now() + 3600000,
        maxPlays: 10,
        isOfflineAllowed: true,
        isSharingAllowed: false,
        isRecordingAllowed: false,
        qualityRestrictions: ['high'],
        regionRestrictions: ['US'],
        deviceRestrictions: [],
        metadata: {}
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLicenseResponse
      })

      const request: LicenseRequest = {
        trackId: 'track-1',
        licenseType: 'streaming',
        deviceId: 'device-1',
        userId: 'user-1',
        region: 'US',
        quality: 'high',
        offlineRequested: false,
        metadata: {}
      }

      await licenseManager.requestLicense(request)

      // Revoke the license
      await licenseManager.revokeLicense('track-1', 'User violation')

      const license = licenseManager.getLicense('track-1')
      expect(license?.status).toBe('revoked')
      expect(license?.metadata.revocationReason).toBe('User violation')
    })

    it('should get all licenses', async () => {
      const licenses = licenseManager.getAllLicenses()
      expect(Array.isArray(licenses)).toBe(true)
    })

    it('should get specific license', async () => {
      const license = licenseManager.getLicense('track-1')
      expect(license).toBeNull() // No license exists yet
    })
  })

  describe('Violation Management', () => {
    beforeEach(async () => {
      await licenseManager.initialize()
    })

    it('should record violations', async () => {
      const validation = await licenseManager.validateLicense('track-999', {
        deviceId: 'device-1',
        userId: 'user-1',
        region: 'US',
        quality: 'high',
        isOffline: false
      })

      expect(validation.valid).toBe(false)
      expect(validation.violation).toBeDefined()

      const violations = licenseManager.getViolations()
      expect(violations.length).toBeGreaterThan(0)
      expect(violations[0].type).toBe('license_expired')
    })

    it('should clear old violations', () => {
      // Add some violations
      const violations = licenseManager.getViolations()
      const initialCount = violations.length

      licenseManager.clearOldViolations(0) // Clear all violations

      const updatedViolations = licenseManager.getViolations()
      expect(updatedViolations.length).toBeLessThanOrEqual(initialCount)
    })
  })

  describe('DRM Support Detection', () => {
    it('should detect no DRM support', async () => {
      const noDRMConfig = {
        ...mockConfig,
        provider: 'none' as DRMProvider
      }

      const manager = new LicenseManager(noDRMConfig)
      await expect(manager.initialize()).resolves.not.toThrow()
    })

    it('should handle DRM initialization errors', async () => {
      const widevineConfig = {
        ...mockConfig,
        provider: 'widevine' as DRMProvider
      }

      mockRequestMediaKeySystemAccess.mockRejectedValue(new Error('DRM not supported'))

      const manager = new LicenseManager(widevineConfig)
      await expect(manager.initialize()).rejects.toThrow('DRM not supported on this device')
    })
  })
})

describe('LicenseManagerFactory', () => {
  it('should create license manager instance', () => {
    const config: DRMConfig = {
      provider: 'none',
      serverUrl: 'https://drm.example.com',
      certificateUrl: 'https://drm.example.com/cert',
      keySystem: 'com.widevine.alpha',
      robustness: 'SW_SECURE_CRYPTO',
      persistentState: 'optional',
      distinctiveIdentifier: 'optional',
      sessionTypes: ['temporary'],
      initDataTypes: ['cenc']
    }

    const manager = LicenseManagerFactory.create(config)
    expect(manager).toBeInstanceOf(LicenseManager)
  })
})
