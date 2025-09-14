/**
 * Comprehensive testing utilities and infrastructure
 * Provides common testing helpers, mocks, and utilities for the music streaming app
 */

import { Track, Album, Artist, Playlist, Queue, LibraryItem, Lyrics, DownloadItem, AudioSettings, ConsentPreferences } from '@/lib/types'

// Mock data generators
export const mockTrack = (overrides: Partial<Track> = {}): Track => ({
  id: 'track-1',
  title: 'Sample Track',
  artists: [{ id: 'artist-1', name: 'Sample Artist' }],
  album: { id: 'album-1', title: 'Sample Album' },
  durationMs: 180000, // 3 minutes
  artwork: 'https://example.com/artwork.jpg',
  audioUrl: 'https://example.com/audio.mp3',
  genre: 'Pop',
  releaseDate: '2024-01-01',
  trackNumber: 1,
  discNumber: 1,
  isExplicit: false,
  isLiked: false,
  playCount: 0,
  lastPlayed: null,
  addedAt: new Date().toISOString(),
  ...overrides,
})

export const mockAlbum = (overrides: Partial<Album> = {}): Album => ({
  id: 'album-1',
  title: 'Sample Album',
  artists: [{ id: 'artist-1', name: 'Sample Artist' }],
  artwork: 'https://example.com/album-artwork.jpg',
  releaseDate: '2024-01-01',
  genre: 'Pop',
  trackCount: 12,
  durationMs: 2400000, // 40 minutes
  isLiked: false,
  addedAt: new Date().toISOString(),
  ...overrides,
})

export const mockArtist = (overrides: Partial<Artist> = {}): Artist => ({
  id: 'artist-1',
  name: 'Sample Artist',
  artwork: 'https://example.com/artist-artwork.jpg',
  genre: 'Pop',
  followerCount: 1000,
  isLiked: false,
  addedAt: new Date().toISOString(),
  ...overrides,
})

export const mockPlaylist = (overrides: Partial<Playlist> = {}): Playlist => ({
  id: 'playlist-1',
  name: 'Sample Playlist',
  description: 'A sample playlist for testing',
  artwork: 'https://example.com/playlist-artwork.jpg',
  trackCount: 5,
  durationMs: 900000, // 15 minutes
  isPublic: false,
  isLiked: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

export const mockQueue = (overrides: Partial<Queue> = {}): Queue => ({
  id: 'queue-1',
  name: 'Current Queue',
  tracks: [mockTrack(), mockTrack({ id: 'track-2', title: 'Track 2' })],
  currentIndex: 0,
  shuffleMode: false,
  repeatMode: 'none',
  history: [],
  ...overrides,
})

export const mockLibraryItem = (overrides: Partial<LibraryItem> = {}): LibraryItem => ({
  id: 'library-item-1',
  type: 'track',
  item: mockTrack(),
  addedAt: new Date().toISOString(),
  ...overrides,
})

export const mockLyrics = (overrides: Partial<Lyrics> = {}): Lyrics => ({
  id: 'lyrics-1',
  trackId: 'track-1',
  text: 'Sample lyrics for testing',
  language: 'en',
  isSynced: false,
  ...overrides,
})

export const mockDownloadItem = (overrides: Partial<DownloadItem> = {}): DownloadItem => ({
  id: 'download-1',
  trackId: 'track-1',
  status: 'completed',
  progress: 100,
  downloadedAt: new Date().toISOString(),
  filePath: '/downloads/track-1.mp3',
  fileSize: 1024000, // 1MB
  ...overrides,
})

export const mockAudioSettings = (overrides: Partial<AudioSettings> = {}): AudioSettings => ({
  volume: 0.8,
  muted: false,
  eq: {
    enabled: false,
    low: 0,
    mid: 0,
    high: 0,
    preset: 'flat',
  },
  crossfade: {
    enabled: false,
    duration: 3000,
    fadeIn: true,
    fadeOut: true,
    curve: 'linear',
  },
  gapless: {
    enabled: true,
    preloadNext: true,
    preloadDuration: 10000,
    bufferSize: 30,
  },
  normalization: {
    enabled: true,
    targetLufs: -14,
    preventClipping: true,
  },
  spatial: {
    enabled: false,
    mode: 'stereo',
    intensity: 0.5,
  },
  advanced: {
    sampleRate: 44100,
    bitDepth: 16,
    bufferSize: 4096,
    latency: 0,
  },
  ...overrides,
})

export const mockConsentPreferences = (overrides: Partial<ConsentPreferences> = {}): ConsentPreferences => ({
  analytics: true,
  personalization: true,
  marketing: false,
  dataSharing: false,
  updatedAt: new Date().toISOString(),
  ...overrides,
})

// Mock collections
export const mockTracks = (count: number = 5): Track[] => {
  return Array.from({ length: count }, (_, index) => 
    mockTrack({ 
      id: `track-${index + 1}`, 
      title: `Track ${index + 1}`,
      trackNumber: index + 1,
    })
  )
}

export const mockAlbums = (count: number = 3): Album[] => {
  return Array.from({ length: count }, (_, index) => 
    mockAlbum({ 
      id: `album-${index + 1}`, 
      title: `Album ${index + 1}`,
    })
  )
}

export const mockArtists = (count: number = 3): Artist[] => {
  return Array.from({ length: count }, (_, index) => 
    mockArtist({ 
      id: `artist-${index + 1}`, 
      name: `Artist ${index + 1}`,
    })
  )
}

export const mockPlaylists = (count: number = 3): Playlist[] => {
  return Array.from({ length: count }, (_, index) => 
    mockPlaylist({ 
      id: `playlist-${index + 1}`, 
      name: `Playlist ${index + 1}`,
    })
  )
}

// Mock API responses
export const mockApiResponse = <T>(data: T, overrides: Partial<{
  status: number
  statusText: string
  headers: Record<string, string>
  delay: number
}> = {}): Promise<Response> => {
  const { status = 200, statusText = 'OK', headers = {}, delay = 0 } = overrides
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ok: status >= 200 && status < 300,
        status,
        statusText,
        headers: new Headers(headers),
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(JSON.stringify(data)),
        blob: () => Promise.resolve(new Blob([JSON.stringify(data)])),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        formData: () => Promise.resolve(new FormData()),
        clone: () => mockApiResponse(data, overrides),
        body: null,
        bodyUsed: false,
        url: 'https://api.example.com',
        type: 'basic',
        redirected: false,
      } as Response)
    }, delay)
  })
}

