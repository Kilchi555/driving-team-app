// server/utils/ip-utils.ts
// Utility to extract client IP address

import { H3Event } from 'h3'

export function getClientIP(event: H3Event): string {
  // Try to get IP from various headers (proxy awareness)
  const forwarded = event.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIP = event.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback to connection IP
  const socket = event.node.res.socket || event.node.res.connection
  if (socket && socket.remoteAddress) {
    return socket.remoteAddress
  }

  return '0.0.0.0'
}

