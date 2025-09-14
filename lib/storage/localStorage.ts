/**
 * localStorage utilities for lightweight preferences
 * Provides type-safe storage with serialization/deserialization
 */

import type { AudioSettings, ConsentPreferences, PrivacySettings } from '@/lib/types'

// Storage keys
export const STORAGE_KEYS = {
  // Audio settings
  AUDIO_SETTINGS: 'streamcast_audio_settings',
  VOLUME: 'streamcast_volume',
  MUTE_STATE: 'streamcast_mute_state',
  
  // Playback state
  CURRENT_TRACK: 'streamcast_current_track',
  CURRENT_TIME: 'streamcast_current_time',
  IS_PLAYING: 'streamcast_is_playing',
  REPEAT_MODE: 'streamcast_repeat_mode',
  SHUFFLE_MODE: 'streamcast_shuffle_mode',
  
  // Queue state
  QUEUE: 'streamcast_queue',
  HISTORY: 'streamcast_history',
  
  // UI preferences
  THEME: 'streamcast_theme',
  SIDEBAR_COLLAPSED: 'streamcast_sidebar_collapsed',
  VIEW_MODE: 'streamcast_view_mode',
  
  // Privacy and consent
  CONSENT_PREFERENCES: 'streamcast_consent_preferences',
  PRIVACY_SETTINGS: 'streamcast_privacy_settings',
  
  // Search and discovery
  SEARCH_HISTORY: 'streamcast_search_history',
  RECENT_SEARCHES: 'streamcast_recent_searches',
  
  // Session data
  SESSION_ID: 'streamcast_session_id',
  LAST_ACTIVITY: 'streamcast_last_activity',
  
  // App state
  ACTIVE_SECTION: 'streamcast_active_section',
  WELCOME_SHOWN: 'streamcast_welcome_shown',
} as const

// Default values
const DEFAULT_VALUES = {
  [STORAGE_KEYS.VOLUME]: 75,
  [STORAGE_KEYS.MUTE_STATE]: false,
  [STORAGE_KEYS.CURRENT_TIME]: 0,
  [STORAGE_KEYS.IS_PLAYING]: false,
  [STORAGE_KEYS.REPEAT_MODE]: 'off',
  [STORAGE_KEYS.SHUFFLE_MODE]: false,
  [STORAGE_KEYS.THEME]: 'dark',
  [STORAGE_KEYS.SIDEBAR_COLLAPSED]: false,
  [STORAGE_KEYS.VIEW_MODE]: 'grid',
  [STORAGE_KEYS.ACTIVE_SECTION]: 'home',
  [STORAGE_KEYS.WELCOME_SHOWN]: false,
} as const

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * Generic storage functions with type safety
 */
export class LocalStorageWrapper {
  /**
   * Set a value in localStorage with JSON serialization
   */
  static setItem<T>(key: string, value: T): void {
    if (!isLocalStorageAvailable()) {
      console.warn('localStorage is not available')
      return
    }

    try {
      const serialized = JSON.stringify(value)
      localStorage.setItem(key, serialized)
    } catch (error) {
      console.error(`Failed to set localStorage item ${key}:`, error)
    }
  }

  /**
   * Get a value from localStorage with JSON deserialization
   */
  static getItem<T>(key: string, defaultValue?: T): T | null {
    if (!isLocalStorageAvailable()) {
      return defaultValue || null
    }

    try {
      const item = localStorage.getItem(key)
      if (item === null) {
        return defaultValue || null
      }
      return JSON.parse(item) as T
    } catch (error) {
      console.error(`Failed to get localStorage item ${key}:`, error)
      return defaultValue || null
    }
  }

  /**
   * Remove an item from localStorage
   */
  static removeItem(key: string): void {
    if (!isLocalStorageAvailable()) {
      return
    }

    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`Failed to remove localStorage item ${key}:`, error)
    }
  }

  /**
   * Clear all localStorage items
   */
  static clear(): void {
    if (!isLocalStorageAvailable()) {
      return
    }

    try {
      localStorage.clear()
    } catch (error) {
      console.error('Failed to clear localStorage:', error)
    }
  }

  /**
   * Get all keys from localStorage
   */
  static getAllKeys(): string[] {
    if (!isLocalStorageAvailable()) {
      return []
    }

    try {
      return Object.keys(localStorage)
    } catch (error) {
      console.error('Failed to get localStorage keys:', error)
      return []
    }
  }

  /**
   * Get localStorage usage estimate
   */
  static getStorageSize(): number {
    if (!isLocalStorageAvailable()) {
      return 0
    }

    try {
      let total = 0
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length + key.length
        }
      }
      return total
    } catch (error) {
      console.error('Failed to calculate localStorage size:', error)
      return 0
    }
  }
}