// Mock fetch function
export const mockFetch = (responses: Record<string, any> = {}) => {
  const defaultResponses = {
    '/api/tracks': mockTracks(),
    '/api/albums': mockAlbums(),
    '/api/artists': mockArtists(),
    '/api/playlists': mockPlaylists(),
    '/api/queue': mockQueue(),
    '/api/audio-settings': mockAudioSettings(),
    '/api/consent-preferences': mockConsentPreferences(),
  }

  const allResponses = { ...defaultResponses, ...responses }

  return jest.fn((url: string) => {
    const response = allResponses[url] || allResponses[url.split('?')[0]]
    if (response) {
      return mockApiResponse(response)
    }
    return mockApiResponse({ error: 'Not found' }, { status: 404 })
  })
}

// Mock localStorage
export const mockLocalStorage = () => {
  const store: Record<string, string> = {}

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
    length: Object.keys(store).length,
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  }
}

// Mock IndexedDB
export const mockIndexedDB = () => {
  const databases: Record<string, any> = {}

  return {
    open: jest.fn((name: string, version?: number) => {
      const request = {
        result: {
          objectStoreNames: ['tracks', 'albums', 'artists', 'playlists', 'downloads', 'settings', 'analytics'],
          createObjectStore: jest.fn(),
          transaction: jest.fn(() => ({
            objectStore: jest.fn(() => ({
              add: jest.fn(),
              put: jest.fn(),
              get: jest.fn(),
              delete: jest.fn(),
              clear: jest.fn(),
              count: jest.fn(),
              openCursor: jest.fn(),
            })),
            oncomplete: null,
            onerror: null,
            onabort: null,
          })),
        },
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      }

      // Simulate successful open
      setTimeout(() => {
        if (request.onsuccess) {
          request.onsuccess({} as Event)
        }
      }, 0)

      return request
    }),
    deleteDatabase: jest.fn(),
    databases: jest.fn(() => Promise.resolve([])),
  }
}

