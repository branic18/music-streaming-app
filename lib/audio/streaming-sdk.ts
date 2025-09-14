/**
 * Third-party streaming SDK integration wrapper
 * Supports multiple streaming providers with unified interface
 */

import { Track, Album, Artist, Playlist } from '@/lib/types'
import { errorHandler } from '@/lib/error/error-handler'

// Streaming provider types
export type StreamingProvider = 'spotify' | 'apple' | 'custom' | 'mock'

// Audio quality levels
export type AudioQuality = 'low' | 'medium' | 'high' | 'lossless'

// Streaming configuration
export interface StreamingConfig {
  provider: StreamingProvider
  apiKey?: string
  clientId?: string
  clientSecret?: string
  redirectUri?: string
  accessToken?: string
  refreshToken?: string
  quality: AudioQuality
  enableDRM: boolean
  enableOffline: boolean
  maxBitrate: number
  bufferSize: number
}

// Streaming SDK events
export interface StreamingEvent {
  type: 'ready' | 'error' | 'trackChange' | 'playbackStateChange' | 'qualityChange' | 'authRequired'
  data?: any
  timestamp: number
}

// Track streaming info
export interface StreamingTrackInfo {
  track: Track
  streamUrl: string
  quality: AudioQuality
  bitrate: number
  duration: number
  isDRMProtected: boolean
  isOfflineAvailable: boolean
  expiresAt?: Date
}

// Search results from streaming provider
export interface StreamingSearchResults {
  tracks: Track[]
  albums: Album[]
  artists: Artist[]
  playlists: Playlist[]
  total: number
  hasMore: boolean
  nextOffset?: number
}

// Authentication state
export interface AuthState {
  isAuthenticated: boolean
  accessToken?: string
  refreshToken?: string
  expiresAt?: Date
  scope?: string[]
  user?: {
    id: string
    name: string
    email?: string
    avatar?: string
  }
}

// Streaming SDK interface
export interface StreamingSDK {
  initialize(config: StreamingConfig): Promise<void>
  authenticate(): Promise<AuthState>
  refreshAuth(): Promise<AuthState>
  search(query: string, types: string[], limit?: number, offset?: number): Promise<StreamingSearchResults>
  getTrackStream(trackId: string, quality?: AudioQuality): Promise<StreamingTrackInfo>
  getAlbum(albumId: string): Promise<Album>
  getArtist(artistId: string): Promise<Artist>
  getPlaylist(playlistId: string): Promise<Playlist>
  getUserPlaylists(): Promise<Playlist[]>
  createPlaylist(name: string, description?: string): Promise<Playlist>
  addToPlaylist(playlistId: string, trackIds: string[]): Promise<void>
  removeFromPlaylist(playlistId: string, trackIds: string[]): Promise<void>
  likeTrack(trackId: string): Promise<void>
  unlikeTrack(trackId: string): Promise<void>
  getLikedTracks(): Promise<Track[]>
  downloadTrack(trackId: string, quality?: AudioQuality): Promise<Blob>
  isTrackAvailable(trackId: string): Promise<boolean>
  getAvailableQualities(trackId: string): Promise<AudioQuality[]>
  on(event: string, callback: (event: StreamingEvent) => void): void
  off(event: string, callback: (event: StreamingEvent) => void): void
  emit(event: string, data?: any): void
}

// Spottify Web API SDK implementation
class SpotifySDK implements StreamingSDK {
  private config: StreamingConfig
  private authState: AuthState
  private eventListeners: Map<string, ((event: StreamingEvent) => void)[]> = new Map()
  private baseUrl = 'https://api.spotify.com/v1'

  constructor() {
    this.authState = { isAuthenticated: false }
  }

  async initialize(config: StreamingConfig): Promise<void> {
    this.config = config
    
    // Load Spottify Web Playback SDK
    await this.loadSpotifySDK()
    
    // Initialize authentication if tokens are provided
    if (config.accessToken) {
      this.authState = {
        isAuthenticated: true,
        accessToken: config.accessToken,
        refreshToken: config.refreshToken,
        expiresAt: config.expiresAt ? new Date(config.expiresAt) : undefined
      }
    }

    this.emit('ready', { provider: 'spotify' })
  }

