/**
 * Enhanced streaming SDK wrapper with advanced error handling and retry logic
 */

import { StreamingSDK, StreamingEvent, StreamingConfig, AuthState, StreamingSearchResults, StreamingTrackInfo } from './streaming-sdk'
import { errorHandler } from '@/lib/error/error-handler'

// Retry configuration
export interface RetryConfig {
  maxRetries: number
  baseDelay: number // Base delay in milliseconds
  maxDelay: number // Maximum delay in milliseconds
  backoffMultiplier: number // Exponential backoff multiplier
  retryableErrors: number[] // HTTP status codes that should be retried
  retryableErrorMessages: string[] // Error messages that should be retried
}

// Circuit breaker configuration
export interface CircuitBreakerConfig {
  failureThreshold: number // Number of failures before opening circuit
  recoveryTimeout: number // Time in milliseconds before attempting recovery
  monitoringPeriod: number // Time window for monitoring failures
}

// Request context for tracking
interface RequestContext {
  id: string
  method: string
  startTime: number
  retryCount: number
  lastError?: Error
}

// Circuit breaker states
type CircuitBreakerState = 'closed' | 'open' | 'half-open'

// Circuit breaker implementation
class CircuitBreaker {
  private state: CircuitBreakerState = 'closed'
  private failureCount = 0
  private lastFailureTime = 0
  private config: CircuitBreakerConfig

  constructor(config: CircuitBreakerConfig) {
    this.config = config
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is open')
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failureCount = 0
    this.state = 'closed'
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open'
    }
  }

  getState(): CircuitBreakerState {
    return this.state
  }

  getFailureCount(): number {
    return this.failureCount
  }
}

// Enhanced streaming SDK wrapper with retry logic and circuit breaker
export class StreamingSDKWrapper {
  private sdk: StreamingSDK
  private retryConfig: RetryConfig
  private circuitBreaker: CircuitBreaker
  private requestQueue: Map<string, RequestContext> = new Map()
  private eventListeners: Map<string, ((event: StreamingEvent) => void)[]> = new Map()

  constructor(sdk: StreamingSDK, retryConfig?: Partial<RetryConfig>, circuitBreakerConfig?: Partial<CircuitBreakerConfig>) {
    this.sdk = sdk
    
    // Default retry configuration
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: [408, 429, 500, 502, 503, 504],
      retryableErrorMessages: [
        'Network error',
        'Timeout',
        'Connection failed',
        'Service unavailable',
        'Rate limit exceeded'
      ],
      ...retryConfig
    }

