/**
 * Search suggestions API endpoint
 * Provides autocomplete suggestions for search queries
 */

import { NextRequest, NextResponse } from 'next/server'
import { suggestionsQuerySchema } from '@/lib/validation/schemas'
import { SearchSuggestion } from '@/lib/search/types'

// Mock suggestions data (in production, this would come from a database or external API)
const mockSuggestions: SearchSuggestion[] = [
  // Popular tracks
  { id: 'suggestion-1', text: 'Bohemian Rhapsody', type: 'track', popularity: 95 },
  { id: 'suggestion-2', text: 'Hotel California', type: 'track', popularity: 92 },
  { id: 'suggestion-3', text: 'Stairway to Heaven', type: 'track', popularity: 98 },
  { id: 'suggestion-4', text: 'Sweet Child O\' Mine', type: 'track', popularity: 94 },
  { id: 'suggestion-5', text: 'Smells Like Teen Spirit', type: 'track', popularity: 96 },
  
  // Popular albums
  { id: 'suggestion-6', text: 'A Night at the Opera', type: 'album', popularity: 95 },
  { id: 'suggestion-7', text: 'Hotel California', type: 'album', popularity: 92 },
  { id: 'suggestion-8', text: 'Led Zeppelin IV', type: 'album', popularity: 98 },
  { id: 'suggestion-9', text: 'Appetite for Destruction', type: 'album', popularity: 94 },
  { id: 'suggestion-10', text: 'Nevermind', type: 'album', popularity: 96 },
  
  // Popular artists
  { id: 'suggestion-11', text: 'Queen', type: 'artist', popularity: 95 },
  { id: 'suggestion-12', text: 'Eagles', type: 'artist', popularity: 92 },
  { id: 'suggestion-13', text: 'Led Zeppelin', type: 'artist', popularity: 98 },
  { id: 'suggestion-14', text: 'Guns N\' Roses', type: 'artist', popularity: 94 },
  { id: 'suggestion-15', text: 'Nirvana', type: 'artist', popularity: 96 },
  
  // Popular genres
  { id: 'suggestion-16', text: 'Rock', type: 'genre', popularity: 90 },
  { id: 'suggestion-17', text: 'Pop', type: 'genre', popularity: 85 },
  { id: 'suggestion-18', text: 'Hip-Hop', type: 'genre', popularity: 80 },
  { id: 'suggestion-19', text: 'Country', type: 'genre', popularity: 75 },
  { id: 'suggestion-20', text: 'Jazz', type: 'genre', popularity: 70 },
]

// Function to get search suggestions
function getSuggestions(query: string, limit: number): SearchSuggestion[] {
  const normalizedQuery = query.toLowerCase().trim()
  
  if (!normalizedQuery) {
    return []
  }

  // Filter suggestions that match the query
  const matchingSuggestions = mockSuggestions.filter(suggestion =>
    suggestion.text.toLowerCase().includes(normalizedQuery)
  )

  // Sort by popularity (descending) and then by relevance
  const sortedSuggestions = matchingSuggestions.sort((a, b) => {
    // First sort by popularity
    if (b.popularity !== a.popularity) {
      return (b.popularity || 0) - (a.popularity || 0)
    }
    
    // Then sort by how early the match occurs in the text
    const aIndex = a.text.toLowerCase().indexOf(normalizedQuery)
    const bIndex = b.text.toLowerCase().indexOf(normalizedQuery)
    
    if (aIndex !== bIndex) {
      return aIndex - bIndex
    }
    
    // Finally sort alphabetically
    return a.text.localeCompare(b.text)
  })

  // Limit results
  return sortedSuggestions.slice(0, limit)
}

// API route handler
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || ''
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10

    // Validate parameters
    const validationResult = suggestionsQuerySchema.safeParse({ query, limit })
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 })
    }

    const { query: validatedQuery, limit: validatedLimit } = validationResult.data

    // Get suggestions
    const suggestions = getSuggestions(validatedQuery, validatedLimit)

    // Create response
    const response = {
      success: true,
      data: {
        suggestions,
        query: validatedQuery,
        total: suggestions.length
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Search suggestions API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed',
    details: 'Only GET requests are supported for search suggestions'
  }, { status: 405 })
}
