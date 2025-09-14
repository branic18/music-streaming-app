/**
 * DRM integration for audio playback
 * Integrates license management with audio playback controls
 */

import { Track } from '@/lib/types'
import { LicenseManager, LicenseRequest, LicenseResponse, ComplianceViolation } from './license-manager'
import { PlaybackController } from '@/lib/audio/playback-controller'
import { errorHandler } from '@/lib/error/error-handler'

// DRM playback context
export interface DRMPlaybackContext {
  trackId: string
  userId: string
  deviceId: string
  region: string
  quality: string
  isOffline: boolean
  licenseType: 'streaming' | 'download' | 'preview' | 'offline' | 'premium'
}

// DRM playback result
export interface DRMPlaybackResult {
  success: boolean
  canPlay: boolean
  error?: string
  violation?: ComplianceViolation
  requiresPayment?: boolean
  requiresUpgrade?: boolean
  retryAfter?: number
}

// DRM integration events
export interface DRMEvent {
  type: 'licenseRequested' | 'licenseGranted' | 'licenseDenied' | 'violationDetected' | 'playbackBlocked' | 'playbackAllowed'
  data?: any
  timestamp: number
}

// DRM integration class
export class DRMIntegration {
  private licenseManager: LicenseManager
  private playbackController: PlaybackController
  private eventListeners: Map<string, ((event: DRMEvent) => void)[]> = new Map()
  private currentContext: DRMPlaybackContext | null = null
  private isInitialized = false

  constructor(licenseManager: LicenseManager, playbackController: PlaybackController) {
    this.licenseManager = licenseManager
    this.playbackController = playbackController
  }

  /**
   * Initialize DRM integration
   */
  async initialize(): Promise<void> {
    try {
      // Ensure both managers are initialized
      if (!this.licenseManager || !this.playbackController) {
        throw new Error('License manager and playback controller must be initialized')
      }

      this.isInitialized = true
      console.log('DRM integration initialized successfully')
    } catch (error) {
      errorHandler.handleError(error as Error, {
        component: 'DRMIntegration',
        action: 'initialize'
      })
      throw error
    }
  }

