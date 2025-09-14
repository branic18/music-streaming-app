/**
 * Simplified unit tests for streaming SDK
 */

import { StreamingSDKFactory, StreamingSDKManager, MockSDK } from './streaming-sdk'

// Mock window objects
Object.defineProperty(global, 'window', {
  value: {
    Spotify: {},
    MusicKit: {},
    location: { href: '' },
    document: {
      createElement: jest.fn(() => ({
        src: '',
        onload: null,
        onerror: null
      })),
      head: {
        appendChild: jest.fn()
      }
    }
  },
  writable: true,
})

// Mock fetch
global.fetch = jest.fn()

// Mock error handler
jest.mock('@/lib/error/error-handler', () => ({
  errorHandler: {
    handleError: jest.fn(),
  },
}))

describe('StreamingSDK', () => {
  describe('StreamingSDKFactory', () => {
    it('should create Spottify SDK', () => {
      const sdk = StreamingSDKFactory.create('spotify')
      expect(sdk).toBeDefined()
      expect(sdk.constructor.name).toBe('SpotifySDK')
    })

    it('should create Apple Music SDK', () => {
      const sdk = StreamingSDKFactory.create('apple')
      expect(sdk).toBeDefined()
      expect(sdk.constructor.name).toBe('AppleMusicSDK')
    })

    it('should create Mock SDK', () => {
      const sdk = StreamingSDKFactory.create('mock')
      expect(sdk).toBeDefined()
      expect(sdk.constructor.name).toBe('MockSDK')
    })

    it('should throw error for unsupported provider', () => {
      expect(() => {
        StreamingSDKFactory.create('unsupported' as any)
      }).toThrow('Unsupported streaming provider: unsupported')
    })
  })

  describe('MockSDK', () => {
    let mockSDK: MockSDK

    beforeEach(() => {
      mockSDK = new MockSDK()
    })

    it('should initialize successfully', async () => {
      const config = {
        provider: 'mock' as const,
        quality: 'medium' as const,
        enableDRM: false,
        enableOffline: false,
        maxBitrate: 320,
        bufferSize: 10
      }

      await expect(mockSDK.initialize(config)).resolves.not.toThrow()
    })

    it('should authenticate successfully', async () => {
      const authState = await mockSDK.authenticate()
      
      expect(authState.isAuthenticated).toBe(true)
      expect(authState.accessToken).toBe('mock-token')
      expect(authState.user?.name).toBe('Mock User')
    })

    it('should return empty search results', async () => {
      const results = await mockSDK.search('test query', ['track'])
      
      expect(results.tracks).toEqual([])
      expect(results.albums).toEqual([])
      expect(results.artists).toEqual([])
      expect(results.playlists).toEqual([])
      expect(results.total).toBe(0)
      expect(results.hasMore).toBe(false)
    })

    it('should throw error for track streaming', async () => {
      await expect(mockSDK.getTrackStream('track-id')).rejects.toThrow('Mock SDK - no real streaming available')
    })

    it('should return empty playlists', async () => {
      const playlists = await mockSDK.getUserPlaylists()
      expect(playlists).toEqual([])
    })

    it('should return empty liked tracks', async () => {
      const tracks = await mockSDK.getLikedTracks()
      expect(tracks).toEqual([])
    })

    it('should return available qualities', async () => {
      const qualities = await mockSDK.getAvailableQualities('track-id')
      expect(qualities).toEqual(['low', 'medium', 'high'])
    })

    it('should return true for track availability', async () => {
      const available = await mockSDK.isTrackAvailable('track-id')
      expect(available).toBe(true)
    })

    it('should handle event listeners', () => {
      const callback = jest.fn()
      
      mockSDK.on('test-event', callback)
      mockSDK.emit('test-event', { data: 'test' })
      
      expect(callback).toHaveBeenCalledWith({
        type: 'test-event',
        data: { data: 'test' },
        timestamp: expect.any(Number)
      })
    })

    it('should remove event listeners', () => {
      const callback = jest.fn()
      
      mockSDK.on('test-event', callback)
      mockSDK.off('test-event', callback)
      mockSDK.emit('test-event', { data: 'test' })
      
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('StreamingSDKManager', () => {
    let manager: StreamingSDKManager

    beforeEach(() => {
      manager = StreamingSDKManager.getInstance()
      // Reset the manager state for each test
      ;(manager as any).sdk = null
      ;(manager as any).config = null
    })

    it('should be singleton', () => {
      const instance1 = StreamingSDKManager.getInstance()
      const instance2 = StreamingSDKManager.getInstance()
      
      expect(instance1).toBe(instance2)
    })

    it('should throw error when SDK not initialized', () => {
      expect(() => manager.getSDK()).toThrow('Streaming SDK not initialized')
    })

    it('should initialize with mock provider', async () => {
      const config = {
        provider: 'mock' as const,
        quality: 'medium' as const,
        enableDRM: false,
        enableOffline: false,
        maxBitrate: 320,
        bufferSize: 10
      }

      await expect(manager.initialize(config)).resolves.not.toThrow()
      
      const sdk = manager.getSDK()
      expect(sdk).toBeDefined()
      expect(sdk.constructor.name).toBe('MockSDK')
    })

    it('should return config', async () => {
      const config = {
        provider: 'mock' as const,
        quality: 'medium' as const,
        enableDRM: false,
        enableOffline: false,
        maxBitrate: 320,
        bufferSize: 10
      }

      await manager.initialize(config)
      
      const returnedConfig = manager.getConfig()
      expect(returnedConfig).toEqual(config)
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

  describe('Error Handling', () => {
    it('should handle initialization errors', async () => {
      const manager = StreamingSDKManager.getInstance()
      
      // Mock a provider that will fail
      const originalCreate = StreamingSDKFactory.create
      StreamingSDKFactory.create = jest.fn().mockImplementation(() => {
        throw new Error('Initialization failed')
      })

      const config = {
        provider: 'mock' as const,
        quality: 'medium' as const,
        enableDRM: false,
        enableOffline: false,
        maxBitrate: 320,
        bufferSize: 10
      }

      await expect(manager.initialize(config)).rejects.toThrow('Initialization failed')
      
      // Restore original function
      StreamingSDKFactory.create = originalCreate
    })
  })
})
