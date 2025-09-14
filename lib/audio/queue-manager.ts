/**
 * Queue manager for audio playback
 * Handles track queuing, shuffling, repeat modes, and gapless transitions
 */

import type { Track, QueueState, PlaybackState } from '@/lib/types'
import { AudioPlaybackEngine, type PlaybackEvent } from './playback-engine'

export type RepeatMode = 'off' | 'all' | 'one'
export type ShuffleMode = boolean

export interface QueueManagerState {
  queue: Track[]
  history: Track[]
  currentIndex: number
  repeatMode: RepeatMode
  shuffleMode: ShuffleMode
  shuffledIndices: number[]
  isPlaying: boolean
  isPaused: boolean
  isBuffering: boolean
}

export interface QueueEvent {
  type: 'queueChange' | 'trackChange' | 'repeatModeChange' | 'shuffleModeChange' | 'play' | 'pause' | 'stop' | 'error'
  data?: any
  timestamp: number
}

export class QueueManager {
  private audioEngine: AudioPlaybackEngine
  private state: QueueManagerState
  private eventListeners: Map<string, ((event: QueueEvent) => void)[]> = new Map()
  private preloadTimeout: NodeJS.Timeout | null = null

  constructor(audioEngine: AudioPlaybackEngine) {
    this.audioEngine = audioEngine
    this.state = {
      queue: [],
      history: [],
      currentIndex: -1,
      repeatMode: 'off',
      shuffleMode: false,
      shuffledIndices: [],
      isPlaying: false,
      isPaused: false,
      isBuffering: false,
    }

    this.setupAudioEngineListeners()
  }

  /**
   * Set up audio engine event listeners
   */
  private setupAudioEngineListeners(): void {
    this.audioEngine.on('play', () => {
      this.state.isPlaying = true
      this.state.isPaused = false
      this.emit('play', { track: this.getCurrentTrack() })
    })

    this.audioEngine.on('pause', () => {
      this.state.isPlaying = false
      this.state.isPaused = true
      this.emit('pause', { track: this.getCurrentTrack() })
    })

    this.audioEngine.on('stop', () => {
      this.state.isPlaying = false
      this.state.isPaused = false
      this.emit('stop', { track: this.getCurrentTrack() })
    })

    this.audioEngine.on('trackChange', (event) => {
      if (event.data?.ended) {
        this.handleTrackEnd()
      }
    })

    this.audioEngine.on('error', (event) => {
      this.emit('error', event.data)
    })
  }

  /**
   * Set the queue
   */
  setQueue(tracks: Track[], startIndex: number = 0): void {
    this.state.queue = [...tracks]
    this.state.currentIndex = Math.max(0, Math.min(startIndex, tracks.length - 1))
    this.state.history = []
    
    if (this.state.shuffleMode) {
      this.generateShuffledIndices()
    }

    this.emit('queueChange', { 
      queue: this.state.queue, 
      currentIndex: this.state.currentIndex 
    })
  }

  /**
   * Add tracks to the queue
   */
  addToQueue(tracks: Track[], position: 'next' | 'end' = 'end'): void {
    if (position === 'next') {
      // Insert after current track
      const insertIndex = this.state.currentIndex + 1
      this.state.queue.splice(insertIndex, 0, ...tracks)
      
      // Update shuffled indices if shuffle is on
      if (this.state.shuffleMode) {
        this.generateShuffledIndices()
      }
    } else {
      // Add to end
      this.state.queue.push(...tracks)
    }

    this.emit('queueChange', { 
      queue: this.state.queue, 
      added: tracks 
    })
  }

  /**
   * Remove track from queue
   */
  removeFromQueue(index: number): Track | null {
    if (index < 0 || index >= this.state.queue.length) return null

    const removedTrack = this.state.queue.splice(index, 1)[0]

    // Adjust current index if necessary
    if (index < this.state.currentIndex) {
      this.state.currentIndex--
    } else if (index === this.state.currentIndex) {
      // If we removed the current track, stop playback
      this.audioEngine.stop()
    }

    // Regenerate shuffled indices if shuffle is on
    if (this.state.shuffleMode) {
      this.generateShuffledIndices()
    }

    this.emit('queueChange', { 
      queue: this.state.queue, 
      removed: removedTrack,
      currentIndex: this.state.currentIndex 
    })

    return removedTrack
  }

