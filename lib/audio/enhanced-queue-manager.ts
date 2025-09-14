/**
 * Enhanced queue manager with persistence integration
 * Combines queue management with automatic state persistence
 */

import type { Track, QueueState, PlaybackState } from '@/lib/types'
import { AudioPlaybackEngine, type PlaybackEvent } from './playback-engine'
import { QueueManager, type QueueManagerState, type QueueEvent } from './queue-manager'
import { 
  QueuePersistenceManager, 
  type PersistentQueueState,
  queuePersistence 
} from './queue-persistence'

export interface EnhancedQueueManagerState extends QueueManagerState {
  isPersisted: boolean
  lastSaved: Date | null
  autoSaveEnabled: boolean
}

export interface EnhancedQueueEvent extends QueueEvent {
  persistence?: {
    saved: boolean
    error?: string
  }
}

export class EnhancedQueueManager extends QueueManager {
  private persistenceManager: QueuePersistenceManager
  private autoSaveEnabled: boolean
  private saveDebounceTimer: NodeJS.Timeout | null = null
  private lastSavedState: string = ''

  constructor(audioEngine: AudioPlaybackEngine, persistenceManager?: QueuePersistenceManager) {
    super(audioEngine)
    this.persistenceManager = persistenceManager || queuePersistence
    this.autoSaveEnabled = true

    // Override parent event emission to include persistence
    this.setupPersistenceIntegration()
  }

  /**
   * Set up persistence integration
   */
  private setupPersistenceIntegration(): void {
    // Listen to queue changes and auto-save
    this.on('queueChange', () => {
      this.debouncedSave()
    })

    this.on('trackChange', () => {
      this.debouncedSave()
    })

    this.on('repeatModeChange', () => {
      this.debouncedSave()
    })

    this.on('shuffleModeChange', () => {
      this.debouncedSave()
    })

    this.on('play', () => {
      this.debouncedSave()
    })

    this.on('pause', () => {
      this.debouncedSave()
    })

    this.on('stop', () => {
      this.debouncedSave()
    })
  }

