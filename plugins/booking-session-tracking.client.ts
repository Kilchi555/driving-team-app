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

  // Track booking events
  const trackBookingEvent = async (eventType: 'viewed' | 'started' | 'completed' | 'abandoned', data: Record<string, any>) => {
    try {
      await fetch('/api/booking-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          event_type: eventType,
          page: window.location.pathname,
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
  window.addEventListener('beforeunload', () => {
    // Simple check: if we're still on booking page, track abandonment
    if (window.location.pathname.includes('booking') || window.location.pathname.includes('availability')) {
      // Use navigator.sendBeacon for reliability (fires even on page close)
      const data = new FormData()
      data.append('session_id', sessionId)
      data.append('event_type', 'abandoned')
      data.append('page', window.location.pathname)
      navigator.sendBeacon('/api/booking-events', data)
    }
  })
})
