/**
 * Comprehensive test setup and configuration
 * Provides global test configuration, mocks, and utilities
 */

import { setupTestEnvironment, cleanupTestEnvironment } from './test-utils'

// Global test configuration
export const testConfig = {
  // Test timeouts
  defaultTimeout: 10000,
  asyncTimeout: 5000,
  networkTimeout: 3000,
  
  // Test data
  defaultTrackCount: 10,
  defaultAlbumCount: 5,
  defaultPlaylistCount: 3,
  defaultArtistCount: 4,
  
  // Mock delays
  apiDelay: 100,
  audioDelay: 50,
  storageDelay: 25,
  
  // Test environment
  enableLogging: false,
  enablePerformanceTracking: false,
  enableErrorTracking: false,
}

// Global test setup
export const globalTestSetup = () => {
  // Set up test environment
  setupTestEnvironment()
  
  // Configure Jest
  jest.setTimeout(testConfig.defaultTimeout)
  
  // Mock console methods in test environment
  if (!testConfig.enableLogging) {
    global.console = {
      ...console,
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    }
  }
  
  // Mock performance tracking
  if (!testConfig.enablePerformanceTracking) {
    global.performance = {
      ...global.performance,
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByType: jest.fn(() => []),
      getEntriesByName: jest.fn(() => []),
      clearMarks: jest.fn(),
      clearMeasures: jest.fn(),
    }
  }
  
  // Mock error tracking
  if (!testConfig.enableErrorTracking) {
    global.addEventListener = jest.fn()
    global.removeEventListener = jest.fn()
  }
}

// Global test teardown
export const globalTestTeardown = () => {
  // Clean up test environment
  cleanupTestEnvironment()
  
  // Clear all timers
  jest.clearAllTimers()
  
  // Clear all mocks
  jest.clearAllMocks()
  
  // Reset modules
  jest.resetModules()
}

// Test suite setup
export const testSuiteSetup = (suiteName: string) => {
  console.log(`\n🧪 Setting up test suite: ${suiteName}`)
  
  // Set up test environment
  setupTestEnvironment()
  
  // Configure test-specific settings
  jest.setTimeout(testConfig.defaultTimeout)
  
  // Mock console for clean test output
  if (!testConfig.enableLogging) {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  }
}

// Test suite teardown
export const testSuiteTeardown = (suiteName: string) => {
  console.log(`\n🧹 Cleaning up test suite: ${suiteName}`)
  
  // Clean up test environment
  cleanupTestEnvironment()
  
  // Restore console methods
  jest.restoreAllMocks()
  
  // Clear all timers
  jest.clearAllTimers()
}

// Individual test setup
export const testSetup = (testName: string) => {
  // Set up test environment
  setupTestEnvironment()
  
  // Configure test-specific settings
  jest.setTimeout(testConfig.asyncTimeout)
  
  // Mock console for clean test output
  if (!testConfig.enableLogging) {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  }
}

// Individual test teardown
export const testTeardown = (testName: string) => {
  // Clean up test environment
  cleanupTestEnvironment()
  
  // Restore console methods
  jest.restoreAllMocks()
  
  // Clear all timers
  jest.clearAllTimers()
}