    // Default circuit breaker configuration
    const defaultCircuitBreakerConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeout: 30000, // 30 seconds
      monitoringPeriod: 60000 // 1 minute
    }

    this.circuitBreaker = new CircuitBreaker({
      ...defaultCircuitBreakerConfig,
      ...circuitBreakerConfig
    })

    // Forward events from underlying SDK
    this.sdk.on('ready', (event) => this.emit('ready', event))
    this.sdk.on('error', (event) => this.emit('error', event))
    this.sdk.on('authRequired', (event) => this.emit('authRequired', event))
  }

  /**
   * Initialize the SDK with retry logic
   */
  async initialize(config: StreamingConfig): Promise<void> {
    return this.executeWithRetry(
      'initialize',
      () => this.sdk.initialize(config)
    )
  }

  /**
   * Authenticate with retry logic
   */
  async authenticate(): Promise<AuthState> {
    return this.executeWithRetry(
      'authenticate',
      () => this.sdk.authenticate()
    )
  }

  /**
   * Refresh authentication with retry logic
   */
  async refreshAuth(): Promise<AuthState> {
    return this.executeWithRetry(
      'refreshAuth',
      () => this.sdk.refreshAuth()
    )
  }

  /**
   * Search with retry logic and caching
   */
  async search(query: string, types: string[], limit = 20, offset = 0): Promise<StreamingSearchResults> {
    return this.executeWithRetry(
      'search',
      () => this.sdk.search(query, types, limit, offset),
      { query, types, limit, offset }
    )
  }

  /**
   * Get track stream with retry logic
   */
  async getTrackStream(trackId: string, quality?: any): Promise<StreamingTrackInfo> {
    return this.executeWithRetry(
      'getTrackStream',
      () => this.sdk.getTrackStream(trackId, quality),
      { trackId, quality }
    )
  }

  /**
   * Get album with retry logic
   */
  async getAlbum(albumId: string): Promise<any> {
    return this.executeWithRetry(
      'getAlbum',
      () => this.sdk.getAlbum(albumId),
      { albumId }
    )
  }

  /**
   * Get artist with retry logic
   */
  async getArtist(artistId: string): Promise<any> {
    return this.executeWithRetry(
      'getArtist',
      () => this.sdk.getArtist(artistId),
      { artistId }
    )
  }

  /**
   * Get playlist with retry logic
   */
  async getPlaylist(playlistId: string): Promise<any> {
    return this.executeWithRetry(
      'getPlaylist',
      () => this.sdk.getPlaylist(playlistId),
      { playlistId }
    )
  }

  /**
   * Get user playlists with retry logic
   */
  async getUserPlaylists(): Promise<any[]> {
    return this.executeWithRetry(
      'getUserPlaylists',
      () => this.sdk.getUserPlaylists()
    )
  }

  /**
   * Create playlist with retry logic
   */
  async createPlaylist(name: string, description?: string): Promise<any> {
    return this.executeWithRetry(
      'createPlaylist',
      () => this.sdk.createPlaylist(name, description),
      { name, description }
    )
  }

  /**
   * Add to playlist with retry logic
   */
  async addToPlaylist(playlistId: string, trackIds: string[]): Promise<void> {
    return this.executeWithRetry(
      'addToPlaylist',
      () => this.sdk.addToPlaylist(playlistId, trackIds),
      { playlistId, trackIds }
    )
  }

  /**
   * Remove from playlist with retry logic
   */
  async removeFromPlaylist(playlistId: string, trackIds: string[]): Promise<void> {
    return this.executeWithRetry(
      'removeFromPlaylist',
      () => this.sdk.removeFromPlaylist(playlistId, trackIds),
      { playlistId, trackIds }
    )
  }

  /**
   * Like track with retry logic
   */
  async likeTrack(trackId: string): Promise<void> {
    return this.executeWithRetry(
      'likeTrack',
      () => this.sdk.likeTrack(trackId),
      { trackId }
    )
  }

  /**
   * Unlike track with retry logic
   */
  async unlikeTrack(trackId: string): Promise<void> {
    return this.executeWithRetry(
      'unlikeTrack',
      () => this.sdk.unlikeTrack(trackId),
      { trackId }
    )
  }

  /**
   * Get liked tracks with retry logic
   */
  async getLikedTracks(): Promise<any[]> {
    return this.executeWithRetry(
      'getLikedTracks',
      () => this.sdk.getLikedTracks()
    )
  }

  /**
   * Download track with retry logic
   */
  async downloadTrack(trackId: string, quality?: any): Promise<Blob> {
    return this.executeWithRetry(
      'downloadTrack',
      () => this.sdk.downloadTrack(trackId, quality),
      { trackId, quality }
    )
  }

  /**
   * Check track availability with retry logic
   */
  async isTrackAvailable(trackId: string): Promise<boolean> {
    return this.executeWithRetry(
      'isTrackAvailable',
      () => this.sdk.isTrackAvailable(trackId),
      { trackId }
    )
  }

  /**
   * Get available qualities with retry logic
   */
  async getAvailableQualities(trackId: string): Promise<any[]> {
    return this.executeWithRetry(
      'getAvailableQualities',
      () => this.sdk.getAvailableQualities(trackId),
      { trackId }
    )
  }

  /**
   * Event handling
   */
  on(event: string, callback: (event: StreamingEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  off(event: string, callback: (event: StreamingEvent) => void): void {
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
      const streamingEvent: StreamingEvent = {
        type: event as any,
        data,
        timestamp: Date.now()
      }
      listeners.forEach(callback => callback(streamingEvent))
    }
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(): CircuitBreakerState {
    return this.circuitBreaker.getState()
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.circuitBreaker.getFailureCount()
  }

  /**
   * Update retry configuration
   */
  updateRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config }
  }

  /**
   * Get current retry configuration
   */
  getRetryConfig(): RetryConfig {
    return { ...this.retryConfig }
  }

  /**
   * Execute operation with retry logic and circuit breaker
   */
  private async executeWithRetry<T>(
    method: string,
    operation: () => Promise<T>,
    context?: any
  ): Promise<T> {
    const requestId = this.generateRequestId()
    const requestContext: RequestContext = {
      id: requestId,
      method,
      startTime: Date.now(),
      retryCount: 0
    }

    this.requestQueue.set(requestId, requestContext)

    try {
      const result = await this.circuitBreaker.execute(async () => {
        return this.retryOperation(operation, requestContext)
      })

      this.requestQueue.delete(requestId)
      return result
    } catch (error) {
      this.requestQueue.delete(requestId)
      
      // Log error with context
      errorHandler.handleError(error as Error, {
        component: 'StreamingSDKWrapper',
        action: method,
        metadata: {
          requestId,
          retryCount: requestContext.retryCount,
          duration: Date.now() - requestContext.startTime,
          context
        }
      })

      throw error
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    requestContext: RequestContext
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        requestContext.retryCount = attempt
        return await operation()
      } catch (error) {
        lastError = error as Error
        requestContext.lastError = lastError

        // Check if error is retryable
        if (!this.isRetryableError(lastError) || attempt === this.retryConfig.maxRetries) {
          throw lastError
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt)
        
        // Emit retry event
        this.emit('retry', {
          method: requestContext.method,
          attempt: attempt + 1,
          maxRetries: this.retryConfig.maxRetries,
          delay,
          error: lastError.message
        })

        // Wait before retry
        await this.sleep(delay)
      }
    }

    throw lastError!
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    // Check for specific error messages
    const errorMessage = error.message.toLowerCase()
    for (const retryableMessage of this.retryConfig.retryableErrorMessages) {
      if (errorMessage.includes(retryableMessage.toLowerCase())) {
        return true
      }
    }

    // Check for HTTP status codes (if available)
    if ('status' in error && typeof error.status === 'number') {
      return this.retryConfig.retryableErrors.includes(error.status)
    }

    // Check for network errors
    if (error.name === 'NetworkError' || error.name === 'TypeError') {
      return true
    }

    return false
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt)
    const jitter = Math.random() * 0.1 * exponentialDelay // Add 10% jitter
    const delay = Math.min(exponentialDelay + jitter, this.retryConfig.maxDelay)
    
    return Math.floor(delay)
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get active requests
   */
  getActiveRequests(): RequestContext[] {
    return Array.from(this.requestQueue.values())
  }

  /**
   * Cancel all active requests
   */
  cancelAllRequests(): void {
    this.requestQueue.clear()
  }

  /**
   * Get request statistics
   */
  getRequestStats(): {
    activeRequests: number
    circuitBreakerState: CircuitBreakerState
    failureCount: number
  } {
    return {
      activeRequests: this.requestQueue.size,
      circuitBreakerState: this.circuitBreaker.getState(),
      failureCount: this.circuitBreaker.getFailureCount()
    }
  }
}

