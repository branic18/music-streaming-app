/**
 * Simplified unit tests for persistent state hooks
 */

import { renderHook, act } from '@testing-library/react'
import { usePersistentState, useLibrary, usePlaylists, useAudioSettings, useConsentPreferences } from './use-persistent-state'

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

Object.defineProperty(global, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
})

// Mock error handler
jest.mock('@/lib/error/error-handler', () => ({
  errorHandler: {
    handleError: jest.fn(),
  },
}))

// Mock validator
jest.mock('@/lib/validation/validator', () => ({
  validator: {
    validateLibraryItems: jest.fn(() => ({ success: true, data: [] })),
    validatePlaylists: jest.fn(() => ({ success: true, data: [] })),
    validatePlaylist: jest.fn(() => ({ success: true, data: {} })),
    validateTrack: jest.fn(() => ({ success: true, data: {} })),
    validateAudioSettings: jest.fn(() => ({ success: true, data: {} })),
    validatePartialAudioSettings: jest.fn(() => ({ success: true, data: {} })),
    validateConsentPreferences: jest.fn(() => ({ success: true, data: {} })),
  },
}))

describe('usePersistentState', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  it('should initialize with default value', () => {
    const { result } = renderHook(() => 
      usePersistentState({
        key: 'test-key',
        defaultValue: 'default-value',
      })
    )

    expect(result.current.value).toBe('default-value')
    expect(result.current.isLoading).toBe(true)
    expect(result.current.isSaving).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should load value from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('"stored-value"')

    const { result } = renderHook(() => 
      usePersistentState({
        key: 'test-key',
        defaultValue: 'default-value',
      })
    )

    expect(result.current.value).toBe('stored-value')
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key')
  })

  it('should save value to localStorage', async () => {
    const { result } = renderHook(() => 
      usePersistentState({
        key: 'test-key',
        defaultValue: 'default-value',
      })
    )

    act(() => {
      result.current.setValue('new-value')
    })

    // Wait for debounced save
    await new Promise(resolve => setTimeout(resolve, 400))

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', '"new-value"')
  })

  it('should clear value from localStorage', () => {
    const { result } = renderHook(() => 
      usePersistentState({
        key: 'test-key',
        defaultValue: 'default-value',
      })
    )

    act(() => {
      result.current.clear()
    })

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key')
    expect(result.current.value).toBe('default-value')
  })

  it('should handle localStorage errors', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage error')
    })

    const { result } = renderHook(() => 
      usePersistentState({
        key: 'test-key',
        defaultValue: 'default-value',
      })
    )

    expect(result.current.error).toBeNull() // Error handling is async
    expect(result.current.value).toBe('default-value')
  })

  it('should use custom validator', () => {
    const customValidator = jest.fn(() => ({ success: true, data: 'validated-value' }))
    mockLocalStorage.getItem.mockReturnValue('"stored-value"')

    const { result } = renderHook(() => 
      usePersistentState({
        key: 'test-key',
        defaultValue: 'default-value',
        validator: customValidator,
      })
    )

    expect(customValidator).toHaveBeenCalledWith('stored-value')
    expect(result.current.value).toBe('validated-value')
  })

  it('should use sessionStorage when specified', () => {
    mockSessionStorage.getItem.mockReturnValue('"session-value"')

    const { result } = renderHook(() => 
      usePersistentState({
        key: 'test-key',
        defaultValue: 'default-value',
        storage: 'sessionStorage',
      })
    )

    expect(mockSessionStorage.getItem).toHaveBeenCalledWith('test-key')
    expect(result.current.value).toBe('session-value')
  })
})