// Mock Web Audio API
export const mockWebAudioAPI = () => {
  const mockAudioContext = {
    createGain: jest.fn(() => ({
      gain: { value: 1 },
      connect: jest.fn(),
      disconnect: jest.fn(),
    })),
    createBiquadFilter: jest.fn(() => ({
      frequency: { value: 350 },
      Q: { value: 1 },
      type: 'lowpass',
      connect: jest.fn(),
      disconnect: jest.fn(),
    })),
    createDynamicsCompressor: jest.fn(() => ({
      threshold: { value: -24 },
      knee: { value: 30 },
      ratio: { value: 12 },
      attack: { value: 0.003 },
      release: { value: 0.25 },
      connect: jest.fn(),
      disconnect: jest.fn(),
    })),
    createAnalyser: jest.fn(() => ({
      fftSize: 2048,
      frequencyBinCount: 1024,
      getByteFrequencyData: jest.fn(),
      getByteTimeDomainData: jest.fn(),
      getFloatFrequencyData: jest.fn(),
      getFloatTimeDomainData: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    })),
    createBuffer: jest.fn(() => ({
      length: 44100,
      duration: 1,
      sampleRate: 44100,
      numberOfChannels: 2,
      getChannelData: jest.fn(() => new Float32Array(44100)),
    })),
    createBufferSource: jest.fn(() => ({
      buffer: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      onended: null,
    })),
    destination: {
      connect: jest.fn(),
      disconnect: jest.fn(),
    },
    state: 'running',
    sampleRate: 44100,
    currentTime: 0,
    suspend: jest.fn(),
    resume: jest.fn(),
    close: jest.fn(),
  }

  return {
    AudioContext: jest.fn(() => mockAudioContext),
    webkitAudioContext: jest.fn(() => mockAudioContext),
  }
}

// Mock performance API
export const mockPerformanceAPI = () => {
  return {
    now: jest.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000,
    },
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
  }
}

// Test utilities
export const waitFor = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const waitForCondition = async (
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return
    }
    await waitFor(interval)
  }
  
  throw new Error(`Condition not met within ${timeout}ms`)
}

export const createMockEvent = (type: string, overrides: Partial<Event> = {}): Event => {
  return {
    type,
    target: null,
    currentTarget: null,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    stopImmediatePropagation: jest.fn(),
    bubbles: false,
    cancelable: false,
    defaultPrevented: false,
    eventPhase: Event.AT_TARGET,
    isTrusted: true,
    timeStamp: Date.now(),
    ...overrides,
  } as Event
}

export const createMockMouseEvent = (type: string, overrides: Partial<MouseEvent> = {}): MouseEvent => {
  return {
    ...createMockEvent(type, overrides),
    clientX: 0,
    clientY: 0,
    screenX: 0,
    screenY: 0,
    button: 0,
    buttons: 0,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ...overrides,
  } as MouseEvent
}

export const createMockKeyboardEvent = (type: string, overrides: Partial<KeyboardEvent> = {}): KeyboardEvent => {
  return {
    ...createMockEvent(type, overrides),
    key: '',
    code: '',
    keyCode: 0,
    which: 0,
    charCode: 0,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    repeat: false,
    ...overrides,
  } as KeyboardEvent
}

// Test data factories
export class TestDataFactory {
  static createTrackSequence(count: number, baseTrack: Partial<Track> = {}): Track[] {
    return Array.from({ length: count }, (_, index) => 
      mockTrack({
        ...baseTrack,
        id: `track-${index + 1}`,
        title: `Track ${index + 1}`,
        trackNumber: index + 1,
        durationMs: 180000 + (index * 10000), // Varying durations
      })
    )
  }

  static createAlbumWithTracks(trackCount: number = 10): { album: Album; tracks: Track[] } {
    const tracks = this.createTrackSequence(trackCount)
    const album = mockAlbum({
      trackCount,
      durationMs: tracks.reduce((sum, track) => sum + track.durationMs, 0),
    })
    
    return { album, tracks }
  }

  static createPlaylistWithTracks(trackCount: number = 5): { playlist: Playlist; tracks: Track[] } {
    const tracks = this.createTrackSequence(trackCount)
    const playlist = mockPlaylist({
      trackCount,
      durationMs: tracks.reduce((sum, track) => sum + track.durationMs, 0),
    })
    
    return { playlist, tracks }
  }

  static createQueueWithTracks(trackCount: number = 8): Queue {
    const tracks = this.createTrackSequence(trackCount)
    return mockQueue({ tracks })
  }

  static createLibraryWithItems(itemCount: number = 20): LibraryItem[] {
    const tracks = this.createTrackSequence(itemCount)
    return tracks.map(track => mockLibraryItem({ item: track }))
  }
}

// Test environment setup
export const setupTestEnvironment = () => {
  // Mock global objects
  global.fetch = mockFetch()
  global.localStorage = mockLocalStorage()
  global.indexedDB = mockIndexedDB()
  global.AudioContext = mockWebAudioAPI().AudioContext
  global.webkitAudioContext = mockWebAudioAPI().webkitAudioContext
  global.performance = mockPerformanceAPI()

  // Mock window and document
  Object.defineProperty(global, 'window', {
    value: {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      fetch: global.fetch,
      localStorage: global.localStorage,
      indexedDB: global.indexedDB,
      AudioContext: global.AudioContext,
      webkitAudioContext: global.webkitAudioContext,
      performance: global.performance,
    },
    writable: true,
  })

  Object.defineProperty(global, 'document', {
    value: {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      createElement: jest.fn(() => ({
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        click: jest.fn(),
        focus: jest.fn(),
        blur: jest.fn(),
      })),
    },
    writable: true,
  })
}

