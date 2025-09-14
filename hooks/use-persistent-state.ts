/**
 * Custom hooks for persistent state management
 * Provides hooks for managing state that persists across sessions
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { validator } from '@/lib/validation/validator'
import { errorHandler } from '@/lib/error/error-handler'

export interface PersistentStateOptions<T> {
  key: string
  defaultValue: T
  validator?: (data: unknown) => { success: boolean; data?: T; errors?: string[] }
  storage?: 'localStorage' | 'sessionStorage' | 'indexedDB'
  serialize?: (value: T) => string
  deserialize?: (value: string) => T
  debounceMs?: number
  onError?: (error: Error) => void
  onSave?: (value: T) => void
  onLoad?: (value: T) => void
}

export interface PersistentStateResult<T> {
  value: T
  setValue: (value: T | ((prev: T) => T)) => void
  isLoading: boolean
  isSaving: boolean
  error: Error | null
  clear: () => void
  refresh: () => void
  save: () => Promise<void>
}

/**
 * Hook for managing persistent state with automatic saving and loading
 */
export function usePersistentState<T>(
  options: PersistentStateOptions<T>
): PersistentStateResult<T> {
  const {
    key,
    defaultValue,
    validator: customValidator,
    storage = 'localStorage',
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    debounceMs = 300,
    onError,
    onSave,
    onLoad,
  } = options

  const [value, setValueState] = useState<T>(defaultValue)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const isInitializedRef = useRef(false)

  // Load initial value from storage
  useEffect(() => {
    const loadValue = async () => {
      try {
        setIsLoading(true)
        setError(null)

        let storedValue: string | null = null

        switch (storage) {
          case 'localStorage':
            storedValue = localStorage.getItem(key)
            break
          case 'sessionStorage':
            storedValue = sessionStorage.getItem(key)
            break
          case 'indexedDB':
            // For IndexedDB, we'll use a simple approach
            // In a real app, you'd use the IndexedDB wrapper
            storedValue = localStorage.getItem(`indexeddb_${key}`)
            break
        }

        if (storedValue) {
          try {
            const parsedValue = deserialize(storedValue)
            
            // Validate the parsed value if validator is provided
            if (customValidator) {
              const validation = customValidator(parsedValue)
              if (validation.success && validation.data) {
                setValueState(validation.data)
                onLoad?.(validation.data)
              } else {
                console.warn(`Validation failed for ${key}:`, validation.errors)
                setValueState(defaultValue)
              }
            } else {
              setValueState(parsedValue)
              onLoad?.(parsedValue)
            }
          } catch (parseError) {
            console.warn(`Failed to parse stored value for ${key}:`, parseError)
            setValueState(defaultValue)
          }
        } else {
          setValueState(defaultValue)
        }
      } catch (error) {
        const err = error as Error
        setError(err)
        onError?.(err)
        errorHandler.handleError(err, {
          component: 'usePersistentState',
          action: 'load',
          metadata: { key, storage },
        })
        setValueState(defaultValue)
      } finally {
        setIsLoading(false)
        isInitializedRef.current = true
      }
    }

    loadValue()
  }, [key, storage, defaultValue, customValidator, deserialize, onError, onLoad])

  // Save value to storage with debouncing
  const saveValue = useCallback(async (newValue: T) => {
    if (!isInitializedRef.current) return

    try {
      setIsSaving(true)
      setError(null)

      const serializedValue = serialize(newValue)

      switch (storage) {
        case 'localStorage':
          localStorage.setItem(key, serializedValue)
          break
        case 'sessionStorage':
          sessionStorage.setItem(key, serializedValue)
          break
        case 'indexedDB':
          // For IndexedDB, we'll use a simple approach
          localStorage.setItem(`indexeddb_${key}`, serializedValue)
          break
      }

      onSave?.(newValue)
    } catch (error) {
      const err = error as Error
      setError(err)
      onError?.(err)
      errorHandler.handleError(err, {
        component: 'usePersistentState',
        action: 'save',
        metadata: { key, storage },
      })
    } finally {
      setIsSaving(false)
    }
  }, [key, storage, serialize, onSave, onError])

  // Debounced save function
  const debouncedSave = useCallback((newValue: T) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      saveValue(newValue)
    }, debounceMs)
  }, [saveValue, debounceMs])

  // Set value function
  const setValue = useCallback((newValue: T | ((prev: T) => T)) => {
    const resolvedValue = typeof newValue === 'function' ? (newValue as (prev: T) => T)(value) : newValue
    
    setValueState(resolvedValue)
    debouncedSave(resolvedValue)
  }, [value, debouncedSave])

  // Clear function
  const clear = useCallback(() => {
    try {
      switch (storage) {
        case 'localStorage':
          localStorage.removeItem(key)
          break
        case 'sessionStorage':
          sessionStorage.removeItem(key)
          break
        case 'indexedDB':
          localStorage.removeItem(`indexeddb_${key}`)
          break
      }
      
      setValueState(defaultValue)
      setError(null)
    } catch (error) {
      const err = error as Error
      setError(err)
      onError?.(err)
      errorHandler.handleError(err, {
        component: 'usePersistentState',
        action: 'clear',
        metadata: { key, storage },
      })
    }
  }, [key, storage, defaultValue, onError])

  // Refresh function
  const refresh = useCallback(() => {
    const loadValue = async () => {
      try {
        setIsLoading(true)
        setError(null)

        let storedValue: string | null = null

        switch (storage) {
          case 'localStorage':
            storedValue = localStorage.getItem(key)
            break
          case 'sessionStorage':
            storedValue = sessionStorage.getItem(key)
            break
          case 'indexedDB':
            storedValue = localStorage.getItem(`indexeddb_${key}`)
            break
        }

        if (storedValue) {
          try {
            const parsedValue = deserialize(storedValue)
            
            if (customValidator) {
              const validation = customValidator(parsedValue)
              if (validation.success && validation.data) {
                setValueState(validation.data)
                onLoad?.(validation.data)
              } else {
                console.warn(`Validation failed for ${key}:`, validation.errors)
                setValueState(defaultValue)
              }
            } else {
              setValueState(parsedValue)
              onLoad?.(parsedValue)
            }
          } catch (parseError) {
            console.warn(`Failed to parse stored value for ${key}:`, parseError)
            setValueState(defaultValue)
          }
        } else {
          setValueState(defaultValue)
        }
      } catch (error) {
        const err = error as Error
        setError(err)
        onError?.(err)
        errorHandler.handleError(err, {
          component: 'usePersistentState',
          action: 'refresh',
          metadata: { key, storage },
        })
        setValueState(defaultValue)
      } finally {
        setIsLoading(false)
      }
    }

    loadValue()
  }, [key, storage, defaultValue, customValidator, deserialize, onError, onLoad])

  // Manual save function
  const save = useCallback(async () => {
    await saveValue(value)
  }, [saveValue, value])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return {
    value,
    setValue,
    isLoading,
    isSaving,
    error,
    clear,
    refresh,
    save,
  }
}