// ============================================================================
// AUDIO SETTINGS
// ============================================================================

/**
 * Save audio settings
 */
export function saveAudioSettings(settings: AudioSettings): void {
  LocalStorageWrapper.setItem(STORAGE_KEYS.AUDIO_SETTINGS, settings)
}

/**
 * Load audio settings
 */
export function loadAudioSettings(): AudioSettings | null {
  return LocalStorageWrapper.getItem(STORAGE_KEYS.AUDIO_SETTINGS)
}

/**
 * Save volume level
 */
export function saveVolume(volume: number): void {
  LocalStorageWrapper.setItem(STORAGE_KEYS.VOLUME, Math.max(0, Math.min(100, volume)))
}

/**
 * Load volume level
 */
export function loadVolume(): number {
  return LocalStorageWrapper.getItem(STORAGE_KEYS.VOLUME, DEFAULT_VALUES[STORAGE_KEYS.VOLUME]) || DEFAULT_VALUES[STORAGE_KEYS.VOLUME]
}

/**
 * Save mute state
 */
export function saveMuteState(isMuted: boolean): void {
  LocalStorageWrapper.setItem(STORAGE_KEYS.MUTE_STATE, isMuted)
}

/**
 * Load mute state
 */
export function loadMuteState(): boolean {
  return LocalStorageWrapper.getItem(STORAGE_KEYS.MUTE_STATE, DEFAULT_VALUES[STORAGE_KEYS.MUTE_STATE]) || DEFAULT_VALUES[STORAGE_KEYS.MUTE_STATE]
}

// ============================================================================
// PLAYBACK STATE
// ============================================================================

/**
 * Save current track
 */
export function saveCurrentTrack(track: any): void {
  LocalStorageWrapper.setItem(STORAGE_KEYS.CURRENT_TRACK, track)
}

/**
 * Load current track
 */
export function loadCurrentTrack(): any | null {
  return LocalStorageWrapper.getItem(STORAGE_KEYS.CURRENT_TRACK)
}

/**
 * Save current playback time
 */
export function saveCurrentTime(time: number): void {
  LocalStorageWrapper.setItem(STORAGE_KEYS.CURRENT_TIME, Math.max(0, time))
}

/**
 * Load current playback time
 */
export function loadCurrentTime(): number {
  return LocalStorageWrapper.getItem(STORAGE_KEYS.CURRENT_TIME, DEFAULT_VALUES[STORAGE_KEYS.CURRENT_TIME]) || DEFAULT_VALUES[STORAGE_KEYS.CURRENT_TIME]
}

/**
 * Save playing state
 */
export function saveIsPlaying(isPlaying: boolean): void {
  LocalStorageWrapper.setItem(STORAGE_KEYS.IS_PLAYING, isPlaying)
}

/**
 * Load playing state
 */
export function loadIsPlaying(): boolean {
  return LocalStorageWrapper.getItem(STORAGE_KEYS.IS_PLAYING, DEFAULT_VALUES[STORAGE_KEYS.IS_PLAYING]) || DEFAULT_VALUES[STORAGE_KEYS.IS_PLAYING]
}

/**
 * Save repeat mode
 */
export function saveRepeatMode(mode: 'off' | 'all' | 'one'): void {
  LocalStorageWrapper.setItem(STORAGE_KEYS.REPEAT_MODE, mode)
}

/**
 * Load repeat mode
 */
export function loadRepeatMode(): 'off' | 'all' | 'one' {
  return LocalStorageWrapper.getItem(STORAGE_KEYS.REPEAT_MODE, DEFAULT_VALUES[STORAGE_KEYS.REPEAT_MODE]) || DEFAULT_VALUES[STORAGE_KEYS.REPEAT_MODE]
}

/**
 * Save shuffle mode
 */
export function saveShuffleMode(isShuffled: boolean): void {
  LocalStorageWrapper.setItem(STORAGE_KEYS.SHUFFLE_MODE, isShuffled)
}

/**
 * Load shuffle mode
 */
