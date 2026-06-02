/**
 * POST /api/admin/courses/notify-waitlist
 * Queues "course now available" emails for all active waitlist entries.
 * Emails are processed via outbound_messages_queue (cron).
 * Admin only.
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'
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
    return { success: true, queued: 0, message: 'Keine Wartelisten-Einträge gefunden.' }
  }

  const tenantName = tenant?.name || 'Simy'
  const sessions = buildSessions(course.course_sessions || [])
  const bookingUrl = buildBookingUrl(tenant?.slug, body.courseId)
  const now = new Date().toISOString()

  const toQueue = entries
    .filter((entry) => !!entry.email)
    .map((entry) => {
      const { subject, html } = generateWaitlistAvailableEmail({
        firstName: entry.first_name,
        lastName: entry.last_name,
        courseName: course.name,
        courseDescription: course.description || undefined,
        sessions,
        bookingUrl,
        tenantName,
        tenantEmail: tenant?.contact_email,
        primaryColor: tenant?.primary_color || undefined,
      })

      return {
        tenant_id: profile.tenant_id,
        channel: 'email',
        recipient_email: entry.email,
        subject,
        body: html,
        status: 'pending',
        send_at: now,
        context_data: {
          stage: 'waitlist_available',
          entry_id: entry.id,
          course_id: body.courseId,
          course_name: course.name,
          tenant_name: tenantName,
        },
      }
    })

  const { error: queueError } = await supabase.from('outbound_messages_queue').insert(toQueue)

  if (queueError) {
    logger.error('❌ Failed to queue waitlist available emails:', queueError.message)
    throw createError({ statusCode: 500, statusMessage: 'Fehler beim Queuen der Emails' })
  }

  logger.info(`📬 Queued ${toQueue.length} waitlist-available emails for course "${course.name}"`)

  return {
    success: true,
    queued: toQueue.length,
    total: entries.length,
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
