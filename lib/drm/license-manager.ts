/**
 * DRM and licensing compliance manager
 * Handles license validation, DRM protection, and compliance monitoring
 */

import { Track, Album, Artist } from '@/lib/types'
import { errorHandler } from '@/lib/error/error-handler'

// License types
export type LicenseType = 'streaming' | 'download' | 'preview' | 'offline' | 'premium'
export type LicenseStatus = 'valid' | 'expired' | 'invalid' | 'revoked' | 'pending'
export type DRMProvider = 'widevine' | 'playready' | 'fairplay' | 'none'

// License information
export interface LicenseInfo {
  id: string
  trackId: string
  type: LicenseType
  status: LicenseStatus
  provider: DRMProvider
  issuedAt: number
  expiresAt: number | null
  maxPlays: number | null
  currentPlays: number
  isOfflineAllowed: boolean
  isSharingAllowed: boolean
  isRecordingAllowed: boolean
  qualityRestrictions: string[]
  regionRestrictions: string[]
  deviceRestrictions: string[]
  metadata: Record<string, any>
}

// DRM configuration
export interface DRMConfig {
  provider: DRMProvider
  serverUrl: string
  certificateUrl: string
  keySystem: string
  robustness: 'SW_SECURE_CRYPTO' | 'SW_SECURE_DECODE' | 'HW_SECURE_CRYPTO' | 'HW_SECURE_DECODE' | 'HW_SECURE_ALL'
  persistentState: 'not-allowed' | 'optional' | 'required'
  distinctiveIdentifier: 'not-allowed' | 'optional' | 'required'
  sessionTypes: string[]
  initDataTypes: string[]
}

// License request
export interface LicenseRequest {
  trackId: string
  licenseType: LicenseType
  deviceId: string
  userId: string
  region: string
  quality: string
  offlineRequested: boolean
  metadata: Record<string, any>
}

// License response
export interface LicenseResponse {
  success: boolean
  license: LicenseInfo | null
  error?: string
  retryAfter?: number
  requiresPayment?: boolean
  requiresUpgrade?: boolean
}

// Compliance violation
export interface ComplianceViolation {
  id: string
  type: 'license_expired' | 'max_plays_exceeded' | 'region_blocked' | 'device_not_authorized' | 'quality_not_allowed' | 'offline_not_allowed' | 'sharing_violation' | 'recording_violation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  trackId: string
  userId: string
  deviceId: string
  timestamp: number
  description: string
  metadata: Record<string, any>
}

// License manager class
export class LicenseManager {
  private licenses: Map<string, LicenseInfo> = new Map()
  private violations: ComplianceViolation[] = []
  private config: DRMConfig
  private isInitialized = false

  constructor(config: DRMConfig) {
    this.config = config
  }

  /**
   * Initialize the license manager
   */
  async initialize(): Promise<void> {
    try {
      // Check DRM support
      if (!this.isDRMSupported()) {
        throw new Error('DRM not supported on this device')
      }

      // Initialize DRM system
      await this.initializeDRMSystem()
      
      // Load existing licenses
      await this.loadExistingLicenses()
      
      this.isInitialized = true
      console.log('License manager initialized successfully')
    } catch (error) {
      errorHandler.handleError(error as Error, {
        component: 'LicenseManager',
        action: 'initialize',
        metadata: { config: this.config }
      })
      throw error
    }
  }

  /**
   * Request a license for a track
   */
  async requestLicense(request: LicenseRequest): Promise<LicenseResponse> {
    if (!this.isInitialized) {
      throw new Error('License manager not initialized')
    }

    try {
      // Check if license already exists and is valid
      const existingLicense = this.licenses.get(request.trackId)
      if (existingLicense && this.isLicenseValid(existingLicense, request)) {
        return {
          success: true,
          license: existingLicense
        }
      }

      // Validate request
      const validation = await this.validateLicenseRequest(request)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          requiresPayment: validation.requiresPayment,
          requiresUpgrade: validation.requiresUpgrade
        }
      }

      // Request license from DRM server
      const license = await this.requestLicenseFromServer(request)
      