// Test data setup
export const setupTestData = () => {
  // Set up test data in localStorage
  const testData = {
    tracks: [
      {
        id: 'test-track-1',
        title: 'Test Track 1',
        artists: [{ id: 'test-artist-1', name: 'Test Artist 1' }],
        album: { id: 'test-album-1', title: 'Test Album 1' },
        durationMs: 180000,
        artwork: 'https://example.com/test-artwork-1.jpg',
        audioUrl: 'https://example.com/test-audio-1.mp3',
        genre: 'Test Genre',
        releaseDate: '2024-01-01',
        trackNumber: 1,
        discNumber: 1,
        isExplicit: false,
        isLiked: false,
        playCount: 0,
        lastPlayed: null,
        addedAt: new Date().toISOString(),
      },
      {
        id: 'test-track-2',
        title: 'Test Track 2',
        artists: [{ id: 'test-artist-2', name: 'Test Artist 2' }],
        album: { id: 'test-album-2', title: 'Test Album 2' },
        durationMs: 200000,
        artwork: 'https://example.com/test-artwork-2.jpg',
        audioUrl: 'https://example.com/test-audio-2.mp3',
        genre: 'Test Genre',
        releaseDate: '2024-01-02',
        trackNumber: 2,
        discNumber: 1,
        isExplicit: false,
        isLiked: true,
        playCount: 5,
        lastPlayed: new Date().toISOString(),
        addedAt: new Date().toISOString(),
      },
    ],
    albums: [
      {
        id: 'test-album-1',
        title: 'Test Album 1',
        artists: [{ id: 'test-artist-1', name: 'Test Artist 1' }],
        artwork: 'https://example.com/test-album-artwork-1.jpg',
        releaseDate: '2024-01-01',
        genre: 'Test Genre',
        trackCount: 12,
        durationMs: 2400000,
        isLiked: false,
        addedAt: new Date().toISOString(),
      },
    ],
    playlists: [
      {
        id: 'test-playlist-1',
        name: 'Test Playlist 1',
        description: 'A test playlist for testing',
        artwork: 'https://example.com/test-playlist-artwork-1.jpg',
        trackCount: 5,
        durationMs: 900000,
        isPublic: false,
        isLiked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    audioSettings: {
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
    },
  }
  
  // Store test data in localStorage
  Object.entries(testData).forEach(([key, value]) => {
    global.localStorage.setItem(key, JSON.stringify(value))
  })
  
  return testData
}

// Test data cleanup
export const cleanupTestData = () => {
  // Clear all test data from localStorage
  const testKeys = ['tracks', 'albums', 'playlists', 'audioSettings']
  testKeys.forEach(key => {
    global.localStorage.removeItem(key)
  })
}

// Mock API setup
export const setupMockAPI = () => {
  // Mock fetch with test responses
  global.fetch = jest.fn((url: string) => {
    const responses: Record<string, any> = {
      '/api/tracks': [
        {
          id: 'api-track-1',
          title: 'API Track 1',
          artists: [{ id: 'api-artist-1', name: 'API Artist 1' }],
          album: { id: 'api-album-1', title: 'API Album 1' },
          durationMs: 180000,
          artwork: 'https://example.com/api-artwork-1.jpg',
          audioUrl: 'https://example.com/api-audio-1.mp3',
          genre: 'API Genre',
          releaseDate: '2024-01-01',
          trackNumber: 1,
          discNumber: 1,
          isExplicit: false,
          isLiked: false,
          playCount: 0,
          lastPlayed: null,
          addedAt: new Date().toISOString(),
        },
      ],
      '/api/albums': [
        {
          id: 'api-album-1',
          title: 'API Album 1',
          artists: [{ id: 'api-artist-1', name: 'API Artist 1' }],
          artwork: 'https://example.com/api-album-artwork-1.jpg',
          releaseDate: '2024-01-01',
          genre: 'API Genre',
          trackCount: 12,
          durationMs: 2400000,
          isLiked: false,
          addedAt: new Date().toISOString(),
        },
      ],
      '/api/playlists': [
        {
          id: 'api-playlist-1',
          name: 'API Playlist 1',
          description: 'An API playlist for testing',
          artwork: 'https://example.com/api-playlist-artwork-1.jpg',
          trackCount: 5,
          durationMs: 900000,
          isPublic: false,
          isLiked: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    }
    
    const response = responses[url] || { error: 'Not found' }
    const status = response.error ? 404 : 200
    
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Not Found',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
    } as Response)
  })
}

// Mock API cleanup
export const cleanupMockAPI = () => {
  // Restore original fetch
  if (global.fetch && typeof global.fetch.mockRestore === 'function') {
    global.fetch.mockRestore()
  }
}

// Test environment validation
export const validateTestEnvironment = () => {
  const requiredGlobals = [
    'fetch',
    'localStorage',
    'indexedDB',
    'AudioContext',
    'performance',
    'window',
    'document',
  ]
  
  const missingGlobals = requiredGlobals.filter(globalName => 
    !(globalName in global) || global[globalName] === undefined
  )
  
  if (missingGlobals.length > 0) {
    throw new Error(`Missing required global objects: ${missingGlobals.join(', ')}`)
  }
  
  return true
}

// Test performance monitoring
export const setupTestPerformanceMonitoring = () => {
  const performanceMetrics: any[] = []
  
  // Mock performance monitoring
  global.performance = {
    ...global.performance,
    mark: jest.fn((name: string) => {
      performanceMetrics.push({ type: 'mark', name, timestamp: Date.now() })
    }),
    measure: jest.fn((name: string, startMark?: string, endMark?: string) => {
      performanceMetrics.push({ type: 'measure', name, startMark, endMark, timestamp: Date.now() })
    }),
    getEntriesByType: jest.fn((type: string) => {
      return performanceMetrics.filter(metric => metric.type === type)
    }),
    getEntriesByName: jest.fn((name: string) => {
      return performanceMetrics.filter(metric => metric.name === name)
    }),
    clearMarks: jest.fn(() => {
      performanceMetrics.splice(0, performanceMetrics.length)
    }),
    clearMeasures: jest.fn(() => {
      performanceMetrics.splice(0, performanceMetrics.length)
    }),
  }
  
  return performanceMetrics
}

// Test error monitoring
export const setupTestErrorMonitoring = () => {
  const errorLogs: any[] = []
  
  // Mock error monitoring
  global.addEventListener = jest.fn((event: string, handler: Function) => {
    if (event === 'error' || event === 'unhandledrejection') {
      errorLogs.push({ event, handler, timestamp: Date.now() })
    }
  })
  
  global.removeEventListener = jest.fn((event: string, handler: Function) => {
    const index = errorLogs.findIndex(log => log.event === event && log.handler === handler)
    if (index !== -1) {
      errorLogs.splice(index, 1)
    }
  })
  
  return errorLogs
}

// Test utilities export
export default {
  testConfig,
  globalTestSetup,
  globalTestTeardown,
  testSuiteSetup,
  testSuiteTeardown,
  testSetup,
  testTeardown,
  setupTestData,
  cleanupTestData,
  setupMockAPI,
  cleanupMockAPI,
  validateTestEnvironment,
  setupTestPerformanceMonitoring,
  setupTestErrorMonitoring,
}
