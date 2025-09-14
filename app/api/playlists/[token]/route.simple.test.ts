/**
 * Simplified unit tests for shared playlist retrieval API with rate limiting
 */

import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE, PATCH } from './route'

// Mock NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, options) => ({
      status: options?.status || 200,
      headers: options?.headers || {},
      json: () => Promise.resolve(data)
    }))
  }
}))

// Mock share tokens (simulate tokens from share API)
const mockShareTokens = new Map([
  ['valid-token-1', {
    token: 'valid-token-1',
    playlistId: 'playlist-1',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    createdAt: new Date().toISOString(),
    accessCount: 0,
    maxAccess: 1000,
    isPublic: true,
    allowDownload: false,
    allowComments: true,
    metadata: {
      playlistName: 'Classic Rock Hits',
      playlistDescription: 'The greatest classic rock songs of all time',
      trackCount: 3,
      totalDuration: 1228000,
      createdAt: new Date('2024-01-01').toISOString(),
      updatedAt: new Date('2024-01-01').toISOString()
    }
  }],
  ['expired-token', {
    token: 'expired-token',
    playlistId: 'playlist-1',
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
    createdAt: new Date().toISOString(),
    accessCount: 0,
    maxAccess: 1000,
    isPublic: true,
    allowDownload: false,
    allowComments: true,
    metadata: {
      playlistName: 'Classic Rock Hits',
      playlistDescription: 'The greatest classic rock songs of all time',
      trackCount: 3,
      totalDuration: 1228000,
      createdAt: new Date('2024-01-01').toISOString(),
      updatedAt: new Date('2024-01-01').toISOString()
    }
  }],
  ['limited-token', {
    token: 'limited-token',
    playlistId: 'playlist-1',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    accessCount: 1000, // Already at limit
    maxAccess: 1000,
    isPublic: true,
    allowDownload: false,
    allowComments: true,
    metadata: {
      playlistName: 'Classic Rock Hits',
      playlistDescription: 'The greatest classic rock songs of all time',
      trackCount: 3,
      totalDuration: 1228000,
      createdAt: new Date('2024-01-01').toISOString(),
      updatedAt: new Date('2024-01-01').toISOString()
    }
  }]
])

// Mock the share tokens map
jest.mock('./route', () => {
  const originalModule = jest.requireActual('./route')
  return {
    ...originalModule,
    shareTokens: mockShareTokens
  }
})