  /**
   * Clear the queue
   */
  clearQueue(): void {
    this.state.queue = []
    this.state.history = []
    this.state.currentIndex = -1
    this.state.shuffledIndices = []
    
    this.audioEngine.stop()

    this.emit('queueChange', { queue: [] })
  }

  /**
   * Move track in queue
   */
  moveTrack(fromIndex: number, toIndex: number): boolean {
    if (fromIndex < 0 || fromIndex >= this.state.queue.length ||
        toIndex < 0 || toIndex >= this.state.queue.length) {
      return false
    }

    const track = this.state.queue.splice(fromIndex, 1)[0]
    this.state.queue.splice(toIndex, 0, track)

    // Adjust current index
    if (fromIndex === this.state.currentIndex) {
      this.state.currentIndex = toIndex
    } else if (fromIndex < this.state.currentIndex && toIndex >= this.state.currentIndex) {
      this.state.currentIndex--
    } else if (fromIndex > this.state.currentIndex && toIndex <= this.state.currentIndex) {
      this.state.currentIndex++
    }

    // Regenerate shuffled indices if shuffle is on
    if (this.state.shuffleMode) {
      this.generateShuffledIndices()
    }

    this.emit('queueChange', { 
      queue: this.state.queue, 
      moved: { from: fromIndex, to: toIndex },
      currentIndex: this.state.currentIndex 
    })

    return true
  }

