import { defineEventHandler, getHeader, getCookie } from 'h3'

/**
 * Middleware to convert HTTP-Only auth cookies to Authorization headers
 * This ensures backward compatibility for APIs that expect Bearer tokens
 * while keeping tokens secure in HTTP-Only cookies
 */
export default defineEventHandler((event) => {
  // Skip if Authorization header already exists
  if (getHeader(event, 'authorization')) {
    return
  }

  // Get auth token from HTTP-Only cookie
  const accessToken = getCookie(event, 'sb-auth-token')
  if (accessToken) {
    // CRITICAL: Set the REQUEST header (not response header!)
    // APIs read from event.node.req.headers, not response headers
    event.node.req.headers.authorization = `Bearer ${accessToken}`
  }
})

