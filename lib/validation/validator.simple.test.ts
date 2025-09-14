/**
 * Simplified unit tests for validation utilities
 */

import { DataValidator, validator, validateTrack, validateAlbum, validateArtist, validatePlaylist } from './validator'
import { schemas } from './schemas'

describe('DataValidator', () => {
  let dataValidator: DataValidator

  beforeEach(() => {
    dataValidator = new DataValidator()
  })

  describe('Basic Validation', () => {
    it('should validate valid track data', () => {
      const validTrack = {
        id: 'track-1',
        title: 'Test Track',
        artists: [{ id: 'artist-1', name: 'Test Artist' }],
        durationMs: 180000,
        artwork: 'https://example.com/artwork.jpg',
        audioUrl: 'https://example.com/audio.mp3',
        genre: 'Pop',
        releaseDate: '2024-01-01',
        trackNumber: 1,
        discNumber: 1,
        isExplicit: false,
        isLiked: false,
        playCount: 0,
        lastPlayed: null,
        addedAt: '2024-01-01T00:00:00.000Z',
      }

      const result = dataValidator.validateTrack(validTrack)
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.errors).toBeUndefined()
    })

    it('should validate valid album data', () => {
      const validAlbum = {
        id: 'album-1',
        title: 'Test Album',
        artists: [{ id: 'artist-1', name: 'Test Artist' }],
        artwork: 'https://example.com/album-artwork.jpg',
        releaseDate: '2024-01-01',
        genre: 'Pop',
        trackCount: 12,
        durationMs: 2400000,
        isLiked: false,
        addedAt: '2024-01-01T00:00:00.000Z',
      }

      const result = dataValidator.validateAlbum(validAlbum)
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.errors).toBeUndefined()
    })

    it('should validate valid artist data', () => {
      const validArtist = {
        id: 'artist-1',
        name: 'Test Artist',
        artwork: 'https://example.com/artist-artwork.jpg',
        genre: 'Pop',
        followerCount: 1000,
        isLiked: false,
        addedAt: '2024-01-01T00:00:00.000Z',
      }

      const result = dataValidator.validateArtist(validArtist)
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.errors).toBeUndefined()
    })

    it('should validate valid playlist data', () => {
      const validPlaylist = {
        id: 'playlist-1',
        name: 'Test Playlist',
        description: 'A test playlist',
        artwork: 'https://example.com/playlist-artwork.jpg',
        trackCount: 5,
        durationMs: 900000,
        isPublic: false,
        isLiked: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      const result = dataValidator.validatePlaylist(validPlaylist)
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.errors).toBeUndefined()
    })
  })

  describe('Validation Errors', () => {
    it('should return errors for invalid track data', () => {
      const invalidTrack = {
        id: '', // Invalid: empty ID
        title: '', // Invalid: empty title
        artists: [], // Invalid: empty artists array
        durationMs: -100, // Invalid: negative duration
        artwork: 'not-a-url', // Invalid: not a URL
        audioUrl: 'not-a-url', // Invalid: not a URL
        genre: 'A'.repeat(101), // Invalid: too long
        releaseDate: 'invalid-date', // Invalid: not YYYY-MM-DD format
        trackNumber: 0, // Invalid: not positive
        discNumber: 0, // Invalid: not positive
        isExplicit: 'not-boolean', // Invalid: not boolean
        isLiked: 'not-boolean', // Invalid: not boolean
        playCount: -1, // Invalid: negative
        lastPlayed: 'invalid-date', // Invalid: not valid datetime
        addedAt: 'invalid-date', // Invalid: not valid datetime
      }

      const result = dataValidator.validateTrack(invalidTrack)
      
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
      expect(result.data).toBeUndefined()
    })

    it('should return errors for invalid album data', () => {
      const invalidAlbum = {
        id: '', // Invalid: empty ID
        title: '', // Invalid: empty title
        artists: [], // Invalid: empty artists array
        artwork: 'not-a-url', // Invalid: not a URL
        releaseDate: 'invalid-date', // Invalid: not YYYY-MM-DD format
        genre: 'A'.repeat(101), // Invalid: too long
        trackCount: 0, // Invalid: not positive
        durationMs: -100, // Invalid: negative
        isLiked: 'not-boolean', // Invalid: not boolean
        addedAt: 'invalid-date', // Invalid: not valid datetime
      }

      const result = dataValidator.validateAlbum(invalidAlbum)
      
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
      expect(result.data).toBeUndefined()
    })

    it('should return errors for invalid artist data', () => {
      const invalidArtist = {
        id: '', // Invalid: empty ID
        name: '', // Invalid: empty name
        artwork: 'not-a-url', // Invalid: not a URL
        genre: 'A'.repeat(101), // Invalid: too long
        followerCount: -1, // Invalid: negative
        isLiked: 'not-boolean', // Invalid: not boolean
        addedAt: 'invalid-date', // Invalid: not valid datetime
      }

      const result = dataValidator.validateArtist(invalidArtist)
      
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
      expect(result.data).toBeUndefined()
    })

    it('should return errors for invalid playlist data', () => {
      const invalidPlaylist = {
        id: '', // Invalid: empty ID
        name: '', // Invalid: empty name
        description: 'A'.repeat(1001), // Invalid: too long
        artwork: 'not-a-url', // Invalid: not a URL
        trackCount: -1, // Invalid: negative
        durationMs: -100, // Invalid: negative
        isPublic: 'not-boolean', // Invalid: not boolean
        isLiked: 'not-boolean', // Invalid: not boolean
        createdAt: 'invalid-date', // Invalid: not valid datetime
        updatedAt: 'invalid-date', // Invalid: not valid datetime
      }

      const result = dataValidator.validatePlaylist(invalidPlaylist)
      
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
      expect(result.data).toBeUndefined()
    })
  })

  describe('Array Validation', () => {
    it('should validate array of tracks', () => {
      const tracks = [
        {
          id: 'track-1',
          title: 'Track 1',
          artists: [{ id: 'artist-1', name: 'Artist 1' }],
          durationMs: 180000,
        },
        {
          id: 'track-2',
          title: 'Track 2',
          artists: [{ id: 'artist-2', name: 'Artist 2' }],
          durationMs: 200000,
        },
      ]

      const result = dataValidator.validateTracks(tracks)
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data).toHaveLength(2)
      expect(result.errors).toBeUndefined()
    })

    it('should return errors for invalid array items', () => {
      const tracks = [
        {
          id: 'track-1',
          title: 'Track 1',
          artists: [{ id: 'artist-1', name: 'Artist 1' }],
          durationMs: 180000,
        },
        {
          id: '', // Invalid: empty ID
          title: '', // Invalid: empty title
          artists: [], // Invalid: empty artists array
          durationMs: -100, // Invalid: negative duration
        },
      ]

      const result = dataValidator.validateTracks(tracks)
      
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
      expect(result.data).toBeDefined()
      expect(result.data).toHaveLength(1) // Only valid items
    })
  })

  describe('Partial Validation', () => {
    it('should validate partial track data', () => {
      const partialTrack = {
        title: 'Updated Track Title',
        durationMs: 200000,
      }

      const result = dataValidator.validatePartialTrack(partialTrack)
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.title).toBe('Updated Track Title')
      expect(result.data?.durationMs).toBe(200000)
    })

    it('should validate partial album data', () => {
      const partialAlbum = {
        title: 'Updated Album Title',
        trackCount: 15,
      }

      const result = dataValidator.validatePartialAlbum(partialAlbum)
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.title).toBe('Updated Album Title')
      expect(result.data?.trackCount).toBe(15)
    })
  })

  describe('Safe Validation', () => {
    it('should return null for invalid data', () => {
      const invalidTrack = {
        id: '',
        title: '',
        artists: [],
        durationMs: -100,
      }

      const result = dataValidator.validateSafe(schemas.track, invalidTrack)
      
      expect(result).toBeNull()
    })

    it('should return data for valid data', () => {
      const validTrack = {
        id: 'track-1',
        title: 'Test Track',
        artists: [{ id: 'artist-1', name: 'Test Artist' }],
        durationMs: 180000,
      }

      const result = dataValidator.validateSafe(schemas.track, validTrack)
      
      expect(result).toBeDefined()
      expect(result?.id).toBe('track-1')
      expect(result?.title).toBe('Test Track')
    })
  })

  describe('Custom Error Messages', () => {
    it('should use custom error messages', () => {
      const invalidTrack = {
        id: '',
        title: '',
        artists: [],
        durationMs: -100,
      }

      const customMessages = {
        id: 'Track ID is required',
        title: 'Track title is required',
        artists: 'At least one artist is required',
        durationMs: 'Duration must be positive',
      }

      const result = dataValidator.validateTrackWithMessages(invalidTrack, customMessages)
      
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.some(error => error.includes('Track ID is required'))).toBe(true)
      expect(result.errors!.some(error => error.includes('Track title is required'))).toBe(true)
    })
  })

  describe('Schema Validation', () => {
    it('should check if data matches schema', () => {
      const validTrack = {
        id: 'track-1',
        title: 'Test Track',
        artists: [{ id: 'artist-1', name: 'Test Artist' }],
        durationMs: 180000,
      }

      const invalidTrack = {
        id: '',
        title: '',
        artists: [],
        durationMs: -100,
      }

      expect(dataValidator.matchesSchema(schemas.track, validTrack)).toBe(true)
      expect(dataValidator.matchesSchema(schemas.track, invalidTrack)).toBe(false)
    })

    it('should get schema errors without throwing', () => {
      const invalidTrack = {
        id: '',
        title: '',
        artists: [],
        durationMs: -100,
      }

      const errors = dataValidator.getSchemaErrors(schemas.track, invalidTrack)
      
      expect(errors).toBeDefined()
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(error => error.includes('ID cannot be empty'))).toBe(true)
    })
  })

  describe('Configuration', () => {
    it('should update validation options', () => {
      dataValidator.updateOptions({ strict: true, abortEarly: true })
      
      const options = dataValidator.getOptions()
      
      expect(options.strict).toBe(true)
      expect(options.abortEarly).toBe(true)
    })

    it('should use updated options for validation', () => {
      dataValidator.updateOptions({ strict: true, abortEarly: true })
      
      const invalidTrack = {
        id: '',
        title: '',
        artists: [],
        durationMs: -100,
      }

      const result = dataValidator.validateTrack(invalidTrack)
      
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      // With abortEarly: true, should have fewer errors
      expect(result.errors!.length).toBeLessThan(10)
    })
  })
})

