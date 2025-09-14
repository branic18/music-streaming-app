/**
 * Simplified unit tests for quality settings panel
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QualitySettingsPanel } from './QualitySettingsPanel'
import { QualityManager, AudioQuality, QualityConfig, QualitySettings, NetworkConditions } from '@/lib/audio/quality-manager'
import { Track } from '@/lib/types'

// Mock the UI components
jest.mock('@/components/ui/Card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>
}))

jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  )
}))

jest.mock('@/components/ui/Badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-variant={variant} className={className}>
      {children}
    </span>
  )
}))

jest.mock('@/components/ui/Progress', () => ({
  Progress: ({ value, className }: any) => (
    <div data-value={value} className={className}>
      Progress: {value}%
    </div>
  )
}))

// Mock quality manager
const mockQualityManager = {
  getCurrentSettings: jest.fn(),
  getNetworkConditions: jest.fn(),
  getAvailableQualities: jest.fn(),
  getEstimatedDataUsage: jest.fn(),
  setQuality: jest.fn(),
  updateSettings: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
} as unknown as QualityManager

// Mock track
const mockTrack: Track = {
  id: 'track-1',
  title: 'Test Track',
  artists: [{ id: 'artist-1', name: 'Test Artist' }],
  album: {
    id: 'album-1',
    title: 'Test Album',
    artist: 'Test Artist',
    artwork: 'test-artwork.jpg',
    year: 2024,
    trackCount: 10
  },
  durationMs: 180000, // 3 minutes
  artwork: 'test-artwork.jpg',
  previewUrl: 'test-preview.mp3'
}

// Mock quality configurations
const mockQualityConfigs: QualityConfig[] = [
  {
    level: 'low',
    bitrate: 128,
    sampleRate: 44100,
    channels: 2,
    format: 'mp3',
    codec: 'mp3',
    description: 'Low Quality (128kbps)',
    fileSizeEstimate: 960000,
    bandwidthRequired: 128,
    isLossless: false,
    isSupported: true
  },
  {
    level: 'medium',
    bitrate: 192,
    sampleRate: 44100,
    channels: 2,
    format: 'aac',
    codec: 'aac',
    description: 'Medium Quality (192kbps)',
    fileSizeEstimate: 1440000,
    bandwidthRequired: 192,
    isLossless: false,
    isSupported: true
  },
  {
    level: 'high',
    bitrate: 320,
    sampleRate: 44100,
    channels: 2,
    format: 'aac',
    codec: 'aac',
    description: 'High Quality (320kbps)',
    fileSizeEstimate: 2400000,
    bandwidthRequired: 320,
    isLossless: false,
    isSupported: true
  },
  {
    level: 'lossless',
    bitrate: 1411,
    sampleRate: 44100,
    channels: 2,
    format: 'flac',
    codec: 'flac',
    description: 'Lossless Quality (FLAC)',
    fileSizeEstimate: 10500000,
    bandwidthRequired: 1411,
    isLossless: true,
    isSupported: true
  }
]

// Mock settings
const mockSettings: QualitySettings = {
  preferredQuality: 'high',
  fallbackQuality: 'medium',
  autoQualityEnabled: true,
  dataSaverMode: false,
  wifiOnlyLossless: true,
  cellularQuality: 'medium',
  wifiQuality: 'high',
  maxBitrate: 320,
  minBitrate: 128,
  adaptiveBitrate: true,
  qualityChangeThreshold: 2000
}

// Mock network conditions
const mockNetworkConditions: NetworkConditions = {
  connectionType: 'wifi',
  effectiveType: '4g',
  downlink: 50,
  rtt: 20,
  saveData: false,
  isOnline: true
}

describe('QualitySettingsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mocks
    ;(mockQualityManager.getCurrentSettings as jest.Mock).mockReturnValue(mockSettings)
    ;(mockQualityManager.getNetworkConditions as jest.Mock).mockReturnValue(mockNetworkConditions)
    ;(mockQualityManager.getAvailableQualities as jest.Mock).mockReturnValue(mockQualityConfigs)
    ;(mockQualityManager.getEstimatedDataUsage as jest.Mock).mockReturnValue(7200000) // 7.2MB
  })

  it('should render loading state initially', () => {
    // Mock loading state
    ;(mockQualityManager.getCurrentSettings as jest.Mock).mockImplementation(() => {
      throw new Error('Loading')
    })

    render(
      <QualitySettingsPanel 
        qualityManager={mockQualityManager}
        currentTrack={mockTrack}
      />
    )

    expect(screen.getByText('Loading quality settings...')).toBeInTheDocument()
    expect(screen.getByText('Progress: 50%')).toBeInTheDocument()
  })

  it('should render error state when settings fail to load', () => {
    // Mock error state
    ;(mockQualityManager.getCurrentSettings as jest.Mock).mockImplementation(() => {
      throw new Error('Failed to load')
    })

    render(
      <QualitySettingsPanel 
        qualityManager={mockQualityManager}
        currentTrack={mockTrack}
      />
    )

    expect(screen.getByText('Failed to load quality settings')).toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('should render quality settings panel', () => {
    render(
      <QualitySettingsPanel 
        qualityManager={mockQualityManager}
        currentTrack={mockTrack}
      />
    )

    expect(screen.getByText('Audio Quality')).toBeInTheDocument()
    expect(screen.getByText('Manage audio quality and bitrate settings')).toBeInTheDocument()
    expect(screen.getByText('Network Status')).toBeInTheDocument()
    expect(screen.getByText('Current Quality')).toBeInTheDocument()
    expect(screen.getByText('Select Quality')).toBeInTheDocument()
  })

  it('should display network status', () => {
    render(
      <QualitySettingsPanel 
        qualityManager={mockQualityManager}
        currentTrack={mockTrack}
      />
    )

    expect(screen.getByText('Network Status')).toBeInTheDocument()
    expect(screen.getByText('WIFI')).toBeInTheDocument()
    expect(screen.getByText('Download: 50.0 Mbps')).toBeInTheDocument()
  })

  it('should display current quality', () => {
    render(
      <QualitySettingsPanel 
        qualityManager={mockQualityManager}
        currentTrack={mockTrack}
      />
    )

    expect(screen.getByText('Current Quality')).toBeInTheDocument()
    expect(screen.getByText('HIGH')).toBeInTheDocument()
    expect(screen.getByText('Estimated data usage: 7.2 MB')).toBeInTheDocument()
  })

  it('should display available quality options', () => {
    render(
      <QualitySettingsPanel 
        qualityManager={mockQualityManager}
        currentTrack={mockTrack}
      />
    )

    expect(screen.getAllByText('Low Quality (128kbps)')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Medium Quality (192kbps)')[0]).toBeInTheDocument()
    expect(screen.getAllByText('High Quality (320kbps)')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Lossless Quality (FLAC)')[0]).toBeInTheDocument()
    expect(screen.getByText('LOSSLESS')).toBeInTheDocument()
  })

  it('should handle quality selection', async () => {
    const onQualityChange = jest.fn()
    ;(mockQualityManager.setQuality as jest.Mock).mockResolvedValue(undefined)

    render(
      <QualitySettingsPanel 
        qualityManager={mockQualityManager}
        currentTrack={mockTrack}
        onQualityChange={onQualityChange}
      />
    )

    const lowQualityButton = screen.getAllByText('Low Quality (128kbps)')[0]
    fireEvent.click(lowQualityButton)

    await waitFor(() => {
      expect(mockQualityManager.setQuality).toHaveBeenCalledWith('low', mockTrack)
    })
  })

  it('should handle auto quality toggle', () => {
    render(
      <QualitySettingsPanel 
        qualityManager={mockQualityManager}
        currentTrack={mockTrack}
      />
    )

    const autoQualityButton = screen.getAllByText('ON')[0]
    fireEvent.click(autoQualityButton)

    expect(mockQualityManager.updateSettings).toHaveBeenCalledWith({
      autoQualityEnabled: false
    })
  })

  it('should handle data saver toggle', () => {
    render(
      <QualitySettingsPanel 
        qualityManager={mockQualityManager}
        currentTrack={mockTrack}
      />
    )

    const dataSaverButton = screen.getByText('OFF')
    fireEvent.click(dataSaverButton)

    expect(mockQualityManager.updateSettings).toHaveBeenCalledWith({
      dataSaverMode: true
    })
  })

  it('should handle wifi only lossless toggle', () => {
    render(
      <QualitySettingsPanel 
        qualityManager={mockQualityManager}
        currentTrack={mockTrack}
      />
    )

    const wifiOnlyButton = screen.getAllByText('ON')[1]
    fireEvent.click(wifiOnlyButton)

    expect(mockQualityManager.updateSettings).toHaveBeenCalledWith({
      wifiOnlyLossless: false
    })
  })

  it('should handle quality presets', () => {
    render(
      <QualitySettingsPanel 
        qualityManager={mockQualityManager}
        currentTrack={mockTrack}
      />
    )

    const balancedButton = screen.getByText('Balanced')
    fireEvent.click(balancedButton)

    expect(mockQualityManager.updateSettings).toHaveBeenCalledWith({
      cellularQuality: 'medium',
      wifiQuality: 'high',
      dataSaverMode: false
    })

    // Clear previous calls
    jest.clearAllMocks()

    const dataSaverButton = screen.getAllByText('Data Saver')[0]
    fireEvent.click(dataSaverButton)

    expect(mockQualityManager.updateSettings).toHaveBeenCalledWith({
      cellularQuality: 'low',
      wifiQuality: 'medium',
      dataSaverMode: true
    })

    const highQualityButton = screen.getByText('High Quality')
    fireEvent.click(highQualityButton)

    expect(mockQualityManager.updateSettings).toHaveBeenCalledWith({
      cellularQuality: 'high',
      wifiQuality: 'lossless',
      dataSaverMode: false
    })

    const autoButton = screen.getByText('Auto')
    fireEvent.click(autoButton)

    expect(mockQualityManager.updateSettings).toHaveBeenCalledWith({
      autoQualityEnabled: true,
      adaptiveBitrate: true
    })
  })

  it('should display bandwidth requirements', () => {
    render(
      <QualitySettingsPanel 
        qualityManager={mockQualityManager}
        currentTrack={mockTrack}
      />
    )

    expect(screen.getByText('Bandwidth Requirements')).toBeInTheDocument()
    expect(screen.getByText('128 kbps')).toBeInTheDocument()
    expect(screen.getByText('192 kbps')).toBeInTheDocument()
    expect(screen.getByText('320 kbps')).toBeInTheDocument()
    expect(screen.getByText('1411 kbps')).toBeInTheDocument()
  })

  it('should handle quality change events', async () => {
    const onQualityChange = jest.fn()
    let qualityChangeCallback: ((event: any) => void) | null = null

    ;(mockQualityManager.on as jest.Mock).mockImplementation((event: string, callback: any) => {
      if (event === 'qualityChanged') {
        qualityChangeCallback = callback
      }
    })

    render(
      <QualitySettingsPanel 
        qualityManager={mockQualityManager}
        currentTrack={mockTrack}
        onQualityChange={onQualityChange}
      />
    )

    // Simulate quality change event
    if (qualityChangeCallback) {
      qualityChangeCallback({
        data: { quality: 'lossless' }
      })
    }

    expect(onQualityChange).toHaveBeenCalledWith('lossless')
  })

  it('should handle network change events', async () => {
    const onNetworkChange = jest.fn()
    let networkChangeCallback: ((event: any) => void) | null = null

    ;(mockQualityManager.on as jest.Mock).mockImplementation((event: string, callback: any) => {
      if (event === 'networkChanged') {
        networkChangeCallback = callback
      }
    })

    render(
      <QualitySettingsPanel 
        qualityManager={mockQualityManager}
        currentTrack={mockTrack}
        onNetworkChange={onNetworkChange}
      />
    )

    // Simulate network change event
    if (networkChangeCallback) {
      networkChangeCallback({
        data: { 
          current: {
            ...mockNetworkConditions,
            connectionType: 'cellular'
          }
        }
      })
    }

    // The callback should be called during the event simulation
    await waitFor(() => {
      expect(onNetworkChange).toHaveBeenCalledWith({
        ...mockNetworkConditions,
        connectionType: 'cellular'
      })
    })
  })

  it('should clean up event listeners on unmount', () => {
    const { unmount } = render(
      <QualitySettingsPanel 
        qualityManager={mockQualityManager}
        currentTrack={mockTrack}
      />
    )

    unmount()

    expect(mockQualityManager.off).toHaveBeenCalledWith('qualityChanged', expect.any(Function))
    expect(mockQualityManager.off).toHaveBeenCalledWith('networkChanged', expect.any(Function))
  })

  it('should handle quality selection errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    ;(mockQualityManager.setQuality as jest.Mock).mockRejectedValue(new Error('Failed to set quality'))

    render(
      <QualitySettingsPanel 
        qualityManager={mockQualityManager}
        currentTrack={mockTrack}
      />
    )

    const lowQualityButton = screen.getAllByText('Low Quality (128kbps)')[0]
    fireEvent.click(lowQualityButton)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to set quality:', expect.any(Error))
    })

    consoleSpy.mockRestore()
  })

  it('should handle settings update errors', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    ;(mockQualityManager.updateSettings as jest.Mock).mockImplementation(() => {
      throw new Error('Failed to update settings')
    })

    render(
      <QualitySettingsPanel 
        qualityManager={mockQualityManager}
        currentTrack={mockTrack}
      />
    )

    const autoQualityButton = screen.getAllByText('ON')[0]
    fireEvent.click(autoQualityButton)

    expect(consoleSpy).toHaveBeenCalledWith('Failed to update settings:', expect.any(Error))

    consoleSpy.mockRestore()
  })
})
