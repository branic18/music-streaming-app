/**
 * Audio session management panel component
 * Provides UI for managing audio session, device selection, and restrictions
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Switch } from '@/components/ui/Switch'
import { Label } from '@/components/ui/Label'
import { 
  AudioSessionManager,
  AudioSessionState,
  AudioDeviceInfo,
  AudioDeviceType,
  Platform
} from '@/lib/audio/audio-session-manager'
import { useAudioSession } from '@/hooks/use-audio-session'

interface AudioSessionPanelProps {
  sessionManager?: AudioSessionManager
  onDeviceChange?: (device: AudioDeviceInfo) => void
  onStateChange?: (state: AudioSessionState) => void
  className?: string
}

export function AudioSessionPanel({ 
  sessionManager,
  onDeviceChange,
  onStateChange,
  className 
}: AudioSessionPanelProps) {
  const {
    state,
    currentDevice,
    availableDevices,
    platform,
    isInitialized,
    isLoading,
    error,
    updateConfig,
    setMediaSessionMetadata,
    setMediaSessionPlaybackState,
    isDeviceAllowed,
    canPlay,
    canPause,
    canSeek,
    canChangeVolume,
    supportsHighQuality,
    supportsSpatialAudio
  } = useAudioSession({
    onDeviceChange: (event) => {
      onDeviceChange?.(event.data.currentDevice)
    },
    onStateChange: (newState) => {
      onStateChange?.(newState)
    }
  })

  const [selectedDevice, setSelectedDevice] = useState<AudioDeviceInfo | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (currentDevice) {
      setSelectedDevice(currentDevice)
    }
  }, [currentDevice])

  const getStateColor = (state: AudioSessionState): string => {
    switch (state) {
      case 'active':
        return 'text-green-600'
      case 'inactive':
        return 'text-gray-600'
      case 'interrupted':
        return 'text-yellow-600'
      case 'suspended':
        return 'text-orange-600'
      case 'ended':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStateIcon = (state: AudioSessionState): string => {
    switch (state) {
      case 'active':
        return '🟢'
      case 'inactive':
        return '⚪'
      case 'interrupted':
        return '🟡'
      case 'suspended':
        return '🟠'
      case 'ended':
        return '🔴'
      default:
        return '⚪'
    }
  }

  const getDeviceIcon = (type: AudioDeviceType): string => {
    switch (type) {
      case 'speaker':
        return '🔊'
      case 'headphones':
        return '🎧'
      case 'bluetooth':
        return '📶'
      case 'airpods':
        return '🎵'
      case 'carplay':
        return '🚗'
      case 'android_auto':
        return '📱'
      default:
        return '🔊'
    }
  }

  const getPlatformIcon = (platform: Platform): string => {
    switch (platform) {
      case 'ios':
        return '🍎'
      case 'android':
        return '🤖'
      case 'web':
        return '🌐'
      case 'desktop':
        return '💻'
      default:
        return '❓'
    }
  }

  const handleDeviceSelect = (device: AudioDeviceInfo) => {
    setSelectedDevice(device)
    onDeviceChange?.(device)
  }

  const handleConfigUpdate = (updates: any) => {
    updateConfig(updates)
  }

  const handleTestPlayback = () => {
    setMediaSessionPlaybackState('playing')
    setTimeout(() => {
      setMediaSessionPlaybackState('paused')
    }, 2000)
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Audio Session</CardTitle>
          <CardDescription>Loading audio session...</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={50} className="w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Audio Session</CardTitle>
          <CardDescription>Error loading audio session</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-sm mb-4">{error}</div>
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
        <CardTitle>Audio Session</CardTitle>
        <CardDescription>
          Manage audio session and device settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Session Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Session Status</span>
            <div className="flex items-center gap-2">
              <span className="text-lg">{getStateIcon(state)}</span>
              <Badge variant="outline" className={getStateColor(state)}>
                {state.toUpperCase()}
              </Badge>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Platform: {getPlatformIcon(platform)} {platform.toUpperCase()}
          </div>
        </div>

        {/* Current Device */}
        {currentDevice && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Device</span>
              <div className="flex items-center gap-2">
                <span className="text-lg">{getDeviceIcon(currentDevice.type)}</span>
                <Badge variant="default">
                  {currentDevice.type.toUpperCase()}
                </Badge>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {currentDevice.name}
            </div>
            
            {/* Device Capabilities */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <span>{canPlay() ? '✅' : '❌'}</span>
                <span>Play</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{canPause() ? '✅' : '❌'}</span>
                <span>Pause</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{canSeek() ? '✅' : '❌'}</span>
                <span>Seek</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{canChangeVolume() ? '✅' : '❌'}</span>
                <span>Volume</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{supportsHighQuality() ? '✅' : '❌'}</span>
                <span>High Quality</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{supportsSpatialAudio() ? '✅' : '❌'}</span>
                <span>Spatial Audio</span>
              </div>
            </div>
          </div>
        )}

        {/* Device Selection */}
        {availableDevices.length > 0 && (
          <div className="space-y-3">
            <span className="text-sm font-medium">Available Devices</span>
            <div className="space-y-2">
              {availableDevices.map((device) => (
                <Button
                  key={device.id}
                  variant={selectedDevice?.id === device.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleDeviceSelect(device)}
                  disabled={!isDeviceAllowed(device)}
                  className="w-full justify-start"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getDeviceIcon(device.type)}</span>
                    <div className="flex flex-col items-start">
                      <span className="text-sm">{device.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {device.type} {device.isDefault && '(Default)'}
                      </span>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Device Restrictions */}
        {currentDevice?.restrictions && Object.keys(currentDevice.restrictions).length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Device Restrictions</span>
            <div className="space-y-1 text-xs text-muted-foreground">
              {currentDevice.restrictions.maxVolume && (
                <div>Max Volume: {Math.round(currentDevice.restrictions.maxVolume * 100)}%</div>
              )}
              {currentDevice.restrictions.minVolume && (
                <div>Min Volume: {Math.round(currentDevice.restrictions.minVolume * 100)}%</div>
              )}
              {currentDevice.restrictions.allowedQualities && (
                <div>Allowed Qualities: {currentDevice.restrictions.allowedQualities.join(', ')}</div>
              )}
              {currentDevice.restrictions.blockedFeatures && (
                <div>Blocked Features: {currentDevice.restrictions.blockedFeatures.join(', ')}</div>
              )}
            </div>
          </div>
        )}

        {/* Advanced Settings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Advanced Settings</span>
            <Switch
              checked={showAdvanced}
              onCheckedChange={setShowAdvanced}
            />
          </div>
          
          {showAdvanced && (
            <div className="space-y-3 pl-4 border-l-2 border-muted">
              {/* Device Restrictions */}
              <div className="space-y-2">
                <Label className="text-xs">Device Restrictions</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Allow Bluetooth</span>
                    <Switch
                      defaultChecked={true}
                      onCheckedChange={(checked) => 
                        handleConfigUpdate({
                          deviceRestrictions: { allowBluetooth: checked }
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Allow AirPods</span>
                    <Switch
                      defaultChecked={true}
                      onCheckedChange={(checked) => 
                        handleConfigUpdate({
                          deviceRestrictions: { allowAirPods: checked }
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Require High Quality</span>
                    <Switch
                      defaultChecked={false}
                      onCheckedChange={(checked) => 
                        handleConfigUpdate({
                          deviceRestrictions: { requireHighQuality: checked }
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Platform Settings */}
              <div className="space-y-2">
                <Label className="text-xs">Platform Settings</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Handle Interruptions</span>
                    <Switch
                      defaultChecked={true}
                      onCheckedChange={(checked) => 
                        handleConfigUpdate({
                          platformSettings: {
                            [platform]: { handleInterruptions: checked }
                          }
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Background Playback</span>
                    <Switch
                      defaultChecked={true}
                      onCheckedChange={(checked) => 
                        handleConfigUpdate({
                          platformSettings: {
                            [platform]: { allowBackgroundPlayback: checked }
                          }
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Test Controls */}
        <div className="space-y-3">
          <span className="text-sm font-medium">Test Controls</span>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestPlayback}
              disabled={!canPlay()}
            >
              Test Playback
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMediaSessionMetadata({
                title: 'Test Track',
                artist: 'Test Artist',
                album: 'Test Album'
              })}
            >
              Set Metadata
            </Button>
          </div>
        </div>

        {/* Session Info */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Session Info</span>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Initialized: {isInitialized ? 'Yes' : 'No'}</div>
            <div>Available Devices: {availableDevices.length}</div>
            <div>Platform: {platform}</div>
            <div>State: {state}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default AudioSessionPanel
