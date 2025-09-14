/**
 * Next.js middleware for rate limiting and geo-fencing
 * Handles request filtering, rate limiting, and geographic restrictions
 */

import { NextRequest, NextResponse } from 'next/server'

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  // Global rate limits
  GLOBAL: {
    requests: 10000, // requests per window
    window: 60 * 1000, // 1 minute in milliseconds
    burst: 100 // burst requests allowed
  },
  // Per IP rate limits
  IP: {
    requests: 1000, // requests per window
    window: 15 * 60 * 1000, // 15 minutes in milliseconds
    burst: 50 // burst requests allowed
  },
  // Per user rate limits (when authenticated)
  USER: {
    requests: 5000, // requests per window
    window: 15 * 60 * 1000, // 15 minutes in milliseconds
    burst: 100 // burst requests allowed
  },
  // API-specific rate limits
  API: {
    requests: 500, // requests per window
    window: 15 * 60 * 1000, // 15 minutes in milliseconds
    burst: 25 // burst requests allowed
  }
}

// Geo-fencing configuration
const GEO_FENCING_CONFIG = {
  // Allowed countries (ISO 3166-1 alpha-2 codes)
  ALLOWED_COUNTRIES: [
    'US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI',
    'CH', 'AT', 'BE', 'IE', 'PT', 'LU', 'IS', 'LI', 'MT', 'CY', 'EE', 'LV', 'LT',
    'PL', 'CZ', 'SK', 'HU', 'SI', 'HR', 'BG', 'RO', 'GR', 'JP', 'KR', 'SG', 'NZ'
  ],
  // Blocked countries
  BLOCKED_COUNTRIES: [
    // Add any countries that should be blocked
  ],
  // Special handling for certain countries
  RESTRICTED_COUNTRIES: {
    // Countries with limited features
    'CN': { features: ['streaming'], message: 'Limited streaming available' },
    'RU': { features: ['streaming'], message: 'Limited streaming available' },
    'IN': { features: ['premium'], message: 'Premium features limited' }
  }
}

// Rate limiting storage
interface RateLimitEntry {
  count: number
  resetTime: number
  burstCount: number
  burstResetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Geo-location cache
const geoLocationCache = new Map<string, { country: string; timestamp: number }>()
const GEO_CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

// Utility functions
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  const cfCountry = request.headers.get('cf-ipcountry')
  
  // Store country in cache if available from Cloudflare
  if (cfCountry && cfCountry !== 'XX') {
    geoLocationCache.set('current', {
      country: cfCountry,
      timestamp: Date.now()
    })
  }
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()
  
  return '127.0.0.1'
}

function getUserId(request: NextRequest): string | null {
  // Try to get user ID from various sources
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // In a real implementation, you would decode the JWT token
    // For now, we'll extract a simple user ID
    const token = authHeader.substring(7)
    if (token.length > 10) {
      return `user_${token.substring(0, 8)}`
    }
  }
  
  const userId = request.headers.get('x-user-id')
  if (userId) return userId
  
  return null
}

function getCountryFromIP(ip: string): Promise<string> {
  // Check cache first
  const cached = geoLocationCache.get(ip)
  if (cached && Date.now() - cached.timestamp < GEO_CACHE_DURATION) {
    return Promise.resolve(cached.country)
  }
  
  // In a real implementation, you would use a geo-location service
  // For now, we'll use a mock implementation
  return new Promise((resolve) => {
    // Mock geo-location based on IP patterns
    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      resolve('US') // Local/private IPs default to US
    } else if (ip.startsWith('127.')) {
      resolve('US') // Localhost
    } else {
      // Mock different countries based on IP patterns
      const hash = ip.split('.').reduce((acc, part) => acc + parseInt(part), 0)
      const countries = ['US', 'CA', 'GB', 'DE', 'FR', 'JP', 'AU', 'BR', 'IN', 'CN']
      const country = countries[hash % countries.length]
      
      // Cache the result
      geoLocationCache.set(ip, {
        country,
        timestamp: Date.now()
      })
      
      resolve(country)
    }
  })
}

function checkRateLimit(
  key: string,
  config: { requests: number; window: number; burst: number }
): { allowed: boolean; remaining: number; resetTime: number; retryAfter?: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)
  
  if (!entry) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.window,
      burstCount: 1,
      burstResetTime: now + 1000 // 1 second burst window
    }
    rateLimitStore.set(key, newEntry)
    
    return {
      allowed: true,
      remaining: config.requests - 1,
      resetTime: newEntry.resetTime
    }
  }
  
  // Check if window has expired
  if (now > entry.resetTime) {
    entry.count = 1
    entry.resetTime = now + config.window
    entry.burstCount = 1
    entry.burstResetTime = now + 1000
    
    return {
      allowed: true,
      remaining: config.requests - 1,
      resetTime: entry.resetTime
    }
  }
  
  // Check burst limit
  if (now < entry.burstResetTime) {
    if (entry.burstCount >= config.burst) {
      return {
        allowed: false,
        remaining: config.requests - entry.count,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.burstResetTime - now) / 1000)
      }
    }
    entry.burstCount++
  } else {
    entry.burstCount = 1
    entry.burstResetTime = now + 1000
  }
  
  // Check main rate limit
  if (entry.count >= config.requests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000)
    }
  }
  
  entry.count++
  
  return {
    allowed: true,
    remaining: config.requests - entry.count,
    resetTime: entry.resetTime
  }
}

