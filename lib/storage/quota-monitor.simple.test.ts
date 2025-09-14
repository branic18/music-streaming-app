/**
 * Simplified unit tests for quota monitor
 */

import { QuotaMonitor, quotaMonitor } from './quota-monitor'

// Mock navigator.storage
const mockStorage = {
  estimate: jest.fn(() => Promise.resolve({
    quota: 10 * 1024 * 1024, // 10MB
    usage: 5 * 1024 * 1024,  // 5MB
  })),
}

Object.defineProperty(global, 'navigator', {
  value: {
    storage: mockStorage,
  },
  writable: true,
})

// Mock localStorage
const mockLocalStorage = {
  length: 0,
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(() => null),
}

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

// Mock sessionStorage
const mockSessionStorage = {
  length: 0,
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(() => null),
}

Object.defineProperty(global, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
})

// Mock window
Object.defineProperty(global, 'window', {
  value: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  writable: true,
})

// Mock error handler
jest.mock('@/lib/error/error-handler', () => ({
  errorHandler: {
    handleError: jest.fn(),
  },
}))

describe('QuotaMonitor', () => {
  let quotaMonitor: QuotaMonitor

  beforeEach(() => {
    jest.clearAllMocks()
    quotaMonitor = new QuotaMonitor()
    mockLocalStorage.length = 0
    mockSessionStorage.length = 0
  })

  afterEach(() => {
    quotaMonitor.stopMonitoring()
  })

  describe('Quota Information', () => {
    it('should get quota info', async () => {
      const quota = await quotaMonitor.getQuotaInfo()

      expect(quota.quota).toBe(10 * 1024 * 1024)
      expect(quota.usage).toBe(5 * 1024 * 1024)
      expect(quota.available).toBe(5 * 1024 * 1024)
      expect(quota.percentage).toBe(50)
    })

    it('should handle storage API errors', async () => {
      mockStorage.estimate.mockRejectedValueOnce(new Error('Storage API error'))

      const quota = await quotaMonitor.getQuotaInfo()

      // Should fallback to localStorage estimation
      expect(quota.quota).toBe(10 * 1024 * 1024)
      expect(quota.usage).toBe(0)
      expect(quota.available).toBe(10 * 1024 * 1024)
      expect(quota.percentage).toBe(0)
    })
  })

  describe('Storage Items', () => {
    it('should get storage items', () => {
      // Mock localStorage items
      mockLocalStorage.length = 2
      mockLocalStorage.key
        .mockReturnValueOnce('test-key-1')
        .mockReturnValueOnce('test-key-2')
      mockLocalStorage.getItem
        .mockReturnValueOnce('test-value-1')
        .mockReturnValueOnce('test-value-2')

      const items = quotaMonitor.getStorageItems()

      expect(items).toHaveLength(2)
      expect(items[0].key).toBe('test-key-1')
      expect(items[0].size).toBe(22) // 'test-key-1' + 'test-value-1'
      expect(items[0].type).toBe('localStorage')
      expect(items[0].priority).toBe(5) // Default priority
    })

    it('should determine item priority correctly', () => {
      // Mock different types of keys
      mockLocalStorage.length = 4
      mockLocalStorage.key
        .mockReturnValueOnce('auth-token')
        .mockReturnValueOnce('user-settings')
        .mockReturnValueOnce('cache-data')
        .mockReturnValueOnce('analytics-log')
      mockLocalStorage.getItem
        .mockReturnValue('test-value')

      const items = quotaMonitor.getStorageItems()

      expect(items[0].priority).toBe(1) // auth-token
      expect(items[1].priority).toBe(2) // user-settings
      expect(items[2].priority).toBe(3) // cache-data
      expect(items[3].priority).toBe(4) // analytics-log
    })

    it('should sort items by size', () => {
      mockLocalStorage.length = 3
      mockLocalStorage.key
        .mockReturnValueOnce('small-key')
        .mockReturnValueOnce('medium-key')
        .mockReturnValueOnce('large-key')
      mockLocalStorage.getItem
        .mockReturnValueOnce('small')
        .mockReturnValueOnce('medium-value')
        .mockReturnValueOnce('large-value-content')

      const items = quotaMonitor.getStorageItems()

      expect(items[0].key).toBe('large-key')
      expect(items[1].key).toBe('medium-key')
      expect(items[2].key).toBe('small-key')
    })
  })

  describe('Storage Cleanup', () => {
    it('should cleanup storage with dry run', async () => {
      // Mock old items
      mockLocalStorage.length = 2
      mockLocalStorage.key
        .mockReturnValueOnce('old-cache-item')
        .mockReturnValueOnce('recent-item')
      mockLocalStorage.getItem
        .mockReturnValueOnce('old-cache-data')
        .mockReturnValueOnce('recent-data')

      const result = await quotaMonitor.cleanupStorage({
        dryRun: true,
        maxAge: 1000, // 1 second
        priority: 3,
      })

      expect(result.success).toBe(true)
      expect(result.dryRun).toBe(true)
      expect(result.itemsToDelete).toHaveLength(1)
      expect(result.itemsToDelete[0].key).toBe('old-cache-item')
      expect(result.bytesFreed).toBe(20) // 'old-cache-item' + 'old-cache-data'
    })

    it('should cleanup storage for real', async () => {
      mockLocalStorage.length = 2
      mockLocalStorage.key
        .mockReturnValueOnce('old-cache-item')
        .mockReturnValueOnce('recent-item')
      mockLocalStorage.getItem
        .mockReturnValueOnce('old-cache-data')
        .mockReturnValueOnce('recent-data')

      const result = await quotaMonitor.cleanupStorage({
        dryRun: false,
        maxAge: 1000,
        priority: 3,
      })

      expect(result.success).toBe(true)
      expect(result.itemsDeleted).toBe(1)
      expect(result.bytesFreed).toBe(20)
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('old-cache-item')
    })

    it('should preserve specified keys', async () => {
      mockLocalStorage.length = 2
      mockLocalStorage.key
        .mockReturnValueOnce('preserve-this')
        .mockReturnValueOnce('delete-this')
      mockLocalStorage.getItem
        .mockReturnValue('test-data')

      const result = await quotaMonitor.cleanupStorage({
        dryRun: true,
        preserveKeys: ['preserve-this'],
        priority: 5,
      })

      expect(result.itemsToDelete).toHaveLength(1)
      expect(result.itemsToDelete[0].key).toBe('delete-this')
    })

    it('should respect priority levels', async () => {
      mockLocalStorage.length = 2
      mockLocalStorage.key
        .mockReturnValueOnce('auth-token')
        .mockReturnValueOnce('temp-cache')
      mockLocalStorage.getItem
        .mockReturnValue('test-data')

      const result = await quotaMonitor.cleanupStorage({
        dryRun: true,
        priority: 3, // Only clean priority 3 and above
      })

      expect(result.itemsToDelete).toHaveLength(1)
      expect(result.itemsToDelete[0].key).toBe('temp-cache')
    })
  })

  describe('Quota Monitoring', () => {
    it('should start monitoring', () => {
      quotaMonitor.startMonitoring(1000)

      expect(quotaMonitor['monitoringInterval']).toBeDefined()
    })

    it('should stop monitoring', () => {
      quotaMonitor.startMonitoring(1000)
      quotaMonitor.stopMonitoring()

      expect(quotaMonitor['monitoringInterval']).toBeNull()
    })

    it('should generate alerts for high usage', async () => {
      // Mock high usage
      mockStorage.estimate.mockResolvedValueOnce({
        quota: 10 * 1024 * 1024,
        usage: 8 * 1024 * 1024, // 80% usage
      })

      await quotaMonitor['checkQuotaAndAlert']()

      const alerts = quotaMonitor.getAlerts()
      expect(alerts).toHaveLength(1)
      expect(alerts[0].level).toBe('warning')
      expect(alerts[0].percentage).toBe(80)
    })

    it('should generate critical alerts for very high usage', async () => {
      // Mock critical usage
      mockStorage.estimate.mockResolvedValueOnce({
        quota: 10 * 1024 * 1024,
        usage: 9.5 * 1024 * 1024, // 95% usage
      })

      await quotaMonitor['checkQuotaAndAlert']()

      const alerts = quotaMonitor.getAlerts()
      expect(alerts).toHaveLength(1)
      expect(alerts[0].level).toBe('critical')
      expect(alerts[0].percentage).toBe(95)
    })
  })

  describe('Storage Statistics', () => {
    it('should get usage by type', () => {
      mockLocalStorage.length = 2
      mockSessionStorage.length = 1
      mockLocalStorage.key
        .mockReturnValueOnce('local-item-1')
        .mockReturnValueOnce('local-item-2')
      mockSessionStorage.key.mockReturnValueOnce('session-item')
      mockLocalStorage.getItem.mockReturnValue('local-data')
      mockSessionStorage.getItem.mockReturnValue('session-data')

      const usage = quotaMonitor.getUsageByType()

      expect(usage.localStorage.count).toBe(2)
      expect(usage.localStorage.size).toBe(22) // 2 * ('local-item-1' + 'local-data')
      expect(usage.sessionStorage.count).toBe(1)
      expect(usage.sessionStorage.size).toBe(21) // 'session-item' + 'session-data'
    })

    it('should get largest items', () => {
      mockLocalStorage.length = 3
      mockLocalStorage.key
        .mockReturnValueOnce('small')
        .mockReturnValueOnce('medium-key')
        .mockReturnValueOnce('large-key-name')
      mockLocalStorage.getItem
        .mockReturnValueOnce('small')
        .mockReturnValueOnce('medium-value')
        .mockReturnValueOnce('large-value-content')

      const largest = quotaMonitor.getLargestItems(2)

      expect(largest).toHaveLength(2)
      expect(largest[0].key).toBe('large-key-name')
      expect(largest[1].key).toBe('medium-key')
    })

    it('should get oldest items', () => {
      mockLocalStorage.length = 2
      mockLocalStorage.key
        .mockReturnValueOnce('old-item')
        .mockReturnValueOnce('new-item')
      mockLocalStorage.getItem.mockReturnValue('data')

      const oldest = quotaMonitor.getOldestItems(1)

      expect(oldest).toHaveLength(1)
      expect(oldest[0].key).toBe('old-item')
    })
  })

  describe('Alert Management', () => {
    it('should get alerts by level', () => {
      quotaMonitor['alerts'] = [
        { level: 'warning', message: 'Warning', percentage: 70, timestamp: new Date() },
        { level: 'critical', message: 'Critical', percentage: 90, timestamp: new Date() },
        { level: 'warning', message: 'Another warning', percentage: 75, timestamp: new Date() },
      ]

      const warningAlerts = quotaMonitor.getAlerts('warning')
      const criticalAlerts = quotaMonitor.getAlerts('critical')

      expect(warningAlerts).toHaveLength(2)
      expect(criticalAlerts).toHaveLength(1)
    })

    it('should clear alerts', () => {
      quotaMonitor['alerts'] = [
        { level: 'warning', message: 'Warning', percentage: 70, timestamp: new Date() },
      ]

      quotaMonitor.clearAlerts()

      expect(quotaMonitor.getAlerts()).toHaveLength(0)
    })
  })

  describe('Configuration', () => {
    it('should update alert thresholds', () => {
      quotaMonitor.updateAlertThresholds(60, 80)

      const thresholds = quotaMonitor.getAlertThresholds()
      expect(thresholds.warning).toBe(60)
      expect(thresholds.critical).toBe(80)
    })

    it('should validate threshold values', () => {
      expect(() => {
        quotaMonitor.updateAlertThresholds(80, 60) // warning > critical
      }).toThrow('Invalid threshold values')

      expect(() => {
        quotaMonitor.updateAlertThresholds(-10, 80) // negative warning
      }).toThrow('Invalid threshold values')

      expect(() => {
        quotaMonitor.updateAlertThresholds(60, 110) // critical > 100
      }).toThrow('Invalid threshold values')
    })
  })

  describe('Data Export/Import', () => {
    it('should export storage data', () => {
      mockLocalStorage.length = 1
      mockLocalStorage.key.mockReturnValueOnce('test-key')
      mockLocalStorage.getItem.mockReturnValueOnce('test-value')

      const exported = quotaMonitor.exportStorageData()
      const parsed = JSON.parse(exported)

      expect(parsed['localStorage.test-key']).toBe('test-value')
    })

    it('should import storage data', () => {
      const data = {
        'localStorage.test-key': 'test-value',
        'sessionStorage.session-key': 'session-value',
      }

      quotaMonitor.importStorageData(JSON.stringify(data))

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', 'test-value')
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('session-key', 'session-value')
    })

    it('should handle import errors', () => {
      expect(() => {
        quotaMonitor.importStorageData('invalid json')
      }).toThrow('Failed to import storage data')
    })
  })

  describe('Storage Management', () => {
    it('should clear all storage', () => {
      quotaMonitor.clearAllStorage()

      expect(mockLocalStorage.clear).toHaveBeenCalled()
      expect(mockSessionStorage.clear).toHaveBeenCalled()
    })

    it('should get comprehensive storage stats', async () => {
      mockLocalStorage.length = 1
      mockLocalStorage.key.mockReturnValueOnce('test-key')
      mockLocalStorage.getItem.mockReturnValueOnce('test-value')

      const stats = await quotaMonitor.getStorageStats()

      expect(stats.quota).toBeDefined()
      expect(stats.items).toHaveLength(1)
      expect(stats.usageByType).toBeDefined()
      expect(stats.alerts).toBeDefined()
      expect(stats.largestItems).toBeDefined()
      expect(stats.oldestItems).toBeDefined()
    })
  })

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = QuotaMonitor.getInstance()
      const instance2 = QuotaMonitor.getInstance()

      expect(instance1).toBe(instance2)
    })
  })
})
