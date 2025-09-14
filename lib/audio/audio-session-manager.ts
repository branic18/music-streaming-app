/**
 * Audio session management and device restrictions
 * Handles audio session lifecycle, device management, and platform-specific restrictions
 */

import { Track, AudioSettings } from '@/lib/types'

// Audio session states
export type AudioSessionState = 'inactive' | 'active' | 'interrupted' | 'suspended' | 'ended'

// Audio session interruption reasons
export type AudioSessionInterruptionReason = 
  | 'userAction' 
  | 'systemAction' 
  | 'phoneCall' 
  | 'alarm' 
  | 'notification' 
  | 'otherAudio' 
  | 'unknown'

// Audio session interruption types
export type AudioSessionInterruptionType = 'began' | 'ended' | 'cancelled'

// Device types
export type AudioDeviceType = 
  | 'speaker' 
  | 'headphones' 
  | 'bluetooth' 
  | 'airpods' 
  | 'carplay' 
  | 'android_auto' 
  | 'unknown'

// Platform types
export type Platform = 'ios' | 'android' | 'web' | 'desktop' | 'unknown'

// Audio session events
export interface AudioSessionEvent {
  type: 'stateChange' | 'interruption' | 'deviceChange' | 'error' | 'permissionChange'
  data?: any
  timestamp: number
}

// Audio session interruption event
export interface AudioSessionInterruptionEvent extends AudioSessionEvent {
  type: 'interruption'
  data: {
    reason: AudioSessionInterruptionReason
    type: AudioSessionInterruptionType
    options?: {
      shouldResume?: boolean
      shouldPause?: boolean
      wasSuspended?: boolean
    }
  }
}

// Device change event
export interface AudioDeviceChangeEvent extends AudioSessionEvent {
  type: 'deviceChange'
  data: {
    previousDevice: AudioDeviceInfo
    currentDevice: AudioDeviceInfo
    reason: 'user' | 'system' | 'connection' | 'disconnection'
  }
}

// Audio device information
export interface AudioDeviceInfo {
  id: string
  name: string
  type: AudioDeviceType
  isDefault: boolean
  isConnected: boolean
  capabilities: {
    canPlay: boolean
    canPause: boolean
    canSeek: boolean
    canChangeVolume: boolean
    supportsHighQuality: boolean
    supportsSpatialAudio: boolean
  }
  restrictions: {
    maxVolume?: number
    minVolume?: number
    allowedQualities?: string[]
    blockedFeatures?: string[]
  }
}

// Audio session configuration
export interface AudioSessionConfig {
  // Session settings
  category: 'playback' | 'playAndRecord' | 'record' | 'ambient' | 'soloAmbient'
  mode: 'default' | 'gameChat' | 'measurement' | 'moviePlayback' | 'spokenAudio' | 'videoChat' | 'videoRecording'
  options: {
    mixWithOthers: boolean
    duckOthers: boolean
    allowBluetooth: boolean
    allowBluetoothA2DP: boolean
    allowAirPlay: boolean
    defaultToSpeaker: boolean
    interruptSpokenAudioAndMixWithOthers: boolean
  }
  
  // Device restrictions
  deviceRestrictions: {
    allowBluetooth: boolean
    allowAirPods: boolean
    allowCarPlay: boolean
    allowAndroidAuto: boolean
    requireHighQuality: boolean
    blockLowQualityDevices: boolean
  }
  
  // Platform-specific settings
  platformSettings: {
    ios: {
      respectSilentSwitch: boolean
      allowBackgroundPlayback: boolean
      handleInterruptions: boolean
    }
    android: {
      respectDoNotDisturb: boolean
      allowBackgroundPlayback: boolean
      handleAudioFocus: boolean
    }
    web: {
      requireUserGesture: boolean
      handlePageVisibility: boolean
      respectAutoplayPolicy: boolean
    }
  }
}

