import { defineEventHandler, getQuery } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

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

    if (!staffId) {
      logger.warn('❌ No staff_id provided to calendar endpoint')
      return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Simy//Calendar//EN\r\nEND:VCALENDAR'
    }

    logger.debug(`📅 Generating calendar for staff: ${staffId}`)

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    // 1. Get staff member info
    const { data: staffUser, error: staffError } = await serviceSupabase
      .from('users')
      .select('id, first_name, last_name, email, tenant_id')
      .eq('id', staffId)
      .single()

    if (staffError || !staffUser) {
      logger.warn(`❌ Staff user not found: ${staffId}`)
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
      .eq('staff_id', staffId)
      .gte('start_time', today.toISOString())
      .lte('start_time', nextYear.toISOString())
      .is('deleted_at', null)
      .not('status', 'eq', 'cancelled')
      .order('start_time', { ascending: true })

    if (appointmentsError) {
      logger.warn(`⚠️ Error fetching appointments: ${appointmentsError.message}`)
    }

    logger.debug(`📅 Found ${appointments?.length || 0} appointments for staff`)

    // 4. Build ICS file
    const icsEvents: string[] = []
    const calendarName = `${staffUser.first_name} ${staffUser.last_name} - ${tenant?.name || 'Simy'}`

    // Add events
    if (appointments && appointments.length > 0) {
      for (const apt of appointments) {
        const startTime = new Date(apt.start_time)
        const endTime = new Date(apt.end_time)

        // Format timestamps as ICS format (YYYYMMDDTHHMMSSZ for UTC)
        const startICS = formatICSDateTime(startTime)
        const endICS = formatICSDateTime(endTime)

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

        // Build event
        const event = `BEGIN:VEVENT
UID:${eventUid}
DTSTAMP:${formatICSDateTime(new Date())}
DTSTART:${startICS}
DTEND:${endICS}
SUMMARY:${sanitizeText(eventTitle)}
DESCRIPTION:${sanitizeText(description)}
STATUS:${apt.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}
SEQUENCE:0
END:VEVENT`

        icsEvents.push(event)
      }
    }

    // 5. Build complete ICS file
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Simy//Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${sanitizeText(calendarName)}
X-WR-TIMEZONE:Europe/Zurich
X-WR-CALDESC:Driving lessons for ${sanitizeText(staffUser.first_name)} ${sanitizeText(staffUser.last_name)}
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

    // Set response headers for calendar file download
    setHeader(event, 'Content-Type', 'text/calendar; charset=utf-8')
    setHeader(event, 'Content-Disposition', `attachment; filename="calendar-${staffUser.id}.ics"`)
    setHeader(event, 'Cache-Control', 'no-cache, max-age=5') // Update every 5 seconds like carzi

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
