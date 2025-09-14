/**
 * Simplified unit tests for audio player hook
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useAudioPlayer, UseAudioPlayerOptions } from './use-audio-player'
import { Track, Queue } from '@/lib/types'

// Mock the audio components
jest.mock('@/lib/audio/playback-engine')
jest.mock('@/lib/audio/playback-controller')
jest.mock('@/lib/audio/streaming-sdk-wrapper')
jest.mock('@/lib/audio/quality-manager')
jest.mock('./use-persistent-state')
jest.mock('./use-audio-quality')

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})

// Mock window event listeners
const mockAddEventListener = jest.fn()
const mockRemoveEventListener = jest.fn()
Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener
})
Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener
})

// Mock track data
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

const mockQueue: Queue = {
  tracks: [mockTrack],
  currentIndex: 0,
  repeatMode: 'off',
  shuffleMode: false,
  shuffleOrder: []
}

// Mock audio components
const mockAudioEngine = {
  initialize: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn(),
  setVolume: jest.fn(),
  setMuted: jest.fn(),
  setPlaybackRate: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
}

const mockPlaybackController = {
  initialize: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn(),
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  stop: jest.fn(),
  next: jest.fn().mockResolvedValue(undefined),
  previous: jest.fn().mockResolvedValue(undefined),
  seek: jest.fn(),
  setVolume: jest.fn(),
  setMuted: jest.fn(),
  setPlaybackRate: jest.fn(),
  playTrack: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  off: jest.fn()
}

const mockStreamingSDK = {
  initialize: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn()
}

const mockQualityManager = {
  initialize: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn(),
  setQuality: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  off: jest.fn()
}

const mockAudioSettings = {
  value: {
    volume: 0.7,
    muted: false,
    eq: { enabled: false, low: 0, mid: 0, high: 0, preset: 'flat' },
    crossfade: { enabled: false, duration: 3000, fadeIn: true, fadeOut: true, curve: 'linear' },
    gapless: { enabled: true, preloadNext: true, preloadDuration: 10000, bufferSize: 30 },
    normalization: { enabled: true, targetLufs: -14, preventClipping: true },
    spatial: { enabled: false, mode: 'stereo', intensity: 0.5 },
    advanced: { sampleRate: 44100, bitDepth: 16, bufferSize: 4096, latency: 0 }
  },
  updateValue: jest.fn()
}

const mockAudioQuality = {
  currentQuality: 'high',
  currentSettings: null,
  networkConditions: null,
  availableQualities: [],
  isLoading: false,
  error: null,
  setQuality: jest.fn(),
  updateSettings: jest.fn(),
  getOptimalQuality: jest.fn(),
  getEstimatedDataUsage: jest.fn(),
  getBandwidthRecommendation: jest.fn(),
  isQualitySupported: jest.fn(),
  isQualityAvailable: jest.fn(),
  formatFileSize: jest.fn(),
  getConnectionTypeIcon: jest.fn()
}

// Setup mocks
beforeEach(() => {
  jest.clearAllMocks()
  
  // Mock constructors
  const { AudioPlaybackEngine } = require('@/lib/audio/playback-engine')
  const { PlaybackController } = require('@/lib/audio/playback-controller')
  const { StreamingSDKWrapper } = require('@/lib/audio/streaming-sdk-wrapper')
  const { QualityManager } = require('@/lib/audio/quality-manager')
  
  AudioPlaybackEngine.mockImplementation(() => mockAudioEngine)
  PlaybackController.mockImplementation(() => mockPlaybackController)
  StreamingSDKWrapper.mockImplementation(() => mockStreamingSDK)
  QualityManager.mockImplementation(() => mockQualityManager)
  
  // Mock hooks
  const { useAudioSettings } = require('./use-persistent-state')
  const { useAudioQuality } = require('./use-audio-quality')
  
  useAudioSettings.mockReturnValue(mockAudioSettings)
  useAudioQuality.mockReturnValue(mockAudioQuality)
})

describe('useAudioPlayer', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAudioPlayer())

    expect(result.current.state.isPlaying).toBe(false)
    expect(result.current.state.isPaused).toBe(false)
    expect(result.current.state.isBuffering).toBe(false)
    expect(result.current.state.isLoading).toBe(true) // Initially loading
    expect(result.current.state.isInitialized).toBe(false)
    expect(result.current.state.currentTrack).toBe(null)
    expect(result.current.state.currentTime).toBe(0)
    expect(result.current.state.duration).toBe(0)
    expect(result.current.state.progress).toBe(0)
    expect(result.current.state.volume).toBe(0.7)
    expect(result.current.state.isMuted).toBe(false)
    expect(result.current.state.playbackRate).toBe(1.0)
    expect(result.current.state.queue.tracks).toEqual([])
    expect(result.current.state.currentIndex).toBe(0)
    expect(result.current.state.hasNext).toBe(false)
    expect(result.current.state.hasPrevious).toBe(false)
    expect(result.current.state.repeatMode).toBe('off')
    expect(result.current.state.shuffleMode).toBe(false)
    expect(result.current.state.error).toBe(null)
    expect(result.current.state.isOnline).toBe(true)
    expect(result.current.state.isOfflineMode).toBe(false)
  })

  it('should initialize with custom options', () => {
    const options: UseAudioPlayerOptions = {
      initialVolume: 0.5,
      initialRepeatMode: 'all',
      initialShuffleMode: true,
      autoPlay: true,
      preloadNext: false
    }

    const { result } = renderHook(() => useAudioPlayer(options))

    expect(result.current.state.volume).toBe(0.5)
    expect(result.current.state.repeatMode).toBe('all')
    expect(result.current.state.shuffleMode).toBe(true)
  })

  it('should provide play/pause functionality', () => {
    const { result } = renderHook(() => useAudioPlayer())

    // Test play
    act(() => {
      result.current.actions.play()
    })

    expect(mockPlaybackController.play).toHaveBeenCalled()

    // Test pause
    act(() => {
      result.current.actions.pause()
    })

    expect(mockPlaybackController.pause).toHaveBeenCalled()

    // Test toggle
    act(() => {
      result.current.actions.togglePlayPause()
    })

    expect(mockPlaybackController.play).toHaveBeenCalledTimes(2)
  })

  it('should handle navigation controls', () => {
    const { result } = renderHook(() => useAudioPlayer())

    // Test next
    act(() => {
      result.current.actions.next()
    })

    expect(mockPlaybackController.next).toHaveBeenCalled()

    // Test previous
    act(() => {
      result.current.actions.previous()
    })

    expect(mockPlaybackController.previous).toHaveBeenCalled()

    // Test seek
    act(() => {
      result.current.actions.seek(60)
    })

    expect(mockPlaybackController.seek).toHaveBeenCalledWith(60)

    // Test relative seek
    act(() => {
      result.current.actions.seekRelative(10)
    })

    expect(mockPlaybackController.seek).toHaveBeenCalledWith(10)
  })

  it('should handle volume controls', () => {
    const { result } = renderHook(() => useAudioPlayer())

    // Test set volume
    act(() => {
      result.current.actions.setVolume(0.5)
    })

    expect(result.current.state.volume).toBe(0.5)
    expect(mockPlaybackController.setVolume).toHaveBeenCalledWith(0.5)
    expect(mockAudioSettings.updateValue).toHaveBeenCalledWith({ volume: 0.5 })

    // Test toggle mute
    act(() => {
      result.current.actions.toggleMute()
    })

    expect(result.current.state.isMuted).toBe(true)
    expect(mockPlaybackController.setMuted).toHaveBeenCalledWith(true)
    expect(mockAudioSettings.updateValue).toHaveBeenCalledWith({ muted: true })

    // Test set muted
    act(() => {
      result.current.actions.setMuted(false)
    })

    expect(result.current.state.isMuted).toBe(false)
    expect(mockPlaybackController.setMuted).toHaveBeenCalledWith(false)
    expect(mockAudioSettings.updateValue).toHaveBeenCalledWith({ muted: false })
  })

  it('should handle queue management', () => {
    const { result } = renderHook(() => useAudioPlayer())

    // Test set queue
    act(() => {
      result.current.actions.setQueue(mockQueue)
    })

    expect(result.current.state.queue).toEqual(mockQueue)

    // Test add to queue
    const newTrack: Track = {
      ...mockTrack,
      id: 'track-2',
      title: 'New Track'
    }

    act(() => {
      result.current.actions.addToQueue([newTrack], 'end')
    })

    expect(result.current.state.queue.tracks).toHaveLength(2)
    expect(result.current.state.queue.tracks[1]).toEqual(newTrack)

    // Test add to next position
    const nextTrack: Track = {
      ...mockTrack,
      id: 'track-3',
      title: 'Next Track'
    }

    act(() => {
      result.current.actions.addToQueue([nextTrack], 'next')
    })

    expect(result.current.state.queue.tracks).toHaveLength(3)
    expect(result.current.state.queue.tracks[1]).toEqual(nextTrack)

    // Test remove from queue
    act(() => {
      result.current.actions.removeFromQueue(1)
    })

    expect(result.current.state.queue.tracks).toHaveLength(2)

    // Test clear queue
    act(() => {
      result.current.actions.clearQueue()
    })

    expect(result.current.state.queue.tracks).toHaveLength(0)
  })

  it('should handle player modes', () => {
    const { result } = renderHook(() => useAudioPlayer())

    // Test set repeat mode
    act(() => {
      result.current.actions.setRepeatMode('all')
    })

    expect(result.current.state.repeatMode).toBe('all')
    expect(result.current.state.queue.repeatMode).toBe('all')

    // Test set shuffle mode
    act(() => {
      result.current.actions.setShuffleMode(true)
    })

    expect(result.current.state.shuffleMode).toBe(true)
    expect(result.current.state.queue.shuffleMode).toBe(true)

    // Test toggle shuffle
    act(() => {
      result.current.actions.toggleShuffle()
    })

    expect(result.current.state.shuffleMode).toBe(false)

    // Test toggle repeat
    act(() => {
      result.current.actions.toggleRepeat()
    })

    expect(result.current.state.repeatMode).toBe('all')

    act(() => {
      result.current.actions.toggleRepeat()
    })

    expect(result.current.state.repeatMode).toBe('one')
  })

  it('should handle playback rate changes', () => {
    const { result } = renderHook(() => useAudioPlayer())

    act(() => {
      result.current.actions.setPlaybackRate(1.5)
    })

    expect(result.current.state.playbackRate).toBe(1.5)
    expect(mockPlaybackController.setPlaybackRate).toHaveBeenCalledWith(1.5)
  })

  it('should handle quality management', () => {
    const { result } = renderHook(() => useAudioPlayer({
      enableQualityManagement: true
    }))

    // Set a current track first
    act(() => {
      result.current.actions.setQueue(mockQueue)
    })

    act(() => {
      result.current.actions.setQuality('lossless')
    })

    expect(mockQualityManager.setQuality).toHaveBeenCalledWith('lossless', mockTrack)
  })

  it('should handle error states', () => {
    const { result } = renderHook(() => useAudioPlayer())

    // Test clear error
    act(() => {
      result.current.actions.clearError()
    })

    expect(result.current.state.error).toBe(null)

    // Test retry
    act(() => {
      result.current.actions.setQueue(mockQueue)
    })

    act(() => {
      result.current.actions.retry()
    })

    expect(mockPlaybackController.playTrack).toHaveBeenCalledWith(mockTrack)
  })

  it('should handle playTrack functionality', () => {
    const { result } = renderHook(() => useAudioPlayer())

    act(() => {
      result.current.actions.playTrack(mockTrack, mockQueue)
    })

    expect(mockPlaybackController.playTrack).toHaveBeenCalledWith(mockTrack)
    expect(result.current.state.queue).toEqual(mockQueue)
  })

  it('should handle volume clamping', () => {
    const { result } = renderHook(() => useAudioPlayer())

    // Test volume clamping
    act(() => {
      result.current.actions.setVolume(-0.5) // Below 0
    })

    expect(result.current.state.volume).toBe(0)

    act(() => {
      result.current.actions.setVolume(1.5) // Above 1
    })

    expect(result.current.state.volume).toBe(1)
  })

  it('should handle playback rate clamping', () => {
    const { result } = renderHook(() => useAudioPlayer())

    // Test playback rate clamping
    act(() => {
      result.current.actions.setPlaybackRate(0.1) // Below minimum
    })

    expect(result.current.state.playbackRate).toBe(0.25)

    act(() => {
      result.current.actions.setPlaybackRate(5) // Above maximum
    })

    expect(result.current.state.playbackRate).toBe(4)
  })

  it('should handle queue index updates correctly', () => {
    const { result } = renderHook(() => useAudioPlayer())

    // Set up a queue with multiple tracks
    const multiTrackQueue: Queue = {
      tracks: [mockTrack, { ...mockTrack, id: 'track-2' }, { ...mockTrack, id: 'track-3' }],
      currentIndex: 1,
      repeatMode: 'off',
      shuffleMode: false,
      shuffleOrder: []
    }

    act(() => {
      result.current.actions.setQueue(multiTrackQueue)
    })

    expect(result.current.state.currentIndex).toBe(1)
    expect(result.current.state.hasNext).toBe(true)
    expect(result.current.state.hasPrevious).toBe(true)

    // Test removing current track
    act(() => {
      result.current.actions.removeFromQueue(1)
    })

    expect(result.current.state.queue.tracks).toHaveLength(2)
    expect(result.current.state.currentIndex).toBe(1) // Should stay at same index
  })

  it('should cleanup on unmount', () => {
    const { result, unmount } = renderHook(() => useAudioPlayer())

    unmount()

    expect(mockPlaybackController.destroy).toHaveBeenCalled()
    expect(mockAudioEngine.destroy).toHaveBeenCalled()
    expect(mockStreamingSDK.destroy).toHaveBeenCalled()
    expect(mockQualityManager.destroy).toHaveBeenCalled()
  })

  it('should handle event callbacks', () => {
    const onTrackChange = jest.fn()
    const onPlaybackStateChange = jest.fn()
    const onError = jest.fn()
    const onQueueChange = jest.fn()

    const { result } = renderHook(() => useAudioPlayer({
      onTrackChange,
      onPlaybackStateChange,
      onError,
      onQueueChange
    }))

    // Test queue change callback
    act(() => {
      result.current.actions.setQueue(mockQueue)
    })

    expect(onQueueChange).toHaveBeenCalledWith(mockQueue)
  })
})
