/**
 * POST /api/admin/courses/notify-waitlist
 * Sends "course now available" emails to all active waitlist entries for a course.
 * Admin only.
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'
import { sendEmail } from '~/server/utils/email'
import { generateWaitlistAvailableEmail } from '~/server/utils/email-templates'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody<{ courseId: string }>(event)

  if (!body?.courseId) {
    throw createError({ statusCode: 400, statusMessage: 'courseId is required' })
  }

  const supabase = getSupabaseAdmin()

  const { data: course } = await supabase
    .from('courses')
    .select(`
      id, name, description, status, tenant_id,
      course_sessions (start_time, end_time)
    `)
    .eq('id', body.courseId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!course) {
    throw createError({ statusCode: 404, statusMessage: 'Course not found' })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, contact_email, primary_color, slug')
    .eq('id', profile.tenant_id)
    .single()

  const { data: entries } = await supabase
    .from('course_waitlist')
    .select('id, first_name, last_name, email')
    .eq('course_id', body.courseId)
    .in('status', ['waiting', 'offered'])

  if (!entries || entries.length === 0) {
    return { success: true, sent: 0, message: 'Keine Wartelisten-Einträge gefunden.' }
  }

  const sessions = buildSessions(course.course_sessions || [])
  const bookingUrl = buildBookingUrl(tenant?.slug, body.courseId)

  let sent = 0
  const errors: string[] = []

  await Promise.allSettled(
    entries.map(async (entry) => {
      if (!entry.email) return

      try {
        const { subject, html } = generateWaitlistAvailableEmail({
          firstName: entry.first_name,
          lastName: entry.last_name,
          courseName: course.name,
          courseDescription: course.description || undefined,
          sessions,
          bookingUrl,
          tenantName: tenant?.name,
          tenantEmail: tenant?.contact_email,
          primaryColor: tenant?.primary_color || undefined,
        })

        await sendEmail({ to: entry.email, subject, html })
        sent++
        logger.debug(`✅ Waitlist available email sent to ${entry.email}`)
      } catch (err: any) {
        logger.warn(`⚠️ Failed to send to ${entry.email}: ${err.message}`)
        errors.push(entry.email)
      }
    })
  )

  logger.info(`📬 Waitlist notify: ${sent}/${entries.length} emails sent for course "${course.name}"`)

  return {
    success: true,
    sent,
    total: entries.length,
    errors,
  }
})

function buildSessions(sessions: Array<{ start_time: string; end_time?: string }>): Array<{ date: string; time: string }> {
  return sessions
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 5)
    .map((s) => {
      const start = new Date(s.start_time)
      const date = start.toLocaleDateString('de-CH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
      const startTime = start.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
      const time = s.end_time
        ? `${startTime} – ${new Date(s.end_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} Uhr`
        : `${startTime} Uhr`
      return { date, time }
    })
}

function buildBookingUrl(tenantSlug?: string | null, courseId?: string): string {
  const base = process.env.NUXT_PUBLIC_APP_URL || 'https://app.drivingteam.ch'
  if (tenantSlug && courseId) {
    return `${base}/customer/courses/${tenantSlug}#course-${courseId}`
  }
  return base
}
