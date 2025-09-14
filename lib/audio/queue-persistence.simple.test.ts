/**
 * Simplified unit tests for queue persistence manager
 */

import { QueuePersistenceManager } from './queue-persistence'
import type { Track, PersistentQueueState } from './queue-persistence'

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}

// Mock global objects
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

// Mock the indexedDB import
jest.mock('@/lib/storage/indexeddb', () => ({
  indexedDB: {
    setSetting: jest.fn(() => Promise.resolve()),
    getSetting: jest.fn(() => Promise.resolve(null)),
    deleteSetting: jest.fn(() => Promise.resolve()),
    getAllSettings: jest.fn(() => Promise.resolve({})),
  },
}))

// Mock localStorage functions
jest.mock('@/lib/storage/localStorage', () => ({
  saveQueue: jest.fn(),
  loadQueue: jest.fn(() => []),
  saveHistory: jest.fn(),
  loadHistory: jest.fn(() => []),
  saveCurrentTrack: jest.fn(),
  loadCurrentTrack: jest.fn(() => null),
  saveCurrentTime: jest.fn(),
  loadCurrentTime: jest.fn(() => 0),
  saveIsPlaying: jest.fn(),
  loadIsPlaying: jest.fn(() => false),
  saveRepeatMode: jest.fn(),
  loadRepeatMode: jest.fn(() => 'off'),
  saveShuffleMode: jest.fn(),
  loadShuffleMode: jest.fn(() => false),
  STORAGE_KEYS: {
    QUEUE: 'streamcast_queue',
  },
}))

