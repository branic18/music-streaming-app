/**
 * Unit tests for core type definitions and validation
 */

import {
  Track,
  Album,
  Artist,
  Playlist,
  Queue,
  LibraryItem,
  Lyrics,
  DownloadItem,
  SearchResult,
  AnalyticsEvent,
  ConsentPreferences,
  AudioSettings,
  PlaybackState,
  AppError,
  isTrack,
  isAlbum,
  isArtist,
  isPlaylist,
  DEFAULT_VALUES,
  VALIDATION_CONSTRAINTS,
} from './index'

describe('Type Definitions', () => {
  describe('Track', () => {
    it('should create a valid Track object', () => {
      const track: Track = {
        id: 'track-1',
        title: 'Test Track',
        artists: ['Test Artist'],
        albumId: 'album-1',
        album: 'Test Album',
        durationMs: 180000, // 3 minutes
        artwork: 'https://example.com/artwork.jpg',
        territories: ['US', 'CA'],
        downloadable: true,
        lyricsAvailable: true,
        explicit: false,
        popularity: 85,
        genres: ['Rock'],
        releaseDate: new Date('2024-01-01'),
        isrc: 'USRC17607839',
        previewUrl: 'https://example.com/preview.mp3',
        externalUrls: {
          spotify: 'https://open.spotify.com/track/1',
        },
      }

      expect(track.id).toBe('track-1')
      expect(track.title).toBe('Test Track')
      expect(track.artists).toEqual(['Test Artist'])
      expect(track.durationMs).toBe(180000)
      expect(track.downloadable).toBe(true)
      expect(track.lyricsAvailable).toBe(true)
    })

    it('should work with minimal required fields', () => {
      const track: Track = {
        id: 'track-1',
        title: 'Minimal Track',
        artists: ['Artist'],
        albumId: 'album-1',
        durationMs: 120000,
        artwork: 'artwork.jpg',
        territories: [],
        downloadable: false,
        lyricsAvailable: false,
        explicit: false,
        popularity: 0,
      }

      expect(track.id).toBe('track-1')
      expect(track.title).toBe('Minimal Track')
    })
  })

  describe('Album', () => {
    it('should create a valid Album object', () => {
      const album: Album = {
        id: 'album-1',
        title: 'Test Album',
        artist: 'Test Artist',
        artists: ['Test Artist', 'Featured Artist'],
        year: 2024,
        trackCount: 12,
        artwork: 'https://example.com/album.jpg',
        duration: 2400, // 40 minutes
        genres: ['Rock', 'Alternative'],
        label: 'Test Records',
        releaseDate: new Date('2024-01-01'),
        albumType: 'album',
        externalUrls: {
          spotify: 'https://open.spotify.com/album/1',
        },
      }

      expect(album.id).toBe('album-1')
      expect(album.title).toBe('Test Album')
      expect(album.trackCount).toBe(12)
      expect(album.albumType).toBe('album')
    })
  })

  describe('Artist', () => {
    it('should create a valid Artist object', () => {
      const artist: Artist = {
        id: 'artist-1',
        name: 'Test Artist',
        followers: 1000000,
        genres: ['Rock', 'Alternative'],
        artwork: 'https://example.com/artist.jpg',
        verified: true,
        popularity: 90,
        externalUrls: {
          spotify: 'https://open.spotify.com/artist/1',
        },
        images: ['image1.jpg', 'image2.jpg'],
      }

      expect(artist.id).toBe('artist-1')
      expect(artist.name).toBe('Test Artist')
      expect(artist.verified).toBe(true)
      expect(artist.followers).toBe(1000000)
    })
  })

  describe('Playlist', () => {
    it('should create a valid Playlist object', () => {
      const playlist: Playlist = {
        id: 'playlist-1',
        name: 'My Playlist',
        description: 'A test playlist',
        trackIds: ['track-1', 'track-2', 'track-3'],
        tracks: [], // Would be populated with full Track objects
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        ownerType: 'anonymous',
        shareToken: 'abc123',
        isPublic: true,
        artwork: 'playlist-artwork.jpg',
        totalDuration: 1800,
        totalTracks: 3,
        externalUrls: {
          spotify: 'https://open.spotify.com/playlist/1',
        },
      }

      expect(playlist.id).toBe('playlist-1')
      expect(playlist.ownerType).toBe('anonymous')
      expect(playlist.isPublic).toBe(true)
      expect(playlist.trackIds).toHaveLength(3)
    })
  })

  describe('Queue', () => {
    it('should create a valid Queue object', () => {
      const track: Track = {
        id: 'track-1',
        title: 'Current Track',
        artists: ['Artist'],
        albumId: 'album-1',
        durationMs: 180000,
        artwork: 'artwork.jpg',
        territories: [],
        downloadable: false,
        lyricsAvailable: false,
        explicit: false,
        popularity: 0,
      }

      const queue: Queue = {
        nowPlaying: track,
        upNext: [],
        history: [],
        shuffleMode: false,
        repeatMode: 'off',
        currentTime: 30,
        volume: 75,
        isPlaying: true,
        isBuffering: false,
        lastUpdated: new Date(),
      }

      expect(queue.nowPlaying).toBe(track)
      expect(queue.isPlaying).toBe(true)
      expect(queue.volume).toBe(75)
    })
  })

  describe('LibraryItem', () => {
    it('should create a valid LibraryItem object', () => {
      const libraryItem: LibraryItem = {
        id: 'lib-1',
        type: 'track',
        itemId: 'track-1',
        addedAt: new Date('2024-01-01'),
        source: 'user',
        tags: ['favorite', 'rock'],
      }

      expect(libraryItem.type).toBe('track')
      expect(libraryItem.itemId).toBe('track-1')
      expect(libraryItem.source).toBe('user')
    })
  })

  describe('Lyrics', () => {
    it('should create a valid Lyrics object with static lyrics', () => {
      const lyrics: Lyrics = {
        trackId: 'track-1',
        static: 'These are the lyrics to the song...',
        provider: 'Genius',
        language: 'en',
        copyright: '© 2024 Test Records',
        lastUpdated: new Date(),
      }

      expect(lyrics.trackId).toBe('track-1')
      expect(lyrics.static).toContain('lyrics')
      expect(lyrics.provider).toBe('Genius')
    })

    it('should create a valid Lyrics object with synced lyrics', () => {
      const lyrics: Lyrics = {
        trackId: 'track-1',
        synced: [
          { time: 0, text: 'First line' },
          { time: 5, text: 'Second line' },
          { time: 10, text: 'Third line' },
        ],
        provider: 'Musixmatch',
        language: 'en',
        lastUpdated: new Date(),
      }

      expect(lyrics.synced).toHaveLength(3)
      expect(lyrics.synced![0].time).toBe(0)
      expect(lyrics.synced![0].text).toBe('First line')
    })
  })

  describe('DownloadItem', () => {
    it('should create a valid DownloadItem object', () => {
      const track: Track = {
        id: 'track-1',
        title: 'Downloadable Track',
        artists: ['Artist'],
        albumId: 'album-1',
        durationMs: 180000,
        artwork: 'artwork.jpg',
        territories: [],
        downloadable: true,
        lyricsAvailable: false,
        explicit: false,
        popularity: 0,
      }

      const downloadItem: DownloadItem = {
        id: 'download-1',
        track,
        status: 'downloading',
        progress: 45,
        fileSize: 5000000, // 5MB
        quality: 'high',
        retryCount: 0,
        maxRetries: 3,
        licenseExpiry: new Date('2025-01-01'),
        encrypted: true,
        checksum: 'abc123def456',
      }

      expect(downloadItem.status).toBe('downloading')
      expect(downloadItem.progress).toBe(45)
      expect(downloadItem.quality).toBe('high')
      expect(downloadItem.encrypted).toBe(true)
    })
  })

  describe('SearchResult', () => {
    it('should create a valid SearchResult object', () => {
      const searchResult: SearchResult = {
        tracks: [],
        albums: [],
        artists: [],
        playlists: [],
        total: 0,
        query: 'test search',
        filters: {
          type: 'all',
          genre: ['rock'],
          explicit: false,
        },
        sortBy: 'relevance',
        page: 1,
        limit: 20,
        hasMore: false,
      }

      expect(searchResult.query).toBe('test search')
      expect(searchResult.page).toBe(1)
      expect(searchResult.limit).toBe(20)
      expect(searchResult.filters?.type).toBe('all')
    })
  })

  describe('AnalyticsEvent', () => {
    it('should create a valid AnalyticsEvent object', () => {
      const event: AnalyticsEvent = {
        id: 'event-1',
        type: 'track_play',
        timestamp: new Date(),
        sessionId: 'session-123',
        data: {
          trackId: 'track-1',
          duration: 180000,
        },
        userAgent: 'Mozilla/5.0...',
        url: 'https://app.example.com/player',
        loadTime: 150,
      }

      expect(event.type).toBe('track_play')
      expect(event.sessionId).toBe('session-123')
      expect(event.data?.trackId).toBe('track-1')
    })
  })

  describe('ConsentPreferences', () => {
    it('should create a valid ConsentPreferences object', () => {
      const consent: ConsentPreferences = {
        analytics: true,
        cookies: true,
        storage: true,
        personalization: false,
        lastUpdated: new Date(),
        version: '1.0',
      }

      expect(consent.analytics).toBe(true)
      expect(consent.personalization).toBe(false)
      expect(consent.version).toBe('1.0')
    })
  })

  describe('AudioSettings', () => {
    it('should create a valid AudioSettings object', () => {
      const settings: AudioSettings = {
        crossfadeEnabled: true,
        crossfadeDuration: 5,
        gaplessEnabled: true,
        normalizeVolume: true,
        audioQuality: 'lossless',
        replayGain: true,
        loudnessNormalization: true,
        dynamicRange: 'extended',
      }

      expect(settings.crossfadeEnabled).toBe(true)
      expect(settings.crossfadeDuration).toBe(5)
      expect(settings.audioQuality).toBe('lossless')
    })
  })

  describe('PlaybackState', () => {
    it('should create a valid PlaybackState object', () => {
      const track: Track = {
        id: 'track-1',
        title: 'Playing Track',
        artists: ['Artist'],
        albumId: 'album-1',
        durationMs: 180000,
        artwork: 'artwork.jpg',
        territories: [],
        downloadable: false,
        lyricsAvailable: false,
        explicit: false,
        popularity: 0,
      }

      const playbackState: PlaybackState = {
        track,
        isPlaying: true,
        currentTime: 30,
        duration: 180,
        volume: 80,
        isBuffering: false,
        isMuted: false,
        repeatMode: 'all',
        shuffleMode: true,
        retryCount: 0,
      }

      expect(playbackState.isPlaying).toBe(true)
      expect(playbackState.currentTime).toBe(30)
      expect(playbackState.repeatMode).toBe('all')
      expect(playbackState.shuffleMode).toBe(true)
    })
  })

  describe('AppError', () => {
    it('should create a valid AppError object', () => {
      const error: AppError = {
        code: 'NETWORK_ERROR',
        message: 'Failed to connect to server',
        details: 'Connection timeout after 30 seconds',
        timestamp: new Date(),
        stack: 'Error: Failed to connect...',
        context: {
          url: 'https://api.example.com/tracks',
          method: 'GET',
        },
        severity: 'high',
      }

      expect(error.code).toBe('NETWORK_ERROR')
      expect(error.severity).toBe('high')
      expect(error.context?.url).toBe('https://api.example.com/tracks')
    })
  })
})

