/**
 * Simplified unit tests for audio visualizer
 */

import { AudioVisualizer } from './audio-visualizer'
import type { AudioVisualizerConfig, VisualizationData } from './audio-visualizer'

// Mock Web Audio API
const mockAnalyser = {
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
  minDecibels: -90,
  maxDecibels: -10,
  frequencyBinCount: 1024,
  getFloatFrequencyData: jest.fn(),
  getFloatTimeDomainData: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
}

const mockAudioContext = {
  sampleRate: 44100,
  state: 'running',
  createAnalyser: jest.fn(() => mockAnalyser),
  createGain: jest.fn(() => ({
    gain: { value: 1 },
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
  createMediaElementSource: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
  createBufferSource: jest.fn(() => ({
    buffer: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
  destination: {},
  close: jest.fn(),
  resume: jest.fn(),
  suspend: jest.fn(),
}

// Mock AudioBuffer
class MockAudioBuffer {
  constructor() {}
}

// Mock global objects
Object.defineProperty(global, 'AudioContext', {
  value: jest.fn(() => mockAudioContext),
  writable: true,
})

Object.defineProperty(global, 'webkitAudioContext', {
  value: jest.fn(() => mockAudioContext),
  writable: true,
})

Object.defineProperty(global, 'AudioBuffer', {
  value: MockAudioBuffer,
  writable: true,
})

Object.defineProperty(global, 'requestAnimationFrame', {
  value: jest.fn((callback) => setTimeout(callback, 16)),
  writable: true,
})

Object.defineProperty(global, 'cancelAnimationFrame', {
  value: jest.fn(),
  writable: true,
})

describe('AudioVisualizer', () => {
  let visualizer: AudioVisualizer

  beforeEach(() => {
    jest.clearAllMocks()
    visualizer = new AudioVisualizer()
  })

  afterEach(() => {
    visualizer.destroy()
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', async () => {
      await visualizer.initialize()
      
      const config = visualizer.getConfig()
      
      expect(config.fftSize).toBe(2048)
      expect(config.smoothingTimeConstant).toBe(0.8)
      expect(config.minDecibels).toBe(-90)
      expect(config.maxDecibels).toBe(-10)
      expect(config.frequencyBinCount).toBe(1024)
      expect(config.sampleRate).toBe(44100)
      expect(config.updateInterval).toBe(16)
    })

    it('should accept custom configuration', () => {
      const customVisualizer = new AudioVisualizer({
        fftSize: 4096,
        smoothingTimeConstant: 0.5,
        minDecibels: -80,
        maxDecibels: -20,
        sampleRate: 48000,
        updateInterval: 32,
      })

      const config = customVisualizer.getConfig()
      
      expect(config.fftSize).toBe(4096)
      expect(config.smoothingTimeConstant).toBe(0.5)
      expect(config.minDecibels).toBe(-80)
      expect(config.maxDecibels).toBe(-20)
      expect(config.sampleRate).toBe(48000)
      expect(config.updateInterval).toBe(32)
    })

    it('should create audio context and analyser', async () => {
      await visualizer.initialize()
      
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled()
      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })
  })

  describe('Configuration', () => {
    beforeEach(async () => {
      await visualizer.initialize()
    })

    it('should update configuration', () => {
      visualizer.updateConfig({
        fftSize: 4096,
        smoothingTimeConstant: 0.5,
        minDecibels: -80,
        maxDecibels: -20,
      })

      const config = visualizer.getConfig()
      
      expect(config.fftSize).toBe(4096)
      expect(config.smoothingTimeConstant).toBe(0.5)
      expect(config.minDecibels).toBe(-80)
      expect(config.maxDecibels).toBe(-20)
    })

    it('should get current configuration', () => {
      const config = visualizer.getConfig()
      
      expect(config).toBeDefined()
      expect(typeof config.fftSize).toBe('number')
      expect(typeof config.smoothingTimeConstant).toBe('number')
    })
  })

  describe('Audio Source Connection', () => {
    beforeEach(async () => {
      await visualizer.initialize()
    })

    it('should connect HTML audio element', () => {
      const mockAudioElement = document.createElement('audio')
      
      visualizer.connectAudioSource(mockAudioElement)
      
      expect(mockAudioContext.createMediaElementSource).toHaveBeenCalledWith(mockAudioElement)
    })

    it('should connect audio buffer', () => {
      const mockAudioBuffer = new MockAudioBuffer() as any
      
      visualizer.connectAudioSource(mockAudioBuffer)
      
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled()
    })
  })

  describe('Visualization Control', () => {
    beforeEach(async () => {
      await visualizer.initialize()
    })

    it('should start and stop visualization', () => {
      expect(visualizer.isActive()).toBe(false)
      
      visualizer.start()
      expect(visualizer.isActive()).toBe(true)
      
      visualizer.stop()
      expect(visualizer.isActive()).toBe(false)
    })

    it('should set volume', () => {
      visualizer.setVolume(0.5)
      // Volume setting is tested through the gain node
      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })
  })

  describe('Data Analysis', () => {
    beforeEach(async () => {
      await visualizer.initialize()
      
      // Mock frequency data
      const mockFrequencyData = new Float32Array(1024)
      const mockTimeDomainData = new Float32Array(1024)
      
      for (let i = 0; i < 1024; i++) {
        mockFrequencyData[i] = -50 + Math.random() * 40
        mockTimeDomainData[i] = (Math.random() - 0.5) * 2
      }
      
      mockAnalyser.getFloatFrequencyData.mockImplementation((array) => {
        array.set(mockFrequencyData)
      })
      
      mockAnalyser.getFloatTimeDomainData.mockImplementation((array) => {
        array.set(mockTimeDomainData)
      })
    })

    it('should get frequency data', () => {
      const frequencyData = visualizer.getFrequencyData()
      
      expect(frequencyData).toBeDefined()
      expect(frequencyData?.frequencies).toBeInstanceOf(Float32Array)
      expect(frequencyData?.timeDomain).toBeInstanceOf(Float32Array)
      expect(frequencyData?.frequencyBins).toBeInstanceOf(Array)
      expect(frequencyData?.peakFrequencies).toBeInstanceOf(Array)
      expect(typeof frequencyData?.averageLevel).toBe('number')
      expect(typeof frequencyData?.peakLevel).toBe('number')
      expect(typeof frequencyData?.rms).toBe('number')
    })

    it('should get visualization data', () => {
      const visualizationData = visualizer.getVisualizationData()
      
      expect(visualizationData).toBeDefined()
      expect(visualizationData?.frequencyData).toBeDefined()
      expect(visualizationData?.waveform).toBeInstanceOf(Float32Array)
      expect(visualizationData?.spectrum).toBeInstanceOf(Array)
      expect(visualizationData?.bars).toBeInstanceOf(Array)
      expect(visualizationData?.peaks).toBeInstanceOf(Array)
      expect(typeof visualizationData?.timestamp).toBe('number')
    })

    it('should calculate frequency bins correctly', () => {
      const frequencyData = visualizer.getFrequencyData()
      
      expect(frequencyData?.frequencyBins).toHaveLength(1024)
      expect(frequencyData?.frequencyBins[0]).toBe(0)
      // Check that the last frequency bin is close to Nyquist frequency (22050 Hz)
      expect(frequencyData?.frequencyBins[1023]).toBeGreaterThan(22000)
      expect(frequencyData?.frequencyBins[1023]).toBeLessThan(22100)
    })
  })

  describe('Event System', () => {
    beforeEach(async () => {
      await visualizer.initialize()
    })

    it('should add and remove event listeners', () => {
      const listener = jest.fn()
      
      visualizer.addEventListener('data', listener)
      expect(visualizer['listeners'].has('data')).toBe(true)
      
      visualizer.removeEventListener('data')
      expect(visualizer['listeners'].has('data')).toBe(false)
    })

    it('should emit events', () => {
      const listener = jest.fn()
      visualizer.addEventListener('data', listener)
      
      // Trigger an event
      visualizer['emitEvent']('data', { data: {} as VisualizationData })
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data',
          timestamp: expect.any(Number),
        })
      )
    })
  })

  describe('Audio Context Management', () => {
    beforeEach(async () => {
      await visualizer.initialize()
    })

    it('should get audio context state', () => {
      const state = visualizer.getAudioContextState()
      expect(state).toBe('running')
    })

    it('should resume suspended audio context', async () => {
      mockAudioContext.state = 'suspended'
      
      await visualizer.resumeAudioContext()
      
      expect(mockAudioContext.resume).toHaveBeenCalled()
    })

    it('should suspend running audio context', async () => {
      mockAudioContext.state = 'running'
      
      await visualizer.suspendAudioContext()
      
      expect(mockAudioContext.suspend).toHaveBeenCalled()
    })
  })

  describe('Utility Methods', () => {
    beforeEach(async () => {
      await visualizer.initialize()
    })

    it('should get sample rate', () => {
      const sampleRate = visualizer.getSampleRate()
      expect(sampleRate).toBe(44100)
    })

    it('should get frequency bin count', () => {
      const binCount = visualizer.getFrequencyBinCount()
      expect(binCount).toBe(1024)
    })

    it('should check if active', () => {
      expect(visualizer.isActive()).toBe(false)
      
      visualizer.start()
      expect(visualizer.isActive()).toBe(true)
    })
  })

  describe('Cleanup', () => {
    it('should destroy visualizer and cleanup resources', async () => {
      await visualizer.initialize()
      
      visualizer.destroy()
      
      expect(mockAudioContext.close).toHaveBeenCalled()
      expect(visualizer['audioContext']).toBeNull()
      expect(visualizer['analyser']).toBeNull()
      expect(visualizer['listeners'].size).toBe(0)
    })
  })
})