describe('QueuePersistenceManager', () => {
  let persistenceManager: QueuePersistenceManager
  let mockTrack: Track
  let mockState: PersistentQueueState

  beforeEach(() => {
    jest.clearAllMocks()
    persistenceManager = new QueuePersistenceManager({
      autoSave: false, // Disable auto-save for tests
      persistToIndexedDB: true,
      persistToLocalStorage: true,
    })

    mockTrack = {
      id: 'track-1',
      title: 'Test Track',
      artists: ['Test Artist'],
      albumId: 'album-1',
      durationMs: 180000,
      artwork: 'artwork.jpg',
      territories: ['US'],
      downloadable: true,
      lyricsAvailable: false,
      explicit: false,
      popularity: 80,
    }

    mockState = {
      queue: [mockTrack],
      history: [],
      currentIndex: 0,
      currentTime: 30,
      isPlaying: true,
      repeatMode: 'off',
      shuffleMode: false,
      shuffledIndices: [],
      lastUpdated: new Date('2024-01-01T12:00:00Z'),
    }
  })

  afterEach(() => {
    persistenceManager.destroy()
  })

  describe('Configuration', () => {
    it('should initialize with default configuration', () => {
      const config = persistenceManager.getConfig()
      
      expect(config.autoSave).toBe(false)
      expect(config.saveInterval).toBe(5000)
      expect(config.maxHistorySize).toBe(100)
      expect(config.maxQueueSize).toBe(1000)
      expect(config.persistToIndexedDB).toBe(true)
      expect(config.persistToLocalStorage).toBe(true)
    })

    it('should accept custom configuration', () => {
      const customManager = new QueuePersistenceManager({
        autoSave: true,
        saveInterval: 10000,
        maxHistorySize: 50,
        persistToIndexedDB: false,
      })

      const config = customManager.getConfig()
      
      expect(config.autoSave).toBe(true)
      expect(config.saveInterval).toBe(10000)
      expect(config.maxHistorySize).toBe(50)
      expect(config.persistToIndexedDB).toBe(false)
    })

    it('should update configuration', () => {
      persistenceManager.updateConfig({
        autoSave: true,
        saveInterval: 2000,
      })

      const config = persistenceManager.getConfig()
      
      expect(config.autoSave).toBe(true)
      expect(config.saveInterval).toBe(2000)
    })
  })

  describe('Save Queue State', () => {
    it('should save state to localStorage', async () => {
      await persistenceManager.saveQueueState(mockState)
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'streamcast_queue_complete',
        expect.stringContaining('"queue"')
      )
    })

    it('should not save if state has not changed', async () => {
      // Save once
      await persistenceManager.saveQueueState(mockState)
      
      // Clear mocks
      jest.clearAllMocks()
      
      // Save again with same state
      await persistenceManager.saveQueueState(mockState)
      
      // Should not call save methods
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
    })

    it('should handle save errors gracefully', async () => {
      // Mock localStorage to throw error
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })
      
      await expect(persistenceManager.saveQueueState(mockState)).rejects.toThrow('localStorage error')
    })
  })

  describe('Load Queue State', () => {
    it('should return null if no state found', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      const loadedState = await persistenceManager.loadQueueState()
      
      expect(loadedState).toBeNull()
    })

    it('should load state from localStorage', async () => {
      const mockLocalStorageState = {
        ...mockState,
        lastUpdated: mockState.lastUpdated.toISOString(),
      }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockLocalStorageState))
      
      const loadedState = await persistenceManager.loadQueueState()
      
      expect(loadedState).toEqual({
        ...mockState,
        lastUpdated: mockState.lastUpdated,
      })
    })

    it('should handle load errors gracefully', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json')
      
      const loadedState = await persistenceManager.loadQueueState()
      
      expect(loadedState).toBeNull()
    })
  })

  describe('Clear Persisted Data', () => {
    it('should clear localStorage data', async () => {
      await persistenceManager.clearPersistedData()
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('streamcast_queue_complete')
    })
  })

  describe('Export/Import', () => {
    it('should export queue state', async () => {
      // Mock localStorage to return state
      const mockLocalStorageState = {
        ...mockState,
        lastUpdated: mockState.lastUpdated.toISOString(),
      }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockLocalStorageState))
      
      const exported = await persistenceManager.exportQueueState()
      const parsed = JSON.parse(exported)
      
      expect(parsed.version).toBe('1.0')
      expect(parsed.queueState).toEqual({
        ...mockState,
        lastUpdated: mockState.lastUpdated,
      })
      expect(parsed.exportedAt).toBeDefined()
    })

    it('should import queue state', async () => {
      const exportData = JSON.stringify({
        version: '1.0',
        exportedAt: new Date().toISOString(),
        queueState: {
          ...mockState,
          lastUpdated: mockState.lastUpdated.toISOString(),
        },
      })
      
      await persistenceManager.importQueueState(exportData)
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'streamcast_queue_complete',
        expect.stringContaining('"queue"')
      )
    })

    it('should handle invalid import data', async () => {
      await expect(persistenceManager.importQueueState('invalid-json')).rejects.toThrow()
    })
  })

  describe('Statistics', () => {
    it('should return empty stats when no state exists', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      const stats = await persistenceManager.getQueueStateStats()
      
      expect(stats.hasPersistedState).toBe(false)
      expect(stats.lastUpdated).toBeNull()
      expect(stats.queueSize).toBe(0)
      expect(stats.historySize).toBe(0)
      expect(stats.storageSize).toBe(0)
    })

    it('should get queue state statistics', async () => {
      const mockLocalStorageState = {
        ...mockState,
        lastUpdated: mockState.lastUpdated.toISOString(),
      }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockLocalStorageState))
      
      const stats = await persistenceManager.getQueueStateStats()
      
      expect(stats.hasPersistedState).toBe(true)
      expect(stats.lastUpdated).toEqual(mockState.lastUpdated)
      expect(stats.queueSize).toBe(1)
      expect(stats.historySize).toBe(0)
      expect(stats.storageSize).toBeGreaterThan(0)
    })
  })

  describe('Configuration Options', () => {
    it('should respect persistToLocalStorage setting', async () => {
      const manager = new QueuePersistenceManager({
        persistToIndexedDB: false,
        persistToLocalStorage: false,
      })
      
      await manager.saveQueueState(mockState)
      
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
    })
  })
})