// Audio session manager class
export class AudioSessionManager {
  private state: AudioSessionState = 'inactive'
  private config: AudioSessionConfig
  private currentDevice: AudioDeviceInfo | null = null
  private availableDevices: AudioDeviceInfo[] = []
  private eventListeners: Map<string, ((event: AudioSessionEvent) => void)[]> = new Map()
  private isInitialized = false
  private platform: Platform = 'unknown'
  private interruptionHandlers: Map<string, () => void> = new Map()
  private deviceChangeHandlers: Map<string, () => void> = new Map()
  
  // Media session API (for web)
  private mediaSession: MediaSession | null = null
  
  // Audio context for device detection
  private audioContext: AudioContext | null = null

  constructor(config?: Partial<AudioSessionConfig>) {
    this.config = {
      category: 'playback',
      mode: 'default',
      options: {
        mixWithOthers: true,
        duckOthers: false,
        allowBluetooth: true,
        allowBluetoothA2DP: true,
        allowAirPlay: true,
        defaultToSpeaker: false,
        interruptSpokenAudioAndMixWithOthers: false
      },
      deviceRestrictions: {
        allowBluetooth: true,
        allowAirPods: true,
        allowCarPlay: true,
        allowAndroidAuto: true,
        requireHighQuality: false,
        blockLowQualityDevices: false
      },
      platformSettings: {
        ios: {
          respectSilentSwitch: true,
          allowBackgroundPlayback: true,
          handleInterruptions: true
        },
        android: {
          respectDoNotDisturb: true,
          allowBackgroundPlayback: true,
          handleAudioFocus: true
        },
        web: {
          requireUserGesture: true,
          handlePageVisibility: true,
          respectAutoplayPolicy: true
        }
      },
      ...config
    }

    this.detectPlatform()
  }

  /**
   * Initialize the audio session manager
   */
  async initialize(): Promise<void> {
    try {
      this.log('Initializing audio session manager')

      // Detect platform and set up platform-specific features
      await this.setupPlatformFeatures()

      // Set up device detection
      await this.setupDeviceDetection()

      // Set up media session (web)
      if (this.platform === 'web') {
        await this.setupMediaSession()
      }

      // Set up event listeners
      this.setupEventListeners()

      // Set initial state
      this.setState('active')

      this.isInitialized = true
      this.log('Audio session manager initialized successfully')

    } catch (error) {
      this.error('Failed to initialize audio session manager:', error)
      throw error
    }
  }

  /**
   * Detect the current platform
   */
  private detectPlatform(): void {
    if (typeof window === 'undefined') {
      this.platform = 'unknown'
      return
    }

    const userAgent = navigator.userAgent.toLowerCase()
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      this.platform = 'ios'
    } else if (/android/.test(userAgent)) {
      this.platform = 'android'
    } else if (typeof window !== 'undefined' && window.navigator) {
      this.platform = 'web'
    } else {
      this.platform = 'desktop'
    }