  /**
   * Debounced save to prevent excessive writes
   */
  private debouncedSave(): void {
    if (!this.autoSaveEnabled) return

    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer)
    }

    this.saveDebounceTimer = setTimeout(() => {
      this.saveState().catch(error => {
        console.error('Auto-save failed:', error)
      })
    }, 1000) // 1 second debounce
  }

  /**
   * Save current state to persistent storage
   */
  async saveState(): Promise<void> {
    try {
      const state = this.getState()
      const playbackState = this.getPlaybackState()
      
      const persistentState: PersistentQueueState = {
        queue: state.queue,
        history: state.history,
        currentIndex: state.currentIndex,
        currentTime: playbackState.currentTime,
        isPlaying: playbackState.isPlaying,
        repeatMode: state.repeatMode,
        shuffleMode: state.shuffleMode,
        shuffledIndices: state.shuffledIndices,
        lastUpdated: new Date(),
      }

      await this.persistenceManager.saveQueueState(persistentState)
      
      // Emit persistence success event
      this.emitEnhancedEvent('queueChange', {
        saved: true,
        queue: state.queue,
        currentIndex: state.currentIndex,
      })

    } catch (error) {
      console.error('Failed to save queue state:', error)
      
      // Emit persistence error event
      this.emitEnhancedEvent('queueChange', {
        saved: false,
        error: error.message,
        queue: this.getState().queue,
        currentIndex: this.getState().currentIndex,
      })
    }
  }

  /**
   * Load state from persistent storage
   */
  async loadState(): Promise<boolean> {
    try {
      const persistentState = await this.persistenceManager.loadQueueState()
      
      if (!persistentState) {
        return false
      }

      // Restore queue state
      this.setQueue(persistentState.queue, persistentState.currentIndex)
      
      // Restore history
      this.state.history = persistentState.history
      
      // Restore repeat and shuffle modes
      this.setRepeatMode(persistentState.repeatMode)
      this.setShuffleMode(persistentState.shuffleMode)
      
      // Restore shuffled indices if shuffle was enabled
      if (persistentState.shuffleMode && persistentState.shuffledIndices.length > 0) {
        this.state.shuffledIndices = persistentState.shuffledIndices
      }

      // Restore playback state
      if (persistentState.currentTime > 0) {
        await this.seek(persistentState.currentTime)
      }

      // Restore playing state
      if (persistentState.isPlaying && this.getCurrentTrack()) {
        await this.play()
      }

      this.emitEnhancedEvent('queueChange', {
        loaded: true,
        queue: persistentState.queue,
        currentIndex: persistentState.currentIndex,
      })

      return true

    } catch (error) {
      console.error('Failed to load queue state:', error)
      
      this.emitEnhancedEvent('queueChange', {
        loaded: false,
        error: error.message,
      })

      return false
    }
  }

  /**
   * Clear all persisted data
   */
  async clearPersistedData(): Promise<void> {
    try {
      await this.persistenceManager.clearPersistedData()
      
      this.emitEnhancedEvent('queueChange', {
        cleared: true,
      })

    } catch (error) {
      console.error('Failed to clear persisted data:', error)
      throw error
    }
  }

  /**
   * Export queue state for backup
   */
  async exportQueueState(): Promise<string> {
    return await this.persistenceManager.exportQueueState()
  }

  /**
   * Import queue state from backup
   */
  async importQueueState(jsonData: string): Promise<void> {
    try {
      await this.persistenceManager.importQueueState(jsonData)
      
      // Reload the imported state
      await this.loadState()
      
      this.emitEnhancedEvent('queueChange', {
        imported: true,
        queue: this.getState().queue,
        currentIndex: this.getState().currentIndex,
      })

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
    currentState: EnhancedQueueManagerState
  }> {
    const persistenceStats = await this.persistenceManager.getQueueStateStats()
    const currentState = this.getEnhancedState()

    return {
      ...persistenceStats,
      currentState,
    }
  }

  /**
   * Enable or disable auto-save
   */
  setAutoSave(enabled: boolean): void {
    this.autoSaveEnabled = enabled
    
    if (enabled) {
      // Save current state when enabling auto-save
      this.debouncedSave()
    }

    this.emitEnhancedEvent('autoSaveChange', { enabled })
  }

  /**
   * Check if auto-save is enabled
   */
  isAutoSaveEnabled(): boolean {
    return this.autoSaveEnabled
  }

  /**
   * Force save current state (bypasses debounce)
   */
  async forceSave(): Promise<void> {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer)
      this.saveDebounceTimer = null
    }

    await this.saveState()
  }

  /**
   * Get enhanced state including persistence info
   */
  getEnhancedState(): EnhancedQueueManagerState {
    const baseState = this.getState()
    
    return {
      ...baseState,
      isPersisted: this.lastSavedState !== '',
      lastSaved: this.lastSavedState ? new Date() : null, // Simplified for now
      autoSaveEnabled: this.autoSaveEnabled,
    }
  }

  /**
   * Override parent methods to include persistence
   */
  async setQueue(tracks: Track[], startIndex: number = 0): Promise<void> {
    await super.setQueue(tracks, startIndex)
    this.debouncedSave()
  }

  async addToQueue(tracks: Track[], position: 'next' | 'end' = 'end'): Promise<void> {
    await super.addToQueue(tracks, position)
    this.debouncedSave()
  }

  async removeFromQueue(index: number): Promise<Track | null> {
    const result = await super.removeFromQueue(index)
    this.debouncedSave()
    return result
  }

  async clearQueue(): Promise<void> {
    await super.clearQueue()
    this.debouncedSave()
  }

  async moveTrack(fromIndex: number, toIndex: number): Promise<boolean> {
    const result = await super.moveTrack(fromIndex, toIndex)
    this.debouncedSave()
    return result
  }

  async setRepeatMode(mode: 'off' | 'all' | 'one'): Promise<void> {
    await super.setRepeatMode(mode)
    this.debouncedSave()
  }

  async setShuffleMode(enabled: boolean): Promise<void> {
    await super.setShuffleMode(enabled)
    this.debouncedSave()
  }

  /**
   * Emit enhanced event with persistence info
   */
  private emitEnhancedEvent(type: QueueEvent['type'], data?: any): void {
    const event: EnhancedQueueEvent = {
      type,
      data,
      timestamp: Date.now(),
    }

    // Call parent's emit method
    super['emit'](type, data)
  }

  /**
   * Override destroy to cleanup persistence
   */
  async destroy(): Promise<void> {
    // Save final state before destroying
    if (this.autoSaveEnabled) {
      await this.forceSave()
    }

    // Clear debounce timer
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer)
    }

    // Call parent destroy
    await super.destroy()
  }
}

// Export singleton instance
export const enhancedQueueManager = new EnhancedQueueManager(
  new AudioPlaybackEngine(),
  queuePersistence
)
