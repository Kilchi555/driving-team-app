/**
 * Cross-domain session tracking plugin
 * Carries session ID from drivingteam.ch to simy.ch
 * Allows complete funnel tracking: Views → Calculator → Booking → Payment
 */

import { defineNuxtPlugin } from '#app'

declare global {
  interface Window {
    __analyticsSessionId: string
    __trackBookingEvent: (eventType: 'viewed' | 'started' | 'completed' | 'abandoned', data: Record<string, any>) => Promise<void>
  }
}

export default defineNuxtPlugin(() => {
  if (process.server) return

  // Only track on booking/availability pages
  const isBookingPage = window.location.pathname.includes('/booking/') || 
                        window.location.pathname.includes('/availability/')
  
  if (!isBookingPage) return // Nur client-side

  // Get or create session ID
  const getSessionId = (): string => {
    const key = 'analytics_session_id'
    
    // First, check URL parameters (from drivingteam.ch redirect)
    const urlParams = new URLSearchParams(window.location.search)
    const sessionFromUrl = urlParams.get('session_id')
    
    if (sessionFromUrl) {
      localStorage.setItem(key, sessionFromUrl)
      return sessionFromUrl
    }

    // Then check localStorage
    let sessionId = localStorage.getItem(key)
    
    if (!sessionId) {
      sessionId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      localStorage.setItem(key, sessionId)
    }
    
    return sessionId
  }

  const sessionId = getSessionId()

  // Track booking events — only fire when on a valid booking/availability page
  const trackBookingEvent = async (eventType: 'viewed' | 'started' | 'completed' | 'abandoned', data: Record<string, any>) => {
    const currentPath = window.location.pathname
    const isValidBookingPath = currentPath.includes('/booking/') || currentPath.includes('/availability/')
    if (!isValidBookingPath) return

    try {
      await fetch('/api/booking-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          event_type: eventType,
          page: currentPath,
          ...data,
        }),
      }).catch(() => {})
    } catch (err) {
      // Silently fail
    }
  }

  // Expose utilities to window
  window.__analyticsSessionId = sessionId
  window.__trackBookingEvent = trackBookingEvent

  // Track page view on initial load
  trackBookingEvent('viewed', {
    referrer: document.referrer,
  })

  // Track if user leaves without completing booking
  let bookingCompleted = false
  const originalTrack = window.__trackBookingEvent
  window.__trackBookingEvent = async (eventType, data) => {
    if (eventType === 'completed') bookingCompleted = true
    return originalTrack(eventType, data)
  }

  window.addEventListener('beforeunload', () => {
    if (bookingCompleted) return
    if (window.location.pathname.includes('booking') || window.location.pathname.includes('availability')) {
      // sendBeacon requires a Blob with explicit content-type so the server can parse it as JSON
      const payload = JSON.stringify({
        session_id: sessionId,
        event_type: 'abandoned',
        page: window.location.pathname,
      })
      navigator.sendBeacon('/api/booking-events', new Blob([payload], { type: 'application/json' }))
    }
  })
})
