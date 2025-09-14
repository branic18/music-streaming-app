/**
 * Storage quota monitoring and cleanup utilities
 * Provides monitoring, cleanup, and management for browser storage quotas
 */

import { errorHandler } from '@/lib/error/error-handler'

export interface StorageQuota {
  quota: number
  usage: number
  available: number
  percentage: number
}

export interface StorageItem {
  key: string
  size: number
  lastAccessed: Date
  lastModified: Date
  type: 'localStorage' | 'sessionStorage' | 'indexedDB'
  priority: number // 1 = highest, 5 = lowest
}

export interface CleanupOptions {
  targetPercentage?: number // Target usage percentage after cleanup
  maxAge?: number // Maximum age in milliseconds
  priority?: number // Maximum priority to clean (1-5)
  dryRun?: boolean // Don't actually delete, just return what would be deleted
  preserveKeys?: string[] // Keys to never delete
}

export interface CleanupResult {
  success: boolean
  itemsDeleted: number
  bytesFreed: number
  itemsToDelete: StorageItem[]
  errors: string[]
  quotaBefore: StorageQuota
  quotaAfter: StorageQuota
}

export interface QuotaAlert {
  level: 'info' | 'warning' | 'critical'
  message: string
  percentage: number
  timestamp: Date
}

export class QuotaMonitor {
  private static instance: QuotaMonitor
  private alerts: QuotaAlert[] = []
  private monitoringInterval: NodeJS.Timeout | null = null
  private alertThresholds = {
    warning: 70, // 70% usage
    critical: 90, // 90% usage
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupStorageEventListeners()
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): QuotaMonitor {
    if (!QuotaMonitor.instance) {
      QuotaMonitor.instance = new QuotaMonitor()
    }
    return QuotaMonitor.instance
  }

  /**
   * Get storage quota information
   */
  async getQuotaInfo(): Promise<StorageQuota> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        const quota = estimate.quota || 0
        const usage = estimate.usage || 0
        const available = quota - usage
        const percentage = quota > 0 ? (usage / quota) * 100 : 0