export function loadShuffleMode(): boolean {
  return LocalStorageWrapper.getItem(STORAGE_KEYS.SHUFFLE_MODE, DEFAULT_VALUES[STORAGE_KEYS.SHUFFLE_MODE]) || DEFAULT_VALUES[STORAGE_KEYS.SHUFFLE_MODE]
}

// ============================================================================
// QUEUE STATE
// ============================================================================

/**
 * Save queue
 */
export function saveQueue(queue: any[]): void {
  LocalStorageWrapper.setItem(STORAGE_KEYS.QUEUE, queue)
}

/**
 * Load queue
 */
export function loadQueue(): any[] {
  return LocalStorageWrapper.getItem(STORAGE_KEYS.QUEUE, []) || []
}

/**
 * Save history
 */
export function saveHistory(history: any[]): void {
  LocalStorageWrapper.setItem(STORAGE_KEYS.HISTORY, history)
}

/**
 * Load history
 */
export function loadHistory(): any[] {
  return LocalStorageWrapper.getItem(STORAGE_KEYS.HISTORY, []) || []
}

// ============================================================================
// UI PREFERENCES
// ============================================================================

/**
 * Save theme
 */
export function saveTheme(theme: string): void {
  LocalStorageWrapper.setItem(STORAGE_KEYS.THEME, theme)
}

/**
 * Load theme
 */
export function loadTheme(): string {
  return LocalStorageWrapper.getItem(STORAGE_KEYS.THEME, DEFAULT_VALUES[STORAGE_KEYS.THEME]) || DEFAULT_VALUES[STORAGE_KEYS.THEME]
}

/**
 * Save sidebar collapsed state
 */
export function saveSidebarCollapsed(isCollapsed: boolean): void {
  LocalStorageWrapper.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, isCollapsed)
}

/**
 * Load sidebar collapsed state
 */
export function loadSidebarCollapsed(): boolean {
  return LocalStorageWrapper.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, DEFAULT_VALUES[STORAGE_KEYS.SIDEBAR_COLLAPSED]) || DEFAULT_VALUES[STORAGE_KEYS.SIDEBAR_COLLAPSED]
}

/**
 * Save view mode
 */
export function saveViewMode(mode: 'grid' | 'list'): void {
  LocalStorageWrapper.setItem(STORAGE_KEYS.VIEW_MODE, mode)
}

/**
 * Load view mode
 */
export function loadViewMode(): 'grid' | 'list' {
  return LocalStorageWrapper.getItem(STORAGE_KEYS.VIEW_MODE, DEFAULT_VALUES[STORAGE_KEYS.VIEW_MODE]) || DEFAULT_VALUES[STORAGE_KEYS.VIEW_MODE]
}

// ============================================================================
// PRIVACY AND CONSENT
// ============================================================================

/**
 * Save consent preferences
 */
export function saveConsentPreferences(consent: ConsentPreferences): void {
  LocalStorageWrapper.setItem(STORAGE_KEYS.CONSENT_PREFERENCES, consent)
}

/**
 * Load consent preferences
 */
export function loadConsentPreferences(): ConsentPreferences | null {
  return LocalStorageWrapper.getItem(STORAGE_KEYS.CONSENT_PREFERENCES)
}

/**
 * Save privacy settings
 */
export function savePrivacySettings(settings: PrivacySettings): void {
  LocalStorageWrapper.setItem(STORAGE_KEYS.PRIVACY_SETTINGS, settings)
}

/**
 * Load privacy settings
 */
export function loadPrivacySettings(): PrivacySettings | null {
  return LocalStorageWrapper.getItem(STORAGE_KEYS.PRIVACY_SETTINGS)
}

// ============================================================================
// SEARCH AND DISCOVERY
// ============================================================================

/**
 * Save search history
 */
export function saveSearchHistory(history: string[]): void {
  // Limit to last 50 searches
  const limitedHistory = history.slice(-50)
  LocalStorageWrapper.setItem(STORAGE_KEYS.SEARCH_HISTORY, limitedHistory)
}

/**
 * Load search history
 */
export function loadSearchHistory(): string[] {
  return LocalStorageWrapper.getItem(STORAGE_KEYS.SEARCH_HISTORY, []) || []
}

/**
 * Add search to history
 */
export function addToSearchHistory(query: string): void {
  if (!query.trim()) return
  
  const history = loadSearchHistory()
  const filteredHistory = history.filter(item => item.toLowerCase() !== query.toLowerCase())
  const newHistory = [...filteredHistory, query]
  saveSearchHistory(newHistory)
}

