/**
 * Custom hook for audio quality management
 * Provides reactive access to quality settings and controls
 */

import { useState, useEffect, useCallback } from 'react'
import { 
  QualityManager, 
  AudioQuality, 
  QualityConfig, 
  QualitySettings,
  NetworkConditions,
  QualityChangeEvent 
} from '@/lib/audio/quality-manager'
import { Track } from '@/lib/types'

interface UseAudioQualityOptions {
  qualityManager: QualityManager
  track?: Track
  onQualityChange?: (quality: AudioQuality) => void
  onNetworkChange?: (conditions: NetworkConditions) => void
}

interface UseAudioQualityReturn {
  // Current state
  currentQuality: AudioQuality
  currentSettings: QualitySettings | null
  networkConditions: NetworkConditions | null
  availableQualities: QualityConfig[]
  isLoading: boolean
  error: string | null
  
  // Actions
  setQuality: (quality: AudioQuality) => Promise<void>
  updateSettings: (settings: Partial<QualitySettings>) => void
  getOptimalQuality: () => QualityConfig | null
  getEstimatedDataUsage: (quality?: AudioQuality) => number
  getBandwidthRecommendation: (quality?: AudioQuality) => number
  
  // Utilities
  isQualitySupported: (quality: AudioQuality) => boolean
  isQualityAvailable: (quality: AudioQuality) => boolean
  formatFileSize: (bytes: number) => string
  getConnectionTypeIcon: (type: string) => string
}

export function useAudioQuality({
  qualityManager,
  track,
  onQualityChange,
  onNetworkChange
}: UseAudioQualityOptions): UseAudioQualityReturn {
  const [currentQuality, setCurrentQuality] = useState<AudioQuality>('high')
  const [currentSettings, setCurrentSettings] = useState<QualitySettings | null>(null)
  const [networkConditions, setNetworkConditions] = useState<NetworkConditions | null>(null)
  const [availableQualities, setAvailableQualities] = useState<QualityConfig[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize hook state
  useEffect(() => {
    const initializeHook = async () => {
      try {
        setError(null)
        setIsLoading(true)
        
        // Get current settings
        const settings = qualityManager.getCurrentSettings()
        setCurrentSettings(settings)
        setCurrentQuality(settings.preferredQuality)
        
        // Get network conditions
        const conditions = qualityManager.getNetworkConditions()
        setNetworkConditions(conditions)
        
        // Get available qualities for current track
        if (track) {
          const qualities = qualityManager.getAvailableQualities(track)
          setAvailableQualities(qualities)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize audio quality')
        console.error('Failed to initialize audio quality hook:', err)
      } finally {
        setIsLoading(false)
      }
    }

    initializeHook()
  }, [qualityManager, track])

  // Set up event listeners
  useEffect(() => {
    const handleQualityChange = (event: QualityChangeEvent) => {
      if (event.data?.quality) {
        setCurrentQuality(event.data.quality)
        onQualityChange?.(event.data.quality)
      }
    }

    const handleNetworkChange = (event: QualityChangeEvent) => {
      if (event.data?.current) {
        setNetworkConditions(event.data.current)
        onNetworkChange?.(event.data.current)
      }
    }

    const handleError = (event: QualityChangeEvent) => {
      setError(event.data?.message || 'Quality management error')
    }

    qualityManager.on('qualityChanged', handleQualityChange)
    qualityManager.on('networkChanged', handleNetworkChange)
    qualityManager.on('error', handleError)

    return () => {
      qualityManager.off('qualityChanged', handleQualityChange)
      qualityManager.off('networkChanged', handleNetworkChange)
      qualityManager.off('error', handleError)
    }
  }, [qualityManager, onQualityChange, onNetworkChange])

  // Update available qualities when track changes
  useEffect(() => {
    if (track) {
      try {
        const qualities = qualityManager.getAvailableQualities(track)
        setAvailableQualities(qualities)
      } catch (err) {
        console.error('Failed to get available qualities:', err)
      }
    }
  }, [qualityManager, track])

  // Set quality
  const setQuality = useCallback(async (quality: AudioQuality) => {
    try {
      setError(null)
      setIsLoading(true)
      await qualityManager.setQuality(quality, track)
      setCurrentQuality(quality)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set quality'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [qualityManager, track])

  // Update settings
  const updateSettings = useCallback((settings: Partial<QualitySettings>) => {
    try {
      setError(null)
      qualityManager.updateSettings(settings)
      setCurrentSettings(prev => prev ? { ...prev, ...settings } : null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings'
      setError(errorMessage)
      console.error('Failed to update quality settings:', err)
    }
  }, [qualityManager])

  // Get optimal quality
  const getOptimalQuality = useCallback((): QualityConfig | null => {
    try {
      if (!track) return null
      return qualityManager.getOptimalQuality(track)
    } catch (err) {
      console.error('Failed to get optimal quality:', err)
      return null
    }
  }, [qualityManager, track])

  // Get estimated data usage
  const getEstimatedDataUsage = useCallback((quality?: AudioQuality): number => {
    try {
      if (!track) return 0
      const targetQuality = quality || currentQuality
      return qualityManager.getEstimatedDataUsage(track, targetQuality)
    } catch (err) {
      console.error('Failed to get estimated data usage:', err)
      return 0
    }
  }, [qualityManager, track, currentQuality])

  // Get bandwidth recommendation
  const getBandwidthRecommendation = useCallback((quality?: AudioQuality): number => {
    try {
      const targetQuality = quality || currentQuality
      return qualityManager.getBandwidthRecommendation(targetQuality)
    } catch (err) {
      console.error('Failed to get bandwidth recommendation:', err)
      return 0
    }
  }, [qualityManager, currentQuality])

  // Check if quality is supported
  const isQualitySupported = useCallback((quality: AudioQuality): boolean => {
    try {
      return qualityManager.isQualitySupported(quality)
    } catch (err) {
      console.error('Failed to check quality support:', err)
      return false
    }
  }, [qualityManager])

  // Check if quality is available for current track
  const isQualityAvailable = useCallback((quality: AudioQuality): boolean => {
    try {
      return availableQualities.some(config => config.level === quality)
    } catch (err) {
      console.error('Failed to check quality availability:', err)
      return false
    }
  }, [availableQualities])

  // Format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }, [])

  // Get connection type icon
  const getConnectionTypeIcon = useCallback((type: string): string => {
    switch (type) {
      case 'wifi':
        return '📶'
      case 'cellular':
        return '📱'
      case 'ethernet':
        return '🔌'
      default:
        return '❓'
    }
  }, [])

  return {
    // Current state
    currentQuality,
    currentSettings,
    networkConditions,
    availableQualities,
    isLoading,
    error,
    
    // Actions
    setQuality,
    updateSettings,
    getOptimalQuality,
    getEstimatedDataUsage,
    getBandwidthRecommendation,
    
    // Utilities
    isQualitySupported,
    isQualityAvailable,
    formatFileSize,
    getConnectionTypeIcon
  }
}

export default useAudioQuality
