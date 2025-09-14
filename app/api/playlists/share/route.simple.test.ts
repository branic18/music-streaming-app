/**
 * Simplified unit tests for playlist sharing API
 */

import { NextRequest } from 'next/server'
import { POST, GET, DELETE, PUT, PATCH } from './route'

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

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn((length) => ({
    toString: jest.fn(() => 'a'.repeat(length * 2)) // hex string is 2x length
  }))
}))

describe('Playlist Sharing API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/playlists/share', () => {
    it('should create a share token for a valid playlist', async () => {
      const requestBody = {
        playlistId: 'playlist-1',
        expiresInHours: 24,
        maxAccess: 100,
        isPublic: true,
        allowDownload: false,
        allowComments: true
      }

      const request = new NextRequest('http://localhost:3000/api/playlists/share', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3000'
        }
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('token')
      expect(data.data).toHaveProperty('shareUrl')
      expect(data.data).toHaveProperty('expiresAt')
      expect(data.data).toHaveProperty('maxAccess', 100)
      expect(data.data).toHaveProperty('accessCount', 0)
      expect(data.data).toHaveProperty('playlist')
      expect(data.data.playlist.id).toBe('playlist-1')
    })

    it('should create a share token with default values', async () => {
      const requestBody = {
        playlistId: 'playlist-1'
      }

      const request = new NextRequest('http://localhost:3000/api/playlists/share', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.maxAccess).toBe(1000) // default value
    })

    it('should return error for non-existent playlist', async () => {
      const requestBody = {
        playlistId: 'non-existent-playlist'
      }

      const request = new NextRequest('http://localhost:3000/api/playlists/share', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Playlist not found')
    })

    it('should return error for invalid request body', async () => {
      const requestBody = {
        playlistId: '', // invalid empty string
        expiresInHours: -1, // invalid negative value
        maxAccess: 0 // invalid zero value
      }

      const request = new NextRequest('http://localhost:3000/api/playlists/share', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid request parameters')
      expect(data.details).toBeInstanceOf(Array)
    })

    it('should return error for missing playlist ID', async () => {
      const requestBody = {}

      const request = new NextRequest('http://localhost:3000/api/playlists/share', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid request parameters')
    })

    it('should return error for invalid expiry hours', async () => {
      const requestBody = {
        playlistId: 'playlist-1',
        expiresInHours: 24 * 31 // more than 30 days
      }

      const request = new NextRequest('http://localhost:3000/api/playlists/share', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid request parameters')
    })

    it('should return error for invalid max access', async () => {
      const requestBody = {
        playlistId: 'playlist-1',
        maxAccess: 10001 // more than 10000
      }

      const request = new NextRequest('http://localhost:3000/api/playlists/share', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid request parameters')
    })

    it('should include playlist metadata in response', async () => {
      const requestBody = {
        playlistId: 'playlist-1'
      }

      const request = new NextRequest('http://localhost:3000/api/playlists/share', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.playlist).toHaveProperty('id', 'playlist-1')
      expect(data.data.playlist).toHaveProperty('name', 'Classic Rock Hits')
      expect(data.data.playlist).toHaveProperty('description')
      expect(data.data.playlist).toHaveProperty('trackCount', 3)
      expect(data.data.playlist).toHaveProperty('totalDuration')
      expect(data.data.playlist).toHaveProperty('artwork')
    })

    it('should generate secure token', async () => {
      const requestBody = {
        playlistId: 'playlist-1'
      }

      const request = new NextRequest('http://localhost:3000/api/playlists/share', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.token).toBeDefined()
      expect(data.data.token).toHaveLength(64) // 32 bytes = 64 hex chars
    })

    it('should create share URL with correct format', async () => {
      const requestBody = {
        playlistId: 'playlist-1'
      }

      const request = new NextRequest('http://localhost:3000/api/playlists/share', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3000'
        }
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.shareUrl).toMatch(/^http:\/\/localhost:3000\/playlist\/[a-f0-9]{64}$/)
    })
  })

  describe('GET /api/playlists/share', () => {
    let shareToken: string

    beforeEach(async () => {
      // Create a share token for testing
      const requestBody = {
        playlistId: 'playlist-1',
        expiresInHours: 24,
        maxAccess: 10
      }

      const request = new NextRequest('http://localhost:3000/api/playlists/share', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()
      shareToken = data.data.token
    })

    it('should validate a valid token', async () => {
      const request = new NextRequest(`http://localhost:3000/api/playlists/share?token=${shareToken}&action=validate`)

      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.token).toBe(shareToken)
      expect(data.data.playlistId).toBe('playlist-1')
      expect(data.data.accessCount).toBe(0)
      expect(data.data.maxAccess).toBe(10)
    })

    it('should record access when action is access', async () => {
      const request = new NextRequest(`http://localhost:3000/api/playlists/share?token=${shareToken}&action=access`)

      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.message).toBe('Access recorded')
    })

    it('should return access statistics', async () => {
      const request = new NextRequest(`http://localhost:3000/api/playlists/share?token=${shareToken}&action=stats`)

      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('accessCount')
      expect(data.data).toHaveProperty('maxAccess')
      expect(data.data).toHaveProperty('remainingAccess')
      expect(data.data).toHaveProperty('expiresAt')
      expect(data.data).toHaveProperty('isExpired', false)
      expect(data.data).toHaveProperty('isAccessLimitReached', false)
    })

    it('should return error for missing token', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/share?action=validate')

      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Token is required')
    })

    it('should return error for invalid token', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/share?token=invalid-token&action=validate')

      const response = await GET(request)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid token')
    })

    it('should return error for invalid action', async () => {
      const request = new NextRequest(`http://localhost:3000/api/playlists/share?token=${shareToken}&action=invalid`)

      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid action')
    })

    it('should default to validate action when no action specified', async () => {
      const request = new NextRequest(`http://localhost:3000/api/playlists/share?token=${shareToken}`)

      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.token).toBe(shareToken)
    })
  })

  describe('DELETE /api/playlists/share', () => {
    let shareToken: string

    beforeEach(async () => {
      // Create a share token for testing
      const requestBody = {
        playlistId: 'playlist-1'
      }

      const request = new NextRequest('http://localhost:3000/api/playlists/share', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()
      shareToken = data.data.token
    })

    it('should delete a valid token', async () => {
      const request = new NextRequest(`http://localhost:3000/api/playlists/share?token=${shareToken}`)

      const response = await DELETE(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.message).toBe('Share token deleted successfully')
    })

    it('should return error for missing token', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/share')

      const response = await DELETE(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Token is required')
    })

    it('should return error for non-existent token', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/share?token=non-existent-token')

      const response = await DELETE(request)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Token not found')
    })

    it('should prevent access to deleted token', async () => {
      // Delete the token
      const deleteRequest = new NextRequest(`http://localhost:3000/api/playlists/share?token=${shareToken}`)
      await DELETE(deleteRequest)

      // Try to access the deleted token
      const getRequest = new NextRequest(`http://localhost:3000/api/playlists/share?token=${shareToken}&action=validate`)
      const response = await GET(getRequest)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid token')
    })
  })

  describe('Unsupported HTTP methods', () => {
    it('should return 405 for PUT requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/share', { method: 'PUT' })
      const response = await PUT(request)

      expect(response.status).toBe(405)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Method not allowed')
    })

    it('should return 405 for PATCH requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/share', { method: 'PATCH' })
      const response = await PATCH(request)

      expect(response.status).toBe(405)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Method not allowed')
    })
  })

  describe('Token validation and expiry', () => {
    it('should handle token expiry correctly', async () => {
      // Create a token with very short expiry
      const requestBody = {
        playlistId: 'playlist-1',
        expiresInHours: 0.001 // 3.6 seconds
      }

      const createRequest = new NextRequest('http://localhost:3000/api/playlists/share', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const createResponse = await POST(createRequest)
      const createData = await createResponse.json()
      const token = createData.data.token

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 4000))

      // Try to access expired token
      const getRequest = new NextRequest(`http://localhost:3000/api/playlists/share?token=${token}&action=validate`)
      const response = await GET(getRequest)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid token')
    })

    it('should handle access limit correctly', async () => {
      // Create a token with low access limit
      const requestBody = {
        playlistId: 'playlist-1',
        maxAccess: 2
      }

      const createRequest = new NextRequest('http://localhost:3000/api/playlists/share', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const createResponse = await POST(createRequest)
      const createData = await createResponse.json()
      const token = createData.data.token

      // Access the token twice (should reach limit)
      const accessRequest1 = new NextRequest(`http://localhost:3000/api/playlists/share?token=${token}&action=access`)
      await GET(accessRequest1)

      const accessRequest2 = new NextRequest(`http://localhost:3000/api/playlists/share?token=${token}&action=access`)
      await GET(accessRequest2)

      // Try to access again (should be blocked)
      const getRequest = new NextRequest(`http://localhost:3000/api/playlists/share?token=${token}&action=validate`)
      const response = await GET(getRequest)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid token')
    })
  })

  describe('Response headers and caching', () => {
    it('should include no-cache headers for POST responses', async () => {
      const requestBody = {
        playlistId: 'playlist-1'
      }

      const request = new NextRequest('http://localhost:3000/api/playlists/share', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(response.headers).toHaveProperty('Cache-Control')
      expect(response.headers['Cache-Control']).toBe('no-cache, no-store, must-revalidate')
    })

    it('should include timestamp in all responses', async () => {
      const requestBody = {
        playlistId: 'playlist-1'
      }

      const request = new NextRequest('http://localhost:3000/api/playlists/share', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.timestamp).toBeDefined()
      expect(new Date(data.timestamp)).toBeInstanceOf(Date)
    })
  })

  describe('Error handling', () => {
    it('should handle malformed JSON in POST request', async () => {
      const request = new NextRequest('http://localhost:3000/api/playlists/share', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle missing Content-Type header', async () => {
      const requestBody = {
        playlistId: 'playlist-1'
      }

      const request = new NextRequest('http://localhost:3000/api/playlists/share', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal server error')
    })
  })
})
