/**
 * Simplified unit tests for playback controller
 */

import { PlaybackController, PlaybackControllerFactory, PlaybackControllerManager } from './playback-controller'
import { AudioPlaybackEngine } from './playback-engine'
import { StreamingSDKWrapper } from './streaming-sdk-wrapper'
import { Track } from '@/lib/types'

// Mock AudioPlaybackEngine
jest.mock('./playback-engine')
const MockAudioPlaybackEngine = AudioPlaybackEngine as jest.MockedClass<typeof AudioPlaybackEngine>

// Mock StreamingSDKWrapper
jest.mock('./streaming-sdk-wrapper')
const MockStreamingSDKWrapper = StreamingSDKWrapper as jest.MockedClass<typeof StreamingSDKWrapper>

// Mock error handler
jest.mock('@/lib/error/error-handler', () => ({
  errorHandler: {
    handleError: jest.fn(),
  },
}))

describe('PlaybackController', () => {
  let mockAudioEngine: jest.Mocked<AudioPlaybackEngine>
  let mockStreamingSDK: jest.Mocked<StreamingSDKWrapper>
  let controller: PlaybackController

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
    durationMs: 180000, // 3 minutes
    artwork: 'test-artwork.jpg',
    previewUrl: 'test-preview.mp3'
  }

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Create mock instances
    mockAudioEngine = {
      initialize: jest.fn().mockResolvedValue(undefined),
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      seek: jest.fn().mockResolvedValue(undefined),
      setVolume: jest.fn().mockResolvedValue(undefined),
      setPlaybackRate: jest.fn().mockResolvedValue(undefined),
      loadTrack: jest.fn().mockResolvedValue(undefined),
      preloadNextTrack: jest.fn().mockResolvedValue(undefined),
      applyAudioSettings: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      getState: jest.fn().mockReturnValue({
        isPlaying: false,
        isPaused: false,
        isBuffering: false,
        currentTrack: null,
        currentTime: 0,
        duration: 0,
        volume: 0.7,
        isMuted: false,
        playbackRate: 1.0
      })
    } as any

    mockStreamingSDK = {
      getTrackStream: jest.fn().mockResolvedValue({
        track: mockTrack,
        streamUrl: 'test-stream-url',
        quality: 'high',
        bitrate: 320,
        duration: 180,
        isDRMProtected: false,
        isOfflineAvailable: false
      }),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    } as any

    // Create controller
    controller = new PlaybackController(mockAudioEngine, mockStreamingSDK)
  })

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(controller.initialize()).resolves.not.toThrow()
      expect(mockAudioEngine.initialize).toHaveBeenCalled()
    })

    it('should set default volume on initialization', async () => {
      await controller.initialize()
      expect(mockAudioEngine.setVolume).toHaveBeenCalledWith(0.7)
    })

    it('should handle initialization errors', async () => {
      mockAudioEngine.initialize.mockRejectedValue(new Error('Initialization failed'))
      
      await expect(controller.initialize()).rejects.toThrow('Initialization failed')
    })
  })

  describe('Playback Controls', () => {
    beforeEach(async () => {
      await controller.initialize()
    })

    it('should play a track', async () => {
      await controller.play(mockTrack)
      
      expect(mockStreamingSDK.getTrackStream).toHaveBeenCalledWith('track-1')
      expect(mockAudioEngine.loadTrack).toHaveBeenCalledWith(mockTrack, 'test-stream-url')
      expect(mockAudioEngine.play).toHaveBeenCalled()
    })

    it('should pause playback', async () => {
      await controller.pause()
      
      expect(mockAudioEngine.pause).toHaveBeenCalled()
    })

    it('should resume playback', async () => {
      await controller.resume()
      
      expect(mockAudioEngine.resume).toHaveBeenCalled()
    })

    it('should stop playback', async () => {
      await controller.stop()
      
      expect(mockAudioEngine.stop).toHaveBeenCalled()
    })

    it('should seek to specific time', async () => {
      await controller.seek(60)
      
      expect(mockAudioEngine.seek).toHaveBeenCalledWith(60)
    })

    it('should seek forward', async () => {
      // Set current time and duration in controller state
      ;(controller as any).state.currentTime = 30
      ;(controller as any).state.duration = 180
      
      await controller.seekForward()
      
      expect(mockAudioEngine.seek).toHaveBeenCalledWith(40) // 30 + 10 (seekStep)
    })

    it('should seek backward', async () => {
      // Set current time in controller state
      ;(controller as any).state.currentTime = 30
      
      await controller.seekBackward()
      
      expect(mockAudioEngine.seek).toHaveBeenCalledWith(20) // 30 - 10 (seekStep)
    })
  })

  describe('Volume Controls', () => {
    beforeEach(async () => {
      await controller.initialize()
    })

    it('should set volume', async () => {
      await controller.setVolume(0.5)
      
      expect(mockAudioEngine.setVolume).toHaveBeenCalledWith(0.5)
    })

    it('should clamp volume to valid range', async () => {
      await controller.setVolume(1.5) // Above max
      expect(mockAudioEngine.setVolume).toHaveBeenCalledWith(1.0)
      
      await controller.setVolume(-0.1) // Below min
      expect(mockAudioEngine.setVolume).toHaveBeenCalledWith(0)
    })

    it('should increase volume', async () => {
      // Set volume in controller state
      ;(controller as any).state.volume = 0.5
      
      await controller.volumeUp()
      
      expect(mockAudioEngine.setVolume).toHaveBeenCalledWith(0.6) // 0.5 + 0.1 (volumeStep)
    })

    it('should decrease volume', async () => {
      // Set volume in controller state
      ;(controller as any).state.volume = 0.5
      
      await controller.volumeDown()
      
      expect(mockAudioEngine.setVolume).toHaveBeenCalledWith(0.4) // 0.5 - 0.1 (volumeStep)
    })

    it('should toggle mute', async () => {
      // Mock the audio engine's getState to return specific volume and mute state
      mockAudioEngine.getState.mockReturnValue({
        isPlaying: false,
        isPaused: false,
        isBuffering: false,
        currentTrack: null,
        currentTime: 0,
        duration: 0,
        volume: 0.5,
        isMuted: false,
        playbackRate: 1.0
      })
      
      await controller.toggleMute()
      
      expect(mockAudioEngine.setVolume).toHaveBeenCalledWith(0)
    })
  })

  describe('Track Management', () => {
    beforeEach(async () => {
      await controller.initialize()
    })

    it('should load a track', async () => {
      await controller.loadTrack(mockTrack)
      
      expect(mockStreamingSDK.getTrackStream).toHaveBeenCalledWith('track-1')
      expect(mockAudioEngine.loadTrack).toHaveBeenCalledWith(mockTrack, 'test-stream-url')
    })

    it('should preload next track', async () => {
      await controller.preloadNextTrack(mockTrack)
      
      expect(mockStreamingSDK.getTrackStream).toHaveBeenCalledWith('track-1')
      expect(mockAudioEngine.preloadNextTrack).toHaveBeenCalledWith(mockTrack, 'test-stream-url')
    })

    it('should handle preload errors gracefully', async () => {
      mockStreamingSDK.getTrackStream.mockRejectedValue(new Error('Preload failed'))
      
      // Should not throw
      await expect(controller.preloadNextTrack(mockTrack)).resolves.not.toThrow()
    })

    it('should check if track is playing', () => {
      // Set state in controller
      ;(controller as any).state.currentTrack = mockTrack
      ;(controller as any).state.isPlaying = true
      
      expect(controller.isTrackPlaying('track-1')).toBe(true)
      expect(controller.isTrackPlaying('track-2')).toBe(false)
    })
  })

  describe('State Management', () => {
    beforeEach(async () => {
      await controller.initialize()
    })

    it('should get current state', () => {
      const state = controller.getState()
      
      expect(state).toHaveProperty('isPlaying')
      expect(state).toHaveProperty('isPaused')
      expect(state).toHaveProperty('currentTrack')
      expect(state).toHaveProperty('currentTime')
      expect(state).toHaveProperty('duration')
      expect(state).toHaveProperty('volume')
    })

    it('should get current track', () => {
      // Set track in controller state
      ;(controller as any).state.currentTrack = mockTrack
      
      expect(controller.getCurrentTrack()).toBe(mockTrack)
    })

    it('should check if ready', () => {
      expect(controller.isReady()).toBe(true)
    })

    it('should update configuration', () => {
      controller.updateConfig({ seekStep: 15 })
      
      const config = controller.getConfig()
      expect(config.seekStep).toBe(15)
    })
  })

  describe('Event Handling', () => {
    beforeEach(async () => {
      await controller.initialize()
    })

    it('should handle events', () => {
      const callback = jest.fn()
      
      controller.on('play', callback)
      controller.emit('play', { track: mockTrack })
      
      expect(callback).toHaveBeenCalledWith({
        type: 'play',
        data: { track: mockTrack },
        timestamp: expect.any(Number)
      })
    })

    it('should remove event listeners', () => {
      const callback = jest.fn()
      
      controller.on('play', callback)
      controller.off('play', callback)
      controller.emit('play', { track: mockTrack })
      
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      await controller.initialize()
    })

    it('should handle play errors', async () => {
      mockAudioEngine.play.mockRejectedValue(new Error('Play failed'))
      
      await expect(controller.play(mockTrack)).rejects.toThrow('Play failed')
    })

    it('should handle load track errors', async () => {
      mockStreamingSDK.getTrackStream.mockRejectedValue(new Error('Stream failed'))
      
      await expect(controller.loadTrack(mockTrack)).rejects.toThrow('Stream failed')
    })

    it('should handle seek errors', async () => {
      mockAudioEngine.seek.mockRejectedValue(new Error('Seek failed'))
      
      await expect(controller.seek(60)).rejects.toThrow('Seek failed')
    })
  })

  describe('Cleanup', () => {
    it('should destroy resources', async () => {
      await controller.initialize()
      await controller.destroy()
      
      expect(mockAudioEngine.destroy).toHaveBeenCalled()
    })
  })
})