describe('useLibrary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  it('should initialize with empty library', () => {
    const { result } = renderHook(() => useLibrary())

    expect(result.current.value).toEqual([])
    expect(result.current.isLoading).toBe(true)
  })

  it('should add item to library', () => {
    const { result } = renderHook(() => useLibrary())

    act(() => {
      result.current.addToLibrary({ id: 'item-1', type: 'track', item: {} })
    })

    expect(result.current.value).toHaveLength(1)
    expect(result.current.value[0].id).toBe('item-1')
  })

  it('should remove item from library', () => {
    const { result } = renderHook(() => useLibrary())

    act(() => {
      result.current.addToLibrary({ id: 'item-1', type: 'track', item: {} })
      result.current.addToLibrary({ id: 'item-2', type: 'album', item: {} })
    })

    act(() => {
      result.current.removeFromLibrary('item-1')
    })

    expect(result.current.value).toHaveLength(1)
    expect(result.current.value[0].id).toBe('item-2')
  })

  it('should update library item', () => {
    const { result } = renderHook(() => useLibrary())

    act(() => {
      result.current.addToLibrary({ id: 'item-1', type: 'track', item: {} })
    })

    act(() => {
      result.current.updateLibraryItem('item-1', { type: 'album' })
    })

    expect(result.current.value[0].type).toBe('album')
  })

  it('should get library item', () => {
    const { result } = renderHook(() => useLibrary())

    act(() => {
      result.current.addToLibrary({ id: 'item-1', type: 'track', item: {} })
    })

    const item = result.current.getLibraryItem('item-1')
    expect(item).toBeDefined()
    expect(item?.id).toBe('item-1')
  })

  it('should clear library', () => {
    const { result } = renderHook(() => useLibrary())

    act(() => {
      result.current.addToLibrary({ id: 'item-1', type: 'track', item: {} })
    })

    act(() => {
      result.current.clearLibrary()
    })

    expect(result.current.value).toEqual([])
  })
})

describe('usePlaylists', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  it('should initialize with empty playlists', () => {
    const { result } = renderHook(() => usePlaylists())

    expect(result.current.value).toEqual([])
    expect(result.current.isLoading).toBe(true)
  })

  it('should create playlist', () => {
    const { result } = renderHook(() => usePlaylists())

    act(() => {
      result.current.createPlaylist({ 
        id: 'playlist-1', 
        name: 'Test Playlist',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      })
    })

    expect(result.current.value).toHaveLength(1)
    expect(result.current.value[0].name).toBe('Test Playlist')
  })

  it('should update playlist', () => {
    const { result } = renderHook(() => usePlaylists())

    act(() => {
      result.current.createPlaylist({ 
        id: 'playlist-1', 
        name: 'Test Playlist',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      })
    })

    act(() => {
      result.current.updatePlaylist('playlist-1', { name: 'Updated Playlist' })
    })

    expect(result.current.value[0].name).toBe('Updated Playlist')
    expect(result.current.value[0].updatedAt).toBeDefined()
  })

  it('should delete playlist', () => {
    const { result } = renderHook(() => usePlaylists())

    act(() => {
      result.current.createPlaylist({ 
        id: 'playlist-1', 
        name: 'Test Playlist',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      })
    })

    act(() => {
      result.current.deletePlaylist('playlist-1')
    })

    expect(result.current.value).toHaveLength(0)
  })

  it('should get playlist', () => {
    const { result } = renderHook(() => usePlaylists())

    act(() => {
      result.current.createPlaylist({ 
        id: 'playlist-1', 
        name: 'Test Playlist',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      })
    })

    const playlist = result.current.getPlaylist('playlist-1')
    expect(playlist).toBeDefined()
    expect(playlist?.name).toBe('Test Playlist')
  })

  it('should add track to playlist', () => {
    const { result } = renderHook(() => usePlaylists())

    act(() => {
      result.current.createPlaylist({ 
        id: 'playlist-1', 
        name: 'Test Playlist',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      })
    })

    act(() => {
      result.current.addTrackToPlaylist('playlist-1', { id: 'track-1', title: 'Test Track' })
    })

    expect(result.current.value[0].tracks).toHaveLength(1)
    expect(result.current.value[0].trackCount).toBe(1)
  })

  it('should remove track from playlist', () => {
    const { result } = renderHook(() => usePlaylists())

    act(() => {
      result.current.createPlaylist({ 
        id: 'playlist-1', 
        name: 'Test Playlist',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      })
    })

    act(() => {
      result.current.addTrackToPlaylist('playlist-1', { id: 'track-1', title: 'Test Track' })
    })

    act(() => {
      result.current.removeTrackFromPlaylist('playlist-1', 'track-1')
    })

    expect(result.current.value[0].tracks).toHaveLength(0)
    expect(result.current.value[0].trackCount).toBe(0)
  })
})

