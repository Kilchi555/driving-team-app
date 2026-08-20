/**
 * Short-link redirect for SMS/print campaigns aimed at driving-instructor
 * prospects: keeps the link in the message short and human-readable
 * ("simy.ch/fl") while still attaching full UTM attribution server-side
 * before redirecting to the actual landing page, so GA4 can attribute the
 * session correctly.
 *
 * Usage in a message: simy.ch/fl (defaults to campaign "fahrlehrer-empfehlung")
 * Optional override for a different drop: simy.ch/fl?c=other-campaign-name
 */
import { defineEventHandler, getQuery, sendRedirect } from 'h3'

const DEFAULT_CAMPAIGN = 'fahrlehrer-empfehlung'
const TARGET_PATH = '/fahrschule'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const raw = typeof query.c === 'string' ? query.c.trim() : ''
  const campaign = raw ? raw.slice(0, 60) : DEFAULT_CAMPAIGN

  const params = new URLSearchParams({
    utm_source: 'sms',
    utm_medium: 'sms',
    utm_campaign: campaign,
  })

  return sendRedirect(event, `${TARGET_PATH}?${params.toString()}`, 302)
})