        return {
          quota,
          usage,
          available,
          percentage,
        }
      } else {
        // Fallback for browsers that don't support Storage API
        return this.getFallbackQuotaInfo()
      }
    } catch (error) {
      errorHandler.handleError(error, {
        component: 'QuotaMonitor',
        action: 'getQuotaInfo',
      })
      return this.getFallbackQuotaInfo()
    }
  }

  /**
   * Get fallback quota info when Storage API is not available
   */
  private getFallbackQuotaInfo(): StorageQuota {
    // Estimate based on localStorage usage
    let usage = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key)
        if (value) {
          usage += key.length + value.length
        }
      }
    }

    // Assume 10MB quota for localStorage (typical browser limit)
    const quota = 10 * 1024 * 1024
    const available = quota - usage
    const percentage = (usage / quota) * 100

    return {
      quota,
      usage,
      available,
      percentage,
    }
  }

  /**
   * Get detailed storage items
   */
  getStorageItems(): StorageItem[] {
    const items: StorageItem[] = []

    // Get localStorage items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key)
        if (value) {
          const size = key.length + value.length
          items.push({
            key,
            size,
            lastAccessed: new Date(),
            lastModified: new Date(),
            type: 'localStorage',
            priority: this.getItemPriority(key),
          })
        }
      }
    }

    // Get sessionStorage items
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key) {
        const value = sessionStorage.getItem(key)
        if (value) {
          const size = key.length + value.length
          items.push({
            key,
            size,
            lastAccessed: new Date(),
            lastModified: new Date(),
            type: 'sessionStorage',
            priority: this.getItemPriority(key),
          })
        }
      }
    }

    return items.sort((a, b) => b.size - a.size) // Sort by size descending
  }

  /**
   * Determine item priority based on key
   */
  private getItemPriority(key: string): number {
    // Critical items (never delete)
    if (key.includes('auth') || key.includes('token') || key.includes('user')) {
      return 1
    }
    // High priority (user preferences)
    if (key.includes('settings') || key.includes('preferences') || key.includes('config')) {
      return 2
    }
    // Medium priority (cached data)
    if (key.includes('cache') || key.includes('temp') || key.includes('session')) {
      return 3
    }
    // Low priority (analytics, logs)
    if (key.includes('analytics') || key.includes('log') || key.includes('debug')) {
      return 4
    }
    // Very low priority (temporary data)
    return 5
  }

  /**
   * Clean up storage based on options
   */
  async cleanupStorage(options: CleanupOptions = {}): Promise<CleanupResult> {
    const {
      targetPercentage = 50,
      maxAge = 7 * 24 * 60 * 60 * 1000, // 7 days
      priority = 5,
      dryRun = false,
      preserveKeys = [],
    } = options

    const result: CleanupResult = {
      success: false,
      itemsDeleted: 0,
      bytesFreed: 0,
      itemsToDelete: [],
      errors: [],
      quotaBefore: await this.getQuotaInfo(),
      quotaAfter: { quota: 0, usage: 0, available: 0, percentage: 0 },
    }

    try {
      const items = this.getStorageItems()
      const now = Date.now()
      const cutoffTime = now - maxAge

      // Filter items to delete
      const itemsToDelete = items.filter(item => {
        // Skip preserved keys
        if (preserveKeys.includes(item.key)) {
          return false
        }

        // Skip high priority items
        if (item.priority < priority) {
          return false
        }

        // Check age
        if (item.lastModified.getTime() > cutoffTime) {
          return false
        }

        return true
      })

      result.itemsToDelete = itemsToDelete

      if (!dryRun) {
        // Actually delete items
        for (const item of itemsToDelete) {
          try {
            if (item.type === 'localStorage') {
              localStorage.removeItem(item.key)
            } else if (item.type === 'sessionStorage') {
              sessionStorage.removeItem(item.key)
            }
            result.bytesFreed += item.size
            result.itemsDeleted++
          } catch (error) {
            result.errors.push(`Failed to delete ${item.key}: ${(error as Error).message}`)
          }
        }
      } else {
        // Dry run - just calculate what would be freed
        result.bytesFreed = itemsToDelete.reduce((sum, item) => sum + item.size, 0)
        result.itemsDeleted = itemsToDelete.length
      }

      result.quotaAfter = await this.getQuotaInfo()
      result.success = result.errors.length === 0

    } catch (error) {
      const err = error as Error
      result.errors.push(`Cleanup failed: ${err.message}`)
      errorHandler.handleError(err, {
        component: 'QuotaMonitor',
        action: 'cleanupStorage',
        metadata: options,
      })
    }

    return result
  }

  /**
   * Start monitoring storage quota
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }

    this.monitoringInterval = setInterval(async () => {
      await this.checkQuotaAndAlert()
    }, intervalMs)

    // Initial check
    this.checkQuotaAndAlert()
  }

  /**
   * Stop monitoring storage quota
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }

  /**
   * Check quota and generate alerts
   */
  private async checkQuotaAndAlert(): Promise<void> {
    try {
      const quota = await this.getQuotaInfo()
      const percentage = quota.percentage

      if (percentage >= this.alertThresholds.critical) {
        this.addAlert({
          level: 'critical',
          message: `Storage quota critical: ${percentage.toFixed(1)}% used`,
          percentage,
          timestamp: new Date(),
        })
      } else if (percentage >= this.alertThresholds.warning) {
        this.addAlert({
          level: 'warning',
          message: `Storage quota warning: ${percentage.toFixed(1)}% used`,
          percentage,
          timestamp: new Date(),
        })
      }
    } catch (error) {
      errorHandler.handleError(error, {
        component: 'QuotaMonitor',
        action: 'checkQuotaAndAlert',
      })
    }
  }

  /**
   * Add quota alert
   */
  private addAlert(alert: QuotaAlert): void {
    this.alerts.push(alert)
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100)
    }

    // Log alert
    console.warn(`[QuotaMonitor] ${alert.level.toUpperCase()}: ${alert.message}`)
  }

  /**
   * Get quota alerts
   */
  getAlerts(level?: QuotaAlert['level']): QuotaAlert[] {
    if (level) {
      return this.alerts.filter(alert => alert.level === level)
    }
    return [...this.alerts]
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = []
  }

  /**
   * Get storage usage by type
   */
  getUsageByType(): Record<string, { count: number; size: number }> {
    const usage: Record<string, { count: number; size: number }> = {
      localStorage: { count: 0, size: 0 },
      sessionStorage: { count: 0, size: 0 },
      indexedDB: { count: 0, size: 0 },
    }

    const items = this.getStorageItems()
    items.forEach(item => {
      usage[item.type].count++
      usage[item.type].size += item.size
    })

    return usage
  }

  /**
   * Get largest storage items
   */
  getLargestItems(limit: number = 10): StorageItem[] {
    const items = this.getStorageItems()
    return items.slice(0, limit)
  }

  /**
   * Get oldest storage items
   */
  getOldestItems(limit: number = 10): StorageItem[] {
    const items = this.getStorageItems()
    return items
      .sort((a, b) => a.lastModified.getTime() - b.lastModified.getTime())
      .slice(0, limit)
  }

  /**
   * Get storage items by priority
   */
  getItemsByPriority(priority: number): StorageItem[] {
    const items = this.getStorageItems()
    return items.filter(item => item.priority === priority)
  }

  /**
   * Estimate cleanup impact
   */
  async estimateCleanupImpact(options: CleanupOptions = {}): Promise<{
    itemsToDelete: number
    bytesToFree: number
    newPercentage: number
  }> {
    const result = await this.cleanupStorage({ ...options, dryRun: true })
    const currentQuota = await this.getQuotaInfo()
    const newUsage = currentQuota.usage - result.bytesFreed
    const newPercentage = currentQuota.quota > 0 ? (newUsage / currentQuota.quota) * 100 : 0

    return {
      itemsToDelete: result.itemsDeleted,
      bytesToFree: result.bytesFreed,
      newPercentage,
    }
  }

  /**
   * Setup storage event listeners
   */
  private setupStorageEventListeners(): void {
    if (typeof window === 'undefined') return

    // Listen for storage changes
    window.addEventListener('storage', (event) => {
      if (event.storageArea === localStorage || event.storageArea === sessionStorage) {
        // Storage changed, check quota
        this.checkQuotaAndAlert()
      }
    })
  }

  /**
   * Update alert thresholds
   */
  updateAlertThresholds(warning: number, critical: number): void {
    if (warning >= critical || warning < 0 || critical > 100) {
      throw new Error('Invalid threshold values')
    }

    this.alertThresholds = { warning, critical }
  }

  /**
   * Get current alert thresholds
   */
  getAlertThresholds(): { warning: number; critical: number } {
    return { ...this.alertThresholds }
  }

  /**
   * Export storage data
   */
  exportStorageData(): string {
    const data: Record<string, any> = {}

    // Export localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        data[`localStorage.${key}`] = localStorage.getItem(key)
      }
    }

    // Export sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key) {
        data[`sessionStorage.${key}`] = sessionStorage.getItem(key)
      }
    }

    return JSON.stringify(data, null, 2)
  }

  /**
   * Import storage data
   */
  importStorageData(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData)

      Object.entries(data).forEach(([key, value]) => {
        if (key.startsWith('localStorage.')) {
          const actualKey = key.replace('localStorage.', '')
          localStorage.setItem(actualKey, value as string)
        } else if (key.startsWith('sessionStorage.')) {
          const actualKey = key.replace('sessionStorage.', '')
          sessionStorage.setItem(actualKey, value as string)
        }
      })
    } catch (error) {
      throw new Error(`Failed to import storage data: ${(error as Error).message}`)
    }
  }

  /**
   * Clear all storage
   */
  clearAllStorage(): void {
    localStorage.clear()
    sessionStorage.clear()
    
    // Note: IndexedDB clearing would require more complex logic
    // and should be handled by the IndexedDB wrapper
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    quota: StorageQuota
    items: StorageItem[]
    usageByType: Record<string, { count: number; size: number }>
    alerts: QuotaAlert[]
    largestItems: StorageItem[]
    oldestItems: StorageItem[]
  }> {
    const quota = await this.getQuotaInfo()
    const items = this.getStorageItems()
    const usageByType = this.getUsageByType()
    const alerts = this.getAlerts()
    const largestItems = this.getLargestItems(10)
    const oldestItems = this.getOldestItems(10)

    return {
      quota,
      items,
      usageByType,
      alerts,
      largestItems,
      oldestItems,
    }
  }
}

// Export singleton instance
export const quotaMonitor = QuotaMonitor.getInstance()

// Export utility functions
export const getQuotaInfo = () => quotaMonitor.getQuotaInfo()
export const getStorageItems = () => quotaMonitor.getStorageItems()
export const cleanupStorage = (options?: CleanupOptions) => quotaMonitor.cleanupStorage(options)
export const startQuotaMonitoring = (intervalMs?: number) => quotaMonitor.startMonitoring(intervalMs)
export const stopQuotaMonitoring = () => quotaMonitor.stopMonitoring()
export const getQuotaAlerts = (level?: QuotaAlert['level']) => quotaMonitor.getAlerts(level)
export const clearQuotaAlerts = () => quotaMonitor.clearAlerts()
export const getStorageStats = () => quotaMonitor.getStorageStats()

export default quotaMonitor
