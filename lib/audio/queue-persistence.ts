/**
 * Queue state persistence manager
 * Handles saving and restoring queue state to/from IndexedDB and localStorage
 */

import type { Track, QueueState } from '@/lib/types'
import { indexedDB } from '@/lib/storage/indexeddb'
import { 
  saveQueue, 
  loadQueue, 
  saveHistory, 
  loadHistory,
  saveCurrentTrack,
  loadCurrentTrack,
  saveCurrentTime,
  loadCurrentTime,
  saveIsPlaying,
  loadIsPlaying,
  saveRepeatMode,
  loadRepeatMode,
  saveShuffleMode,
  loadShuffleMode,
  STORAGE_KEYS
} from '@/lib/storage/localStorage'

export interface PersistentQueueState {
  queue: Track[]
  history: Track[]
  currentIndex: number
  currentTime: number
  isPlaying: boolean
  repeatMode: 'off' | 'all' | 'one'
  shuffleMode: boolean
  shuffledIndices: number[]
  lastUpdated: Date
}

export interface QueuePersistenceConfig {
  autoSave: boolean
  saveInterval: number // milliseconds
  maxHistorySize: number
  maxQueueSize: number
  persistToIndexedDB: boolean
  persistToLocalStorage: boolean
}

export class QueuePersistenceManager {
  private config: QueuePersistenceConfig
  private saveTimer: NodeJS.Timeout | null = null
  private isSaving: boolean = false
  private lastSavedState: string = ''

  constructor(config: Partial<QueuePersistenceConfig> = {}) {
    this.config = {
      autoSave: true,
      saveInterval: 5000, // 5 seconds
      maxHistorySize: 100,
      maxQueueSize: 1000,
      persistToIndexedDB: true,
      persistToLocalStorage: true,
      ...config,
    }

    if (this.config.autoSave) {
      this.startAutoSave()
    }
  }

  /**
   * Save queue state to persistent storage
   */
  async saveQueueState(state: PersistentQueueState): Promise<void> {
    if (this.isSaving) return

    try {
      this.isSaving = true

      // Create a serializable version of the state
      const serializableState = {
        ...state,
        lastUpdated: state.lastUpdated.toISOString(),
      }

      // Check if state has actually changed
      const stateString = JSON.stringify(serializableState)
      if (stateString === this.lastSavedState) {
        return // No changes to save
      }

      // Save to localStorage (lightweight, fast access)
      if (this.config.persistToLocalStorage) {
        await this.saveToLocalStorage(state)
      }

      // Save to IndexedDB (comprehensive, reliable)
      if (this.config.persistToIndexedDB) {
        await this.saveToIndexedDB(state)
      }

      this.lastSavedState = stateString

    } catch (error) {
      console.error('Failed to save queue state:', error)
      throw error
    } finally {
      this.isSaving = false
    }
  }

  /**
   * Load queue state from persistent storage
   */
  async loadQueueState(): Promise<PersistentQueueState | null> {
    try {
      // Try to load from IndexedDB first (most complete)
      if (this.config.persistToIndexedDB) {
        const indexedDBState = await this.loadFromIndexedDB()
        if (indexedDBState) {
          return indexedDBState
        }
      }

      // Fallback to localStorage
      if (this.config.persistToLocalStorage) {
        const localStorageState = await this.loadFromLocalStorage()
        if (localStorageState) {
          return localStorageState
        }
      }

      return null

    } catch (error) {
      console.error('Failed to load queue state:', error)
      return null
    }
  }

  /**
   * Save to localStorage
   */
  private async saveToLocalStorage(state: PersistentQueueState): Promise<void> {
    // Save individual components for quick access
    saveQueue(state.queue.slice(0, this.config.maxQueueSize))
    saveHistory(state.history.slice(-this.config.maxHistorySize))
    
    if (state.queue[state.currentIndex]) {
      saveCurrentTrack(state.queue[state.currentIndex])
    }
    
    saveCurrentTime(state.currentTime)
    saveIsPlaying(state.isPlaying)
    saveRepeatMode(state.repeatMode)
    saveShuffleMode(state.shuffleMode)

    // Save complete state as backup
    const completeState = {
      ...state,
      lastUpdated: state.lastUpdated.toISOString(),
    }
    
    localStorage.setItem(STORAGE_KEYS.QUEUE + '_complete', JSON.stringify(completeState))
  }

  /**
   * Load from localStorage
   */
  private async loadFromLocalStorage(): Promise<PersistentQueueState | null> {
    try {
      // Try to load complete state first
      const completeStateString = localStorage.getItem(STORAGE_KEYS.QUEUE + '_complete')
      if (completeStateString) {
        const completeState = JSON.parse(completeStateString)
        return {
          ...completeState,
          lastUpdated: new Date(completeState.lastUpdated),
        }
      }

      // Fallback to individual components
      const queue = loadQueue()
      const history = loadHistory()
      const currentTrack = loadCurrentTrack()
      const currentTime = loadCurrentTime()
      const isPlaying = loadIsPlaying()
      const repeatMode = loadRepeatMode()
      const shuffleMode = loadShuffleMode()

      if (queue.length === 0) {
        return null
      }

      // Find current track index
      let currentIndex = 0
      if (currentTrack) {
        const index = queue.findIndex(track => track.id === currentTrack.id)
        if (index !== -1) {
          currentIndex = index
        }
      }

      return {
        queue,
        history,
        currentIndex,
        currentTime,
        isPlaying,
        repeatMode,
        shuffleMode,
        shuffledIndices: [], // Will be regenerated
        lastUpdated: new Date(),
      }

    } catch (error) {
      console.error('Failed to load from localStorage:', error)
      return null
    }
  }

