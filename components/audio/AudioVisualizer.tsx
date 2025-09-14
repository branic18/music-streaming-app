/**
 * Audio Visualizer React Component
 * Provides real-time audio visualization with spectrum analyzer and waveform display
 */

'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Play, 
  Pause, 
  Volume2, 
  Settings, 
  BarChart3, 
  Activity,
  Zap
} from 'lucide-react'
import { 
  AudioVisualizer, 
  type VisualizationData, 
  type VisualizerEvent,
  type AudioVisualizerConfig 
} from '@/lib/audio/audio-visualizer'

interface AudioVisualizerProps {
  audioElement?: HTMLAudioElement
  className?: string
  onDataUpdate?: (data: VisualizationData) => void
  onError?: (error: string) => void
}

export function AudioVisualizerComponent({ 
  audioElement, 
  className, 
  onDataUpdate, 
  onError 
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const visualizerRef = useRef<AudioVisualizer | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [visualizationData, setVisualizationData] = useState<VisualizationData | null>(null)
  const [config, setConfig] = useState<AudioVisualizerConfig>({
    fftSize: 2048,
    smoothingTimeConstant: 0.8,
    minDecibels: -90,
    maxDecibels: -10,
    frequencyBinCount: 1024,
    sampleRate: 44100,
    updateInterval: 16,
  })
  const [visualizationType, setVisualizationType] = useState<'spectrum' | 'waveform' | 'bars'>('spectrum')
  const [volume, setVolume] = useState(1)
  const [showSettings, setShowSettings] = useState(false)

  // Initialize visualizer
  useEffect(() => {
    const initVisualizer = async () => {
      try {
        visualizerRef.current = new AudioVisualizer(config)
        await visualizerRef.current.initialize()

        // Connect audio element if provided
        if (audioElement) {
          visualizerRef.current.connectAudioSource(audioElement)
        }

        // Set up event listeners
        visualizerRef.current.addEventListener('data', handleVisualizationData)
        visualizerRef.current.addEventListener('error', handleError)
        visualizerRef.current.addEventListener('start', () => setIsRunning(true))
        visualizerRef.current.addEventListener('stop', () => setIsRunning(false))

      } catch (error) {
        console.error('Failed to initialize visualizer:', error)
        onError?.(error.message)
      }
    }

    initVisualizer()

    return () => {
      if (visualizerRef.current) {
        visualizerRef.current.destroy()
      }
    }
  }, [audioElement, onError])

  // Handle visualization data updates
  const handleVisualizationData = useCallback((event: VisualizerEvent) => {
    if (event.data) {
      setVisualizationData(event.data)
      onDataUpdate?.(event.data)
    }
  }, [onDataUpdate])

  // Handle errors
  const handleError = useCallback((event: VisualizerEvent) => {
    if (event.error) {
      console.error('Visualizer error:', event.error)
      onError?.(event.error)
    }
  }, [onError])

  // Start/stop visualization
  const toggleVisualization = useCallback(() => {
    if (!visualizerRef.current) return

    if (isRunning) {
      visualizerRef.current.stop()
    } else {
      visualizerRef.current.start()
    }
  }, [isRunning])

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<AudioVisualizerConfig>) => {
    const updatedConfig = { ...config, ...newConfig }
    setConfig(updatedConfig)
    
    if (visualizerRef.current) {
      visualizerRef.current.updateConfig(newConfig)
    }
  }, [config])

  // Update volume
  const updateVolume = useCallback((newVolume: number) => {
    setVolume(newVolume)
    if (visualizerRef.current) {
      visualizerRef.current.setVolume(newVolume)
    }
  }, [])

  // Draw visualization
  const drawVisualization = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !visualizationData) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    // Set up gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#3b82f6')
    gradient.addColorStop(0.5, '#8b5cf6')
    gradient.addColorStop(1, '#ec4899')

    ctx.fillStyle = gradient
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2

    switch (visualizationType) {
      case 'spectrum':
        drawSpectrum(ctx, width, height, visualizationData)
        break
      case 'waveform':
        drawWaveform(ctx, width, height, visualizationData)
        break
      case 'bars':
        drawBars(ctx, width, height, visualizationData)
        break
    }
  }, [visualizationData, visualizationType])

  // Draw spectrum visualization
  const drawSpectrum = (ctx: CanvasRenderingContext2D, width: number, height: number, data: VisualizationData) => {
    const { spectrum } = data
    const barWidth = width / spectrum.length

    for (let i = 0; i < spectrum.length; i++) {
      const barHeight = spectrum[i] * height
      const x = i * barWidth
      const y = height - barHeight

      ctx.fillRect(x, y, barWidth, barHeight)
    }
  }

  // Draw waveform visualization
  const drawWaveform = (ctx: CanvasRenderingContext2D, width: number, height: number, data: VisualizationData) => {
    const { waveform } = data
    const sliceWidth = width / waveform.length
    let x = 0

    ctx.beginPath()
    ctx.moveTo(0, height / 2)

    for (let i = 0; i < waveform.length; i++) {
      const v = waveform[i] * 0.5 + 0.5
      const y = v * height
      ctx.lineTo(x, y)
      x += sliceWidth
    }

    ctx.stroke()
  }

  // Draw bars visualization
  const drawBars = (ctx: CanvasRenderingContext2D, width: number, height: number, data: VisualizationData) => {
    const { bars } = data
    const barWidth = width / bars.length
    const spacing = barWidth * 0.1

    for (let i = 0; i < bars.length; i++) {
      const barHeight = bars[i] * height
      const x = i * barWidth + spacing
      const y = height - barHeight
      const actualBarWidth = barWidth - spacing * 2

      ctx.fillRect(x, y, actualBarWidth, barHeight)
    }
  }

  // Update canvas size
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  // Draw when data updates
  useEffect(() => {
    drawVisualization()
  }, [drawVisualization])

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Audio Visualizer
            </CardTitle>
            <CardDescription>
              Real-time audio spectrum analysis and visualization
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleVisualization}
              className="h-8"
            >
              {isRunning ? (
                <Pause className="h-4 w-4 mr-1" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              {isRunning ? 'Stop' : 'Start'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="h-8"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Visualization Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full h-64 bg-black rounded-lg border"
            style={{ aspectRatio: '16/9' }}
          />
          
          {/* Visualization Type Selector */}
          <div className="absolute top-2 left-2">
            <Tabs value={visualizationType} onValueChange={(value) => setVisualizationType(value as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="spectrum" className="text-xs">Spectrum</TabsTrigger>
                <TabsTrigger value="waveform" className="text-xs">Waveform</TabsTrigger>
                <TabsTrigger value="bars" className="text-xs">Bars</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Volume Control */}
          <div className="absolute top-2 right-2 flex items-center gap-2 bg-black/50 rounded px-2 py-1">
            <Volume2 className="h-4 w-4 text-white" />
            <Slider
              value={[volume * 100]}
              onValueChange={([value]) => updateVolume(value / 100)}
              max={100}
              min={0}
              step={1}
              className="w-20"
            />
            <span className="text-white text-xs w-8">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">FFT Size</Label>
                <Slider
                  value={[config.fftSize]}
                  onValueChange={([value]) => updateConfig({ fftSize: value })}
                  max={8192}
                  min={256}
                  step={256}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground text-center">
                  {config.fftSize}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Smoothing</Label>
                <Slider
                  value={[config.smoothingTimeConstant * 100]}
                  onValueChange={([value]) => updateConfig({ smoothingTimeConstant: value / 100 })}
                  max={100}
                  min={0}
                  step={1}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground text-center">
                  {Math.round(config.smoothingTimeConstant * 100)}%
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Min Decibels</Label>
                <Slider
                  value={[Math.abs(config.minDecibels)]}
                  onValueChange={([value]) => updateConfig({ minDecibels: -value })}
                  max={100}
                  min={10}
                  step={1}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground text-center">
                  {config.minDecibels} dB
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Max Decibels</Label>
                <Slider
                  value={[Math.abs(config.maxDecibels)]}
                  onValueChange={([value]) => updateConfig({ maxDecibels: -value })}
                  max={50}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground text-center">
                  {config.maxDecibels} dB
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audio Info */}
        {visualizationData && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="font-medium">Audio Analysis</span>
              </div>
              <div className="text-muted-foreground">
                <div>Average Level: {visualizationData.frequencyData.averageLevel.toFixed(1)} dB</div>
                <div>Peak Level: {visualizationData.frequencyData.peakLevel.toFixed(1)} dB</div>
                <div>RMS: {visualizationData.frequencyData.rms.toFixed(1)}</div>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span className="font-medium">Peak Frequencies</span>
              </div>
              <div className="text-muted-foreground">
                {visualizationData.frequencyData.peakFrequencies.length > 0 ? (
                  visualizationData.frequencyData.peakFrequencies
                    .slice(0, 3)
                    .map((freq, i) => (
                      <div key={i}>
                        Peak {i + 1}: {freq.toFixed(0)} Hz
                      </div>
                    ))
                ) : (
                  <div>No significant peaks detected</div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
