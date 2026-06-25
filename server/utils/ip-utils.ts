// server/utils/ip-utils.ts
// Utility to extract client IP address in a spoofing-resistant way.
//
// Priority order:
//  1. x-vercel-forwarded-for  – set by Vercel's edge; clients cannot override it
//  2. x-real-ip               – set by nginx/trusted proxy; not client-accessible
//  3. socket.remoteAddress    – true TCP connection IP (works behind any reverse proxy
//                               that connects directly to this process)
//
// We intentionally do NOT trust the raw x-forwarded-for header as the authoritative
// source because clients can inject arbitrary values into it, allowing them to
// bypass IP-based rate limits. The x-forwarded-for header is only used as a last
// resort fallback, and even then we take the LAST entry (added by the closest
// trusted proxy), never the first (which the client controls).

import { H3Event } from 'h3'

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$|^[0-9a-f:]+$/i

function sanitizeIP(raw: string | null | undefined): string | null {
  if (!raw) return null
  const candidate = raw.trim()
  // Strip port suffix if present (e.g. "1.2.3.4:1234" or "[::1]:1234")
  const withoutPort = candidate.replace(/:\d+$/, '').replace(/^\[/, '').replace(/\]$/, '')
  return IP_REGEX.test(withoutPort) ? withoutPort : null
}

export function getClientIP(event: H3Event): string {
  // 1. Vercel edge header (cannot be spoofed by the client)
  const vercelIP = sanitizeIP(event.headers.get('x-vercel-forwarded-for'))
  if (vercelIP) return vercelIP

  // 2. Trusted reverse-proxy header (nginx x-real-ip or equivalent)
  const realIP = sanitizeIP(event.headers.get('x-real-ip'))
  if (realIP) return realIP

  // 3. True TCP connection address
  const socket = event.node.res.socket || event.node.res.connection
  const socketIP = sanitizeIP(socket?.remoteAddress ?? null)
  if (socketIP) return socketIP

  // 4. Last resort: rightmost entry of x-forwarded-for (added by closest proxy)
  //    We take the LAST value, not the first, to avoid client-injected spoofing.
  const forwarded = event.headers.get('x-forwarded-for')
  if (forwarded) {
    const parts = forwarded.split(',').map(s => s.trim()).reverse()
    for (const part of parts) {
      const ip = sanitizeIP(part)
      if (ip) return ip
    }
  }

  return '0.0.0.0'
}