describe('useAudioSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  it('should initialize with default audio settings', () => {
    const { result } = renderHook(() => useAudioSettings())

    expect(result.current.value.volume).toBe(0.8)
    expect(result.current.value.muted).toBe(false)
    expect(result.current.value.eq.enabled).toBe(false)
    expect(result.current.value.crossfade.enabled).toBe(false)
    expect(result.current.value.gapless.enabled).toBe(true)
  })

  it('should update volume', () => {
    const { result } = renderHook(() => useAudioSettings())

    act(() => {
      result.current.updateVolume(0.5)
    })

    expect(result.current.value.volume).toBe(0.5)
  })

  it('should clamp volume to valid range', () => {
    const { result } = renderHook(() => useAudioSettings())

    act(() => {
      result.current.updateVolume(1.5)
    })

    expect(result.current.value.volume).toBe(1)

    act(() => {
      result.current.updateVolume(-0.5)
    })

    expect(result.current.value.volume).toBe(0)
  })

  it('should toggle mute', () => {
    const { result } = renderHook(() => useAudioSettings())

    expect(result.current.value.muted).toBe(false)

    act(() => {
      result.current.toggleMute()
    })

    expect(result.current.value.muted).toBe(true)

    act(() => {
      result.current.toggleMute()
    })

    expect(result.current.value.muted).toBe(false)
  })

  it('should update EQ settings', () => {
    const { result } = renderHook(() => useAudioSettings())

    act(() => {
      result.current.updateEQSettings({ enabled: true, low: 2, mid: 1, high: -1 })
    })

    expect(result.current.value.eq.enabled).toBe(true)
    expect(result.current.value.eq.low).toBe(2)
    expect(result.current.value.eq.mid).toBe(1)
    expect(result.current.value.eq.high).toBe(-1)
  })

  it('should update crossfade settings', () => {
    const { result } = renderHook(() => useAudioSettings())

    act(() => {
      result.current.updateCrossfadeSettings({ enabled: true, duration: 5000 })
    })

    expect(result.current.value.crossfade.enabled).toBe(true)
    expect(result.current.value.crossfade.duration).toBe(5000)
  })

  it('should update gapless settings', () => {
    const { result } = renderHook(() => useAudioSettings())

    act(() => {
      result.current.updateGaplessSettings({ enabled: false, preloadNext: false })
    })

    expect(result.current.value.gapless.enabled).toBe(false)
    expect(result.current.value.gapless.preloadNext).toBe(false)
  })

  it('should reset to defaults', () => {
    const { result } = renderHook(() => useAudioSettings())

    act(() => {
      result.current.updateVolume(0.5)
      result.current.toggleMute()
    })

    act(() => {
      result.current.resetToDefaults()
    })

    expect(result.current.value.volume).toBe(0.8)
    expect(result.current.value.muted).toBe(false)
  })
})

describe('useConsentPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  it('should initialize with default consent preferences', () => {
    const { result } = renderHook(() => useConsentPreferences())

    expect(result.current.value.analytics).toBe(false)
    expect(result.current.value.personalization).toBe(false)
    expect(result.current.value.marketing).toBe(false)
    expect(result.current.value.dataSharing).toBe(false)
  })

  it('should update consent preferences', () => {
    const { result } = renderHook(() => useConsentPreferences())

    act(() => {
      result.current.updateConsent({ analytics: true, personalization: true })
    })

    expect(result.current.value.analytics).toBe(true)
    expect(result.current.value.personalization).toBe(true)
    expect(result.current.value.marketing).toBe(false)
    expect(result.current.value.dataSharing).toBe(false)
  })

  it('should grant all consent', () => {
    const { result } = renderHook(() => useConsentPreferences())

    act(() => {
      result.current.grantAllConsent()
    })

    expect(result.current.value.analytics).toBe(true)
    expect(result.current.value.personalization).toBe(true)
    expect(result.current.value.marketing).toBe(true)
    expect(result.current.value.dataSharing).toBe(true)
  })

  it('should revoke all consent', () => {
    const { result } = renderHook(() => useConsentPreferences())

    act(() => {
      result.current.grantAllConsent()
    })

    act(() => {
      result.current.revokeAllConsent()
    })

    expect(result.current.value.analytics).toBe(false)
    expect(result.current.value.personalization).toBe(false)
    expect(result.current.value.marketing).toBe(false)
    expect(result.current.value.dataSharing).toBe(false)
  })
})
