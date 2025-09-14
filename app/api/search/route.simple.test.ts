/**
 * Simplified unit tests for search API endpoint
 */

import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from './route'

// Mock NextResponse
const mockNextResponse = {
  json: jest.fn((data, options) => ({
    status: options?.status || 200,
    headers: options?.headers || {},
    json: () => Promise.resolve(data)
  }))
}

// Mock NextResponse.json
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

describe('Search API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/search', () => {
    it('should return search results for a valid query', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=queen')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(response.json()).resolves.toMatchObject({
        success: true,
        data: {
          tracks: expect.any(Array),
          albums: expect.any(Array),
          artists: expect.any(Array),
          playlists: expect.any(Array),
          totalResults: expect.any(Number),
          pagination: expect.any(Object)
        }
      })
    })

    it('should return tracks when searching for specific track', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=bohemian&type=tracks')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.tracks.length).toBeGreaterThan(0)
      expect(data.data.tracks[0].title).toContain('Bohemian')
    })

    it('should return albums when searching for specific album', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=night&type=albums')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.albums.length).toBeGreaterThan(0)
      expect(data.data.albums[0].title).toContain('Night')
    })

    it('should return artists when searching for specific artist', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=led&type=artists')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.artists.length).toBeGreaterThan(0)
      expect(data.data.artists[0].name).toContain('Led')
    })

    it('should return playlists when searching for specific playlist', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=classic&type=playlists')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.playlists.length).toBeGreaterThan(0)
      expect(data.data.playlists[0].name).toContain('Classic')
    })

    it('should handle pagination correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=rock&limit=2&offset=0')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.pagination.limit).toBe(2)
      expect(data.data.pagination.offset).toBe(0)
      expect(data.data.pagination.hasNext).toBe(true)
      expect(data.data.pagination.hasPrevious).toBe(false)
    })

    it('should sort results by popularity', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=rock&sortBy=popularity&sortOrder=desc')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      
      // Check that tracks are sorted by popularity (descending)
      const tracks = data.data.tracks
      if (tracks.length > 1) {
        expect(tracks[0].popularity).toBeGreaterThanOrEqual(tracks[1].popularity)
      }
    })

    it('should sort results by name', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=rock&sortBy=name&sortOrder=asc')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      
      // Check that tracks are sorted by name (ascending)
      const tracks = data.data.tracks
      if (tracks.length > 1) {
        expect(tracks[0].title.localeCompare(tracks[1].title)).toBeLessThanOrEqual(0)
      }
    })

    it('should filter by genre', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=rock&genre=progressive')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      
      // Check that all returned tracks have progressive rock genre
      const tracks = data.data.tracks
      tracks.forEach((track: any) => {
        expect(track.genres).toContain('Progressive Rock')
      })
    })

    it('should filter by year', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=rock&year=1975')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      
      // Check that all returned albums are from 1975
      const albums = data.data.albums
      albums.forEach((album: any) => {
        expect(album.year).toBe(1975)
      })
    })

    it('should filter by duration range', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=rock&durationMin=300&durationMax=400')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      
      // Check that all returned tracks are within duration range
      const tracks = data.data.tracks
      tracks.forEach((track: any) => {
        const durationSeconds = track.durationMs / 1000
        expect(durationSeconds).toBeGreaterThanOrEqual(300)
        expect(durationSeconds).toBeLessThanOrEqual(400)
      })
    })

    it('should filter by explicit content', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=rock&explicit=true')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      
      // Check that all returned tracks are explicit
      const tracks = data.data.tracks
      tracks.forEach((track: any) => {
        expect(track.explicit).toBe(true)
      })
    })

    it('should return empty results for non-matching query', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=nonexistent')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.totalResults).toBe(0)
      expect(data.data.tracks.length).toBe(0)
      expect(data.data.albums.length).toBe(0)
      expect(data.data.artists.length).toBe(0)
      expect(data.data.playlists.length).toBe(0)
    })

    it('should handle case-insensitive search', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=QUEEN')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.totalResults).toBeGreaterThan(0)
    })

    it('should handle partial matches', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=bohem')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.totalResults).toBeGreaterThan(0)
    })

    it('should return error for empty query', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid query parameters')
    })

    it('should return error for invalid limit', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=rock&limit=101')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid query parameters')
    })

    it('should return error for negative offset', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=rock&offset=-1')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid query parameters')
    })

    it('should return error for invalid sortBy', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=rock&sortBy=invalid')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid query parameters')
    })

    it('should return error for invalid sortOrder', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=rock&sortOrder=invalid')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid query parameters')
    })

    it('should return error for invalid type', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=rock&type=invalid')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid query parameters')
    })

    it('should include cache headers in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=rock')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(response.headers).toHaveProperty('Cache-Control')
      expect(response.headers['Cache-Control']).toBe('public, max-age=300')
    })

    it('should include timestamp in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=rock')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.timestamp).toBeDefined()
      expect(new Date(data.timestamp)).toBeInstanceOf(Date)
    })
  })

  describe('Unsupported HTTP methods', () => {
    it('should return 405 for POST requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/search', { method: 'POST' })
      const response = await POST(request)

      expect(response.status).toBe(405)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Method not allowed')
    })

    it('should return 405 for PUT requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/search', { method: 'PUT' })
      const response = await PUT(request)

      expect(response.status).toBe(405)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Method not allowed')
    })

    it('should return 405 for DELETE requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/search', { method: 'DELETE' })
      const response = await DELETE(request)

      expect(response.status).toBe(405)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Method not allowed')
    })
  })

  describe('Search functionality', () => {
    it('should search across multiple fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=california')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.totalResults).toBeGreaterThan(0)
    })

    it('should handle special characters in query', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=child%20o%27%20mine')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.totalResults).toBeGreaterThan(0)
    })

    it('should handle multiple word queries', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=hotel%20california')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.totalResults).toBeGreaterThan(0)
    })

    it('should return relevant results based on query', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=zeppelin')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      
      // Check that results contain "zeppelin" in some form
      const allResults = [
        ...data.data.tracks,
        ...data.data.albums,
        ...data.data.artists,
        ...data.data.playlists
      ]
      
      const hasZeppelinResult = allResults.some((result: any) => 
        (result.title || result.name || '').toLowerCase().includes('zeppelin') ||
        (result.artists || []).some((artist: string) => artist.toLowerCase().includes('zeppelin'))
      )
      
      expect(hasZeppelinResult).toBe(true)
    })
  })

  describe('Pagination', () => {
    it('should handle offset correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=rock&limit=1&offset=1')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.pagination.offset).toBe(1)
      expect(data.data.pagination.hasPrevious).toBe(true)
    })

    it('should calculate hasNext correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=rock&limit=1&offset=0')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.pagination.hasNext).toBe(data.data.totalResults > 1)
    })

    it('should calculate hasPrevious correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=rock&limit=1&offset=1')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.pagination.hasPrevious).toBe(true)
    })
  })

  describe('Error handling', () => {
    it('should handle malformed URLs gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?invalid=param')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid query parameters')
    })

    it('should handle missing query parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/search')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid query parameters')
    })
  })
})