  /**
   * Play the current track
   */
  async play(): Promise<void> {
    const currentTrack = this.getCurrentTrack()
    if (!currentTrack) return

    try {
      await this.audioEngine.loadTrack(currentTrack)
      await this.audioEngine.play()
    } catch (error) {
      this.emit('error', { error: error.message, track: currentTrack })
      throw error
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    this.audioEngine.pause()
  }

  /**
   * Stop playback
   */
  async stop(): Promise<void> {
    await this.audioEngine.stop()
  }

  /**
   * Play next track
   */
  async playNext(): Promise<void> {
    const nextIndex = this.getNextIndex()
    if (nextIndex === -1) {
      await this.stop()
      return
    }

    this.state.currentIndex = nextIndex
    const nextTrack = this.getCurrentTrack()
    
    if (nextTrack) {
      // Add current track to history
      const currentTrack = this.state.queue[this.getActualIndex(this.state.currentIndex - 1)]
      if (currentTrack) {
        this.state.history.push(currentTrack)
      }

      await this.play()
      this.preloadNextTrack()
    }
  }

  /**
   * Play previous track
   */
  async playPrevious(): Promise<void> {
    const prevIndex = this.getPreviousIndex()
    if (prevIndex === -1) {
      await this.stop()
      return
    }

    this.state.currentIndex = prevIndex
    const prevTrack = this.getCurrentTrack()
    
    if (prevTrack) {
      await this.play()
      this.preloadNextTrack()
    }
  }

  /**
   * Skip to specific track in queue
   */
  async skipTo(index: number): Promise<void> {
    if (index < 0 || index >= this.state.queue.length) return

    this.state.currentIndex = index
    const track = this.getCurrentTrack()
    
    if (track) {
      await this.play()
      this.preloadNextTrack()
    }
  }

  /**
   * Set repeat mode
   */
  setRepeatMode(mode: RepeatMode): void {
    this.state.repeatMode = mode
    this.emit('repeatModeChange', { mode })
  }

  /**
   * Set shuffle mode
   */
  setShuffleMode(enabled: boolean): void {
    this.state.shuffleMode = enabled
    
    if (enabled) {
      this.generateShuffledIndices()
    } else {
      this.state.shuffledIndices = []
    }

    this.emit('shuffleModeChange', { enabled })
  }

  /**
   * Generate shuffled indices for shuffle mode
   */
  private generateShuffledIndices(): void {
    const indices = Array.from({ length: this.state.queue.length }, (_, i) => i)
    
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]]
    }

    this.state.shuffledIndices = indices
  }

  /**
   * Get the actual index in the queue (considering shuffle)
   */
  private getActualIndex(logicalIndex: number): number {
    if (!this.state.shuffleMode || logicalIndex < 0 || logicalIndex >= this.state.queue.length) {
      return logicalIndex
    }
    return this.state.shuffledIndices[logicalIndex]
  }

  /**
   * Get current track
   */
  getCurrentTrack(): Track | null {
    if (this.state.currentIndex < 0 || this.state.currentIndex >= this.state.queue.length) {
      return null
    }
    
    const actualIndex = this.getActualIndex(this.state.currentIndex)
    return this.state.queue[actualIndex] || null
  }

  /**
   * Get next track index
   */
  private getNextIndex(): number {
    if (this.state.queue.length === 0) return -1

    let nextIndex = this.state.currentIndex + 1

    if (nextIndex >= this.state.queue.length) {
      // End of queue
      if (this.state.repeatMode === 'all') {
        nextIndex = 0 // Loop back to beginning
      } else {
        return -1 // No more tracks
      }
    }

    return nextIndex
  }

  /**
   * Get previous track index
   */
  private getPreviousIndex(): number {
    if (this.state.queue.length === 0) return -1

    let prevIndex = this.state.currentIndex - 1

    if (prevIndex < 0) {
      // Beginning of queue
      if (this.state.repeatMode === 'all') {
        prevIndex = this.state.queue.length - 1 // Loop to end
      } else {
        return -1 // No previous track
      }
    }

    return prevIndex
  }

  /**
   * Handle track end
   */
  private async handleTrackEnd(): Promise<void> {
    if (this.state.repeatMode === 'one') {
      // Repeat current track
      await this.play()
    } else {
      // Play next track
      await this.playNext()
    }
  }

  /**
   * Preload next track for gapless playback
   */
  private preloadNextTrack(): void {
    if (this.preloadTimeout) {
      clearTimeout(this.preloadTimeout)
    }

    this.preloadTimeout = setTimeout(async () => {
      const nextIndex = this.getNextIndex()
      if (nextIndex !== -1) {
        const nextTrack = this.state.queue[this.getActualIndex(nextIndex)]
        if (nextTrack) {
          try {
            await this.audioEngine.preloadNextTrack(nextTrack)
          } catch (error) {
            console.warn('Failed to preload next track:', error)
          }
        }
      }
    }, 1000) // Preload 1 second after track starts
  }

  /**
   * Get queue state
   */
  getQueueState(): QueueState {
    return {
      nowPlaying: this.getCurrentTrack(),
      upNext: this.getUpNextTracks(10), // Next 10 tracks
      history: [...this.state.history].slice(-10), // Last 10 tracks
    }
  }

  /**
   * Get upcoming tracks
   */
  getUpNextTracks(count: number = 5): Track[] {
    const tracks: Track[] = []
    let index = this.state.currentIndex + 1

    while (tracks.length < count && index < this.state.queue.length) {
      const actualIndex = this.getActualIndex(index)
      const track = this.state.queue[actualIndex]
      if (track) {
        tracks.push(track)
      }
      index++
    }

    return tracks
  }

  /**
   * Get queue manager state
   */
  getState(): QueueManagerState {
    return { ...this.state }
  }

  /**
   * Get playback state from audio engine
   */
  getPlaybackState(): PlaybackState {
    return this.audioEngine.getPlaybackState()
  }

  /**
   * Seek to specific time
   */
  async seek(time: number): Promise<void> {
    await this.audioEngine.seek(time)
  }

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    this.audioEngine.setVolume(volume)
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    this.audioEngine.setMuted(muted)
  }

  /**
   * Add event listener
   */
  on(event: string, callback: (event: QueueEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: (event: QueueEvent) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * Emit event
   */
  private emit(type: QueueEvent['type'], data?: any): void {
    const event: QueueEvent = {
      type,
      data,
      timestamp: Date.now(),
    }

    const listeners = this.eventListeners.get(type)
    if (listeners) {
      listeners.forEach(callback => callback(event))
    }
  }

  /**
   * Cleanup
   */
  async destroy(): Promise<void> {
    if (this.preloadTimeout) {
      clearTimeout(this.preloadTimeout)
    }
    
    await this.audioEngine.destroy()
    this.eventListeners.clear()
  }
}