describe('PlaybackControllerFactory', () => {
  it('should create controller with initialization', async () => {
    const mockStreamingSDK = {} as any
    
    const controller = await PlaybackControllerFactory.create(mockStreamingSDK)
    
    expect(controller).toBeInstanceOf(PlaybackController)
    expect(controller.isReady()).toBe(true)
  })
})

describe('PlaybackControllerManager', () => {
  let manager: PlaybackControllerManager

  beforeEach(() => {
    manager = PlaybackControllerManager.getInstance()
  })

  it('should be singleton', () => {
    const instance1 = PlaybackControllerManager.getInstance()
    const instance2 = PlaybackControllerManager.getInstance()
    
    expect(instance1).toBe(instance2)
  })

  it('should initialize controller', async () => {
    const mockStreamingSDK = {} as any
    
    await expect(manager.initialize(mockStreamingSDK)).resolves.not.toThrow()
    
    const controller = manager.getController()
    expect(controller).toBeInstanceOf(PlaybackController)
  })

  it('should throw error when controller not initialized', () => {
    // Reset the manager state
    ;(manager as any).controller = null
    
    expect(() => manager.getController()).toThrow('Playback controller not initialized')
  })

  it('should destroy controller', async () => {
    const mockStreamingSDK = {} as any
    
    await manager.initialize(mockStreamingSDK)
    await manager.destroy()
    
    expect(() => manager.getController()).toThrow('Playback controller not initialized')
  })
})