/**
 * Hook for managing library state
 */
export function useLibrary() {
  const libraryState = usePersistentState({
    key: 'music_library',
    defaultValue: [] as any[],
    validator: (data) => validator.validateLibraryItems(data as unknown[]),
    storage: 'indexedDB',
    onError: (error) => {
      console.error('Library state error:', error)
    },
  })

  const addToLibrary = useCallback((item: any) => {
    const validation = validator.validateLibraryItem(item)
    if (validation.success && validation.data) {
      libraryState.setValue(prev => [...prev, validation.data!])
    } else {
      console.error('Invalid library item:', validation.errors)
    }
  }, [libraryState])

  const removeFromLibrary = useCallback((itemId: string) => {
    libraryState.setValue(prev => prev.filter(item => item.id !== itemId))
  }, [libraryState])

  const updateLibraryItem = useCallback((itemId: string, updates: Partial<any>) => {
    libraryState.setValue(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      )
    )
  }, [libraryState])

  const getLibraryItem = useCallback((itemId: string) => {
    return libraryState.value.find(item => item.id === itemId)
  }, [libraryState.value])

  const clearLibrary = useCallback(() => {
    libraryState.clear()
  }, [libraryState])

  return {
    ...libraryState,
    addToLibrary,
    removeFromLibrary,
    updateLibraryItem,
    getLibraryItem,
    clearLibrary,
  }
}

/**
 * Hook for managing playlists state
 */
export function usePlaylists() {
  const playlistsState = usePersistentState({
    key: 'music_playlists',
    defaultValue: [] as any[],
    validator: (data) => validator.validatePlaylists(data as unknown[]),
    storage: 'indexedDB',
    onError: (error) => {
      console.error('Playlists state error:', error)
    },
  })

  const createPlaylist = useCallback((playlist: any) => {
    const validation = validator.validatePlaylist(playlist)
    if (validation.success && validation.data) {
      playlistsState.setValue(prev => [...prev, validation.data!])
    } else {
      console.error('Invalid playlist:', validation.errors)
    }
  }, [playlistsState])

  const updatePlaylist = useCallback((playlistId: string, updates: Partial<any>) => {
    playlistsState.setValue(prev => 
      prev.map(playlist => 
        playlist.id === playlistId 
          ? { ...playlist, ...updates, updatedAt: new Date().toISOString() }
          : playlist
      )
    )
  }, [playlistsState])

  const deletePlaylist = useCallback((playlistId: string) => {
    playlistsState.setValue(prev => prev.filter(playlist => playlist.id !== playlistId))
  }, [playlistsState])

  const getPlaylist = useCallback((playlistId: string) => {
    return playlistsState.value.find(playlist => playlist.id === playlistId)
  }, [playlistsState.value])

  const addTrackToPlaylist = useCallback((playlistId: string, track: any) => {
    const trackValidation = validator.validateTrack(track)
    if (!trackValidation.success) {
      console.error('Invalid track:', trackValidation.errors)
      return
    }

    playlistsState.setValue(prev => 
      prev.map(playlist => 
        playlist.id === playlistId 
          ? { 
              ...playlist, 
              tracks: [...(playlist.tracks || []), trackValidation.data!],
              trackCount: (playlist.trackCount || 0) + 1,
              updatedAt: new Date().toISOString()
            }
          : playlist
      )
    )
  }, [playlistsState])

  const removeTrackFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    playlistsState.setValue(prev => 
      prev.map(playlist => 
        playlist.id === playlistId 
          ? { 
              ...playlist, 
              tracks: (playlist.tracks || []).filter((track: any) => track.id !== trackId),
              trackCount: Math.max(0, (playlist.trackCount || 0) - 1),
              updatedAt: new Date().toISOString()
            }
          : playlist
      )
    )
  }, [playlistsState])

  const clearPlaylists = useCallback(() => {
    playlistsState.clear()
  }, [playlistsState])

  return {
    ...playlistsState,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    getPlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    clearPlaylists,
  }
}

