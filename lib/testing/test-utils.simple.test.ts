/**
 * Simplified unit tests for testing utilities
 */

import { 
  mockTrack, 
  mockAlbum, 
  mockArtist, 
  mockPlaylist, 
  mockQueue, 
  mockAudioSettings,
  mockTracks,
  mockAlbums,
  mockArtists,
  mockPlaylists,
  TestDataFactory,
  expectToBeValidTrack,
  expectToBeValidAlbum,
  expectToBeValidPlaylist,
  expectToBeValidQueue,
  setupTestEnvironment,
  cleanupTestEnvironment,
  waitFor,
  waitForCondition,
  createMockEvent,
  createMockMouseEvent,
  createMockKeyboardEvent,
} from './test-utils'

describe('Test Utils', () => {
  beforeEach(() => {
    setupTestEnvironment()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('Mock Data Generators', () => {
    it('should generate valid track', () => {
      const track = mockTrack()
      
      expect(track).toBeDefined()
      expect(track.id).toBe('track-1')
      expect(track.title).toBe('Sample Track')
      expect(track.artists).toHaveLength(1)
      expect(track.artists[0].name).toBe('Sample Artist')
      expect(track.durationMs).toBe(180000)
      expect(track.artwork).toBe('https://example.com/artwork.jpg')
      expect(track.audioUrl).toBe('https://example.com/audio.mp3')
    })

    it('should generate track with overrides', () => {
      const track = mockTrack({
        id: 'custom-track',
        title: 'Custom Track',
        durationMs: 240000,
      })
      
      expect(track.id).toBe('custom-track')
      expect(track.title).toBe('Custom Track')
      expect(track.durationMs).toBe(240000)
      expect(track.artists[0].name).toBe('Sample Artist') // Default value
    })

    it('should generate valid album', () => {
      const album = mockAlbum()
      
      expect(album).toBeDefined()
      expect(album.id).toBe('album-1')
      expect(album.title).toBe('Sample Album')
      expect(album.artists).toHaveLength(1)
      expect(album.trackCount).toBe(12)
      expect(album.durationMs).toBe(2400000)
    })

    it('should generate valid artist', () => {
      const artist = mockArtist()
      
      expect(artist).toBeDefined()
      expect(artist.id).toBe('artist-1')
      expect(artist.name).toBe('Sample Artist')
      expect(artist.genre).toBe('Pop')
      expect(artist.followerCount).toBe(1000)
    })

    it('should generate valid playlist', () => {
      const playlist = mockPlaylist()
      
      expect(playlist).toBeDefined()
      expect(playlist.id).toBe('playlist-1')
      expect(playlist.name).toBe('Sample Playlist')
      expect(playlist.description).toBe('A sample playlist for testing')
      expect(playlist.trackCount).toBe(5)
      expect(playlist.durationMs).toBe(900000)
    })

    it('should generate valid queue', () => {
      const queue = mockQueue()
      
      expect(queue).toBeDefined()
      expect(queue.id).toBe('queue-1')
      expect(queue.name).toBe('Current Queue')
      expect(queue.tracks).toHaveLength(2)
      expect(queue.currentIndex).toBe(0)
      expect(queue.shuffleMode).toBe(false)
      expect(queue.repeatMode).toBe('none')
      expect(queue.history).toHaveLength(0)
    })

    it('should generate valid audio settings', () => {
      const settings = mockAudioSettings()
      
      expect(settings).toBeDefined()
      expect(settings.volume).toBe(0.8)
      expect(settings.muted).toBe(false)
      expect(settings.eq.enabled).toBe(false)
      expect(settings.crossfade.enabled).toBe(false)
      expect(settings.gapless.enabled).toBe(true)
      expect(settings.normalization.enabled).toBe(true)
      expect(settings.spatial.enabled).toBe(false)
    })
  })

  describe('Mock Collections', () => {
    it('should generate array of tracks', () => {
      const tracks = mockTracks(3)
      
      expect(tracks).toHaveLength(3)
      expect(tracks[0].id).toBe('track-1')
      expect(tracks[0].title).toBe('Track 1')
      expect(tracks[0].trackNumber).toBe(1)
      expect(tracks[1].id).toBe('track-2')
      expect(tracks[1].title).toBe('Track 2')
      expect(tracks[1].trackNumber).toBe(2)
      expect(tracks[2].id).toBe('track-3')
      expect(tracks[2].title).toBe('Track 3')
      expect(tracks[2].trackNumber).toBe(3)
    })

    it('should generate array of albums', () => {
      const albums = mockAlbums(2)
      
      expect(albums).toHaveLength(2)
      expect(albums[0].id).toBe('album-1')
      expect(albums[0].title).toBe('Album 1')
      expect(albums[1].id).toBe('album-2')
      expect(albums[1].title).toBe('Album 2')
    })

    it('should generate array of artists', () => {
      const artists = mockArtists(2)
      
      expect(artists).toHaveLength(2)
      expect(artists[0].id).toBe('artist-1')
      expect(artists[0].name).toBe('Artist 1')
      expect(artists[1].id).toBe('artist-2')
      expect(artists[1].name).toBe('Artist 2')
    })

    it('should generate array of playlists', () => {
      const playlists = mockPlaylists(2)
      
      expect(playlists).toHaveLength(2)
      expect(playlists[0].id).toBe('playlist-1')
      expect(playlists[0].name).toBe('Playlist 1')
      expect(playlists[1].id).toBe('playlist-2')
      expect(playlists[1].name).toBe('Playlist 2')
    })
  })

  describe('Test Data Factory', () => {
    it('should create track sequence', () => {
      const tracks = TestDataFactory.createTrackSequence(3)
      
      expect(tracks).toHaveLength(3)
      expect(tracks[0].id).toBe('track-1')
      expect(tracks[0].title).toBe('Track 1')
      expect(tracks[0].trackNumber).toBe(1)
      expect(tracks[0].durationMs).toBe(180000)
      expect(tracks[1].durationMs).toBe(190000)
      expect(tracks[2].durationMs).toBe(200000)
    })

    it('should create track sequence with base track', () => {
      const tracks = TestDataFactory.createTrackSequence(2, {
        title: 'Base Track',
        genre: 'Rock',
      })
      
      expect(tracks).toHaveLength(2)
      expect(tracks[0].title).toBe('Track 1')
      expect(tracks[0].genre).toBe('Rock')
      expect(tracks[1].title).toBe('Track 2')
      expect(tracks[1].genre).toBe('Rock')
    })

    it('should create album with tracks', () => {
      const { album, tracks } = TestDataFactory.createAlbumWithTracks(3)
      
      expect(album).toBeDefined()
      expect(tracks).toHaveLength(3)
      expect(album.trackCount).toBe(3)
      expect(album.durationMs).toBe(570000) // 180000 + 190000 + 200000
    })

    it('should create playlist with tracks', () => {
      const { playlist, tracks } = TestDataFactory.createPlaylistWithTracks(2)
      
      expect(playlist).toBeDefined()
      expect(tracks).toHaveLength(2)
      expect(playlist.trackCount).toBe(2)
      expect(playlist.durationMs).toBe(370000) // 180000 + 190000
    })

    it('should create queue with tracks', () => {
      const queue = TestDataFactory.createQueueWithTracks(3)
      
      expect(queue).toBeDefined()
      expect(queue.tracks).toHaveLength(3)
      expect(queue.tracks[0].id).toBe('track-1')
      expect(queue.tracks[1].id).toBe('track-2')
      expect(queue.tracks[2].id).toBe('track-3')
    })

    it('should create library with items', () => {
      const library = TestDataFactory.createLibraryWithItems(3)
      
      expect(library).toHaveLength(3)
      expect(library[0].type).toBe('track')
      expect(library[0].item.id).toBe('track-1')
      expect(library[1].item.id).toBe('track-2')
      expect(library[2].item.id).toBe('track-3')
    })
  })

  describe('Test Assertions', () => {
    it('should validate track', () => {
      const track = mockTrack()
      
      expect(() => expectToBeValidTrack(track)).not.toThrow()
    })

    it('should validate album', () => {
      const album = mockAlbum()
      
      expect(() => expectToBeValidAlbum(album)).not.toThrow()
    })

    it('should validate playlist', () => {
      const playlist = mockPlaylist()
      
      expect(() => expectToBeValidPlaylist(playlist)).not.toThrow()
    })

    it('should validate queue', () => {
      const queue = mockQueue()
      
      expect(() => expectToBeValidQueue(queue)).not.toThrow()
    })

    it('should throw error for invalid track', () => {
      const invalidTrack = { id: 'test' } // Missing required properties
      
      expect(() => expectToBeValidTrack(invalidTrack)).toThrow()
    })

    it('should throw error for invalid album', () => {
      const invalidAlbum = { id: 'test' } // Missing required properties
      
      expect(() => expectToBeValidAlbum(invalidAlbum)).toThrow()
    })

    it('should throw error for invalid playlist', () => {
      const invalidPlaylist = { id: 'test' } // Missing required properties
      
      expect(() => expectToBeValidPlaylist(invalidPlaylist)).toThrow()
    })

    it('should throw error for invalid queue', () => {
      const invalidQueue = { id: 'test' } // Missing required properties
      
      expect(() => expectToBeValidQueue(invalidQueue)).toThrow()
    })
  })

  describe('Test Utilities', () => {
    it('should wait for specified time', async () => {
      const startTime = Date.now()
      await waitFor(100)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(90)
      expect(endTime - startTime).toBeLessThan(200)
    })

    it('should wait for condition', async () => {
      let conditionMet = false
      
      setTimeout(() => {
        conditionMet = true
      }, 50)
      
      await waitForCondition(() => conditionMet, 1000, 10)
      
      expect(conditionMet).toBe(true)
    })

    it('should timeout waiting for condition', async () => {
      let conditionMet = false
      
      try {
        await waitForCondition(() => conditionMet, 100, 10)
        fail('Expected timeout error')
      } catch (error) {
        expect(error.message).toContain('Condition not met within 100ms')
      }
    })

    it('should create mock event', () => {
      const event = createMockEvent('click')
      
      expect(event.type).toBe('click')
      expect(event.preventDefault).toBeDefined()
      expect(event.stopPropagation).toBeDefined()
      expect(typeof event.preventDefault).toBe('function')
      expect(typeof event.stopPropagation).toBe('function')
    })

    it('should create mock mouse event', () => {
      const event = createMockMouseEvent('click', { clientX: 100, clientY: 200 })
      
      expect(event.type).toBe('click')
      expect(event.clientX).toBe(100)
      expect(event.clientY).toBe(200)
      expect(event.button).toBe(0)
      expect(event.ctrlKey).toBe(false)
    })

    it('should create mock keyboard event', () => {
      const event = createMockKeyboardEvent('keydown', { key: 'Enter', ctrlKey: true })
      
      expect(event.type).toBe('keydown')
      expect(event.key).toBe('Enter')
      expect(event.ctrlKey).toBe(true)
      expect(event.shiftKey).toBe(false)
    })
  })

  describe('Test Environment', () => {
    it('should set up test environment', () => {
      expect(global.fetch).toBeDefined()
      expect(global.localStorage).toBeDefined()
      expect(global.indexedDB).toBeDefined()
      expect(global.AudioContext).toBeDefined()
      expect(global.performance).toBeDefined()
      expect(global.window).toBeDefined()
      expect(global.document).toBeDefined()
    })

    it('should clean up test environment', () => {
      cleanupTestEnvironment()
      
      // Environment should still be set up but mocks should be cleared
      expect(global.fetch).toBeDefined()
      expect(global.localStorage).toBeDefined()
      expect(global.indexedDB).toBeDefined()
    })
  })
})