describe('Type Guards', () => {
  describe('isTrack', () => {
    it('should return true for valid Track objects', () => {
      const validTrack = {
        id: 'track-1',
        title: 'Test Track',
        artists: ['Artist'],
        albumId: 'album-1',
        durationMs: 180000,
        artwork: 'artwork.jpg',
        territories: [],
        downloadable: false,
        lyricsAvailable: false,
        explicit: false,
        popularity: 0,
      }

      expect(isTrack(validTrack)).toBe(true)
    })

    it('should return false for invalid objects', () => {
      expect(isTrack(null)).toBe(false)
      expect(isTrack(undefined)).toBe(false)
      expect(isTrack({})).toBe(false)
      expect(isTrack({ id: 'track-1' })).toBe(false)
      expect(isTrack({ id: 'track-1', title: 'Test' })).toBe(false)
    })
  })

  describe('isAlbum', () => {
    it('should return true for valid Album objects', () => {
      const validAlbum = {
        id: 'album-1',
        title: 'Test Album',
        artist: 'Test Artist',
        year: 2024,
        trackCount: 12,
        artwork: 'artwork.jpg',
        duration: 2400,
      }

      expect(isAlbum(validAlbum)).toBe(true)
    })

    it('should return false for invalid objects', () => {
      expect(isAlbum(null)).toBe(false)
      expect(isAlbum({})).toBe(false)
      expect(isAlbum({ id: 'album-1' })).toBe(false)
    })
  })

  describe('isArtist', () => {
    it('should return true for valid Artist objects', () => {
      const validArtist = {
        id: 'artist-1',
        name: 'Test Artist',
        followers: 1000000,
        genres: ['Rock'],
        artwork: 'artwork.jpg',
        verified: true,
      }

      expect(isArtist(validArtist)).toBe(true)
    })

    it('should return false for invalid objects', () => {
      expect(isArtist(null)).toBe(false)
      expect(isArtist({})).toBe(false)
      expect(isArtist({ id: 'artist-1' })).toBe(false)
    })
  })

  describe('isPlaylist', () => {
    it('should return true for valid Playlist objects', () => {
      const validPlaylist = {
        id: 'playlist-1',
        name: 'Test Playlist',
        trackIds: ['track-1', 'track-2'],
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerType: 'anonymous',
        isPublic: false,
      }

      expect(isPlaylist(validPlaylist)).toBe(true)
    })

    it('should return false for invalid objects', () => {
      expect(isPlaylist(null)).toBe(false)
      expect(isPlaylist({})).toBe(false)
      expect(isPlaylist({ id: 'playlist-1' })).toBe(false)
    })
  })
})

