/**
 * IndexedDB wrapper for persistent storage of library, playlists, and downloads
 * Provides CRUD operations with proper error handling and type safety
 */

import type { Track, Album, Artist, Playlist, DownloadItem, LibraryItem } from '@/lib/types'

// Database configuration
const DB_NAME = 'StreamCastDB'
const DB_VERSION = 1

// Store names
export const STORES = {
  LIBRARY: 'library',
  PLAYLISTS: 'playlists',
  DOWNLOADS: 'downloads',
  SETTINGS: 'settings',
  ANALYTICS: 'analytics',
} as const

// IndexedDB wrapper class
export class IndexedDBWrapper {
  private db: IDBDatabase | null = null
  private dbPromise: Promise<IDBDatabase> | null = null

  constructor() {
    // Don't initialize automatically to avoid issues in tests
    // Call initDB() when needed
  }

  /**
   * Initialize the IndexedDB database
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise
    }

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not supported'))
        return
      }
      
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        this.createStores(db)
      }
    })

    return this.dbPromise
  }

  /**
   * Create database stores and indexes
   */
  private createStores(db: IDBDatabase): void {
    // Library store
    if (!db.objectStoreNames.contains(STORES.LIBRARY)) {
      const libraryStore = db.createObjectStore(STORES.LIBRARY, { keyPath: 'id' })
      libraryStore.createIndex('type', 'type', { unique: false })
      libraryStore.createIndex('itemId', 'itemId', { unique: false })
      libraryStore.createIndex('addedAt', 'addedAt', { unique: false })
    }

    // Playlists store
    if (!db.objectStoreNames.contains(STORES.PLAYLISTS)) {
      const playlistsStore = db.createObjectStore(STORES.PLAYLISTS, { keyPath: 'id' })
      playlistsStore.createIndex('name', 'name', { unique: false })
      playlistsStore.createIndex('isPublic', 'isPublic', { unique: false })
      playlistsStore.createIndex('shareToken', 'shareToken', { unique: true })
      playlistsStore.createIndex('createdAt', 'createdAt', { unique: false })
      playlistsStore.createIndex('updatedAt', 'updatedAt', { unique: false })
    }

    // Downloads store
    if (!db.objectStoreNames.contains(STORES.DOWNLOADS)) {
      const downloadsStore = db.createObjectStore(STORES.DOWNLOADS, { keyPath: 'id' })
      downloadsStore.createIndex('status', 'status', { unique: false })
      downloadsStore.createIndex('trackId', 'track.id', { unique: false })
      downloadsStore.createIndex('downloadedAt', 'downloadedAt', { unique: false })
      downloadsStore.createIndex('quality', 'quality', { unique: false })
    }

    // Settings store
    if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
      const settingsStore = db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' })
    }