function cleanupExpiredRateLimits(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

function cleanupExpiredGeoCache(): void {
  const now = Date.now()
  for (const [key, entry] of geoLocationCache.entries()) {
    if (now - entry.timestamp > GEO_CACHE_DURATION) {
      geoLocationCache.delete(key)
    }
  }
}

function isAPIRoute(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

function isStaticRoute(pathname: string): boolean {
  return pathname.startsWith('/_next/') || 
         pathname.startsWith('/favicon.ico') ||
         pathname.startsWith('/robots.txt') ||
         pathname.startsWith('/sitemap.xml') ||
         pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)
}

function shouldSkipMiddleware(pathname: string): boolean {
  // Skip middleware for static assets and Next.js internals
  return isStaticRoute(pathname) || pathname === '/health'
}

// Main middleware function
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const clientIP = getClientIP(request)
  const userId = getUserId(request)
  
  // Skip middleware for static assets and health checks
  if (shouldSkipMiddleware(pathname)) {
    return NextResponse.next()
  }
  
  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance
    cleanupExpiredRateLimits()
    cleanupExpiredGeoCache()
  }
  
  // Geo-fencing check
  try {
    const country = await getCountryFromIP(clientIP)
    
    // Check if country is blocked
    if (GEO_FENCING_CONFIG.BLOCKED_COUNTRIES.includes(country)) {
      return new NextResponse(
        JSON.stringify({
          error: 'Access denied',
          message: 'Service not available in your region',
          country
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'X-Blocked-Country': country
          }
        }
      )
    }
    
    // Check if country is restricted
    const restrictions = GEO_FENCING_CONFIG.RESTRICTED_COUNTRIES[country as keyof typeof GEO_FENCING_CONFIG.RESTRICTED_COUNTRIES]
    if (restrictions) {
      // Add restriction headers for the application to handle
      const response = NextResponse.next()
      response.headers.set('X-Country-Restrictions', JSON.stringify(restrictions))
      response.headers.set('X-User-Country', country)
      return response
    }
    
    // Add country header for allowed countries
    const response = NextResponse.next()
    response.headers.set('X-User-Country', country)
    return response
    
  } catch (error) {
    console.error('Geo-fencing error:', error)
    // Continue with request if geo-fencing fails
  }
  
  // Rate limiting checks
  const rateLimitChecks = []
  
  // Global rate limit
  const globalKey = 'global'
  const globalLimit = checkRateLimit(globalKey, RATE_LIMIT_CONFIG.GLOBAL)
  rateLimitChecks.push({ type: 'global', limit: globalLimit })
  
  // IP-based rate limit
  const ipKey = `ip:${clientIP}`
  const ipLimit = checkRateLimit(ipKey, RATE_LIMIT_CONFIG.IP)
  rateLimitChecks.push({ type: 'ip', limit: ipLimit })
  
  // User-based rate limit (if authenticated)
  if (userId) {
    const userKey = `user:${userId}`
    const userLimit = checkRateLimit(userKey, RATE_LIMIT_CONFIG.USER)
    rateLimitChecks.push({ type: 'user', limit: userLimit })
  }
  
  // API-specific rate limit
  if (isAPIRoute(pathname)) {
    const apiKey = `api:${clientIP}`
    const apiLimit = checkRateLimit(apiKey, RATE_LIMIT_CONFIG.API)
    rateLimitChecks.push({ type: 'api', limit: apiLimit })
  }
  
  // Check if any rate limit is exceeded
  const exceededLimit = rateLimitChecks.find(check => !check.limit.allowed)
  if (exceededLimit) {
    const { limit } = exceededLimit
    
    return new NextResponse(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again later.`,
        type: exceededLimit.type,
        retryAfter: limit.retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': limit.retryAfter?.toString() || '60',
          'X-RateLimit-Limit': RATE_LIMIT_CONFIG[exceededLimit.type.toUpperCase() as keyof typeof RATE_LIMIT_CONFIG].requests.toString(),
          'X-RateLimit-Remaining': limit.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(limit.resetTime / 1000).toString(),
          'X-RateLimit-Type': exceededLimit.type
        }
      }
    )
  }
  
  // Create response with rate limit headers
  const response = NextResponse.next()
  
  // Add rate limit headers for the most restrictive limit
  const mostRestrictive = rateLimitChecks.reduce((prev, current) => 
    current.limit.remaining < prev.limit.remaining ? current : prev
  )
  
  response.headers.set('X-RateLimit-Limit', RATE_LIMIT_CONFIG[mostRestrictive.type.toUpperCase() as keyof typeof RATE_LIMIT_CONFIG].requests.toString())
  response.headers.set('X-RateLimit-Remaining', mostRestrictive.limit.remaining.toString())
  response.headers.set('X-RateLimit-Reset', Math.ceil(mostRestrictive.limit.resetTime / 1000).toString())
  response.headers.set('X-RateLimit-Type', mostRestrictive.type)
  
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Add CORS headers for API routes
  if (isAPIRoute(pathname)) {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-ID')
    response.headers.set('Access-Control-Max-Age', '86400')
  }
  
  return response
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt (robots file)
     * - sitemap.xml (sitemap file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
}
