/**
 * Allow drivingteam.ch to embed the guest booking flow in a same-site modal.
 * X-Frame-Options SAMEORIGIN would block that; CSP frame-ancestors replaces it.
 */
import { getRequestURL, removeResponseHeader, setHeader } from 'h3'

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/booking/')) return

  removeResponseHeader(event, 'X-Frame-Options')
  setHeader(
    event,
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://app-wallee.com https://connect.facebook.net https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://unyjaetebnaexaflpyoc.supabase.co https://maps.googleapis.com https://api.resend.com https://app-wallee.com wss://unyjaetebnaexaflpyoc.supabase.co https://www.facebook.com https://connect.facebook.net https://api.stripe.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "frame-src 'self' https://app-wallee.com https://*.google.com https://*.google.ch https://www.openstreetmap.org https://js.stripe.com https://hooks.stripe.com",
      "frame-ancestors 'self' https://drivingteam.ch https://www.drivingteam.ch",
      "media-src 'self' blob: https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://app-wallee.com",
    ].join('; '),
  )
})
