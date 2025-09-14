/**
 * Audio Settings Panel Component
 * Provides UI controls for audio settings including EQ, crossfade, and gapless playback
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Volume2, 
  VolumeX, 
  Music, 
  Zap, 
  Settings, 
  RotateCcw, 
  Download, 
  Upload,
  Info
} from 'lucide-react'
import { audioSettingsManager, type AudioSettingsChangeEvent } from '@/lib/audio/audio-settings'
import type { AudioSettings, EQSettings, CrossfadeSettings, GaplessSettings } from '@/lib/types'

interface AudioSettingsPanelProps {
  className?: string
  onSettingsChange?: (settings: AudioSettings) => void
}

export function AudioSettingsPanel({ className, onSettingsChange }: AudioSettingsPanelProps) {
  const [settings, setSettings] = useState<AudioSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    const initializeSettings = async () => {
      try {
        await audioSettingsManager.initialize()
        const currentSettings = audioSettingsManager.getSettings()
        setSettings(currentSettings)
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to initialize audio settings:', error)
        setIsLoading(false)
      }
    }

    initializeSettings()

    // Listen for settings changes
    const handleSettingsChange = (event: AudioSettingsChangeEvent) => {
      const newSettings = audioSettingsManager.getSettings()
      setSettings(newSettings)
      setHasChanges(false)
      onSettingsChange?.(newSettings)
    }

    audioSettingsManager.addEventListener('settingsChange', handleSettingsChange)

    return () => {
      audioSettingsManager.removeEventListener('settingsChange')
    }
  }, [onSettingsChange])

  const updateSettings = async (updates: Partial<AudioSettings>) => {
    if (!settings) return

    try {
      await audioSettingsManager.updateSettings(updates)
      setHasChanges(true)
    } catch (error) {
      console.error('Failed to update settings:', error)
    }
  }

  const updateEQSettings = async (eqUpdates: Partial<EQSettings>) => {
    if (!settings) return

    try {
      await audioSettingsManager.updateEQSettings(eqUpdates)
      setHasChanges(true)
    } catch (error) {
      console.error('Failed to update EQ settings:', error)
    }
  }

  const updateCrossfadeSettings = async (crossfadeUpdates: Partial<CrossfadeSettings>) => {
    if (!settings) return

    try {
      await audioSettingsManager.updateCrossfadeSettings(crossfadeUpdates)
      setHasChanges(true)
    } catch (error) {
      console.error('Failed to update crossfade settings:', error)
    }
  }

  const updateGaplessSettings = async (gaplessUpdates: Partial<GaplessSettings>) => {
    if (!settings) return

    try {
      await audioSettingsManager.updateGaplessSettings(gaplessUpdates)
      setHasChanges(true)
    } catch (error) {
      console.error('Failed to update gapless settings:', error)
    }
  }

  const resetToDefaults = async () => {
    try {
      await audioSettingsManager.resetToDefaults()
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to reset settings:', error)
    }
  }

  const exportSettings = async () => {
    try {
      const exported = await audioSettingsManager.exportSettings()
      const blob = new Blob([exported], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'audio-settings.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export settings:', error)
    }
  }

  const importSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      await audioSettingsManager.importSettings(text)
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to import settings:', error)
    }
  }

  if (isLoading || !settings) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading audio settings...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Audio Settings
            </CardTitle>
            <CardDescription>
              Configure audio playback, EQ, crossfade, and gapless settings
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="secondary" className="text-xs">
                Unsaved Changes
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDefaults}
              className="h-8"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="eq">EQ</TabsTrigger>
            <TabsTrigger value="crossfade">Crossfade</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            {/* Volume Controls */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Volume</Label>
                <div className="flex items-center gap-2">
                  {settings.muted ? (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {Math.round(settings.volume * 100)}%
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Slider
                  value={[settings.volume * 100]}
                  onValueChange={([value]) => updateSettings({ volume: value / 100 })}
                  max={100}
                  min={0}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="mute"
                  checked={settings.muted}
                  onCheckedChange={(checked) => updateSettings({ muted: checked })}
                />
                <Label htmlFor="mute">Mute</Label>
              </div>
            </div>

            <Separator />

            {/* Gapless Playback */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <Label className="text-base font-medium">Gapless Playback</Label>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="gapless-enabled"
                    checked={settings.gapless.enabled}
                    onCheckedChange={(checked) => updateGaplessSettings({ enabled: checked })}
                  />
                  <Label htmlFor="gapless-enabled">Enable gapless playback</Label>
                </div>

                {settings.gapless.enabled && (
                  <>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="preload-next"
                        checked={settings.gapless.preloadNext}
                        onCheckedChange={(checked) => updateGaplessSettings({ preloadNext: checked })}
                      />
                      <Label htmlFor="preload-next">Preload next track</Label>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Preload Duration (seconds)</Label>
                      <Slider
                        value={[settings.gapless.preloadDuration / 1000]}
                        onValueChange={([value]) => updateGaplessSettings({ preloadDuration: value * 1000 })}
                        max={30}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1s</span>
                        <span>30s</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Buffer Size (seconds)</Label>
                      <Slider
                        value={[settings.gapless.bufferSize]}
                        onValueChange={([value]) => updateGaplessSettings({ bufferSize: value })}
                        max={60}
                        min={10}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>10s</span>
                        <span>60s</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="eq" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                <Label className="text-base font-medium">Equalizer</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="eq-enabled"
                  checked={settings.eq.enabled}
                  onCheckedChange={(checked) => updateEQSettings({ enabled: checked })}
                />
                <Label htmlFor="eq-enabled">Enable equalizer</Label>
              </div>

              {settings.eq.enabled && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm">EQ Preset</Label>
                    <Select
                      value={settings.eq.preset}
                      onValueChange={(value) => updateEQSettings({ preset: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Flat</SelectItem>
                        <SelectItem value="bass">Bass Boost</SelectItem>
                        <SelectItem value="treble">Treble Boost</SelectItem>
                        <SelectItem value="vocal">Vocal</SelectItem>
                        <SelectItem value="rock">Rock</SelectItem>
                        <SelectItem value="jazz">Jazz</SelectItem>
                        <SelectItem value="classical">Classical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm text-center block">Low</Label>
                      <Slider
                        value={[settings.eq.low]}
                        onValueChange={([value]) => updateEQSettings({ low: value })}
                        max={12}
                        min={-12}
                        step={1}
                        orientation="vertical"
                        className="h-32 mx-auto"
                      />
                      <div className="text-xs text-center text-muted-foreground">
                        {settings.eq.low > 0 ? '+' : ''}{settings.eq.low}dB
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm text-center block">Mid</Label>
                      <Slider
                        value={[settings.eq.mid]}
                        onValueChange={([value]) => updateEQSettings({ mid: value })}
                        max={12}
                        min={-12}
                        step={1}
                        orientation="vertical"
                        className="h-32 mx-auto"
                      />
                      <div className="text-xs text-center text-muted-foreground">
                        {settings.eq.mid > 0 ? '+' : ''}{settings.eq.mid}dB
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm text-center block">High</Label>
                      <Slider
                        value={[settings.eq.high]}
                        onValueChange={([value]) => updateEQSettings({ high: value })}
                        max={12}
                        min={-12}
                        step={1}
                        orientation="vertical"
                        className="h-32 mx-auto"
                      />
                      <div className="text-xs text-center text-muted-foreground">
                        {settings.eq.high > 0 ? '+' : ''}{settings.eq.high}dB
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="crossfade" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <Label className="text-base font-medium">Crossfade</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="crossfade-enabled"
                  checked={settings.crossfade.enabled}
                  onCheckedChange={(checked) => updateCrossfadeSettings({ enabled: checked })}
                />
                <Label htmlFor="crossfade-enabled">Enable crossfade</Label>
              </div>

              {settings.crossfade.enabled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Crossfade Duration (seconds)</Label>
                    <Slider
                      value={[settings.crossfade.duration / 1000]}
                      onValueChange={([value]) => updateCrossfadeSettings({ duration: value * 1000 })}
                      max={10}
                      min={0.5}
                      step={0.5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0.5s</span>
                      <span>10s</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Fade Curve</Label>
                    <Select
                      value={settings.crossfade.curve}
                      onValueChange={(value) => updateCrossfadeSettings({ curve: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linear">Linear</SelectItem>
                        <SelectItem value="exponential">Exponential</SelectItem>
                        <SelectItem value="logarithmic">Logarithmic</SelectItem>
                        <SelectItem value="s-curve">S-Curve</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="fade-in"
                        checked={settings.crossfade.fadeIn}
                        onCheckedChange={(checked) => updateCrossfadeSettings({ fadeIn: checked })}
                      />
                      <Label htmlFor="fade-in">Fade in</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="fade-out"
                        checked={settings.crossfade.fadeOut}
                        onCheckedChange={(checked) => updateCrossfadeSettings({ fadeOut: checked })}
                      />
                      <Label htmlFor="fade-out">Fade out</Label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <Label className="text-base font-medium">Advanced Settings</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Sample Rate</Label>
                  <Select
                    value={settings.advanced.sampleRate.toString()}
                    onValueChange={(value) => updateSettings({ 
                      advanced: { ...settings.advanced, sampleRate: parseInt(value) }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="44100">44.1 kHz</SelectItem>
                      <SelectItem value="48000">48 kHz</SelectItem>
                      <SelectItem value="88200">88.2 kHz</SelectItem>
                      <SelectItem value="96000">96 kHz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Bit Depth</Label>
                  <Select
                    value={settings.advanced.bitDepth.toString()}
                    onValueChange={(value) => updateSettings({ 
                      advanced: { ...settings.advanced, bitDepth: parseInt(value) }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16">16-bit</SelectItem>
                      <SelectItem value="24">24-bit</SelectItem>
                      <SelectItem value="32">32-bit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Channels</Label>
                  <Select
                    value={settings.advanced.channels.toString()}
                    onValueChange={(value) => updateSettings({ 
                      advanced: { ...settings.advanced, channels: parseInt(value) }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Mono</SelectItem>
                      <SelectItem value="2">Stereo</SelectItem>
                      <SelectItem value="4">4.0</SelectItem>
                      <SelectItem value="6">5.1</SelectItem>
                      <SelectItem value="8">7.1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Latency</Label>
                  <Select
                    value={settings.advanced.latency}
                    onValueChange={(value) => updateSettings({ 
                      advanced: { ...settings.advanced, latency: value as 'low' | 'medium' | 'high' }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Import/Export */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                <Label className="text-base font-medium">Backup & Restore</Label>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportSettings}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Settings
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('import-settings')?.click()}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import Settings
                </Button>
                
                <input
                  id="import-settings"
                  type="file"
                  accept=".json"
                  onChange={importSettings}
                  className="hidden"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
