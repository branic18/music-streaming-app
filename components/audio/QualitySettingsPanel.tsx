/**
 * Audio quality settings panel component
 * Provides UI for managing audio quality and bitrate settings
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { 
  QualityManager, 
  QualityConfig, 
  AudioQuality, 
  QualitySettings,
  NetworkConditions 
} from '@/lib/audio/quality-manager'
import { Track } from '@/lib/types'

interface QualitySettingsPanelProps {
  qualityManager: QualityManager
  currentTrack?: Track
  onQualityChange?: (quality: AudioQuality) => void
  className?: string
}

export function QualitySettingsPanel({ 
  qualityManager, 
  currentTrack,
  onQualityChange,
  className 
}: QualitySettingsPanelProps) {
  const [settings, setSettings] = useState<QualitySettings | null>(null)
  const [networkConditions, setNetworkConditions] = useState<NetworkConditions | null>(null)
  const [availableQualities, setAvailableQualities] = useState<QualityConfig[]>([])
  const [currentQuality, setCurrentQuality] = useState<AudioQuality>('high')
  const [isLoading, setIsLoading] = useState(false)
  const [dataUsage, setDataUsage] = useState<number>(0)

  useEffect(() => {
    // Initialize component state
    const initializeComponent = async () => {
      try {
        setIsLoading(true)
        
        // Get current settings
        const currentSettings = qualityManager.getCurrentSettings()
        setSettings(currentSettings)
        setCurrentQuality(currentSettings.preferredQuality)
        
        // Get network conditions
        const conditions = qualityManager.getNetworkConditions()
        setNetworkConditions(conditions)
        
        // Get available qualities for current track
        if (currentTrack) {
          const qualities = qualityManager.getAvailableQualities(currentTrack)
          setAvailableQualities(qualities)
          
          // Calculate data usage for current track
          const usage = qualityManager.getEstimatedDataUsage(currentTrack, currentSettings.preferredQuality)
          setDataUsage(usage)
        }
      } catch (error) {
        console.error('Failed to initialize quality settings panel:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeComponent()

    // Set up event listeners
    const handleQualityChange = (event: any) => {
      if (event.data?.quality) {
        setCurrentQuality(event.data.quality)
        onQualityChange?.(event.data.quality)
      }
    }

    const handleNetworkChange = (event: any) => {
      if (event.data?.current) {
        setNetworkConditions(event.data.current)
      }
    }

    qualityManager.on('qualityChanged', handleQualityChange)
    qualityManager.on('networkChanged', handleNetworkChange)

    return () => {
      qualityManager.off('qualityChanged', handleQualityChange)
      qualityManager.off('networkChanged', handleNetworkChange)
    }
  }, [qualityManager, currentTrack, onQualityChange])

  const handleQualitySelect = async (quality: AudioQuality) => {
    try {
      setIsLoading(true)
      await qualityManager.setQuality(quality, currentTrack)
      setCurrentQuality(quality)
      
      // Update data usage estimate
      if (currentTrack) {
        const usage = qualityManager.getEstimatedDataUsage(currentTrack, quality)
        setDataUsage(usage)
      }
    } catch (error) {
      console.error('Failed to set quality:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSettingsUpdate = (newSettings: Partial<QualitySettings>) => {
    try {
      qualityManager.updateSettings(newSettings)
      setSettings(prev => prev ? { ...prev, ...newSettings } : null)
    } catch (error) {
      console.error('Failed to update settings:', error)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getConnectionTypeIcon = (type: string) => {
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
  }

  const getQualityBadgeVariant = (quality: AudioQuality) => {
    switch (quality) {
      case 'lossless':
        return 'success'
      case 'high':
        return 'default'
      case 'medium':
        return 'secondary'
      case 'low':
        return 'outline'
      default:
        return 'default'
    }
  }

  if (isLoading && !settings) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Audio Quality</CardTitle>
          <CardDescription>Loading quality settings...</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={50} className="w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!settings) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Audio Quality</CardTitle>
          <CardDescription>Failed to load quality settings</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="w-full"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Audio Quality</CardTitle>
        <CardDescription>
          Manage audio quality and bitrate settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Network Status */}
        {networkConditions && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Network Status</span>
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {getConnectionTypeIcon(networkConditions.connectionType)}
                </span>
                <Badge variant="outline">
                  {networkConditions.connectionType.toUpperCase()}
                </Badge>
              </div>
            </div>
            {networkConditions.downlink > 0 && (
              <div className="text-xs text-muted-foreground">
                Download: {networkConditions.downlink.toFixed(1)} Mbps
              </div>
            )}
          </div>
        )}

        {/* Current Quality */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Quality</span>
            <Badge variant={getQualityBadgeVariant(currentQuality)}>
              {currentQuality.toUpperCase()}
            </Badge>
          </div>
          {currentTrack && (
            <div className="text-xs text-muted-foreground">
              Estimated data usage: {formatFileSize(dataUsage)}
            </div>
          )}
        </div>

        {/* Quality Selection */}
        <div className="space-y-3">
          <span className="text-sm font-medium">Select Quality</span>
          <div className="grid grid-cols-1 gap-2">
            {availableQualities.map((config) => (
              <Button
                key={config.level}
                variant={currentQuality === config.level ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQualitySelect(config.level)}
                disabled={isLoading || !config.isSupported}
                className="justify-between"
              >
                <div className="flex items-center gap-2">
                  <span>{config.description}</span>
                  {config.isLossless && <Badge variant="success" className="text-xs">LOSSLESS</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {config.bitrate}kbps
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Auto Quality Toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Auto Quality</span>
              <p className="text-xs text-muted-foreground">
                Automatically adjust quality based on network conditions
              </p>
            </div>
            <Button
              variant={settings.autoQualityEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSettingsUpdate({ autoQualityEnabled: !settings.autoQualityEnabled })}
            >
              {settings.autoQualityEnabled ? 'ON' : 'OFF'}
            </Button>
          </div>
        </div>

        {/* Data Saver Mode */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Data Saver</span>
              <p className="text-xs text-muted-foreground">
                Use lower quality to save data
              </p>
            </div>
            <Button
              variant={settings.dataSaverMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSettingsUpdate({ dataSaverMode: !settings.dataSaverMode })}
            >
              {settings.dataSaverMode ? 'ON' : 'OFF'}
            </Button>
          </div>
        </div>

        {/* WiFi Only Lossless */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">WiFi Only Lossless</span>
              <p className="text-xs text-muted-foreground">
                Only use lossless quality on WiFi
              </p>
            </div>
            <Button
              variant={settings.wifiOnlyLossless ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSettingsUpdate({ wifiOnlyLossless: !settings.wifiOnlyLossless })}
            >
              {settings.wifiOnlyLossless ? 'ON' : 'OFF'}
            </Button>
          </div>
        </div>

        {/* Quality Presets */}
        <div className="space-y-3">
          <span className="text-sm font-medium">Quick Presets</span>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSettingsUpdate({ 
                cellularQuality: 'medium',
                wifiQuality: 'high',
                dataSaverMode: false
              })}
            >
              Balanced
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSettingsUpdate({ 
                cellularQuality: 'low',
                wifiQuality: 'medium',
                dataSaverMode: true
              })}
            >
              Data Saver
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSettingsUpdate({ 
                cellularQuality: 'high',
                wifiQuality: 'lossless',
                dataSaverMode: false
              })}
            >
              High Quality
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSettingsUpdate({ 
                autoQualityEnabled: true,
                adaptiveBitrate: true
              })}
            >
              Auto
            </Button>
          </div>
        </div>

        {/* Bandwidth Requirements */}
        {availableQualities.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Bandwidth Requirements</span>
            <div className="space-y-1">
              {availableQualities.map((config) => (
                <div key={config.level} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{config.description}</span>
                  <span>{config.bandwidthRequired} kbps</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default QualitySettingsPanel