      if (license) {
        this.licenses.set(request.trackId, license)
        await this.saveLicense(license)
        
        return {
          success: true,
          license
        }
      } else {
        return {
          success: false,
          error: 'Failed to obtain license from server'
        }
      }
    } catch (error) {
      errorHandler.handleError(error as Error, {
        component: 'LicenseManager',
        action: 'requestLicense',
        metadata: { request }
      })
      
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Validate a license for playback
   */
  async validateLicense(trackId: string, context: {
    deviceId: string
    userId: string
    region: string
    quality: string
    isOffline: boolean
  }): Promise<{ valid: boolean; violation?: ComplianceViolation }> {
    const license = this.licenses.get(trackId)
    
    if (!license) {
      const violation: ComplianceViolation = {
        id: this.generateViolationId(),
        type: 'license_expired',
        severity: 'high',
        trackId,
        userId: context.userId,
        deviceId: context.deviceId,
        timestamp: Date.now(),
        description: 'No license found for track',
        metadata: { context }
      }
      this.recordViolation(violation)
      return { valid: false, violation }
    }

    // Check license status
    if (license.status !== 'valid') {
      const violation: ComplianceViolation = {
        id: this.generateViolationId(),
        type: 'license_expired',
        severity: 'high',
        trackId,
        userId: context.userId,
        deviceId: context.deviceId,
        timestamp: Date.now(),
        description: `License status: ${license.status}`,
        metadata: { license, context }
      }
      this.recordViolation(violation)
      return { valid: false, violation }
    }

    // Check expiration
    if (license.expiresAt && Date.now() > license.expiresAt) {
      const violation: ComplianceViolation = {
        id: this.generateViolationId(),
        type: 'license_expired',
        severity: 'high',
        trackId,
        userId: context.userId,
        deviceId: context.deviceId,
        timestamp: Date.now(),
        description: 'License has expired',
        metadata: { license, context }
      }
      this.recordViolation(violation)
      return { valid: false, violation }
    }

    // Check play count
    if (license.maxPlays && license.currentPlays >= license.maxPlays) {
      const violation: ComplianceViolation = {
        id: this.generateViolationId(),
        type: 'max_plays_exceeded',
        severity: 'medium',
        trackId,
        userId: context.userId,
        deviceId: context.deviceId,
        timestamp: Date.now(),
        description: `Maximum plays exceeded (${license.currentPlays}/${license.maxPlays})`,
        metadata: { license, context }
      }
      this.recordViolation(violation)
      return { valid: false, violation }
    }

    // Check region restrictions
    if (license.regionRestrictions.length > 0 && !license.regionRestrictions.includes(context.region)) {
      const violation: ComplianceViolation = {
        id: this.generateViolationId(),
        type: 'region_blocked',
        severity: 'high',
        trackId,
        userId: context.userId,
        deviceId: context.deviceId,
        timestamp: Date.now(),
        description: `Region not allowed: ${context.region}`,
        metadata: { license, context }
      }
      this.recordViolation(violation)
      return { valid: false, violation }
    }

    // Check quality restrictions
    if (license.qualityRestrictions.length > 0 && !license.qualityRestrictions.includes(context.quality)) {
      const violation: ComplianceViolation = {
        id: this.generateViolationId(),
        type: 'quality_not_allowed',
        severity: 'medium',
        trackId,
        userId: context.userId,
        deviceId: context.deviceId,
        timestamp: Date.now(),
        description: `Quality not allowed: ${context.quality}`,
        metadata: { license, context }
      }
      this.recordViolation(violation)
      return { valid: false, violation }
    }

    // Check offline restrictions
    if (context.isOffline && !license.isOfflineAllowed) {
      const violation: ComplianceViolation = {
        id: this.generateViolationId(),
        type: 'offline_not_allowed',
        severity: 'medium',
        trackId,
        userId: context.userId,
        deviceId: context.deviceId,
        timestamp: Date.now(),
        description: 'Offline playback not allowed',
        metadata: { license, context }
      }
      this.recordViolation(violation)
      return { valid: false, violation }
    }

    return { valid: true }
  }

  /**
   * Record a play event
   */
  async recordPlay(trackId: string, context: {
    deviceId: string
    userId: string
    duration: number
    quality: string
  }): Promise<void> {
    const license = this.licenses.get(trackId)
    
    if (license) {
      license.currentPlays++
      await this.saveLicense(license)
      
      // Check if license needs renewal
      if (license.maxPlays && license.currentPlays >= license.maxPlays * 0.9) {
        console.warn(`License for track ${trackId} is approaching play limit`)
      }
    }
  }

  /**
   * Revoke a license
   */
  async revokeLicense(trackId: string, reason: string): Promise<void> {
    const license = this.licenses.get(trackId)
    
    if (license) {
      license.status = 'revoked'
      license.metadata.revocationReason = reason
      license.metadata.revokedAt = Date.now()
      
      await this.saveLicense(license)
      console.log(`License revoked for track ${trackId}: ${reason}`)
    }
  }

  /**
   * Get license information
   */
  getLicense(trackId: string): LicenseInfo | null {
    return this.licenses.get(trackId) || null
  }

  /**
   * Get all licenses
   */
  getAllLicenses(): LicenseInfo[] {
    return Array.from(this.licenses.values())
  }

  /**
   * Get compliance violations
   */
  getViolations(): ComplianceViolation[] {
    return [...this.violations]
  }

  /**
   * Clear old violations
   */
  clearOldViolations(olderThan: number = 7 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - olderThan
    this.violations = this.violations.filter(violation => violation.timestamp > cutoff)
  }

  /**
   * Check if DRM is supported
   */
  private isDRMSupported(): boolean {
    if (this.config.provider === 'none') {
      return true
    }

    // Check for EME support
    if (!('MediaKeys' in window) && !('webkitMediaKeys' in window)) {
      return false
    }

    // Check for specific DRM provider support
    switch (this.config.provider) {
      case 'widevine':
        return this.isWidevineSupported()
      case 'playready':
        return this.isPlayReadySupported()
      case 'fairplay':
        return this.isFairPlaySupported()
      default:
        return false
    }
  }

  /**
   * Check Widevine support
   */
  private isWidevineSupported(): boolean {
    try {
      return navigator.requestMediaKeySystemAccess !== undefined
    } catch {
      return false
    }
  }

  /**
   * Check PlayReady support
   */
  private isPlayReadySupported(): boolean {
    // PlayReady is primarily Windows/Edge
    return navigator.userAgent.includes('Windows') && navigator.userAgent.includes('Edge')
  }

  /**
   * Check FairPlay support
   */
  private isFairPlaySupported(): boolean {
    // FairPlay is primarily Safari/macOS/iOS
    return navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')
  }

  /**
   * Initialize DRM system
   */
  private async initializeDRMSystem(): Promise<void> {
    if (this.config.provider === 'none') {
      return
    }

    // Initialize EME
    try {
      const keySystemAccess = await navigator.requestMediaKeySystemAccess(
        this.config.keySystem,
        [{
          initDataTypes: this.config.initDataTypes,
          audioCapabilities: [{
            contentType: 'audio/mp4; codecs="mp4a.40.2"',
            robustness: this.config.robustness
          }],
          persistentState: this.config.persistentState,
          distinctiveIdentifier: this.config.distinctiveIdentifier
        }]
      )

      console.log('DRM system initialized:', keySystemAccess.keySystem)
    } catch (error) {
      throw new Error(`Failed to initialize DRM system: ${(error as Error).message}`)
    }
  }

  /**
   * Load existing licenses from storage
   */
  private async loadExistingLicenses(): Promise<void> {
    try {
      const stored = localStorage.getItem('drm_licenses')
      if (stored) {
        const licenses: LicenseInfo[] = JSON.parse(stored)
        licenses.forEach(license => {
          this.licenses.set(license.trackId, license)
        })
      }
    } catch (error) {
      console.warn('Failed to load existing licenses:', error)
    }
  }

  /**
   * Save license to storage
   */
  private async saveLicense(license: LicenseInfo): Promise<void> {
    try {
      const licenses = Array.from(this.licenses.values())
      localStorage.setItem('drm_licenses', JSON.stringify(licenses))
    } catch (error) {
      console.warn('Failed to save license:', error)
    }
  }

  /**
   * Validate license request
   */
  private async validateLicenseRequest(request: LicenseRequest): Promise<{
    valid: boolean
    error?: string
    requiresPayment?: boolean
    requiresUpgrade?: boolean
  }> {
    // Basic validation
    if (!request.trackId || !request.userId || !request.deviceId) {
      return { valid: false, error: 'Missing required fields' }
    }

    // Check user subscription status (mock implementation)
    const userSubscription = await this.getUserSubscription(request.userId)
    if (!userSubscription.active) {
      return { valid: false, error: 'Subscription required', requiresPayment: true }
    }

    // Check if user has access to requested quality
    if (request.quality === 'lossless' && !userSubscription.premium) {
      return { valid: false, error: 'Premium subscription required for lossless quality', requiresUpgrade: true }
    }

    return { valid: true }
  }

  /**
   * Request license from DRM server
   */
  private async requestLicenseFromServer(request: LicenseRequest): Promise<LicenseInfo | null> {
    try {
      const response = await fetch(`${this.config.serverUrl}/license`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`License server error: ${response.status}`)
      }

      const data = await response.json()
      
      return {
        id: data.id,
        trackId: request.trackId,
        type: request.licenseType,
        status: 'valid',
        provider: this.config.provider,
        issuedAt: Date.now(),
        expiresAt: data.expiresAt ? Date.now() + data.expiresAt : null,
        maxPlays: data.maxPlays || null,
        currentPlays: 0,
        isOfflineAllowed: data.isOfflineAllowed || false,
        isSharingAllowed: data.isSharingAllowed || false,
        isRecordingAllowed: data.isRecordingAllowed || false,
        qualityRestrictions: data.qualityRestrictions || [],
        regionRestrictions: data.regionRestrictions || [],
        deviceRestrictions: data.deviceRestrictions || [],
        metadata: data.metadata || {}
      }
    } catch (error) {
      console.error('Failed to request license from server:', error)
      return null
    }
  }

  /**
   * Check if license is valid for request
   */
  private isLicenseValid(license: LicenseInfo, request: LicenseRequest): boolean {
    if (license.status !== 'valid') return false
    if (license.expiresAt && Date.now() > license.expiresAt) return false
    if (license.maxPlays && license.currentPlays >= license.maxPlays) return false
    if (license.regionRestrictions.length > 0 && !license.regionRestrictions.includes(request.region)) return false
    if (license.qualityRestrictions.length > 0 && !license.qualityRestrictions.includes(request.quality)) return false
    if (request.offlineRequested && !license.isOfflineAllowed) return false
    
    return true
  }

  /**
   * Record compliance violation
   */
  private recordViolation(violation: ComplianceViolation): void {
    this.violations.push(violation)
    
    // Log violation
    errorHandler.handleError(new Error(violation.description), {
      component: 'LicenseManager',
      action: 'complianceViolation',
      metadata: { violation }
    })

    // Store violations
    try {
      localStorage.setItem('drm_violations', JSON.stringify(this.violations))
    } catch (error) {
      console.warn('Failed to store violation:', error)
    }
  }

  /**
   * Get user subscription (mock implementation)
   */
  private async getUserSubscription(userId: string): Promise<{
    active: boolean
    premium: boolean
    expiresAt: number | null
  }> {
    // Mock implementation - in real app, this would query user service
    return {
      active: true,
      premium: false,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    }
  }

  /**
   * Get authentication token (mock implementation)
   */
  private async getAuthToken(): Promise<string> {
    // Mock implementation - in real app, this would get actual auth token
    return 'mock_auth_token'
  }

  /**
   * Generate violation ID
   */
  private generateViolationId(): string {
    return `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// License manager factory
export class LicenseManagerFactory {
  static create(config: DRMConfig): LicenseManager {
    return new LicenseManager(config)
  }
}

// Global license manager instance
let globalLicenseManager: LicenseManager | null = null

export function getLicenseManager(): LicenseManager {
  if (!globalLicenseManager) {
    throw new Error('License manager not initialized')
  }
  return globalLicenseManager
}

export async function initializeLicenseManager(config: DRMConfig): Promise<LicenseManager> {
  globalLicenseManager = LicenseManagerFactory.create(config)
  await globalLicenseManager.initialize()
  return globalLicenseManager
}

// Export types and classes
export {
  LicenseManager,
  LicenseManagerFactory
}
