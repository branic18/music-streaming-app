/**
 * Simplified unit tests for enhanced streaming SDK wrapper
 */

import { StreamingSDKWrapper, EnhancedStreamingSDKManager, CircuitBreaker } from './streaming-sdk-wrapper'
import { MockSDK } from './streaming-sdk'

// Mock error handler
jest.mock('@/lib/error/error-handler', () => ({
  errorHandler: {
    handleError: jest.fn(),
  },
}))

describe('StreamingSDKWrapper', () => {
  let mockSDK: MockSDK
  let wrapper: StreamingSDKWrapper

  beforeEach(() => {
    mockSDK = new MockSDK()
    wrapper = new StreamingSDKWrapper(mockSDK, {
      maxRetries: 2,
      baseDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2,
      retryableErrors: [500, 502, 503],
      retryableErrorMessages: ['Network error', 'Timeout']
    })
  })

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const config = {
        provider: 'mock' as const,
        quality: 'medium' as const,
        enableDRM: false,
        enableOffline: false,
        maxBitrate: 320,
        bufferSize: 10
      }

      await expect(wrapper.initialize(config)).resolves.not.toThrow()
    })

    it('should forward events from underlying SDK', (done) => {
      wrapper.on('ready', (event) => {
        expect(event.type).toBe('ready')
        done()
      })

      mockSDK.emit('ready', { provider: 'mock' })
    })
  })

  describe('Retry Logic', () => {
    it('should retry on retryable errors', async () => {
      let attemptCount = 0
      const originalSearch = mockSDK.search.bind(mockSDK)
      
      mockSDK.search = jest.fn().mockImplementation(async () => {
        attemptCount++
        if (attemptCount < 3) {
          throw new Error('Network error')
        }
        return originalSearch()
      })

      const result = await wrapper.search('test', ['track'])
      
      expect(attemptCount).toBe(3)
      expect(result).toBeDefined()
    })

    it('should not retry on non-retryable errors', async () => {
      let attemptCount = 0
      const originalSearch = mockSDK.search.bind(mockSDK)
      
      mockSDK.search = jest.fn().mockImplementation(async () => {
        attemptCount++
        throw new Error('Authentication failed')
      })

      await expect(wrapper.search('test', ['track'])).rejects.toThrow('Authentication failed')
      expect(attemptCount).toBe(1)
    })

    it('should respect max retries', async () => {
      let attemptCount = 0
      
      mockSDK.search = jest.fn().mockImplementation(async () => {
        attemptCount++
        throw new Error('Network error')
      })

      await expect(wrapper.search('test', ['track'])).rejects.toThrow('Network error')
      expect(attemptCount).toBe(3) // 1 initial + 2 retries
    })

    it('should emit retry events', (done) => {
      let retryEventCount = 0
      
      wrapper.on('retry', (event) => {
        retryEventCount++
        expect(event.data.method).toBe('search')
        expect(event.data.attempt).toBeGreaterThan(0)
        expect(event.data.maxRetries).toBe(2)
        
        if (retryEventCount === 2) {
          done()
        }
      })

      mockSDK.search = jest.fn().mockImplementation(async () => {
        throw new Error('Network error')
      })

      wrapper.search('test', ['track']).catch(() => {
        // Expected to fail
      })
    })
  })

  describe('Circuit Breaker', () => {
    it('should open circuit after failure threshold', async () => {
      const circuitBreakerWrapper = new StreamingSDKWrapper(mockSDK, {
        maxRetries: 0,
        baseDelay: 10,
        maxDelay: 100,
        backoffMultiplier: 2,
        retryableErrors: [],
        retryableErrorMessages: []
      }, {
        failureThreshold: 2,
        recoveryTimeout: 100,
        monitoringPeriod: 1000
      })

      // Cause failures
      mockSDK.search = jest.fn().mockImplementation(async () => {
        throw new Error('Service unavailable')
      })

      // First failure
      await expect(circuitBreakerWrapper.search('test', ['track'])).rejects.toThrow()
      
      // Second failure should open circuit
      await expect(circuitBreakerWrapper.search('test', ['track'])).rejects.toThrow()
      
      // Third call should be rejected by circuit breaker
      await expect(circuitBreakerWrapper.search('test', ['track'])).rejects.toThrow('Circuit breaker is open')
    })

    it('should recover after timeout', async () => {
      const circuitBreakerWrapper = new StreamingSDKWrapper(mockSDK, {
        maxRetries: 0,
        baseDelay: 10,
        maxDelay: 100,
        backoffMultiplier: 2,
        retryableErrors: [],
        retryableErrorMessages: []
      }, {
        failureThreshold: 1,
        recoveryTimeout: 50,
        monitoringPeriod: 1000
      })

      // Cause initial failure
      mockSDK.search = jest.fn().mockImplementation(async () => {
        throw new Error('Service unavailable')
      })

      await expect(circuitBreakerWrapper.search('test', ['track'])).rejects.toThrow()
      
      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 60))
      
      // Should now be in half-open state and allow the call
      await expect(circuitBreakerWrapper.search('test', ['track'])).rejects.toThrow('Service unavailable')
    })
  })

  describe('Request Tracking', () => {
    it('should track active requests', async () => {
      const config = {
        provider: 'mock' as const,
        quality: 'medium' as const,
        enableDRM: false,
        enableOffline: false,
        maxBitrate: 320,
        bufferSize: 10
      }

      await wrapper.initialize(config)

      // Start a request
      const searchPromise = wrapper.search('test', ['track'])
      
      // Check active requests
      const activeRequests = wrapper.getActiveRequests()
      expect(activeRequests.length).toBeGreaterThan(0)
      expect(activeRequests[0].method).toBe('search')

      // Wait for completion
      await searchPromise
      
      // Should be no active requests now
      expect(wrapper.getActiveRequests().length).toBe(0)
    })

    it('should provide request statistics', async () => {
      const config = {
        provider: 'mock' as const,
        quality: 'medium' as const,
        enableDRM: false,
        enableOffline: false,
        maxBitrate: 320,
        bufferSize: 10
      }

      await wrapper.initialize(config)

      const stats = wrapper.getRequestStats()
      expect(stats).toHaveProperty('activeRequests')
      expect(stats).toHaveProperty('circuitBreakerState')
      expect(stats).toHaveProperty('failureCount')
      expect(stats.circuitBreakerState).toBe('closed')
      expect(stats.failureCount).toBe(0)
    })
  })

  describe('Configuration', () => {
    it('should update retry configuration', () => {
      const newConfig = {
        maxRetries: 5,
        baseDelay: 200
      }

      wrapper.updateRetryConfig(newConfig)
      
      const config = wrapper.getRetryConfig()
      expect(config.maxRetries).toBe(5)
      expect(config.baseDelay).toBe(200)
    })

    it('should get current retry configuration', () => {
      const config = wrapper.getRetryConfig()
      
      expect(config).toHaveProperty('maxRetries')
      expect(config).toHaveProperty('baseDelay')
      expect(config).toHaveProperty('maxDelay')
      expect(config).toHaveProperty('backoffMultiplier')
      expect(config).toHaveProperty('retryableErrors')
      expect(config).toHaveProperty('retryableErrorMessages')
    })
  })

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      mockSDK.search = jest.fn().mockImplementation(async () => {
        throw new Error('Authentication required')
      })

      await expect(wrapper.search('test', ['track'])).rejects.toThrow('Authentication required')
    })

    it('should handle network timeouts', async () => {
      mockSDK.search = jest.fn().mockImplementation(async () => {
        throw new Error('Timeout')
      })

      await expect(wrapper.search('test', ['track'])).rejects.toThrow('Timeout')
    })
  })
})

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 2,
      recoveryTimeout: 100,
      monitoringPeriod: 1000
    })
  })

  it('should start in closed state', () => {
    expect(circuitBreaker.getState()).toBe('closed')
    expect(circuitBreaker.getFailureCount()).toBe(0)
  })

  it('should track failures', async () => {
    const failingOperation = jest.fn().mockRejectedValue(new Error('Test error'))

    await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('Test error')
    expect(circuitBreaker.getFailureCount()).toBe(1)
    expect(circuitBreaker.getState()).toBe('closed')
  })

  it('should open after failure threshold', async () => {
    const failingOperation = jest.fn().mockRejectedValue(new Error('Test error'))

    // First failure
    await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow()
    expect(circuitBreaker.getState()).toBe('closed')

    // Second failure should open circuit
    await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow()
    expect(circuitBreaker.getState()).toBe('open')
  })

  it('should recover after success', async () => {
    const failingOperation = jest.fn().mockRejectedValue(new Error('Test error'))
    const succeedingOperation = jest.fn().mockResolvedValue('success')

    // Cause failure
    await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow()
    expect(circuitBreaker.getState()).toBe('closed')

    // Success should reset failure count
    const result = await circuitBreaker.execute(succeedingOperation)
    expect(result).toBe('success')
    expect(circuitBreaker.getFailureCount()).toBe(0)
    expect(circuitBreaker.getState()).toBe('closed')
  })
})