  /**
   * Save to IndexedDB
   */
  private async saveToIndexedDB(state: PersistentQueueState): Promise<void> {
    try {
      // Save queue state as a single document
      const queueStateDoc = {
        id: 'current_queue_state',
        type: 'queue_state',
        data: {
          ...state,
          lastUpdated: state.lastUpdated.toISOString(),
        },
        timestamp: new Date(),
      }

      // Use the settings store to save queue state
      await indexedDB.setSetting('queue_state', queueStateDoc)

      // Also save individual tracks for reference
      for (const track of state.queue.slice(0, this.config.maxQueueSize)) {
        await indexedDB.setSetting(`queue_track_${track.id}`, track)
      }

      // Save history tracks
      for (const track of state.history.slice(-this.config.maxHistorySize)) {
        await indexedDB.setSetting(`history_track_${track.id}`, track)
      }

    } catch (error) {
      console.error('Failed to save to IndexedDB:', error)
      throw error
    }
  }

  /**
   * Load from IndexedDB
   */
  private async loadFromIndexedDB(): Promise<PersistentQueueState | null> {
    try {
      const queueStateDoc = await indexedDB.getSetting('queue_state')
      
      if (!queueStateDoc || !queueStateDoc.data) {
        return null
      }

      const state = queueStateDoc.data
      
      return {
        ...state,
        lastUpdated: new Date(state.lastUpdated),
      }

    } catch (error) {
      console.error('Failed to load from IndexedDB:', error)
      return null
    }
  }

  /**
   * Clear all persisted queue data
   */
  async clearPersistedData(): Promise<void> {
    try {
      // Clear localStorage
      if (this.config.persistToLocalStorage) {
        localStorage.removeItem(STORAGE_KEYS.QUEUE + '_complete')
        // Note: We don't clear individual components as they might be used elsewhere
      }

      // Clear IndexedDB
      if (this.config.persistToIndexedDB) {
        await indexedDB.deleteSetting('queue_state')
        
        // Clear individual track references
        const allSettings = await indexedDB.getAllSettings()
        for (const [key, value] of Object.entries(allSettings)) {
          if (key.startsWith('queue_track_') || key.startsWith('history_track_')) {
            await indexedDB.deleteSetting(key)
          }
        }
      }

    } catch (error) {
      console.error('Failed to clear persisted data:', error)
      throw error
    }
  }

  /**
   * Export queue state for backup
   */
  async exportQueueState(): Promise<string> {
    const state = await this.loadQueueState()
    if (!state) {
      throw new Error('No queue state to export')
    }

    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      queueState: state,
    }, null, 2)
  }

  /**
   * Import queue state from backup
   */
  async importQueueState(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData)
      
      if (!data.queueState) {
        throw new Error('Invalid queue state data')
      }

      const state: PersistentQueueState = {
        ...data.queueState,
        lastUpdated: new Date(data.queueState.lastUpdated),
      }

      await this.saveQueueState(state)

    } catch (error) {
      console.error('Failed to import queue state:', error)
      throw error
    }
  }

  /**
   * Get queue state statistics
   */
  async getQueueStateStats(): Promise<{
    hasPersistedState: boolean
    lastUpdated: Date | null
    queueSize: number
    historySize: number
    storageSize: number
  }> {
    try {
      const state = await this.loadQueueState()
      
      if (!state) {
        return {
          hasPersistedState: false,
          lastUpdated: null,
          queueSize: 0,
          historySize: 0,
          storageSize: 0,
        }
      }

      // Calculate storage size
      const stateString = JSON.stringify(state)
      const storageSize = new Blob([stateString]).size

      return {
        hasPersistedState: true,
        lastUpdated: state.lastUpdated,
        queueSize: state.queue.length,
        historySize: state.history.length,
        storageSize,
      }

    } catch (error) {
      console.error('Failed to get queue state stats:', error)
      return {
        hasPersistedState: false,
        lastUpdated: null,
        queueSize: 0,
        historySize: 0,
        storageSize: 0,
      }
    }
  }

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer)
    }

    this.saveTimer = setInterval(() => {
      // Auto-save will be triggered by external calls to saveQueueState
      // This timer is just for cleanup and monitoring
    }, this.config.saveInterval)
  }

  /**
   * Stop auto-save timer
   */
  private stopAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer)
      this.saveTimer = null
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<QueuePersistenceConfig>): void {
    const oldAutoSave = this.config.autoSave
    this.config = { ...this.config, ...newConfig }

    if (oldAutoSave !== this.config.autoSave) {
      if (this.config.autoSave) {
        this.startAutoSave()
      } else {
        this.stopAutoSave()
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): QueuePersistenceConfig {
    return { ...this.config }
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.stopAutoSave()
  }
}

// Export singleton instance
export const queuePersistence = new QueuePersistenceManager()