describe('Default Values', () => {
  it('should have correct default values for Track', () => {
    expect(DEFAULT_VALUES.TRACK.durationMs).toBe(0)
    expect(DEFAULT_VALUES.TRACK.explicit).toBe(false)
    expect(DEFAULT_VALUES.TRACK.downloadable).toBe(false)
    expect(DEFAULT_VALUES.TRACK.lyricsAvailable).toBe(false)
    expect(DEFAULT_VALUES.TRACK.popularity).toBe(0)
    expect(DEFAULT_VALUES.TRACK.territories).toEqual([])
    expect(DEFAULT_VALUES.TRACK.artists).toEqual([])
  })

  it('should have correct default values for Album', () => {
    expect(DEFAULT_VALUES.ALBUM.year).toBe(new Date().getFullYear())
    expect(DEFAULT_VALUES.ALBUM.trackCount).toBe(0)
    expect(DEFAULT_VALUES.ALBUM.duration).toBe(0)
    expect(DEFAULT_VALUES.ALBUM.genres).toEqual([])
  })

  it('should have correct default values for Artist', () => {
    expect(DEFAULT_VALUES.ARTIST.followers).toBe(0)
    expect(DEFAULT_VALUES.ARTIST.genres).toEqual([])
    expect(DEFAULT_VALUES.ARTIST.verified).toBe(false)
    expect(DEFAULT_VALUES.ARTIST.popularity).toBe(0)
  })

  it('should have correct default values for Playlist', () => {
    expect(DEFAULT_VALUES.PLAYLIST.trackIds).toEqual([])
    expect(DEFAULT_VALUES.PLAYLIST.isPublic).toBe(false)
    expect(DEFAULT_VALUES.PLAYLIST.ownerType).toBe('anonymous')
    expect(DEFAULT_VALUES.PLAYLIST.createdAt).toBeInstanceOf(Date)
    expect(DEFAULT_VALUES.PLAYLIST.updatedAt).toBeInstanceOf(Date)
  })

  it('should have correct default values for Queue', () => {
    expect(DEFAULT_VALUES.QUEUE.nowPlaying).toBe(null)
    expect(DEFAULT_VALUES.QUEUE.upNext).toEqual([])
    expect(DEFAULT_VALUES.QUEUE.history).toEqual([])
    expect(DEFAULT_VALUES.QUEUE.shuffleMode).toBe(false)
    expect(DEFAULT_VALUES.QUEUE.repeatMode).toBe('off')
    expect(DEFAULT_VALUES.QUEUE.currentTime).toBe(0)
    expect(DEFAULT_VALUES.QUEUE.volume).toBe(75)
    expect(DEFAULT_VALUES.QUEUE.isPlaying).toBe(false)
    expect(DEFAULT_VALUES.QUEUE.isBuffering).toBe(false)
    expect(DEFAULT_VALUES.QUEUE.lastUpdated).toBeInstanceOf(Date)
  })

  it('should have correct default values for AudioSettings', () => {
    expect(DEFAULT_VALUES.AUDIO_SETTINGS.crossfadeEnabled).toBe(false)
    expect(DEFAULT_VALUES.AUDIO_SETTINGS.crossfadeDuration).toBe(3)
    expect(DEFAULT_VALUES.AUDIO_SETTINGS.gaplessEnabled).toBe(true)
    expect(DEFAULT_VALUES.AUDIO_SETTINGS.normalizeVolume).toBe(true)
    expect(DEFAULT_VALUES.AUDIO_SETTINGS.audioQuality).toBe('high')
    expect(DEFAULT_VALUES.AUDIO_SETTINGS.replayGain).toBe(false)
    expect(DEFAULT_VALUES.AUDIO_SETTINGS.loudnessNormalization).toBe(true)
    expect(DEFAULT_VALUES.AUDIO_SETTINGS.dynamicRange).toBe('standard')
  })
})