describe('EnhancedStreamingSDKManager', () => {
  let manager: EnhancedStreamingSDKManager

  beforeEach(() => {
    manager = EnhancedStreamingSDKManager.getInstance()
    // Reset the manager state
    ;(manager as any).wrapper = null
    ;(manager as any).config = null
  })

  it('should be singleton', () => {
    const instance1 = EnhancedStreamingSDKManager.getInstance()
    const instance2 = EnhancedStreamingSDKManager.getInstance()
    
    expect(instance1).toBe(instance2)
  })

  it('should initialize with wrapper', async () => {
    const config = {
      provider: 'mock' as const,
      quality: 'medium' as const,
      enableDRM: false,
      enableOffline: false,
      maxBitrate: 320,
      bufferSize: 10
    }

    await expect(manager.initialize(config)).resolves.not.toThrow()
    
    const wrapper = manager.getWrapper()
    expect(wrapper).toBeDefined()
    expect(wrapper.constructor.name).toBe('StreamingSDKWrapper')
  })

  it('should throw error when wrapper not initialized', () => {
    expect(() => manager.getWrapper()).toThrow('Streaming SDK wrapper not initialized')
  })

  it('should provide statistics', async () => {
    const config = {
      provider: 'mock' as const,
      quality: 'medium' as const,
      enableDRM: false,
      enableOffline: false,
      maxBitrate: 320,
      bufferSize: 10
    }

    await manager.initialize(config)
    
    const stats = manager.getStats()
    expect(stats).toHaveProperty('requestStats')
    expect(stats).toHaveProperty('retryConfig')
    expect(stats.requestStats).toHaveProperty('activeRequests')
    expect(stats.requestStats).toHaveProperty('circuitBreakerState')
    expect(stats.requestStats).toHaveProperty('failureCount')
  })

  it('should switch providers', async () => {
    const initialConfig = {
      provider: 'mock' as const,
      quality: 'medium' as const,
      enableDRM: false,
      enableOffline: false,
      maxBitrate: 320,
      bufferSize: 10
    }

    await manager.initialize(initialConfig)
    
    const newConfig = {
      provider: 'mock' as const,
      quality: 'high' as const,
      enableDRM: true,
      enableOffline: true,
      maxBitrate: 320,
      bufferSize: 10
    }

    await expect(manager.switchProvider('mock', newConfig)).resolves.not.toThrow()
    
    const updatedConfig = manager.getConfig()
    expect(updatedConfig?.quality).toBe('high')
    expect(updatedConfig?.enableDRM).toBe(true)
    expect(updatedConfig?.enableOffline).toBe(true)
  })
})
