/**
 * Simplified unit tests for localStorage utilities
 */

import {
  LocalStorageWrapper,
  STORAGE_KEYS,
  isLocalStorageAvailable,
  saveVolume,
  loadVolume,
  saveTheme,
  loadTheme,
  saveSearchHistory,
  loadSearchHistory,
  clearAppData,
} from './localStorage'

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
}

// Mock global localStorage
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

describe('localStorage utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockImplementation(() => null)
    mockLocalStorage.setItem.mockImplementation(() => {})
    mockLocalStorage.removeItem.mockImplementation(() => {})
    mockLocalStorage.clear.mockImplementation(() => {})
    mockLocalStorage.key.mockImplementation(() => null)
  })

  describe('isLocalStorageAvailable', () => {
    it('should return true when localStorage is available', () => {
      expect(isLocalStorageAvailable()).toBe(true)
    })

    it('should return false when localStorage throws error', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })
      
      expect(isLocalStorageAvailable()).toBe(false)
    })
  })

  describe('LocalStorageWrapper', () => {
    it('should set item with JSON serialization', () => {
      const testData = { key: 'value', number: 123 }
      LocalStorageWrapper.setItem('test-key', testData)
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify(testData))
    })

    it('should get item with JSON deserialization', () => {
      const testData = { key: 'value', number: 123 }
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testData))
      
      const result = LocalStorageWrapper.getItem('test-key')
      
      expect(result).toEqual(testData)
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key')
    })

    it('should return default value when item not found', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      const result = LocalStorageWrapper.getItem('test-key', 'default')
      
      expect(result).toBe('default')
    })

    it('should remove item from localStorage', () => {
      LocalStorageWrapper.removeItem('test-key')
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key')
    })

    it('should clear all localStorage', () => {
      LocalStorageWrapper.clear()
      
      expect(mockLocalStorage.clear).toHaveBeenCalled()
    })
  })

  describe('Volume Functions', () => {
    it('should save and load volume', () => {
      saveVolume(85)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.VOLUME, '85')

      mockLocalStorage.getItem.mockReturnValue('85')
      const volume = loadVolume()
      expect(volume).toBe(85)
    })

    it('should clamp volume to valid range', () => {
      saveVolume(150)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.VOLUME, '100')

      saveVolume(-10)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.VOLUME, '0')
    })
  })

  describe('Theme Functions', () => {
    it('should save and load theme', () => {
      saveTheme('light')
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.THEME, '"light"')

      mockLocalStorage.getItem.mockReturnValue('"light"')
      const theme = loadTheme()
      expect(theme).toBe('light')
    })
  })

  describe('Search History Functions', () => {
    it('should save and load search history', () => {
      const history = ['search1', 'search2', 'search3']
      saveSearchHistory(history)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SEARCH_HISTORY,
        JSON.stringify(history)
      )

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(history))
      const loaded = loadSearchHistory()
      expect(loaded).toEqual(history)
    })

    it('should limit search history to 50 items', () => {
      const longHistory = Array.from({ length: 60 }, (_, i) => `search${i}`)
      saveSearchHistory(longHistory)
      
      const expectedHistory = longHistory.slice(-50)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SEARCH_HISTORY,
        JSON.stringify(expectedHistory)
      )
    })
  })

  describe('Utility Functions', () => {
    it('should clear all app data', () => {
      clearAppData()
      
      Object.values(STORAGE_KEYS).forEach(key => {
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(key)
      })
    })
  })
})
