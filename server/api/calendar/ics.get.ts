import { defineEventHandler, getQuery, setHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import crypto from 'crypto'

/**
 * Generate iCalendar (ICS) format for staff appointments
 * This allows subscribing to a staff member's calendar in phone/desktop apps
 * Usage: /api/calendar/ics?staff_id=<uuid>
 */
export default defineEventHandler(async (event) => {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Simy//Calendar//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nEND:VCALENDAR'
  }

  try {
    const query = getQuery(event)
    const staffId = query.staff_id as string
    const calendarToken = query.token as string

    // Either staff_id OR token must be provided
    if (!staffId && !calendarToken) {
      logger.warn('❌ No staff_id or token provided to calendar endpoint')
      return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Simy//Calendar//EN\r\nEND:VCALENDAR'
    }

    logger.debug(`📅 Generating calendar for: ${staffId ? 'staff_id=' + staffId : 'token=' + calendarToken}`)

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    let resolvedStaffId = staffId

    // If token is provided, validate and resolve to staff_id
    if (calendarToken && !staffId) {
      logger.debug(`🔑 Validating token: ${calendarToken.substring(0, 8)}...`)

      const { data: tokenData, error: tokenError } = await serviceSupabase
        .from('calendar_tokens')
        .select('staff_id, last_used_at')
        .eq('token', calendarToken)
        .eq('is_active', true)
        .single()

      if (tokenError || !tokenData) {
        logger.warn(`❌ Invalid or expired token`)
        return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Simy//Calendar//EN\r\nEND:VCALENDAR'
      }

      resolvedStaffId = tokenData.staff_id

      // Update last_used_at
      await serviceSupabase
        .from('calendar_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('token', calendarToken)

      logger.debug(`✅ Token validated, staff_id: ${resolvedStaffId}`)
    }

    if (!resolvedStaffId) {
      logger.warn('❌ No valid staff_id found')
      logger.warn(`Debug: staffId=${staffId}, calendarToken=${calendarToken?.substring(0, 8)}...`)
      return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Simy//Calendar//EN\r\nEND:VCALENDAR'
    }

    // 1. Get staff member info
    const { data: staffUser, error: staffError } = await serviceSupabase
      .from('users')
      .select('id, first_name, last_name, email, tenant_id')
      .eq('id', resolvedStaffId)
      .single()

    if (staffError || !staffUser) {
      logger.warn(`❌ Staff user not found: ${resolvedStaffId}`)
      return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Simy//Calendar//EN\r\nEND:VCALENDAR'
    }

    logger.debug(`✅ Staff found: ${staffUser.email}`)

    // 2. Get tenant info
    const { data: tenant, error: tenantError } = await serviceSupabase
      .from('tenants')
      .select('name, slug')
      .eq('id', staffUser.tenant_id)
      .single()

    if (tenantError || !tenant) {
      logger.warn(`❌ Tenant not found for staff: ${staffId}`)
    }

    // 3. Get all appointments for this staff member (next 12 months)
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    const nextYear = new Date(today)
    nextYear.setFullYear(nextYear.getFullYear() + 1)

    const { data: appointments, error: appointmentsError } = await serviceSupabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        status,
        user_id,
        users!appointments_user_id_fkey (
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq('staff_id', resolvedStaffId)
      .gte('start_time', today.toISOString())
      .lte('start_time', nextYear.toISOString())
      .is('deleted_at', null)
      .not('status', 'eq', 'cancelled')
      .order('start_time', { ascending: true })

    if (appointmentsError) {
      logger.warn(`⚠️ Error fetching appointments: ${appointmentsError.message}`)
    }

    logger.debug(`📅 Found ${appointments?.length || 0} appointments for staff: ${resolvedStaffId}`)
    if (appointments && appointments.length === 0) {
      logger.debug(`ℹ️ No appointments found in range for staff: ${resolvedStaffId}`)
    }

    // 4. Build ICS file
    const icsEvents: string[] = []
    const calendarName = `${staffUser.first_name} ${staffUser.last_name} - ${tenant?.name || 'Simy'}`

    // Add events
    if (appointments && appointments.length > 0) {
      for (const apt of appointments) {
        const startTime = new Date(apt.start_time)
        const endTime = new Date(apt.end_time)

        // Build description with student info
        let description = ''
        let studentFullName = ''
        if (apt.users) {
          studentFullName = `${apt.users.first_name} ${apt.users.last_name}`
          description = `Student: ${studentFullName}`
          // Removed: phone and email for privacy
        }

        // Create unique ID for event (using appointment ID)
        const eventUid = `${apt.id}@${new URL(process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000').hostname}`

        // Build title with student name
        const eventTitle = studentFullName 
          ? `${apt.title || 'Appointment'} - ${studentFullName}`
          : apt.title || 'Appointment'

        // Build event with proper iOS-compatible formatting
        const event = `BEGIN:VEVENT
UID:${eventUid}
DTSTAMP:${formatICSDateTime(new Date())}
DTSTART;TZID=Europe/Zurich:${formatICSDateTimeLocal(startTime)}
DTEND;TZID=Europe/Zurich:${formatICSDateTimeLocal(endTime)}
SUMMARY:${sanitizeText(eventTitle)}
DESCRIPTION:${sanitizeText(description)}
LOCATION:Driving Lesson
TRANSP:OPAQUE
STATUS:${apt.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}
SEQUENCE:0
CREATED:${formatICSDateTime(new Date(apt.id))}
LAST-MODIFIED:${formatICSDateTime(new Date())}
X-MICROSOFT-CDO-BUSYSTATUS:BUSY
CATEGORIES:Driving Lesson
END:VEVENT`

        icsEvents.push(event)
      }
    }

    // 5. Build complete ICS file
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Simy//Driving Lessons Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${sanitizeText(calendarName)}
X-WR-TIMEZONE:Europe/Zurich
X-WR-CALDESC:Driving lessons for ${sanitizeText(staffUser.first_name)} ${sanitizeText(staffUser.last_name)}
X-WR-RELCALID:${staffUser.id}@simy.ch
REFRESH-INTERVAL;VALUE=DURATION:PT5M
BEGIN:VTIMEZONE
TZID:Europe/Zurich
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
DTSTART:19980329T020000
TZNAME:CEST
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
DTSTART:19960929T030000
TZNAME:CET
END:STANDARD
END:VTIMEZONE
${icsEvents.join('\r\n')}
END:VCALENDAR`

    logger.info(`✅ Calendar ICS generated for staff: ${staffUser.email}`)

    // Set response headers for calendar subscription (not download)
    // iOS Calendar checks these headers to decide how often to refresh
    setHeader(event, 'Content-Type', 'text/calendar; charset=utf-8')
    setHeader(event, 'Content-Disposition', 'inline') // Don't force download, allow subscription
    
    // Generate ETag based on content hash for efficient caching
    const contentHash = crypto
      .createHash('md5')
      .update(icsContent)
      .digest('hex')
      .slice(0, 16)
    
    // AGGRESSIVE HEADERS TO FORCE APPLE CALENDAR FREQUENT REFRESH
    // Apple Calendar checks for updates based on these headers
    
    // Tell Apple to ALWAYS revalidate (max-age=0) - forces check on every open
    setHeader(event, 'Cache-Control', 'public, max-age=0, must-revalidate, no-cache, no-store')
    
    // Always send new Last-Modified time (triggers Apple to think content changed)
    setHeader(event, 'Last-Modified', new Date().toUTCString())
    
    // Always send new ETag (makes Apple think content changed)
    setHeader(event, 'ETag', `"${contentHash}-${Date.now()}"`)
    
    // Additional headers for maximum compatibility
    setHeader(event, 'Pragma', 'no-cache')
    setHeader(event, 'Expires', '0')
    
    // Tell clients to refresh every minute
    setHeader(event, 'X-Publish-Interval', 'PT60S')
    
    // Mark as dynamic content (not static)
    setHeader(event, 'X-Content-Type-Options', 'nosniff')

    return icsContent
  } catch (error: any) {
    console.error('❌ Error generating calendar:', error)
    logger.error('Calendar generation error:', error.message)

    // Return empty but valid ICS on error
    return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Simy//Calendar//EN\r\nEND:VCALENDAR'
  }
})

/**
 * Format date to ICS format (YYYYMMDDTHHMMSSZ for UTC)
 */
function formatICSDateTime(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

/**
 * Format date to ICS local time format (YYYYMMDDTHHMMSS) for use with TZID
 * Converts UTC date to Europe/Zurich timezone
 * iOS Calendar prefers this format when TZID is specified
 */
function formatICSDateTimeLocal(date: Date): string {
  // Use Intl.DateTimeFormat to get the correct Zurich time
  // This works correctly on servers running in UTC (like Vercel)
  const zurichFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  const parts = zurichFormatter.formatToParts(date)
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00'
  
  const year = getPart('year')
  const month = getPart('month')
  const day = getPart('day')
  const hours = getPart('hour')
  const minutes = getPart('minute')
  const seconds = getPart('second')

  return `${year}${month}${day}T${hours}${minutes}${seconds}`
}

/**
 * Sanitize text for ICS format
 * Remove special characters and escape line breaks
 */
function sanitizeText(text: string): string {
  if (!text) return ''
  return text
    .replace(/[\r\n]/g, '\\n') // Escape line breaks
    .replace(/[,;\\]/g, '\\$&') // Escape special characters
    .substring(0, 200) // Limit length
}
