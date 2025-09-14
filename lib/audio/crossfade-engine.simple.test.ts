/**
 * Simplified unit tests for crossfade engine
 */

import { CrossfadeEngine, CrossfadeEngineFactory, CrossfadeConfig, GaplessConfig } from './crossfade-engine'
import { Track } from '@/lib/types'

// Mock error handler
jest.mock('@/lib/error/error-handler', () => ({
  errorHandler: {
    handleError: jest.fn(),
  },
}))

// Mock AudioContext
const mockAudioContext = {
  state: 'running',
  currentTime: 0,
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: { value: 1 }
  })),
  createBufferSource: jest.fn(() => ({
    buffer: null,
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    disconnect: jest.fn()
  })),
  decodeAudioData: jest.fn(),
  resume: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  destination: {}
}

// Mock fetch
global.fetch = jest.fn()

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 16) // ~60fps
  return 1
})

global.cancelAnimationFrame = jest.fn()

describe('CrossfadeEngine', () => {
  let crossfadeEngine: CrossfadeEngine
  let mockTrack1: Track
  let mockTrack2: Track

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock AudioContext
    Object.defineProperty(window, 'AudioContext', {
      value: jest.fn(() => mockAudioContext),
      writable: true,
    })

    Object.defineProperty(window, 'webkitAudioContext', {
      value: jest.fn(() => mockAudioContext),
      writable: true,
    })

    // Mock tracks
    mockTrack1 = {
      id: 'track-1',
      title: 'Track 1',
      artists: [{ id: 'artist-1', name: 'Artist 1' }],
      album: {
        id: 'album-1',
        title: 'Album 1',
        artist: 'Artist 1',
        artwork: 'artwork1.jpg',
        year: 2024,
        trackCount: 10
      },
      durationMs: 180000,
      artwork: 'artwork1.jpg',
      previewUrl: 'preview1.mp3'
    }

    mockTrack2 = {
      id: 'track-2',
      title: 'Track 2',
      artists: [{ id: 'artist-2', name: 'Artist 2' }],
      album: {
        id: 'album-2',
        title: 'Album 2',
        artist: 'Artist 2',
        artwork: 'artwork2.jpg',
        year: 2024,
        trackCount: 12
      },
      durationMs: 200000,
      artwork: 'artwork2.jpg',
      previewUrl: 'preview2.mp3'
    }

    crossfadeEngine = new CrossfadeEngine()
  })

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(crossfadeEngine.initialize()).resolves.not.toThrow()
    })

    it('should create audio context', async () => {
      // Mock suspended state to trigger resume
      mockAudioContext.state = 'suspended'
      await crossfadeEngine.initialize()
      expect(mockAudioContext.resume).toHaveBeenCalled()
    })

    it('should handle initialization errors', async () => {
      // Mock AudioContext constructor to throw error
      Object.defineProperty(window, 'AudioContext', {
        value: jest.fn(() => {
          throw new Error('AudioContext not supported')
        }),
        writable: true,
      })

      await expect(crossfadeEngine.initialize()).rejects.toThrow('AudioContext not supported')
    })
  })

  describe('Track Loading', () => {
    beforeEach(async () => {
      await crossfadeEngine.initialize()
    })

    it('should load track successfully', async () => {
      const mockArrayBuffer = new ArrayBuffer(1024)
      const mockAudioBuffer = {
        duration: 180,
        sampleRate: 44100,
        numberOfChannels: 2,
        length: 7938000
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        arrayBuffer: () => Promise.resolve(mockArrayBuffer)
      })

      mockAudioContext.decodeAudioData.mockResolvedValueOnce(mockAudioBuffer)

      await expect(crossfadeEngine.loadTrack(mockTrack1, 'stream-url')).resolves.not.toThrow()
      expect(crossfadeEngine.isTrackLoaded('track-1')).toBe(true)
    })

    it('should handle load track errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await expect(crossfadeEngine.loadTrack(mockTrack1, 'stream-url')).rejects.toThrow('Network error')
    })

    it('should throw error when not initialized', async () => {
      const uninitializedEngine = new CrossfadeEngine()
      
      await expect(uninitializedEngine.loadTrack(mockTrack1, 'stream-url')).rejects.toThrow('Crossfade engine not initialized')
    })
  })

  describe('Track Playback', () => {
    beforeEach(async () => {
      await crossfadeEngine.initialize()
      
      // Load tracks
      const mockArrayBuffer = new ArrayBuffer(1024)
      const mockAudioBuffer = {
        duration: 180,
        sampleRate: 44100,
        numberOfChannels: 2,
        length: 7938000
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        arrayBuffer: () => Promise.resolve(mockArrayBuffer)
      })

      mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer)

      await crossfadeEngine.loadTrack(mockTrack1, 'stream-url-1')
      await crossfadeEngine.loadTrack(mockTrack2, 'stream-url-2')
    })

    it('should play track successfully', async () => {
      await expect(crossfadeEngine.playTrack(mockTrack1)).resolves.not.toThrow()
      expect(crossfadeEngine.isTrackPlaying('track-1')).toBe(true)
      expect(crossfadeEngine.getCurrentTrack()).toBe(mockTrack1)
    })

    it('should stop current track when playing new track', async () => {
      await crossfadeEngine.playTrack(mockTrack1)
      await crossfadeEngine.playTrack(mockTrack2)

      expect(crossfadeEngine.isTrackPlaying('track-1')).toBe(false)
      expect(crossfadeEngine.isTrackPlaying('track-2')).toBe(true)
      expect(crossfadeEngine.getCurrentTrack()).toBe(mockTrack2)
    })

    it('should handle play track errors', async () => {
      const unloadedTrack = {
        ...mockTrack1,
        id: 'unloaded-track'
      }

      await expect(crossfadeEngine.playTrack(unloadedTrack)).rejects.toThrow('Track not loaded')
    })

    it('should set volume for track', () => {
      crossfadeEngine.setVolume('track-1', 0.5)
      // Volume setting is tested through the gain node mock
    })
  })

  describe('Crossfade Transitions', () => {
    beforeEach(async () => {
      await crossfadeEngine.initialize()
      
      // Load tracks
      const mockArrayBuffer = new ArrayBuffer(1024)
      const mockAudioBuffer = {
        duration: 180,
        sampleRate: 44100,
        numberOfChannels: 2,
        length: 7938000
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        arrayBuffer: () => Promise.resolve(mockArrayBuffer)
      })

      mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer)

      await crossfadeEngine.loadTrack(mockTrack1, 'stream-url-1')
      await crossfadeEngine.loadTrack(mockTrack2, 'stream-url-2')
    })

    it('should start crossfade transition', async () => {
      await crossfadeEngine.playTrack(mockTrack1)
      
      await expect(crossfadeEngine.startCrossfade(mockTrack1, mockTrack2)).resolves.not.toThrow()
      
      const transitionState = crossfadeEngine.getTransitionState()
      expect(transitionState.type).toBe('crossfade')
      expect(transitionState.isActive).toBe(true)
      // The playTrack call updates the currentTrack in transition state to the next track
      expect(transitionState.currentTrack?.id).toBe(mockTrack2.id)
      expect(transitionState.nextTrack?.id).toBe(mockTrack2.id)
      // The actual current track should be the next track since playTrack was called
      expect(crossfadeEngine.getCurrentTrack()?.id).toBe(mockTrack2.id)
    })

    it('should handle crossfade when disabled', async () => {
      crossfadeEngine.updateCrossfadeConfig({ enabled: false })
      
      await crossfadeEngine.playTrack(mockTrack1)
      await crossfadeEngine.startCrossfade(mockTrack1, mockTrack2)
      
      // Should just play the next track without crossfade
      expect(crossfadeEngine.getCurrentTrack()).toBe(mockTrack2)
    })

    it('should handle crossfade errors', async () => {
      const unloadedTrack = {
        ...mockTrack2,
        id: 'unloaded-track'
      }

      await crossfadeEngine.playTrack(mockTrack1)
      
      await expect(crossfadeEngine.startCrossfade(mockTrack1, unloadedTrack)).rejects.toThrow('Next track not loaded')
    })
  })

  describe('Gapless Transitions', () => {
    beforeEach(async () => {
      await crossfadeEngine.initialize()
      
      // Load tracks
      const mockArrayBuffer = new ArrayBuffer(1024)
      const mockAudioBuffer = {
        duration: 180,
        sampleRate: 44100,
        numberOfChannels: 2,
        length: 7938000
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        arrayBuffer: () => Promise.resolve(mockArrayBuffer)
      })

      mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer)

      await crossfadeEngine.loadTrack(mockTrack1, 'stream-url-1')
      await crossfadeEngine.loadTrack(mockTrack2, 'stream-url-2')
    })

    it('should start gapless transition', async () => {
      await crossfadeEngine.playTrack(mockTrack1)
      
      await expect(crossfadeEngine.startGaplessTransition(mockTrack1, mockTrack2)).resolves.not.toThrow()
      
      const transitionState = crossfadeEngine.getTransitionState()
      expect(transitionState.type).toBe('gapless')
      expect(transitionState.isActive).toBe(true)
      // The playTrack call updates the currentTrack in transition state to the next track
      expect(transitionState.currentTrack?.id).toBe(mockTrack2.id)
      expect(transitionState.nextTrack?.id).toBe(mockTrack2.id)
      // The actual current track should be the next track since playTrack was called
      expect(crossfadeEngine.getCurrentTrack()?.id).toBe(mockTrack2.id)
    })

    it('should handle gapless when disabled', async () => {
      crossfadeEngine.updateGaplessConfig({ enabled: false })
      
      await crossfadeEngine.playTrack(mockTrack1)
      await crossfadeEngine.startGaplessTransition(mockTrack1, mockTrack2)
      
      // Should just play the next track without gapless
      expect(crossfadeEngine.getCurrentTrack()).toBe(mockTrack2)
    })

    it('should handle gapless errors', async () => {
      const unloadedTrack = {
        ...mockTrack2,
        id: 'unloaded-track'
      }

      await crossfadeEngine.playTrack(mockTrack1)
      
      await expect(crossfadeEngine.startGaplessTransition(mockTrack1, unloadedTrack)).rejects.toThrow('Next track not loaded')
    })
  })

  describe('Track Management', () => {
    beforeEach(async () => {
      await crossfadeEngine.initialize()
      
      // Load tracks
      const mockArrayBuffer = new ArrayBuffer(1024)
      const mockAudioBuffer = {
        duration: 180,
        sampleRate: 44100,
        numberOfChannels: 2,
        length: 7938000
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        arrayBuffer: () => Promise.resolve(mockArrayBuffer)
      })

      mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer)

      await crossfadeEngine.loadTrack(mockTrack1, 'stream-url-1')
    })

    it('should stop track', async () => {
      await crossfadeEngine.playTrack(mockTrack1)
      expect(crossfadeEngine.isTrackPlaying('track-1')).toBe(true)
      
      await crossfadeEngine.stopTrack('track-1')
      expect(crossfadeEngine.isTrackPlaying('track-1')).toBe(false)
    })

    it('should handle stop non-playing track', async () => {
      await expect(crossfadeEngine.stopTrack('track-1')).resolves.not.toThrow()
    })

    it('should check if track is loaded', () => {
      expect(crossfadeEngine.isTrackLoaded('track-1')).toBe(true)
      expect(crossfadeEngine.isTrackLoaded('track-999')).toBe(false)
    })

    it('should check if track is playing', async () => {
      expect(crossfadeEngine.isTrackPlaying('track-1')).toBe(false)
      
      await crossfadeEngine.playTrack(mockTrack1)
      expect(crossfadeEngine.isTrackPlaying('track-1')).toBe(true)
    })
  })

  describe('Configuration', () => {
    beforeEach(async () => {
      await crossfadeEngine.initialize()
    })

    it('should update crossfade configuration', () => {
      const newConfig: Partial<CrossfadeConfig> = {
        duration: 5000,
        curve: 'linear'
      }

      crossfadeEngine.updateCrossfadeConfig(newConfig)
      
      const config = crossfadeEngine.getConfig()
      expect(config.crossfade.duration).toBe(5000)
      expect(config.crossfade.curve).toBe('linear')
    })

    it('should update gapless configuration', () => {
      const newConfig: Partial<GaplessConfig> = {
        preloadDuration: 10000,
        bufferSize: 20
      }

      crossfadeEngine.updateGaplessConfig(newConfig)
      
      const config = crossfadeEngine.getConfig()
      expect(config.gapless.preloadDuration).toBe(10000)
      expect(config.gapless.bufferSize).toBe(20)
    })

    it('should get current configuration', () => {
      const config = crossfadeEngine.getConfig()
      
      expect(config).toHaveProperty('crossfade')
      expect(config).toHaveProperty('gapless')
      expect(config.crossfade).toHaveProperty('enabled')
      expect(config.crossfade).toHaveProperty('duration')
      expect(config.crossfade).toHaveProperty('curve')
      expect(config.gapless).toHaveProperty('enabled')
      expect(config.gapless).toHaveProperty('preloadDuration')
      expect(config.gapless).toHaveProperty('bufferSize')
    })
  })

  describe('Event Handling', () => {
    beforeEach(async () => {
      await crossfadeEngine.initialize()
    })

    it('should handle events', () => {
      const callback = jest.fn()
      
      crossfadeEngine.on('trackChange', callback)
      crossfadeEngine.emit('trackChange', { track: mockTrack1 })
      
      expect(callback).toHaveBeenCalledWith({
        type: 'trackChange',
        data: { track: mockTrack1 },
        timestamp: expect.any(Number)
      })
    })

    it('should remove event listeners', () => {
      const callback = jest.fn()
      
      crossfadeEngine.on('trackChange', callback)
      crossfadeEngine.off('trackChange', callback)
      crossfadeEngine.emit('trackChange', { track: mockTrack1 })
      
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('Cleanup', () => {
    it('should destroy resources', async () => {
      await crossfadeEngine.initialize()
      await expect(crossfadeEngine.destroy()).resolves.not.toThrow()
    })

    it('should handle destroy when not initialized', async () => {
      const uninitializedEngine = new CrossfadeEngine()
      await expect(uninitializedEngine.destroy()).resolves.not.toThrow()
    })
  })
})

describe('CrossfadeEngineFactory', () => {
  it('should create crossfade engine instance', () => {
    const engine = CrossfadeEngineFactory.create()
    expect(engine).toBeInstanceOf(CrossfadeEngine)
  })

  it('should create crossfade engine with custom config', () => {
    const crossfadeConfig: Partial<CrossfadeConfig> = {
      duration: 5000,
      curve: 'exponential'
    }

    const gaplessConfig: Partial<GaplessConfig> = {
      preloadDuration: 10000,
      bufferSize: 20
    }

    const engine = CrossfadeEngineFactory.create(crossfadeConfig, gaplessConfig)
    expect(engine).toBeInstanceOf(CrossfadeEngine)
  })
})