  /**
   * Request playback permission for a track
   */
  async requestPlaybackPermission(context: DRMPlaybackContext): Promise<DRMPlaybackResult> {
    if (!this.isInitialized) {
      throw new Error('DRM integration not initialized')
    }

    try {
      this.currentContext = context
      this.emit('licenseRequested', { context })

      // Check if we already have a valid license
      const existingLicense = this.licenseManager.getLicense(context.trackId)
      if (existingLicense) {
        const validation = await this.licenseManager.validateLicense(context.trackId, {
          deviceId: context.deviceId,
          userId: context.userId,
          region: context.region,
          quality: context.quality,
          isOffline: context.isOffline
        })

        if (validation.valid) {
          this.emit('licenseGranted', { context, license: existingLicense })
          return {
            success: true,
            canPlay: true
          }
        } else {
          this.emit('violationDetected', { context, violation: validation.violation })
          return {
            success: false,
            canPlay: false,
            violation: validation.violation
          }
        }
      }

      // Request new license
      const licenseRequest: LicenseRequest = {
        trackId: context.trackId,
        licenseType: context.licenseType,
        deviceId: context.deviceId,
        userId: context.userId,
        region: context.region,
        quality: context.quality,
        offlineRequested: context.isOffline,
        metadata: {
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        }
      }

      const licenseResponse: LicenseResponse = await this.licenseManager.requestLicense(licenseRequest)

      if (licenseResponse.success && licenseResponse.license) {
        this.emit('licenseGranted', { context, license: licenseResponse.license })
        return {
          success: true,
          canPlay: true
        }
      } else {
        this.emit('licenseDenied', { context, response: licenseResponse })
        return {
          success: false,
          canPlay: false,
          error: licenseResponse.error,
          requiresPayment: licenseResponse.requiresPayment,
          requiresUpgrade: licenseResponse.requiresUpgrade,
          retryAfter: licenseResponse.retryAfter
        }
      }
    } catch (error) {
      errorHandler.handleError(error as Error, {
        component: 'DRMIntegration',
        action: 'requestPlaybackPermission',
        metadata: { context }
      })

      return {
        success: false,
        canPlay: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Play a track with DRM protection
   */
  async playTrack(track: Track, context: DRMPlaybackContext): Promise<DRMPlaybackResult> {
    if (!this.isInitialized) {
      throw new Error('DRM integration not initialized')
    }

    try {
      // Request playback permission
      const permission = await this.requestPlaybackPermission(context)
      
      if (!permission.canPlay) {
        this.emit('playbackBlocked', { track, context, permission })
        return permission
      }

      // Validate license before playing
      const validation = await this.licenseManager.validateLicense(track.id, {
        deviceId: context.deviceId,
        userId: context.userId,
        region: context.region,
        quality: context.quality,
        isOffline: context.isOffline
      })

      if (!validation.valid) {
        this.emit('playbackBlocked', { track, context, violation: validation.violation })
        return {
          success: false,
          canPlay: false,
          violation: validation.violation
        }
      }

      // Play the track
      await this.playbackController.play(track)
      
      // Record the play
      await this.licenseManager.recordPlay(track.id, {
        deviceId: context.deviceId,
        userId: context.userId,
        duration: track.durationMs,
        quality: context.quality
      })

      this.emit('playbackAllowed', { track, context })
      
      return {
        success: true,
        canPlay: true
      }
    } catch (error) {
      errorHandler.handleError(error as Error, {
        component: 'DRMIntegration',
        action: 'playTrack',
        metadata: { track: track.id, context }
      })

      return {
        success: false,
        canPlay: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Check if track can be played offline
   */
  async canPlayOffline(trackId: string, context: Omit<DRMPlaybackContext, 'isOffline'>): Promise<boolean> {
    const license = this.licenseManager.getLicense(trackId)
    
    if (!license) {
      return false
    }

    if (!license.isOfflineAllowed) {
      return false
    }

    const validation = await this.licenseManager.validateLicense(trackId, {
      ...context,
      isOffline: true
    })

    return validation.valid
  }

  /**
   * Download track for offline playback
   */
  async downloadForOffline(track: Track, context: Omit<DRMPlaybackContext, 'isOffline' | 'licenseType'>): Promise<DRMPlaybackResult> {
    const offlineContext: DRMPlaybackContext = {
      ...context,
      isOffline: true,
      licenseType: 'offline'
    }

    return this.requestPlaybackPermission(offlineContext)
  }

  /**
   * Get current playback context
   */
  getCurrentContext(): DRMPlaybackContext | null {
    return this.currentContext
  }

  /**
   * Get license information for a track
   */
  getLicenseInfo(trackId: string) {
    return this.licenseManager.getLicense(trackId)
  }

  /**
   * Get all compliance violations
   */
  getViolations() {
    return this.licenseManager.getViolations()
  }

  /**
   * Clear old violations
   */
  clearOldViolations(olderThan?: number) {
    this.licenseManager.clearOldViolations(olderThan)
  }

  /**
   * Revoke license for a track
   */
  async revokeLicense(trackId: string, reason: string): Promise<void> {
    await this.licenseManager.revokeLicense(trackId, reason)
  }

  /**
   * Event handling
   */
  on(event: string, callback: (event: DRMEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  off(event: string, callback: (event: DRMEvent) => void): void {
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
      const drmEvent: DRMEvent = {
        type: event as any,
        data,
        timestamp: Date.now()
      }
      listeners.forEach(callback => callback(drmEvent))
    }
  }

  /**
   * Check if DRM integration is ready
   */
  isReady(): boolean {
    return this.isInitialized
  }
}

// DRM integration factory
export class DRMIntegrationFactory {
  static create(licenseManager: LicenseManager, playbackController: PlaybackController): DRMIntegration {
    return new DRMIntegration(licenseManager, playbackController)
  }
}

// Global DRM integration instance
let globalDRMIntegration: DRMIntegration | null = null

export function getDRMIntegration(): DRMIntegration {
  if (!globalDRMIntegration) {
    throw new Error('DRM integration not initialized')
  }
  return globalDRMIntegration
}

export async function initializeDRMIntegration(
  licenseManager: LicenseManager,
  playbackController: PlaybackController
): Promise<DRMIntegration> {
  globalDRMIntegration = DRMIntegrationFactory.create(licenseManager, playbackController)
  await globalDRMIntegration.initialize()
  return globalDRMIntegration
}

// Export types and classes
export {
  DRMIntegration,
  DRMIntegrationFactory
}