// Enhanced streaming SDK manager with wrapper
export class EnhancedStreamingSDKManager {
  private static instance: EnhancedStreamingSDKManager
  private wrapper: StreamingSDKWrapper | null = null
  private config: StreamingConfig | null = null

  static getInstance(): EnhancedStreamingSDKManager {
    if (!EnhancedStreamingSDKManager.instance) {
      EnhancedStreamingSDKManager.instance = new EnhancedStreamingSDKManager()
    }
    return EnhancedStreamingSDKManager.instance
  }

  async initialize(
    config: StreamingConfig,
    retryConfig?: Partial<RetryConfig>,
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>
  ): Promise<void> {
    this.config = config
    
    // Import the SDK factory dynamically to avoid circular dependencies
    const { StreamingSDKFactory } = await import('./streaming-sdk')
    const sdk = StreamingSDKFactory.create(config.provider)
    
    this.wrapper = new StreamingSDKWrapper(sdk, retryConfig, circuitBreakerConfig)
    
    try {
      await this.wrapper.initialize(config)
    } catch (error) {
      errorHandler.handleError(error as Error, {
        component: 'EnhancedStreamingSDKManager',
        action: 'initialize',
        metadata: { provider: config.provider }
      })
      throw error
    }
  }

  getWrapper(): StreamingSDKWrapper {
    if (!this.wrapper) {
      throw new Error('Streaming SDK wrapper not initialized')
    }
    return this.wrapper
  }

  getConfig(): StreamingConfig | null {
    return this.config
  }

  async switchProvider(
    provider: any,
    config: Partial<StreamingConfig>,
    retryConfig?: Partial<RetryConfig>,
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>
  ): Promise<void> {
    const newConfig: StreamingConfig = {
      ...this.config!,
      ...config,
      provider
    }
    
    await this.initialize(newConfig, retryConfig, circuitBreakerConfig)
  }

  getStats(): {
    requestStats: any
    retryConfig: RetryConfig
  } {
    if (!this.wrapper) {
      throw new Error('Streaming SDK wrapper not initialized')
    }

    return {
      requestStats: this.wrapper.getRequestStats(),
      retryConfig: this.wrapper.getRetryConfig()
    }
  }
}

// Export singleton instance
export const enhancedStreamingSDKManager = EnhancedStreamingSDKManager.getInstance()

// Export types and classes
export {
  CircuitBreaker,
  CircuitBreakerState,
  RequestContext
}