/**
 * Hook for managing audio settings
 */
export function useAudioSettings() {
  const audioSettingsState = usePersistentState({
    key: 'audio_settings',
    defaultValue: {
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
    validator: (data) => validator.validateAudioSettings(data),
    storage: 'localStorage',
    onError: (error) => {
      console.error('Audio settings error:', error)
    },
  })

  const updateVolume = useCallback((volume: number) => {
    audioSettingsState.setValue(prev => ({ ...prev, volume: Math.max(0, Math.min(1, volume)) }))
  }, [audioSettingsState])

  const toggleMute = useCallback(() => {
    audioSettingsState.setValue(prev => ({ ...prev, muted: !prev.muted }))
  }, [audioSettingsState])

  const updateEQSettings = useCallback((eqSettings: any) => {
    const validation = validator.validatePartialAudioSettings(eqSettings)
    if (validation.success && validation.data) {
      audioSettingsState.setValue(prev => ({ 
        ...prev, 
        eq: { ...prev.eq, ...validation.data?.eq } 
      }))
    } else {
      console.error('Invalid EQ settings:', validation.errors)
    }
  }, [audioSettingsState])

  const updateCrossfadeSettings = useCallback((crossfadeSettings: any) => {
    const validation = validator.validatePartialAudioSettings(crossfadeSettings)
    if (validation.success && validation.data) {
      audioSettingsState.setValue(prev => ({ 
        ...prev, 
        crossfade: { ...prev.crossfade, ...validation.data?.crossfade } 
      }))
    } else {
      console.error('Invalid crossfade settings:', validation.errors)
    }
  }, [audioSettingsState])

  const updateGaplessSettings = useCallback((gaplessSettings: any) => {
    const validation = validator.validatePartialAudioSettings(gaplessSettings)
    if (validation.success && validation.data) {
      audioSettingsState.setValue(prev => ({ 
        ...prev, 
        gapless: { ...prev.gapless, ...validation.data?.gapless } 
      }))
    } else {
      console.error('Invalid gapless settings:', validation.errors)
    }
  }, [audioSettingsState])

  const resetToDefaults = useCallback(() => {
    audioSettingsState.clear()
  }, [audioSettingsState])

  return {
    ...audioSettingsState,
    updateVolume,
    toggleMute,
    updateEQSettings,
    updateCrossfadeSettings,
    updateGaplessSettings,
    resetToDefaults,
  }
}

/**
 * Hook for managing consent preferences
 */
export function useConsentPreferences() {
  const consentState = usePersistentState({
    key: 'consent_preferences',
    defaultValue: {
      analytics: false,
      personalization: false,
      marketing: false,
      dataSharing: false,
      updatedAt: new Date().toISOString(),
    },
    validator: (data) => validator.validateConsentPreferences(data),
    storage: 'localStorage',
    onError: (error) => {
      console.error('Consent preferences error:', error)
    },
  })

  const updateConsent = useCallback((preferences: Partial<any>) => {
    const validation = validator.validatePartialAudioSettings(preferences)
    if (validation.success && validation.data) {
      consentState.setValue(prev => ({ 
        ...prev, 
        ...preferences,
        updatedAt: new Date().toISOString()
      }))
    } else {
      console.error('Invalid consent preferences:', validation.errors)
    }
  }, [consentState])

  const grantAllConsent = useCallback(() => {
    consentState.setValue(prev => ({
      ...prev,
      analytics: true,
      personalization: true,
      marketing: true,
      dataSharing: true,
      updatedAt: new Date().toISOString(),
    }))
  }, [consentState])

  const revokeAllConsent = useCallback(() => {
    consentState.setValue(prev => ({
      ...prev,
      analytics: false,
      personalization: false,
      marketing: false,
      dataSharing: false,
      updatedAt: new Date().toISOString(),
    }))
  }, [consentState])

  return {
    ...consentState,
    updateConsent,
    grantAllConsent,
    revokeAllConsent,
  }
}

// Export all hooks
export default {
  usePersistentState,
  useLibrary,
  usePlaylists,
  useAudioSettings,
  useConsentPreferences,
}