// Test cleanup utilities
export const cleanupTestEnvironment = () => {
  jest.clearAllMocks()
  jest.clearAllTimers()
  
  // Clear localStorage
  if (global.localStorage && typeof global.localStorage.clear === 'function') {
    global.localStorage.clear()
  }
}

// Test assertion helpers
export const expectToBeValidTrack = (track: any): void => {
  expect(track).toHaveProperty('id')
  expect(track).toHaveProperty('title')
  expect(track).toHaveProperty('artists')
  expect(track).toHaveProperty('album')
  expect(track).toHaveProperty('durationMs')
  expect(track).toHaveProperty('artwork')
  expect(track).toHaveProperty('audioUrl')
  expect(typeof track.id).toBe('string')
  expect(typeof track.title).toBe('string')
  expect(Array.isArray(track.artists)).toBe(true)
  expect(typeof track.durationMs).toBe('number')
  expect(track.durationMs).toBeGreaterThan(0)
}

export const expectToBeValidAlbum = (album: any): void => {
  expect(album).toHaveProperty('id')
  expect(album).toHaveProperty('title')
  expect(album).toHaveProperty('artists')
  expect(album).toHaveProperty('artwork')
  expect(album).toHaveProperty('releaseDate')
  expect(album).toHaveProperty('trackCount')
  expect(album).toHaveProperty('durationMs')
  expect(typeof album.id).toBe('string')
  expect(typeof album.title).toBe('string')
  expect(Array.isArray(album.artists)).toBe(true)
  expect(typeof album.trackCount).toBe('number')
  expect(album.trackCount).toBeGreaterThan(0)
}

export const expectToBeValidPlaylist = (playlist: any): void => {
  expect(playlist).toHaveProperty('id')
  expect(playlist).toHaveProperty('name')
  expect(playlist).toHaveProperty('trackCount')
  expect(playlist).toHaveProperty('durationMs')
  expect(playlist).toHaveProperty('createdAt')
  expect(playlist).toHaveProperty('updatedAt')
  expect(typeof playlist.id).toBe('string')
  expect(typeof playlist.name).toBe('string')
  expect(typeof playlist.trackCount).toBe('number')
  expect(typeof playlist.durationMs).toBe('number')
}

export const expectToBeValidQueue = (queue: any): void => {
  expect(queue).toHaveProperty('id')
  expect(queue).toHaveProperty('tracks')
  expect(queue).toHaveProperty('currentIndex')
  expect(queue).toHaveProperty('shuffleMode')
  expect(queue).toHaveProperty('repeatMode')
  expect(queue).toHaveProperty('history')
  expect(typeof queue.id).toBe('string')
  expect(Array.isArray(queue.tracks)).toBe(true)
  expect(typeof queue.currentIndex).toBe('number')
  expect(queue.currentIndex).toBeGreaterThanOrEqual(0)
  expect(queue.currentIndex).toBeLessThan(queue.tracks.length)
}

// Test data validation
export const validateTestData = {
  track: expectToBeValidTrack,
  album: expectToBeValidAlbum,
  playlist: expectToBeValidPlaylist,
  queue: expectToBeValidQueue,
}

// Export all utilities
export default {
  // Mock data generators
  mockTrack,
  mockAlbum,
  mockArtist,
  mockPlaylist,
  mockQueue,
  mockLibraryItem,
  mockLyrics,
  mockDownloadItem,
  mockAudioSettings,
  mockConsentPreferences,
  
  // Mock collections
  mockTracks,
  mockAlbums,
  mockArtists,
  mockPlaylists,
  
  // Mock APIs
  mockApiResponse,
  mockFetch,
  mockLocalStorage,
  mockIndexedDB,
  mockWebAudioAPI,
  mockPerformanceAPI,
  
  // Test utilities
  waitFor,
  waitForCondition,
  createMockEvent,
  createMockMouseEvent,
  createMockKeyboardEvent,
  
  // Test data factories
  TestDataFactory,
  
  // Test environment
  setupTestEnvironment,
  cleanupTestEnvironment,
  
  // Test assertions
  expectToBeValidTrack,
  expectToBeValidAlbum,
  expectToBeValidPlaylist,
  expectToBeValidQueue,
  validateTestData,
}