    // Analytics store
    if (!db.objectStoreNames.contains(STORES.ANALYTICS)) {
      const analyticsStore = db.createObjectStore(STORES.ANALYTICS, { keyPath: 'id' })
      analyticsStore.createIndex('type', 'type', { unique: false })
      analyticsStore.createIndex('timestamp', 'timestamp', { unique: false })
      analyticsStore.createIndex('sessionId', 'sessionId', { unique: false })
    }
  }

  /**
   * Get database instance
   */
  private async getDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db
    }
    return this.initDB()
  }

  /**
   * Generic method to perform database operations
   */
  private async performOperation<T>(
    storeName: string,
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const db = await this.getDB()
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = operation(store)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error(`Database operation failed: ${request.error?.message}`))
    })
  }

  /**
   * Generic method to perform read operations
   */
  private async performReadOperation<T>(
    storeName: string,
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const db = await this.getDB()
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const request = operation(store)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error(`Database read operation failed: ${request.error?.message}`))
    })
  }

  // ============================================================================
  // LIBRARY OPERATIONS
  // ============================================================================

  /**
   * Add item to library
   */
  async addToLibrary(item: LibraryItem): Promise<void> {
    await this.performOperation(STORES.LIBRARY, (store) => store.add(item))
  }

  /**
   * Remove item from library
   */
  async removeFromLibrary(id: string): Promise<void> {
    await this.performOperation(STORES.LIBRARY, (store) => store.delete(id))
  }

  /**
   * Get all library items
   */
  async getAllLibraryItems(): Promise<LibraryItem[]> {
    return this.performReadOperation(STORES.LIBRARY, (store) => store.getAll())
  }

  /**
   * Get library items by type
   */
  async getLibraryItemsByType(type: LibraryItem['type']): Promise<LibraryItem[]> {
    const db = await this.getDB()
    const transaction = db.transaction([STORES.LIBRARY], 'readonly')
    const store = transaction.objectStore(STORES.LIBRARY)
    const index = store.index('type')
    const request = index.getAll(type)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error(`Failed to get library items by type: ${request.error?.message}`))
    })
  }

  /**
   * Check if item is in library
   */
  async isInLibrary(itemId: string, type: LibraryItem['type']): Promise<boolean> {
    const db = await this.getDB()
    const transaction = db.transaction([STORES.LIBRARY], 'readonly')
    const store = transaction.objectStore(STORES.LIBRARY)
    const index = store.index('itemId')
    const request = index.get(itemId)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const item = request.result as LibraryItem | undefined
        resolve(item ? item.type === type : false)
      }
      request.onerror = () => reject(new Error(`Failed to check library status: ${request.error?.message}`))
    })
  }

  /**
   * Clear all library items
   */
  async clearLibrary(): Promise<void> {
    await this.performOperation(STORES.LIBRARY, (store) => store.clear())
  }

  // ============================================================================
  // PLAYLIST OPERATIONS
  // ============================================================================

  /**
   * Create a new playlist
   */
  async createPlaylist(playlist: Playlist): Promise<void> {
    await this.performOperation(STORES.PLAYLISTS, (store) => store.add(playlist))
  }

  /**
   * Get all playlists
   */
  async getAllPlaylists(): Promise<Playlist[]> {
    return this.performReadOperation(STORES.PLAYLISTS, (store) => store.getAll())
  }

  /**
   * Get playlist by ID
   */
  async getPlaylist(id: string): Promise<Playlist | null> {
    const result = await this.performReadOperation(STORES.PLAYLISTS, (store) => store.get(id))
    return result || null
  }

  /**
   * Get playlist by share token
   */
  async getPlaylistByShareToken(shareToken: string): Promise<Playlist | null> {
    const db = await this.getDB()
    const transaction = db.transaction([STORES.PLAYLISTS], 'readonly')
    const store = transaction.objectStore(STORES.PLAYLISTS)
    const index = store.index('shareToken')
    const request = index.get(shareToken)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(new Error(`Failed to get playlist by share token: ${request.error?.message}`))
    })
  }

  /**
   * Update playlist
   */
  async updatePlaylist(playlist: Playlist): Promise<void> {
    await this.performOperation(STORES.PLAYLISTS, (store) => store.put(playlist))
  }

  /**
   * Delete playlist
   */
  async deletePlaylist(id: string): Promise<void> {
    await this.performOperation(STORES.PLAYLISTS, (store) => store.delete(id))
  }

  /**
   * Get public playlists
   */
  async getPublicPlaylists(): Promise<Playlist[]> {
    const db = await this.getDB()
    const transaction = db.transaction([STORES.PLAYLISTS], 'readonly')
    const store = transaction.objectStore(STORES.PLAYLISTS)
    const index = store.index('isPublic')
    const request = index.getAll(true)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error(`Failed to get public playlists: ${request.error?.message}`))
    })
  }

  /**
   * Clear all playlists
   */
  async clearPlaylists(): Promise<void> {
    await this.performOperation(STORES.PLAYLISTS, (store) => store.clear())
  }

  // ============================================================================
  // DOWNLOAD OPERATIONS
  // ============================================================================

  /**
   * Add download item
   */
  async addDownload(download: DownloadItem): Promise<void> {
    await this.performOperation(STORES.DOWNLOADS, (store) => store.add(download))
  }

  /**
   * Get all downloads
   */
  async getAllDownloads(): Promise<DownloadItem[]> {
    return this.performReadOperation(STORES.DOWNLOADS, (store) => store.getAll())
  }

  /**
   * Get download by ID
   */
  async getDownload(id: string): Promise<DownloadItem | null> {
    const result = await this.performReadOperation(STORES.DOWNLOADS, (store) => store.get(id))
    return result || null
  }

  /**
   * Update download
   */
  async updateDownload(download: DownloadItem): Promise<void> {
    await this.performOperation(STORES.DOWNLOADS, (store) => store.put(download))
  }

  /**
   * Delete download
   */
  async deleteDownload(id: string): Promise<void> {
    await this.performOperation(STORES.DOWNLOADS, (store) => store.delete(id))
  }

  /**
   * Get downloads by status
   */
  async getDownloadsByStatus(status: DownloadItem['status']): Promise<DownloadItem[]> {
    const db = await this.getDB()
    const transaction = db.transaction([STORES.DOWNLOADS], 'readonly')
    const store = transaction.objectStore(STORES.DOWNLOADS)
    const index = store.index('status')
    const request = index.getAll(status)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error(`Failed to get downloads by status: ${request.error?.message}`))
    })
  }

  /**
   * Get completed downloads
   */
  async getCompletedDownloads(): Promise<DownloadItem[]> {
    return this.getDownloadsByStatus('completed')
  }

  /**
   * Get downloads by track ID
   */
  async getDownloadsByTrackId(trackId: string): Promise<DownloadItem[]> {
    const db = await this.getDB()
    const transaction = db.transaction([STORES.DOWNLOADS], 'readonly')
    const store = transaction.objectStore(STORES.DOWNLOADS)
    const index = store.index('trackId')
    const request = index.getAll(trackId)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error(`Failed to get downloads by track ID: ${request.error?.message}`))
    })
  }

  /**
   * Clear all downloads
   */
  async clearDownloads(): Promise<void> {
    await this.performOperation(STORES.DOWNLOADS, (store) => store.clear())
  }

  /**
   * Clear completed downloads
   */
  async clearCompletedDownloads(): Promise<void> {
    const completedDownloads = await this.getCompletedDownloads()
    const db = await this.getDB()
    const transaction = db.transaction([STORES.DOWNLOADS], 'readwrite')
    const store = transaction.objectStore(STORES.DOWNLOADS)

    for (const download of completedDownloads) {
      store.delete(download.id)
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(new Error(`Failed to clear completed downloads: ${transaction.error?.message}`))
    })
  }

  // ============================================================================
  // SETTINGS OPERATIONS
  // ============================================================================

  /**
   * Set setting value
   */
  async setSetting(key: string, value: any): Promise<void> {
    await this.performOperation(STORES.SETTINGS, (store) => store.put({ key, value }))
  }

  /**
   * Get setting value
   */
  async getSetting(key: string): Promise<any> {
    const result = await this.performReadOperation(STORES.SETTINGS, (store) => store.get(key))
    return result?.value
  }

  /**
   * Get all settings
   */
  async getAllSettings(): Promise<Record<string, any>> {
    const results = await this.performReadOperation(STORES.SETTINGS, (store) => store.getAll())
    return results.reduce((acc, item) => {
      acc[item.key] = item.value
      return acc
    }, {} as Record<string, any>)
  }

  /**
   * Delete setting
   */
  async deleteSetting(key: string): Promise<void> {
    await this.performOperation(STORES.SETTINGS, (store) => store.delete(key))
  }

  // ============================================================================
  // ANALYTICS OPERATIONS
  // ============================================================================

  /**
   * Add analytics event
   */
  async addAnalyticsEvent(event: any): Promise<void> {
    await this.performOperation(STORES.ANALYTICS, (store) => store.add(event))
  }

  /**
   * Get analytics events by type
   */
  async getAnalyticsEventsByType(type: string): Promise<any[]> {
    const db = await this.getDB()
    const transaction = db.transaction([STORES.ANALYTICS], 'readonly')
    const store = transaction.objectStore(STORES.ANALYTICS)
    const index = store.index('type')
    const request = index.getAll(type)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error(`Failed to get analytics events: ${request.error?.message}`))
    })
  }

  /**
   * Clear old analytics events (older than specified days)
   */
  async clearOldAnalyticsEvents(daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const db = await this.getDB()
    const transaction = db.transaction([STORES.ANALYTICS], 'readwrite')
    const store = transaction.objectStore(STORES.ANALYTICS)
    const index = store.index('timestamp')
    const request = index.openCursor()

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          const event = cursor.value
          if (event.timestamp < cutoffDate) {
            cursor.delete()
          }
          cursor.continue()
        } else {
          resolve()
        }
      }
      request.onerror = () => reject(new Error(`Failed to clear old analytics events: ${request.error?.message}`))
    })
  }

  // ============================================================================
  // UTILITY OPERATIONS
  // ============================================================================

  /**
   * Get database size estimate
   */
  async getDatabaseSize(): Promise<number> {
    if (!navigator.storage || !navigator.storage.estimate) {
      return 0
    }

    const estimate = await navigator.storage.estimate()
    return estimate.usage || 0
  }

  /**
   * Clear all data
   */
  async clearAllData(): Promise<void> {
    const db = await this.getDB()
    const transaction = db.transaction(Object.values(STORES), 'readwrite')

    for (const storeName of Object.values(STORES)) {
      transaction.objectStore(storeName).clear()
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(new Error(`Failed to clear all data: ${transaction.error?.message}`))
    })
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      this.dbPromise = null
    }
  }

  /**
   * Check if IndexedDB is supported
   */
  static isSupported(): boolean {
    return typeof indexedDB !== 'undefined'
  }
}