describe('Validator Utility Functions', () => {
  it('should validate track using utility function', () => {
    const validTrack = {
      id: 'track-1',
      title: 'Test Track',
      artists: [{ id: 'artist-1', name: 'Test Artist' }],
      durationMs: 180000,
    }

    const result = validateTrack(validTrack)
    
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  it('should validate album using utility function', () => {
    const validAlbum = {
      id: 'album-1',
      title: 'Test Album',
      artists: [{ id: 'artist-1', name: 'Test Artist' }],
      trackCount: 12,
      durationMs: 2400000,
    }

    const result = validateAlbum(validAlbum)
    
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  it('should validate artist using utility function', () => {
    const validArtist = {
      id: 'artist-1',
      name: 'Test Artist',
      genre: 'Pop',
      followerCount: 1000,
    }

    const result = validateArtist(validArtist)
    
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  it('should validate playlist using utility function', () => {
    const validPlaylist = {
      id: 'playlist-1',
      name: 'Test Playlist',
      trackCount: 5,
      durationMs: 900000,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }

    const result = validatePlaylist(validPlaylist)
    
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })
})

describe('Singleton Validator', () => {
  it('should return same instance', () => {
    const instance1 = DataValidator.getInstance()
    const instance2 = DataValidator.getInstance()
    
    expect(instance1).toBe(instance2)
  })

  it('should use singleton for utility functions', () => {
    const validTrack = {
      id: 'track-1',
      title: 'Test Track',
      artists: [{ id: 'artist-1', name: 'Test Artist' }],
      durationMs: 180000,
    }

    const result = validator.validateTrack(validTrack)
    
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })
})