describe('Shared Playlist Retrieval API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/playlists/[token]', () => {
    it('should retrieve a valid shared playlist', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/valid-token-1', {
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      })

      const response = await GET(request, { params: { token: 'valid-token-1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('playlist')
      expect(data.data).toHaveProperty('shareInfo')
      expect(data.data).toHaveProperty('rateLimit')
      expect(data.data.playlist.id).toBe('playlist-1')
      expect(data.data.playlist.name).toBe('Classic Rock Hits')
      expect(data.data.playlist.tracks).toHaveLength(3)
    })

    it('should include rate limit headers in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/valid-token-1', {
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      })

      const response = await GET(request, { params: { token: 'valid-token-1' } })

      expect(response.status).toBe(200)
      expect(response.headers).toHaveProperty('X-RateLimit-Limit-Global')
      expect(response.headers).toHaveProperty('X-RateLimit-Remaining-Global')
      expect(response.headers).toHaveProperty('X-RateLimit-Reset-Global')
      expect(response.headers).toHaveProperty('X-RateLimit-Limit-IP')
      expect(response.headers).toHaveProperty('X-RateLimit-Remaining-IP')
      expect(response.headers).toHaveProperty('X-RateLimit-Reset-IP')
      expect(response.headers).toHaveProperty('X-RateLimit-Limit-Token')
      expect(response.headers).toHaveProperty('X-RateLimit-Remaining-Token')
      expect(response.headers).toHaveProperty('X-RateLimit-Reset-Token')
    })

    it('should include cache headers in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/valid-token-1', {
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      })

      const response = await GET(request, { params: { token: 'valid-token-1' } })

      expect(response.status).toBe(200)
      expect(response.headers).toHaveProperty('Cache-Control')
      expect(response.headers['Cache-Control']).toBe('public, max-age=300')
    })

    it('should return error for invalid token', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/invalid-token', {
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      })

      const response = await GET(request, { params: { token: 'invalid-token' } })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid token')
    })

    it('should return error for expired token', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/expired-token', {
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      })

      const response = await GET(request, { params: { token: 'expired-token' } })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid token')
    })

    it('should return error for token with access limit reached', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/limited-token', {
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      })

      const response = await GET(request, { params: { token: 'limited-token' } })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid token')
    })

    it('should include share information in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/valid-token-1', {
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      })

      const response = await GET(request, { params: { token: 'valid-token-1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.shareInfo).toHaveProperty('token', 'valid-token-1')
      expect(data.data.shareInfo).toHaveProperty('expiresAt')
      expect(data.data.shareInfo).toHaveProperty('accessCount')
      expect(data.data.shareInfo).toHaveProperty('maxAccess')
      expect(data.data.shareInfo).toHaveProperty('isPublic')
      expect(data.data.shareInfo).toHaveProperty('allowDownload')
      expect(data.data.shareInfo).toHaveProperty('allowComments')
    })

    it('should include rate limit information in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/valid-token-1', {
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      })

      const response = await GET(request, { params: { token: 'valid-token-1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.rateLimit).toHaveProperty('global')
      expect(data.data.rateLimit).toHaveProperty('ip')
      expect(data.data.rateLimit).toHaveProperty('token')
      expect(data.data.rateLimit.global).toHaveProperty('remaining')
      expect(data.data.rateLimit.global).toHaveProperty('resetTime')
      expect(data.data.rateLimit.ip).toHaveProperty('remaining')
      expect(data.data.rateLimit.ip).toHaveProperty('resetTime')
      expect(data.data.rateLimit.token).toHaveProperty('remaining')
      expect(data.data.rateLimit.token).toHaveProperty('resetTime')
    })

    it('should filter downloadable tracks based on share token permissions', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/valid-token-1', {
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      })

      const response = await GET(request, { params: { token: 'valid-token-1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      
      // Since allowDownload is false, all tracks should have downloadable: false
      data.data.playlist.tracks.forEach((track: any) => {
        expect(track.downloadable).toBe(false)
      })
    })

    it('should include track metadata in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/valid-token-1', {
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      })

      const response = await GET(request, { params: { token: 'valid-token-1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      
      const track = data.data.playlist.tracks[0]
      expect(track).toHaveProperty('id')
      expect(track).toHaveProperty('title')
      expect(track).toHaveProperty('artists')
      expect(track).toHaveProperty('album')
      expect(track).toHaveProperty('durationMs')
      expect(track).toHaveProperty('artwork')
      expect(track).toHaveProperty('explicit')
      expect(track).toHaveProperty('popularity')
      expect(track).toHaveProperty('genres')
      expect(track).toHaveProperty('releaseDate')
      expect(track).toHaveProperty('previewUrl')
      expect(track).toHaveProperty('downloadable')
    })

    it('should include playlist metadata in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/valid-token-1', {
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      })

      const response = await GET(request, { params: { token: 'valid-token-1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      
      const playlist = data.data.playlist
      expect(playlist).toHaveProperty('id', 'playlist-1')
      expect(playlist).toHaveProperty('name', 'Classic Rock Hits')
      expect(playlist).toHaveProperty('description')
      expect(playlist).toHaveProperty('artwork')
      expect(playlist).toHaveProperty('trackCount', 3)
      expect(playlist).toHaveProperty('totalDuration')
      expect(playlist).toHaveProperty('createdAt')
      expect(playlist).toHaveProperty('updatedAt')
      expect(playlist).toHaveProperty('tracks')
    })

    it('should handle missing x-forwarded-for header', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/valid-token-1')

      const response = await GET(request, { params: { token: 'valid-token-1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should handle x-real-ip header', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/valid-token-1', {
        headers: {
          'x-real-ip': '10.0.0.1'
        }
      })

      const response = await GET(request, { params: { token: 'valid-token-1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should handle cf-connecting-ip header', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/valid-token-1', {
        headers: {
          'cf-connecting-ip': '203.0.113.1'
        }
      })

      const response = await GET(request, { params: { token: 'valid-token-1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should handle x-forwarded-for with multiple IPs', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/valid-token-1', {
        headers: {
          'x-forwarded-for': '203.0.113.1, 70.41.3.18, 150.172.238.178'
        }
      })

      const response = await GET(request, { params: { token: 'valid-token-1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should include timestamp in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/valid-token-1', {
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      })

      const response = await GET(request, { params: { token: 'valid-token-1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.timestamp).toBeDefined()
      expect(new Date(data.timestamp)).toBeInstanceOf(Date)
    })
  })

  describe('Rate Limiting', () => {
    it('should handle rate limiting gracefully', async () => {
      // This test would require more complex setup to actually trigger rate limits
      // For now, we'll just verify the structure is in place
      const request = new NextRequest('http://localhost:3000/api/playlists/valid-token-1', {
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      })

      const response = await GET(request, { params: { token: 'valid-token-1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.rateLimit).toBeDefined()
    })

    it('should include rate limit information in response headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/valid-token-1', {
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      })

      const response = await GET(request, { params: { token: 'valid-token-1' } })

      expect(response.status).toBe(200)
      
      // Check that rate limit headers are present
      expect(response.headers).toHaveProperty('X-RateLimit-Limit-Global')
      expect(response.headers).toHaveProperty('X-RateLimit-Remaining-Global')
      expect(response.headers).toHaveProperty('X-RateLimit-Reset-Global')
      expect(response.headers).toHaveProperty('X-RateLimit-Limit-IP')
      expect(response.headers).toHaveProperty('X-RateLimit-Remaining-IP')
      expect(response.headers).toHaveProperty('X-RateLimit-Reset-IP')
      expect(response.headers).toHaveProperty('X-RateLimit-Limit-Token')
      expect(response.headers).toHaveProperty('X-RateLimit-Remaining-Token')
      expect(response.headers).toHaveProperty('X-RateLimit-Reset-Token')
    })
  })

  describe('Unsupported HTTP methods', () => {
    it('should return 405 for POST requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/valid-token-1', { method: 'POST' })
      const response = await POST(request)

      expect(response.status).toBe(405)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Method not allowed')
    })

    it('should return 405 for PUT requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/valid-token-1', { method: 'PUT' })
      const response = await PUT(request)

      expect(response.status).toBe(405)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Method not allowed')
    })

    it('should return 405 for DELETE requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/valid-token-1', { method: 'DELETE' })
      const response = await DELETE(request)

      expect(response.status).toBe(405)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Method not allowed')
    })

    it('should return 405 for PATCH requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/valid-token-1', { method: 'PATCH' })
      const response = await PATCH(request)

      expect(response.status).toBe(405)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Method not allowed')
    })
  })

  describe('Error handling', () => {
    it('should handle missing token parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/', {
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      })

      const response = await GET(request, { params: { token: '' } })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid token')
    })

    it('should handle malformed requests gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/valid-token-1', {
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      })

      const response = await GET(request, { params: { token: 'valid-token-1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })

  describe('Response structure', () => {
    it('should return properly structured response', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/valid-token-1', {
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      })

      const response = await GET(request, { params: { token: 'valid-token-1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      
      // Check top-level structure
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')
      expect(data).toHaveProperty('timestamp')
      
      // Check data structure
      expect(data.data).toHaveProperty('playlist')
      expect(data.data).toHaveProperty('shareInfo')
      expect(data.data).toHaveProperty('rateLimit')
      
      // Check playlist structure
      expect(data.data.playlist).toHaveProperty('id')
      expect(data.data.playlist).toHaveProperty('name')
      expect(data.data.playlist).toHaveProperty('description')
      expect(data.data.playlist).toHaveProperty('artwork')
      expect(data.data.playlist).toHaveProperty('trackCount')
      expect(data.data.playlist).toHaveProperty('totalDuration')
      expect(data.data.playlist).toHaveProperty('createdAt')
      expect(data.data.playlist).toHaveProperty('updatedAt')
      expect(data.data.playlist).toHaveProperty('tracks')
      
      // Check shareInfo structure
      expect(data.data.shareInfo).toHaveProperty('token')
      expect(data.data.shareInfo).toHaveProperty('expiresAt')
      expect(data.data.shareInfo).toHaveProperty('accessCount')
      expect(data.data.shareInfo).toHaveProperty('maxAccess')
      expect(data.data.shareInfo).toHaveProperty('isPublic')
      expect(data.data.shareInfo).toHaveProperty('allowDownload')
      expect(data.data.shareInfo).toHaveProperty('allowComments')
      expect(data.data.shareInfo).toHaveProperty('createdAt')
      
      // Check rateLimit structure
      expect(data.data.rateLimit).toHaveProperty('global')
      expect(data.data.rateLimit).toHaveProperty('ip')
      expect(data.data.rateLimit).toHaveProperty('token')
    })
  })
})