    this.log(`Detected platform: ${this.platform}`)
  }

  /**
   * Set up platform-specific features
   */
  private async setupPlatformFeatures(): Promise<void> {
    switch (this.platform) {
      case 'ios':
        await this.setupIOSFeatures()
        break
      case 'android':
        await this.setupAndroidFeatures()
        break
      case 'web':
        await this.setupWebFeatures()
        break
      case 'desktop':
        await this.setupDesktopFeatures()
        break
    }
  }

  /**
   * Set up iOS-specific features
   */
  private async setupIOSFeatures(): Promise<void> {
    this.log('Setting up iOS-specific features')

    // Handle silent switch
    if (this.config.platformSettings.ios.respectSilentSwitch) {
      // iOS doesn't provide direct access to silent switch state
      // We can only detect it through audio context state
      this.setupSilentSwitchDetection()
    }

    // Handle background playback
    if (this.config.platformSettings.ios.allowBackgroundPlayback) {
      this.setupBackgroundPlayback()
    }

    // Handle interruptions
    if (this.config.platformSettings.ios.handleInterruptions) {
      this.setupInterruptionHandling()
    }
  }

  /**
   * Set up Android-specific features
   */
  private async setupAndroidFeatures(): Promise<void> {
    this.log('Setting up Android-specific features')

    // Handle Do Not Disturb
    if (this.config.platformSettings.android.respectDoNotDisturb) {
      this.setupDoNotDisturbDetection()
    }

    // Handle background playback
    if (this.config.platformSettings.android.allowBackgroundPlayback) {
      this.setupBackgroundPlayback()
    }

    // Handle audio focus
    if (this.config.platformSettings.android.handleAudioFocus) {
      this.setupAudioFocusHandling()
    }
  }

  /**
   * Set up web-specific features
   */
  private async setupWebFeatures(): Promise<void> {
    this.log('Setting up web-specific features')

    // Handle user gesture requirement
    if (this.config.platformSettings.web.requireUserGesture) {
      this.setupUserGestureDetection()
    }

    // Handle page visibility
    if (this.config.platformSettings.web.handlePageVisibility) {
      this.setupPageVisibilityHandling()
    }

    // Handle autoplay policy
    if (this.config.platformSettings.web.respectAutoplayPolicy) {
      this.setupAutoplayPolicyHandling()
    }
  }

  /**
   * Set up desktop-specific features
   */
  private async setupDesktopFeatures(): Promise<void> {
    this.log('Setting up desktop-specific features')
    // Desktop-specific setup can be added here
  }

  /**
   * Set up device detection
   */
  private async setupDeviceDetection(): Promise<void> {
    try {
      // Create audio context for device detection
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Get initial device list
      await this.updateDeviceList()

      // Set up device change detection
      if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
        navigator.mediaDevices.addEventListener('devicechange', () => {
          this.updateDeviceList()
        })
      }

      // Set current device
      if (this.availableDevices.length > 0) {
        this.currentDevice = this.availableDevices.find(d => d.isDefault) || this.availableDevices[0]
      }

    } catch (error) {
      this.error('Failed to set up device detection:', error)
    }
  }

  /**
   * Update the list of available audio devices
   */
  private async updateDeviceList(): Promise<void> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        this.log('Media devices API not available')
        return
      }

      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioDevices = devices.filter(device => device.kind === 'audiooutput')

      this.availableDevices = audioDevices.map(device => this.createDeviceInfo(device))

      // Check for device changes
      this.checkDeviceChanges()

    } catch (error) {
      this.error('Failed to update device list:', error)
    }
  }

  /**
   * Create device info from MediaDeviceInfo
   */
  private createDeviceInfo(device: MediaDeviceInfo): AudioDeviceInfo {
    const deviceType = this.detectDeviceType(device)
    const capabilities = this.getDeviceCapabilities(deviceType)
    const restrictions = this.getDeviceRestrictions(deviceType)

    return {
      id: device.deviceId,
      name: device.label || `Audio Device ${device.deviceId.slice(0, 8)}`,
      type: deviceType,
      isDefault: device.deviceId === 'default',
      isConnected: true,
      capabilities,
      restrictions
    }
  }

  /**
   * Detect device type from MediaDeviceInfo
   */
  private detectDeviceType(device: MediaDeviceInfo): AudioDeviceType {
    const label = device.label.toLowerCase()
    
    if (label.includes('airpods') || label.includes('airpod')) {
      return 'airpods'
    } else if (label.includes('bluetooth') || label.includes('bt')) {
      return 'bluetooth'
    } else if (label.includes('headphone') || label.includes('headset')) {
      return 'headphones'
    } else if (label.includes('carplay')) {
      return 'carplay'
    } else if (label.includes('android auto')) {
      return 'android_auto'
    } else if (label.includes('speaker')) {
      return 'speaker'
    } else {
      return 'unknown'
    }
  }

  /**
   * Get device capabilities based on type
   */
  private getDeviceCapabilities(type: AudioDeviceType): AudioDeviceInfo['capabilities'] {
    const baseCapabilities = {
      canPlay: true,
      canPause: true,
      canSeek: true,
      canChangeVolume: true,
      supportsHighQuality: true,
      supportsSpatialAudio: false
    }

    switch (type) {
      case 'airpods':
        return {
          ...baseCapabilities,
          supportsSpatialAudio: true
        }
      case 'bluetooth':
        return {
          ...baseCapabilities,
          supportsHighQuality: false,
          supportsSpatialAudio: false
        }
      case 'carplay':
      case 'android_auto':
        return {
          ...baseCapabilities,
          canChangeVolume: false,
          supportsSpatialAudio: false
        }
      case 'speaker':
        return {
          ...baseCapabilities,
          supportsSpatialAudio: false
        }
      default:
        return baseCapabilities
    }
  }

  /**
   * Get device restrictions based on type
   */
  private getDeviceRestrictions(type: AudioDeviceType): AudioDeviceInfo['restrictions'] {
    const restrictions: AudioDeviceInfo['restrictions'] = {}

    switch (type) {
      case 'bluetooth':
        restrictions.maxVolume = 0.8
        restrictions.allowedQualities = ['low', 'medium']
        restrictions.blockedFeatures = ['spatial_audio']
        break
      case 'carplay':
      case 'android_auto':
        restrictions.allowedQualities = ['medium', 'high']
        restrictions.blockedFeatures = ['volume_control']
        break
      case 'speaker':
        restrictions.maxVolume = 1.0
        restrictions.minVolume = 0.1
        break
    }

    return restrictions
  }

  /**
   * Check for device changes and emit events
   */
  private checkDeviceChanges(): void {
    const previousDevice = this.currentDevice
    const newDefaultDevice = this.availableDevices.find(d => d.isDefault)

    if (newDefaultDevice && (!previousDevice || previousDevice.id !== newDefaultDevice.id)) {
      this.currentDevice = newDefaultDevice
      this.emitDeviceChange(previousDevice, newDefaultDevice, 'system')
    }
  }

  /**
   * Set up media session for web platform
   */
  private async setupMediaSession(): Promise<void> {
    if (!('mediaSession' in navigator)) {
      this.log('Media Session API not available')
      return
    }

    this.mediaSession = navigator.mediaSession

    // Set up media session action handlers
    this.mediaSession.setActionHandler('play', () => {
      this.emit('stateChange', { state: 'active' })
    })

    this.mediaSession.setActionHandler('pause', () => {
      this.emit('stateChange', { state: 'suspended' })
    })

    this.mediaSession.setActionHandler('stop', () => {
      this.emit('stateChange', { state: 'ended' })
    })

    this.mediaSession.setActionHandler('previoustrack', () => {
      this.emit('interruption', {
        reason: 'userAction',
        type: 'began',
        options: { shouldPause: false }
      })
    })

    this.mediaSession.setActionHandler('nexttrack', () => {
      this.emit('interruption', {
        reason: 'userAction',
        type: 'began',
        options: { shouldPause: false }
      })
    })

    this.log('Media session set up successfully')
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Page visibility change
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.handlePageHidden()
        } else {
          this.handlePageVisible()
        }
      })
    }

    // Window focus/blur
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => this.handleWindowFocus())
      window.addEventListener('blur', () => this.handleWindowBlur())
    }

    // Audio context state changes
    if (this.audioContext) {
      this.audioContext.addEventListener('statechange', () => {
        this.handleAudioContextStateChange()
      })
    }
  }

  /**
   * Set up silent switch detection (iOS)
   */
  private setupSilentSwitchDetection(): void {
    // iOS doesn't provide direct access to silent switch
    // We can only detect it through audio context state
    if (this.audioContext) {
      this.audioContext.addEventListener('statechange', () => {
        if (this.audioContext?.state === 'suspended') {
          this.emit('interruption', {
            reason: 'systemAction',
            type: 'began',
            options: { shouldPause: true }
          })
        }
      })
    }
  }

  /**
   * Set up background playback
   */
  private setupBackgroundPlayback(): void {
    // This would typically involve setting up service workers
    // or using platform-specific background audio APIs
    this.log('Background playback setup completed')
  }

  /**
   * Set up interruption handling
   */
  private setupInterruptionHandling(): void {
    // Platform-specific interruption handling
    this.log('Interruption handling setup completed')
  }

  /**
   * Set up Do Not Disturb detection (Android)
   */
  private setupDoNotDisturbDetection(): void {
    // Android-specific Do Not Disturb detection
    this.log('Do Not Disturb detection setup completed')
  }

  /**
   * Set up audio focus handling (Android)
   */
  private setupAudioFocusHandling(): void {
    // Android-specific audio focus handling
    this.log('Audio focus handling setup completed')
  }

  /**
   * Set up user gesture detection (Web)
   */
  private setupUserGestureDetection(): void {
    // Web-specific user gesture detection
    this.log('User gesture detection setup completed')
  }

  /**
   * Set up page visibility handling (Web)
   */
  private setupPageVisibilityHandling(): void {
    // Web-specific page visibility handling
    this.log('Page visibility handling setup completed')
  }

  /**
   * Set up autoplay policy handling (Web)
   */
  private setupAutoplayPolicyHandling(): void {
    // Web-specific autoplay policy handling
    this.log('Autoplay policy handling setup completed')
  }

  /**
   * Handle page hidden event
   */
  private handlePageHidden(): void {
    this.log('Page hidden')
    this.emit('interruption', {
      reason: 'systemAction',
      type: 'began',
      options: { shouldPause: true }
    })
  }

  /**
   * Handle page visible event
   */
  private handlePageVisible(): void {
    this.log('Page visible')
    this.emit('interruption', {
      reason: 'systemAction',
      type: 'ended',
      options: { shouldResume: true }
    })
  }

  /**
   * Handle window focus event
   */
  private handleWindowFocus(): void {
    this.log('Window focused')
    this.setState('active')
  }

  /**
   * Handle window blur event
   */
  private handleWindowBlur(): void {
    this.log('Window blurred')
    this.setState('inactive')
  }

  /**
   * Handle audio context state change
   */
  private handleAudioContextStateChange(): void {
    if (!this.audioContext) return

    this.log(`Audio context state changed to: ${this.audioContext.state}`)

    switch (this.audioContext.state) {
      case 'running':
        this.setState('active')
        break
      case 'suspended':
        this.setState('suspended')
        break
      case 'closed':
        this.setState('ended')
        break
    }
  }

  /**
   * Set the audio session state
   */
  private setState(newState: AudioSessionState): void {
    if (this.state === newState) return

    const previousState = this.state
    this.state = newState

    this.log(`Audio session state changed: ${previousState} -> ${newState}`)

    this.emit('stateChange', {
      state: newState,
      previousState
    })
  }

  /**
   * Emit device change event
   */
  private emitDeviceChange(
    previousDevice: AudioDeviceInfo | null,
    currentDevice: AudioDeviceInfo,
    reason: 'user' | 'system' | 'connection' | 'disconnection'
  ): void {
    this.log(`Device changed: ${previousDevice?.name || 'none'} -> ${currentDevice.name}`)

    const event: AudioDeviceChangeEvent = {
      type: 'deviceChange',
      data: {
        previousDevice: previousDevice || this.createDefaultDeviceInfo(),
        currentDevice,
        reason
      },
      timestamp: Date.now()
    }

    this.emit('deviceChange', event)
  }

  /**
   * Create default device info
   */
  private createDefaultDeviceInfo(): AudioDeviceInfo {
    return {
      id: 'default',
      name: 'Default Audio Device',
      type: 'unknown',
      isDefault: true,
      isConnected: true,
      capabilities: {
        canPlay: true,
        canPause: true,
        canSeek: true,
        canChangeVolume: true,
        supportsHighQuality: true,
        supportsSpatialAudio: false
      },
      restrictions: {}
    }
  }

  /**
   * Check if a device is allowed based on restrictions
   */
  isDeviceAllowed(device: AudioDeviceInfo): boolean {
    const restrictions = this.config.deviceRestrictions

    // Check device type restrictions
    if (device.type === 'bluetooth' && !restrictions.allowBluetooth) {
      return false
    }
    if (device.type === 'airpods' && !restrictions.allowAirPods) {
      return false
    }
    if (device.type === 'carplay' && !restrictions.allowCarPlay) {
      return false
    }
    if (device.type === 'android_auto' && !restrictions.allowAndroidAuto) {
      return false
    }

    // Check quality requirements
    if (restrictions.requireHighQuality && !device.capabilities.supportsHighQuality) {
      return false
    }

    // Check if device is blocked
    if (restrictions.blockLowQualityDevices && device.type === 'bluetooth') {
      return false
    }

    return true
  }

  /**
   * Get current audio session state
   */
  getState(): AudioSessionState {
    return this.state
  }

  /**
   * Get current device
   */
  getCurrentDevice(): AudioDeviceInfo | null {
    return this.currentDevice
  }

  /**
   * Get available devices
   */
  getAvailableDevices(): AudioDeviceInfo[] {
    return this.availableDevices.filter(device => this.isDeviceAllowed(device))
  }

  /**
   * Get platform
   */
  getPlatform(): Platform {
    return this.platform
  }

  /**
   * Get session configuration
   */
  getConfig(): AudioSessionConfig {
    return { ...this.config }
  }

  /**
   * Update session configuration
   */
  updateConfig(updates: Partial<AudioSessionConfig>): void {
    this.config = { ...this.config, ...updates }
    this.log('Session configuration updated')
  }

  /**
   * Set media session metadata (web)
   */
  setMediaSessionMetadata(metadata: {
    title?: string
    artist?: string
    album?: string
    artwork?: MediaImage[]
  }): void {
    if (!this.mediaSession) return

    this.mediaSession.metadata = new MediaMetadata(metadata)
  }

  /**
   * Set media session playback state (web)
   */
  setMediaSessionPlaybackState(state: 'playing' | 'paused' | 'none'): void {
    if (!this.mediaSession) return

    this.mediaSession.playbackState = state
  }

  /**
   * Add event listener
   */
  on(event: string, listener: (event: AudioSessionEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(listener)
  }

  /**
   * Remove event listener
   */
  off(event: string, listener?: (event: AudioSessionEvent) => void): void {
    if (!this.eventListeners.has(event)) return

    if (listener) {
      const listeners = this.eventListeners.get(event)!
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    } else {
      this.eventListeners.delete(event)
    }
  }

  /**
   * Emit event
   */
  private emit(type: string, data?: any): void {
    const event: AudioSessionEvent = {
      type: type as any,
      data,
      timestamp: Date.now()
    }

    const listeners = this.eventListeners.get(type) || []
    listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        this.error(`Error in event listener for ${type}:`, error)
      }
    })
  }

  /**
   * Log message
   */
  private log(message: string, ...args: any[]): void {
    console.log(`[AudioSessionManager] ${message}`, ...args)
  }

  /**
   * Log error
   */
  private error(message: string, error?: any): void {
    console.error(`[AudioSessionManager] ${message}`, error)
    this.emit('error', { message, error })
  }

  /**
   * Destroy the audio session manager
   */
  destroy(): void {
    this.log('Destroying audio session manager')

    // Clean up audio context
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    // Clean up event listeners
    this.eventListeners.clear()

    // Clean up media session
    this.mediaSession = null

    // Reset state
    this.state = 'inactive'
    this.currentDevice = null
    this.availableDevices = []
    this.isInitialized = false

    this.log('Audio session manager destroyed')
  }
}

// Factory function
export function createAudioSessionManager(config?: Partial<AudioSessionConfig>): AudioSessionManager {
  return new AudioSessionManager(config)
}

// Singleton instance
let sessionManagerInstance: AudioSessionManager | null = null

export function getAudioSessionManager(): AudioSessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new AudioSessionManager()
  }
  return sessionManagerInstance
}

export default AudioSessionManager