/**
 * Clear search history
 */
export function clearSearchHistory(): void {
  LocalStorageWrapper.removeItem(STORAGE_KEYS.SEARCH_HISTORY)
}

/**
 * Save recent searches
 */
export function saveRecentSearches(searches: string[]): void {
  LocalStorageWrapper.setItem(STORAGE_KEYS.RECENT_SEARCHES, searches)
}

/**
 * Load recent searches
 */
export function loadRecentSearches(): string[] {
  return LocalStorageWrapper.getItem(STORAGE_KEYS.RECENT_SEARCHES, []) || []
}

// ============================================================================
// SESSION DATA
// ============================================================================

/**
 * Save session ID
 */
export function saveSessionId(sessionId: string): void {
  LocalStorageWrapper.setItem(STORAGE_KEYS.SESSION_ID, sessionId)
}

/**
 * Load session ID
 */
export function loadSessionId(): string | null {
  return LocalStorageWrapper.getItem(STORAGE_KEYS.SESSION_ID)
}

/**
 * Save last activity timestamp
 */
export function saveLastActivity(timestamp: Date): void {
  LocalStorageWrapper.setItem(STORAGE_KEYS.LAST_ACTIVITY, timestamp.toISOString())
}

/**
 * Load last activity timestamp
 */
export function loadLastActivity(): Date | null {
  const timestamp = LocalStorageWrapper.getItem(STORAGE_KEYS.LAST_ACTIVITY)
  return timestamp ? new Date(timestamp) : null
}

// ============================================================================
// APP STATE
// ============================================================================

/**
 * Save active section
 */
export function saveActiveSection(section: string): void {
  LocalStorageWrapper.setItem(STORAGE_KEYS.ACTIVE_SECTION, section)
}

/**
 * Load active section
 */
export function loadActiveSection(): string {
  return LocalStorageWrapper.getItem(STORAGE_KEYS.ACTIVE_SECTION, DEFAULT_VALUES[STORAGE_KEYS.ACTIVE_SECTION]) || DEFAULT_VALUES[STORAGE_KEYS.ACTIVE_SECTION]
}

/**
 * Save welcome shown state
 */
export function saveWelcomeShown(shown: boolean): void {
  LocalStorageWrapper.setItem(STORAGE_KEYS.WELCOME_SHOWN, shown)
}

/**
 * Load welcome shown state
 */
export function loadWelcomeShown(): boolean {
  return LocalStorageWrapper.getItem(STORAGE_KEYS.WELCOME_SHOWN, DEFAULT_VALUES[STORAGE_KEYS.WELCOME_SHOWN]) || DEFAULT_VALUES[STORAGE_KEYS.WELCOME_SHOWN]
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clear all app-specific localStorage data
 */
export function clearAppData(): void {
  const keys = Object.values(STORAGE_KEYS)
  keys.forEach(key => {
    LocalStorageWrapper.removeItem(key)
  })
}

/**
 * Export all app data as JSON
 */
export function exportAppData(): string {
  const data: Record<string, any> = {}
  
  Object.values(STORAGE_KEYS).forEach(key => {
    const value = LocalStorageWrapper.getItem(key)
    if (value !== null) {
      data[key] = value
    }
  })
  
  return JSON.stringify(data, null, 2)
}

/**
 * Import app data from JSON
 */
export function importAppData(jsonData: string): boolean {
  try {
    const data = JSON.parse(jsonData)
    
    Object.entries(data).forEach(([key, value]) => {
      if (Object.values(STORAGE_KEYS).includes(key as any)) {
        LocalStorageWrapper.setItem(key, value)
      }
    })
    
    return true
  } catch (error) {
    console.error('Failed to import app data:', error)
    return false
  }
}

/**
 * Get storage usage statistics
 */
export function getStorageStats(): {
  totalSize: number
  itemCount: number
  appDataSize: number
  appItemCount: number
} {
  const totalSize = LocalStorageWrapper.getStorageSize()
  const allKeys = LocalStorageWrapper.getAllKeys()
  const appKeys = Object.values(STORAGE_KEYS)
  
  let appDataSize = 0
  let appItemCount = 0
  
  appKeys.forEach(key => {
    const item = localStorage.getItem(key)
    if (item) {
      appDataSize += item.length + key.length
      appItemCount++
    }
  })
  
  return {
    totalSize,
    itemCount: allKeys.length,
    appDataSize,
    appItemCount,
  }
}