// Create singleton instance (lazy initialization to avoid issues in tests)
let _indexedDBInstance: IndexedDBWrapper | null = null

export function getIndexedDBInstance(): IndexedDBWrapper {
  if (!_indexedDBInstance) {
    _indexedDBInstance = new IndexedDBWrapper()
  }
  return _indexedDBInstance
}

export const indexedDB = getIndexedDBInstance()

// Export convenience functions
export const {
  addToLibrary,
  removeFromLibrary,
  getAllLibraryItems,
  getLibraryItemsByType,
  isInLibrary,
  clearLibrary,
  createPlaylist,
  getAllPlaylists,
  getPlaylist,
  getPlaylistByShareToken,
  updatePlaylist,
  deletePlaylist,
  getPublicPlaylists,
  clearPlaylists,
  addDownload,
  getAllDownloads,
  getDownload,
  updateDownload,
  deleteDownload,
  getDownloadsByStatus,
  getCompletedDownloads,
  getDownloadsByTrackId,
  clearDownloads,
  clearCompletedDownloads,
  setSetting,
  getSetting,
  getAllSettings,
  deleteSetting,
  addAnalyticsEvent,
  getAnalyticsEventsByType,
  clearOldAnalyticsEvents,
  getDatabaseSize,
  clearAllData,
  close,
} = indexedDB