describe('Validation Constraints', () => {
  it('should have correct validation constraints for Track', () => {
    expect(VALIDATION_CONSTRAINTS.TRACK.TITLE_MAX_LENGTH).toBe(200)
    expect(VALIDATION_CONSTRAINTS.TRACK.ARTISTS_MAX_COUNT).toBe(10)
    expect(VALIDATION_CONSTRAINTS.TRACK.DURATION_MAX_MS).toBe(3600000)
    expect(VALIDATION_CONSTRAINTS.TRACK.POPULARITY_MIN).toBe(0)
    expect(VALIDATION_CONSTRAINTS.TRACK.POPULARITY_MAX).toBe(100)
  })

  it('should have correct validation constraints for Album', () => {
    expect(VALIDATION_CONSTRAINTS.ALBUM.TITLE_MAX_LENGTH).toBe(200)
    expect(VALIDATION_CONSTRAINTS.ALBUM.YEAR_MIN).toBe(1900)
    expect(VALIDATION_CONSTRAINTS.ALBUM.YEAR_MAX).toBe(new Date().getFullYear() + 1)
    expect(VALIDATION_CONSTRAINTS.ALBUM.TRACK_COUNT_MAX).toBe(100)
  })

  it('should have correct validation constraints for Artist', () => {
    expect(VALIDATION_CONSTRAINTS.ARTIST.NAME_MAX_LENGTH).toBe(100)
    expect(VALIDATION_CONSTRAINTS.ARTIST.GENRES_MAX_COUNT).toBe(20)
    expect(VALIDATION_CONSTRAINTS.ARTIST.FOLLOWERS_MIN).toBe(0)
  })

  it('should have correct validation constraints for Playlist', () => {
    expect(VALIDATION_CONSTRAINTS.PLAYLIST.NAME_MAX_LENGTH).toBe(100)
    expect(VALIDATION_CONSTRAINTS.PLAYLIST.DESCRIPTION_MAX_LENGTH).toBe(500)
    expect(VALIDATION_CONSTRAINTS.PLAYLIST.TRACKS_MAX_COUNT).toBe(1000)
  })
})
