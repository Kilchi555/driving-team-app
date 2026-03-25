/**
 * Composable zur Verfolgung von Buchungs-Sessions
 * Trackt wenn Besucher auf Simy klicken und erfasst Redirect Events
 */

export const useBookingTracking = () => {
  /**
   * Generiert Booking-URL mit Session ID und trackt den Klick
   */
  const generateBookingUrlWithTracking = (url: string, category?: string): string => {
    // Get session ID from window
    const sessionId = (window as any).__analyticsSessionId || 'unknown'
    
    // Add session_id parameter if not already present
    const separator = url.includes('?') ? '&' : '?'
    const trackedUrl = url.includes('session_id') ? url : `${url}${separator}session_id=${sessionId}`
    
    // Track the redirect event
    trackBookingRedirect(category || 'unknown', sessionId)
    
    return trackedUrl
  }

  /**
   * Trackt dass Besucher auf Booking-Seite weitergeleitet wurde
   */
  const trackBookingRedirect = async (category: string, sessionId: string) => {
    try {
      await fetch('/api/booking-redirect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          session_id: sessionId,
          referrer_page: window.location.pathname,
        }),
      }).catch(() => {}) // Fire and forget
    } catch (err) {
      // Silently fail
    }
  }

  return {
    generateBookingUrlWithTracking,
    trackBookingRedirect,
  }
}