  private async loadSpotifySDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.Spotify) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Spottify SDK'))
      document.head.appendChild(script)
    })
  }

  async authenticate(): Promise<AuthState> {
    const scopes = [
      'streaming',
      'user-read-email',
      'user-read-private',
      'user-library-read',
      'user-library-modify',
      'user-read-playback-state',
      'user-modify-playback-state',
      'playlist-read-private',
      'playlist-modify-public',
      'playlist-modify-private'
    ]

    const authUrl = new URL('https://accounts.spotify.com/authorize')
    authUrl.searchParams.set('client_id', this.config.clientId!)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('redirect_uri', this.config.redirectUri!)
    authUrl.searchParams.set('scope', scopes.join(' '))
    authUrl.searchParams.set('show_dialog', 'true')

    // Redirect to Spottify auth
    window.location.href = authUrl.toString()
    
    return this.authState
  }

  async refreshAuth(): Promise<AuthState> {
    if (!this.config.clientSecret || !this.authState.refreshToken) {
      throw new Error('Missing client secret or refresh token')
    }

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.authState.refreshToken
        })
      })

      if (!response.ok) {
        throw new Error('Failed to refresh token')
      }

      const data = await response.json()
      
      this.authState = {
        isAuthenticated: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || this.authState.refreshToken,
        expiresAt: new Date(Date.now() + data.expires_in * 1000)
      }

      return this.authState
    } catch (error) {
      this.authState.isAuthenticated = false
      throw error
    }
  }

  async search(query: string, types: string[], limit = 20, offset = 0): Promise<StreamingSearchResults> {
    await this.ensureAuthenticated()

    const params = new URLSearchParams({
      q: query,
      type: types.join(','),
      limit: limit.toString(),
      offset: offset.toString()
    })

    const response = await this.makeRequest(`/search?${params}`)
    const data = await response.json()

    return {
      tracks: data.tracks?.items?.map(this.mapSpotifyTrack) || [],
      albums: data.albums?.items?.map(this.mapSpotifyAlbum) || [],
      artists: data.artists?.items?.map(this.mapSpotifyArtist) || [],
      playlists: data.playlists?.items?.map(this.mapSpotifyPlaylist) || [],
      total: data.tracks?.total || 0,
      hasMore: (data.tracks?.offset || 0) + (data.tracks?.limit || 0) < (data.tracks?.total || 0),
      nextOffset: offset + limit
    }
  }

  async getTrackStream(trackId: string, quality?: AudioQuality): Promise<StreamingTrackInfo> {
    await this.ensureAuthenticated()

    const track = await this.getTrack(trackId)
    const streamUrl = `https://api.spotify.com/v1/tracks/${trackId}`
    
    return {
      track,
      streamUrl,
      quality: quality || this.config.quality,
      bitrate: this.getBitrateForQuality(quality || this.config.quality),
      duration: track.durationMs / 1000,
      isDRMProtected: false, // Spottify Web API doesn't use DRM
      isOfflineAvailable: false, // Would need premium subscription
      expiresAt: new Date(Date.now() + 3600000) // 1 hour
    }
  }

  async getAlbum(albumId: string): Promise<Album> {
    await this.ensureAuthenticated()
    const response = await this.makeRequest(`/albums/${albumId}`)
    const data = await response.json()
    return this.mapSpotifyAlbum(data)
  }

  async getArtist(artistId: string): Promise<Artist> {
    await this.ensureAuthenticated()
    const response = await this.makeRequest(`/artists/${artistId}`)
    const data = await response.json()
    return this.mapSpotifyArtist(data)
  }

  async getPlaylist(playlistId: string): Promise<Playlist> {
    await this.ensureAuthenticated()
    const response = await this.makeRequest(`/playlists/${playlistId}`)
    const data = await response.json()
    return this.mapSpotifyPlaylist(data)
  }

  async getUserPlaylists(): Promise<Playlist[]> {
    await this.ensureAuthenticated()
    const response = await this.makeRequest('/me/playlists')
    const data = await response.json()
    return data.items.map(this.mapSpotifyPlaylist)
  }

  async createPlaylist(name: string, description?: string): Promise<Playlist> {
    await this.ensureAuthenticated()
    
    const response = await this.makeRequest('/me/playlists', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        public: false
      })
    })
    
    const data = await response.json()
    return this.mapSpotifyPlaylist(data)
  }

  async addToPlaylist(playlistId: string, trackIds: string[]): Promise<void> {
    await this.ensureAuthenticated()
    
    await this.makeRequest(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        uris: trackIds.map(id => `spotify:track:${id}`)
      })
    })
  }

  async removeFromPlaylist(playlistId: string, trackIds: string[]): Promise<void> {
    await this.ensureAuthenticated()
    
    await this.makeRequest(`/playlists/${playlistId}/tracks`, {
      method: 'DELETE',
      body: JSON.stringify({
        tracks: trackIds.map(id => ({ uri: `spotify:track:${id}` }))
      })
    })
  }

  async likeTrack(trackId: string): Promise<void> {
    await this.ensureAuthenticated()
    await this.makeRequest(`/me/tracks?ids=${trackId}`, { method: 'PUT' })
  }

  async unlikeTrack(trackId: string): Promise<void> {
    await this.ensureAuthenticated()
    await this.makeRequest(`/me/tracks?ids=${trackId}`, { method: 'DELETE' })
  }

  async getLikedTracks(): Promise<Track[]> {
    await this.ensureAuthenticated()
    const response = await this.makeRequest('/me/tracks')
    const data = await response.json()
    return data.items.map((item: any) => this.mapSpotifyTrack(item.track))
  }

  async downloadTrack(trackId: string, quality?: AudioQuality): Promise<Blob> {
    // Spottify doesn't allow direct downloads via Web API
    throw new Error('Download not supported by Spotify Web API')
  }

  async isTrackAvailable(trackId: string): Promise<boolean> {
    try {
      await this.getTrack(trackId)
      return true
    } catch {
      return false
    }
  }

  async getAvailableQualities(trackId: string): Promise<AudioQuality[]> {
    // Spottify Web API has limited quality options
    return ['medium', 'high']
  }

  // Event handling
  on(event: string, callback: (event: StreamingEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  off(event: string, callback: (event: StreamingEvent) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const streamingEvent: StreamingEvent = {
        type: event as any,
        data,
        timestamp: Date.now()
      }
      listeners.forEach(callback => callback(streamingEvent))
    }
  }

  // Private helper methods
  private async ensureAuthenticated(): Promise<void> {
    if (!this.authState.isAuthenticated || !this.authState.accessToken) {
      this.emit('authRequired', { provider: 'spotify' })
      throw new Error('Authentication required')
    }

    // Check if token is expired
    if (this.authState.expiresAt && this.authState.expiresAt <= new Date()) {
      await this.refreshAuth()
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      'Authorization': `Bearer ${this.authState.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    }

    const response = await fetch(url, { ...options, headers })
    
    if (!response.ok) {
      if (response.status === 401) {
        this.authState.isAuthenticated = false
        this.emit('authRequired', { provider: 'spotify' })
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    return response
  }

  private async getTrack(trackId: string): Promise<Track> {
    const response = await this.makeRequest(`/tracks/${trackId}`)
    const data = await response.json()
    return this.mapSpotifyTrack(data)
  }

  private mapSpotifyTrack(spotifyTrack: any): Track {
    return {
      id: spotifyTrack.id,
      title: spotifyTrack.name,
      artists: spotifyTrack.artists.map((artist: any) => ({
        id: artist.id,
        name: artist.name,
        image: artist.images?.[0]?.url
      })),
      album: {
        id: spotifyTrack.album.id,
        title: spotifyTrack.album.name,
        artist: spotifyTrack.album.artists[0]?.name || '',
        artwork: spotifyTrack.album.images?.[0]?.url || '',
        year: new Date(spotifyTrack.album.release_date).getFullYear(),
        trackCount: spotifyTrack.album.total_tracks
      },
      durationMs: spotifyTrack.duration_ms,
      artwork: spotifyTrack.album.images?.[0]?.url || '',
      previewUrl: spotifyTrack.preview_url,
      externalUrls: {
        spotify: spotifyTrack.external_urls?.spotify
      }
    }
  }

  private mapSpotifyAlbum(spotifyAlbum: any): Album {
    return {
      id: spotifyAlbum.id,
      title: spotifyAlbum.name,
      artist: spotifyAlbum.artists[0]?.name || '',
      artwork: spotifyAlbum.images?.[0]?.url || '',
      year: new Date(spotifyAlbum.release_date).getFullYear(),
      trackCount: spotifyAlbum.total_tracks,
      externalUrls: {
        spotify: spotifyAlbum.external_urls?.spotify
      }
    }
  }

  private mapSpotifyArtist(spotifyArtist: any): Artist {
    return {
      id: spotifyArtist.id,
      name: spotifyArtist.name,
      image: spotifyArtist.images?.[0]?.url,
      externalUrls: {
        spotify: spotifyArtist.external_urls?.spotify
      }
    }
  }

  private mapSpotifyPlaylist(spotifyPlaylist: any): Playlist {
    return {
      id: spotifyPlaylist.id,
      name: spotifyPlaylist.name,
      description: spotifyPlaylist.description,
      artwork: spotifyPlaylist.images?.[0]?.url,
      trackCount: spotifyPlaylist.tracks?.total || 0,
      isPublic: spotifyPlaylist.public,
      owner: spotifyPlaylist.owner?.display_name || spotifyPlaylist.owner?.id,
      externalUrls: {
        spotify: spotifyPlaylist.external_urls?.spotify
      }
    }
  }

  private getBitrateForQuality(quality: AudioQuality): number {
    switch (quality) {
      case 'low': return 128
      case 'medium': return 160
      case 'high': return 320
      case 'lossless': return 1411
      default: return 160
    }
  }
}

// Apple Music API SDK implementation
class AppleMusicSDK implements StreamingSDK {
  private config: StreamingConfig
  private authState: AuthState
  private eventListeners: Map<string, ((event: StreamingEvent) => void)[]> = new Map()
  private baseUrl = 'https://api.music.apple.com/v1'

  constructor() {
    this.authState = { isAuthenticated: false }
  }

  async initialize(config: StreamingConfig): Promise<void> {
    this.config = config
    
    // Load Apple Music JS SDK
    await this.loadAppleMusicSDK()
    
    this.emit('ready', { provider: 'apple' })
  }

  private async loadAppleMusicSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.MusicKit) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://js-cdn.music.apple.com/musickit/v1/musickit.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Apple Music SDK'))
      document.head.appendChild(script)
    })
  }

  async authenticate(): Promise<AuthState> {
    try {
      const musicKit = await window.MusicKit.configure({
        developerToken: this.config.apiKey!,
        app: {
          name: 'Music Streaming App',
          build: '1.0.0'
        }
      })

      const userToken = await musicKit.authorize()
      
      this.authState = {
        isAuthenticated: true,
        accessToken: userToken,
        user: {
          id: musicKit.userID,
          name: musicKit.userName
        }
      }

      return this.authState
    } catch (error) {
      this.authState.isAuthenticated = false
      throw error
    }
  }

  async refreshAuth(): Promise<AuthState> {
    // Apple Music handles token refresh automatically
    return this.authState
  }

  async search(query: string, types: string[], limit = 20, offset = 0): Promise<StreamingSearchResults> {
    await this.ensureAuthenticated()

    const musicKit = window.MusicKit.getInstance()
    const searchTypes = types.map(type => {
      switch (type) {
        case 'track': return 'songs'
        case 'album': return 'albums'
        case 'artist': return 'artists'
        case 'playlist': return 'playlists'
        default: return type
      }
    }).join(',')

    const results = await musicKit.api.search(query, {
      types: searchTypes,
      limit,
      offset
    })

    return {
      tracks: results.songs?.data?.map(this.mapAppleTrack) || [],
      albums: results.albums?.data?.map(this.mapAppleAlbum) || [],
      artists: results.artists?.data?.map(this.mapAppleArtist) || [],
      playlists: results.playlists?.data?.map(this.mapApplePlaylist) || [],
      total: results.songs?.meta?.total || 0,
      hasMore: (results.songs?.meta?.offset || 0) + (results.songs?.meta?.limit || 0) < (results.songs?.meta?.total || 0),
      nextOffset: offset + limit
    }
  }

  async getTrackStream(trackId: string, quality?: AudioQuality): Promise<StreamingTrackInfo> {
    await this.ensureAuthenticated()

    const musicKit = window.MusicKit.getInstance()
    const track = await musicKit.api.song(trackId)
    
    return {
      track: this.mapAppleTrack(track),
      streamUrl: track.attributes?.previews?.[0]?.url || '',
      quality: quality || this.config.quality,
      bitrate: this.getBitrateForQuality(quality || this.config.quality),
      duration: track.attributes?.durationInMillis ? track.attributes.durationInMillis / 1000 : 0,
      isDRMProtected: true, // Apple Music uses DRM
      isOfflineAvailable: false, // Would need Apple Music subscription
      expiresAt: new Date(Date.now() + 3600000) // 1 hour
    }
  }

  async getAlbum(albumId: string): Promise<Album> {
    await this.ensureAuthenticated()
    const musicKit = window.MusicKit.getInstance()
    const album = await musicKit.api.album(albumId)
    return this.mapAppleAlbum(album)
  }

  async getArtist(artistId: string): Promise<Artist> {
    await this.ensureAuthenticated()
    const musicKit = window.MusicKit.getInstance()
    const artist = await musicKit.api.artist(artistId)
    return this.mapAppleArtist(artist)
  }

  async getPlaylist(playlistId: string): Promise<Playlist> {
    await this.ensureAuthenticated()
    const musicKit = window.MusicKit.getInstance()
    const playlist = await musicKit.api.playlist(playlistId)
    return this.mapApplePlaylist(playlist)
  }

  async getUserPlaylists(): Promise<Playlist[]> {
    await this.ensureAuthenticated()
    const musicKit = window.MusicKit.getInstance()
    const playlists = await musicKit.api.library.playlists()
    return playlists.data.map(this.mapApplePlaylist)
  }

  async createPlaylist(name: string, description?: string): Promise<Playlist> {
    await this.ensureAuthenticated()
    const musicKit = window.MusicKit.getInstance()
    const playlist = await musicKit.api.library.createPlaylist(name, description)
    return this.mapApplePlaylist(playlist)
  }

  async addToPlaylist(playlistId: string, trackIds: string[]): Promise<void> {
    await this.ensureAuthenticated()
    const musicKit = window.MusicKit.getInstance()
    await musicKit.api.library.addToPlaylist(playlistId, trackIds)
  }

  async removeFromPlaylist(playlistId: string, trackIds: string[]): Promise<void> {
    await this.ensureAuthenticated()
    const musicKit = window.MusicKit.getInstance()
    await musicKit.api.library.removeFromPlaylist(playlistId, trackIds)
  }

  async likeTrack(trackId: string): Promise<void> {
    await this.ensureAuthenticated()
    const musicKit = window.MusicKit.getInstance()
    await musicKit.api.library.addToLibrary(trackId)
  }

  async unlikeTrack(trackId: string): Promise<void> {
    await this.ensureAuthenticated()
    const musicKit = window.MusicKit.getInstance()
    await musicKit.api.library.removeFromLibrary(trackId)
  }

  async getLikedTracks(): Promise<Track[]> {
    await this.ensureAuthenticated()
    const musicKit = window.MusicKit.getInstance()
    const tracks = await musicKit.api.library.songs()
    return tracks.data.map(this.mapAppleTrack)
  }

  async downloadTrack(trackId: string, quality?: AudioQuality): Promise<Blob> {
    // Apple Music doesn't allow direct downloads via API
    throw new Error('Download not supported by Apple Music API')
  }

  async isTrackAvailable(trackId: string): Promise<boolean> {
    try {
      await this.getTrack(trackId)
      return true
    } catch {
      return false
    }
  }

  async getAvailableQualities(trackId: string): Promise<AudioQuality[]> {
    // Apple Music has limited quality options
    return ['medium', 'high', 'lossless']
  }

  // Event handling
  on(event: string, callback: (event: StreamingEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  off(event: string, callback: (event: StreamingEvent) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const streamingEvent: StreamingEvent = {
        type: event as any,
        data,
        timestamp: Date.now()
      }
      listeners.forEach(callback => callback(streamingEvent))
    }
  }

  // Private helper methods
  private async ensureAuthenticated(): Promise<void> {
    if (!this.authState.isAuthenticated) {
      this.emit('authRequired', { provider: 'apple' })
      throw new Error('Authentication required')
    }
  }

  private async getTrack(trackId: string): Promise<any> {
    const musicKit = window.MusicKit.getInstance()
    return await musicKit.api.song(trackId)
  }

  private mapAppleTrack(appleTrack: any): Track {
    return {
      id: appleTrack.id,
      title: appleTrack.attributes?.name || '',
      artists: appleTrack.attributes?.artistName ? [{
        id: appleTrack.attributes?.artistId || '',
        name: appleTrack.attributes.artistName
      }] : [],
      album: {
        id: appleTrack.attributes?.albumId || '',
        title: appleTrack.attributes?.albumName || '',
        artist: appleTrack.attributes?.artistName || '',
        artwork: appleTrack.attributes?.artwork?.url || '',
        year: appleTrack.attributes?.releaseDate ? new Date(appleTrack.attributes.releaseDate).getFullYear() : 0,
        trackCount: 0
      },
      durationMs: appleTrack.attributes?.durationInMillis || 0,
      artwork: appleTrack.attributes?.artwork?.url || '',
      previewUrl: appleTrack.attributes?.previews?.[0]?.url,
      externalUrls: {
        appleMusic: appleTrack.attributes?.url
      }
    }
  }

  private mapAppleAlbum(appleAlbum: any): Album {
    return {
      id: appleAlbum.id,
      title: appleAlbum.attributes?.name || '',
      artist: appleAlbum.attributes?.artistName || '',
      artwork: appleAlbum.attributes?.artwork?.url || '',
      year: appleAlbum.attributes?.releaseDate ? new Date(appleAlbum.attributes.releaseDate).getFullYear() : 0,
      trackCount: appleAlbum.attributes?.trackCount || 0,
      externalUrls: {
        appleMusic: appleAlbum.attributes?.url
      }
    }
  }

  private mapAppleArtist(appleArtist: any): Artist {
    return {
      id: appleArtist.id,
      name: appleArtist.attributes?.name || '',
      image: appleArtist.attributes?.artwork?.url,
      externalUrls: {
        appleMusic: appleArtist.attributes?.url
      }
    }
  }

  private mapApplePlaylist(applePlaylist: any): Playlist {
    return {
      id: applePlaylist.id,
      name: applePlaylist.attributes?.name || '',
      description: applePlaylist.attributes?.description?.standard || '',
      artwork: applePlaylist.attributes?.artwork?.url,
      trackCount: applePlaylist.attributes?.trackCount || 0,
      isPublic: applePlaylist.attributes?.isPublic || false,
      owner: applePlaylist.attributes?.curatorName || applePlaylist.attributes?.ownerName,
      externalUrls: {
        appleMusic: applePlaylist.attributes?.url
      }
    }
  }

  private getBitrateForQuality(quality: AudioQuality): number {
    switch (quality) {
      case 'low': return 128
      case 'medium': return 256
      case 'high': return 320
      case 'lossless': return 1411
      default: return 256
    }
  }
}

// Mock SDK for development and testing
class MockSDK implements StreamingSDK {
  private config: StreamingConfig
  private authState: AuthState
  private eventListeners: Map<string, ((event: StreamingEvent) => void)[]> = new Map()

  constructor() {
    this.authState = { isAuthenticated: false }
  }

  async initialize(config: StreamingConfig): Promise<void> {
    this.config = config
    this.emit('ready', { provider: 'mock' })
  }

  async authenticate(): Promise<AuthState> {
    this.authState = {
      isAuthenticated: true,
      accessToken: 'mock-token',
      user: {
        id: 'mock-user',
        name: 'Mock User',
        email: 'mock@example.com'
      }
    }
    return this.authState
  }

  async refreshAuth(): Promise<AuthState> {
    return this.authState
  }

  async search(query: string, types: string[], limit = 20, offset = 0): Promise<StreamingSearchResults> {
    // Return mock search results
    return {
      tracks: [],
      albums: [],
      artists: [],
      playlists: [],
      total: 0,
      hasMore: false
    }
  }

  async getTrackStream(trackId: string, quality?: AudioQuality): Promise<StreamingTrackInfo> {
    throw new Error('Mock SDK - no real streaming available')
  }

  async getAlbum(albumId: string): Promise<Album> {
    throw new Error('Mock SDK - no real data available')
  }

  async getArtist(artistId: string): Promise<Artist> {
    throw new Error('Mock SDK - no real data available')
  }

  async getPlaylist(playlistId: string): Promise<Playlist> {
    throw new Error('Mock SDK - no real data available')
  }

  async getUserPlaylists(): Promise<Playlist[]> {
    return []
  }

  async createPlaylist(name: string, description?: string): Promise<Playlist> {
    throw new Error('Mock SDK - no real data available')
  }

  async addToPlaylist(playlistId: string, trackIds: string[]): Promise<void> {
    // Mock implementation
  }

  async removeFromPlaylist(playlistId: string, trackIds: string[]): Promise<void> {
    // Mock implementation
  }

  async likeTrack(trackId: string): Promise<void> {
    // Mock implementation
  }

  async unlikeTrack(trackId: string): Promise<void> {
    // Mock implementation
  }

  async getLikedTracks(): Promise<Track[]> {
    return []
  }

  async downloadTrack(trackId: string, quality?: AudioQuality): Promise<Blob> {
    throw new Error('Mock SDK - no real downloads available')
  }

  async isTrackAvailable(trackId: string): Promise<boolean> {
    return true
  }

  async getAvailableQualities(trackId: string): Promise<AudioQuality[]> {
    return ['low', 'medium', 'high']
  }

  // Event handling
  on(event: string, callback: (event: StreamingEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  off(event: string, callback: (event: StreamingEvent) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const streamingEvent: StreamingEvent = {
        type: event as any,
        data,
        timestamp: Date.now()
      }
      listeners.forEach(callback => callback(streamingEvent))
    }
  }
}

// Streaming SDK Factory
export class StreamingSDKFactory {
  static create(provider: StreamingProvider): StreamingSDK {
    switch (provider) {
      case 'spotify':
        return new SpotifySDK()
      case 'apple':
        return new AppleMusicSDK()
      case 'mock':
        return new MockSDK()
      default:
        throw new Error(`Unsupported streaming provider: ${provider}`)
    }
  }
}

// Global streaming SDK manager
export class StreamingSDKManager {
  private static instance: StreamingSDKManager
  private sdk: StreamingSDK | null = null
  private config: StreamingConfig | null = null

  static getInstance(): StreamingSDKManager {
    if (!StreamingSDKManager.instance) {
      StreamingSDKManager.instance = new StreamingSDKManager()
    }
    return StreamingSDKManager.instance
  }

  async initialize(config: StreamingConfig): Promise<void> {
    this.config = config
    this.sdk = StreamingSDKFactory.create(config.provider)
    
    try {
      await this.sdk.initialize(config)
    } catch (error) {
      errorHandler.handleError(error, {
        component: 'StreamingSDKManager',
        action: 'initialize',
        metadata: { provider: config.provider }
      })
      throw error
    }
  }

  getSDK(): StreamingSDK {
    if (!this.sdk) {
      throw new Error('Streaming SDK not initialized')
    }
    return this.sdk
  }

  getConfig(): StreamingConfig | null {
    return this.config
  }

  async switchProvider(provider: StreamingProvider, config: Partial<StreamingConfig>): Promise<void> {
    const newConfig: StreamingConfig = {
      ...this.config!,
      ...config,
      provider
    }
    
    await this.initialize(newConfig)
  }
}

// Export singleton instance
export const streamingSDKManager = StreamingSDKManager.getInstance()

// Export types and classes
export {
  StreamingSDK,
  SpotifySDK,
  AppleMusicSDK,
  MockSDK
}

// Global type declarations for external SDKs
declare global {
  interface Window {
    Spotify: any
    MusicKit: any
  }
}
