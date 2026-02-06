import { H3Event, setCookie, getCookie, deleteCookie } from 'h3'

const COOKIE_NAME = 'sb-session'
const REFRESH_COOKIE_NAME = 'sb-refresh'

const isProduction = process.env.NODE_ENV === 'production'

export interface SessionCookieOptions {
  rememberMe?: boolean
  maxAge?: number
}

/**
 * Set authentication cookies (httpOnly, secure, sameSite)
 */
export function setAuthCookies(
  event: H3Event, 
  accessToken: string, 
  refreshToken: string,
  options: SessionCookieOptions = {}
) {
  const { rememberMe = false, maxAge } = options
  
  // Calculate maxAge
  // Remember Me: 7 days, Otherwise: 1 hour
  const cookieMaxAge = maxAge || (rememberMe ? 7 * 24 * 60 * 60 : 60 * 60)
  
  // Set Access Token cookie
  setCookie(event, COOKIE_NAME, accessToken, {
    httpOnly: true,           // Cannot be accessed by JavaScript (XSS protection)
    secure: isProduction,     // Only over HTTPS in production
    sameSite: 'lax',         // CSRF protection (strict würde OAuth breaks)
    maxAge: cookieMaxAge,
    path: '/'
  })
  
  // Set Refresh Token cookie (longer lived)
  const refreshMaxAge = rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60
  setCookie(event, REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: refreshMaxAge,
    path: '/'
  })
}

/**
 * Get authentication tokens from cookies
 */
export function getAuthCookies(event: H3Event): {
  accessToken: string | undefined
  refreshToken: string | undefined
} {
  return {
    accessToken: getCookie(event, COOKIE_NAME),
    refreshToken: getCookie(event, REFRESH_COOKIE_NAME)
  }
}

/**
 * Clear authentication cookies
 */
export function clearAuthCookies(event: H3Event) {
  deleteCookie(event, COOKIE_NAME, {
    path: '/'
  })
  deleteCookie(event, REFRESH_COOKIE_NAME, {
    path: '/'
  })
}

/**
 * Check if user has valid session cookie
 */
export function hasSessionCookie(event: H3Event): boolean {
  const { accessToken } = getAuthCookies(event)
  return !!accessToken
}

