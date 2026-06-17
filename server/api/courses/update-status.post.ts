import { defineEventHandler, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'
import { generateWaitlistAvailableEmail } from '~/server/utils/email-templates'
import { logger } from '~/utils/logger'

const VALID_STATUSES = ['draft', 'active', 'scheduled', 'completed', 'cancelled', 'waitlist'] as const
type CourseStatus = typeof VALID_STATUSES[number]

/**
 * POST /api/courses/update-status
 * Updates the status of a course (admin/staff only).
 * When notifyWaitlist=true and status changes from 'waitlist' to active/scheduled,
 * sends "now available" emails to all waiting entries.
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)

  const body = await readBody<{ courseId: string; status: CourseStatus; notifyWaitlist?: boolean }>(event)

  if (!body?.courseId) {
    throw createError({ statusCode: 400, statusMessage: 'courseId is required' })
  }
  if (!body?.status || !VALID_STATUSES.includes(body.status)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` })
  }

  const supabase = getSupabaseAdmin()

  // Verify course belongs to the caller's tenant
  const { data: course } = await supabase
    .from('courses')
    .select('id, tenant_id, status, name, description, instructor_id, external_instructor_name, price_per_participant_rappen, sari_managed, course_sessions (start_time, end_time, staff_id, external_instructor_name)')
    .eq('id', body.courseId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!course) {
    throw createError({ statusCode: 404, statusMessage: 'Course not found' })
  }

  // Business rule: course can only be set to active if instructor and price are set
  if (body.status === 'active') {
    // Accept instructor at course level (legacy) OR on any session (modern / SARI)
    const sessionInstructor = (course.course_sessions as any[] | null)?.some(
      (s: any) => s.staff_id || s.external_instructor_name
    )
    const hasInstructor = !!(course.instructor_id || course.external_instructor_name || sessionInstructor)
    const hasPrice = (course.price_per_participant_rappen ?? 0) > 0

    if (!hasInstructor) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Kurs kann nicht aktiviert werden: Kursleiter fehlt. Bitte zuerst einen Kursleiter zuweisen.'
      })
    }
    if (!hasPrice) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Kurs kann nicht aktiviert werden: Kurs-Preis fehlt. Bitte zuerst einen Preis festlegen.'
      })
    }
  }

  const updateData: Record<string, any> = {
    status: body.status,
    status_changed_at: new Date().toISOString(),
    status_changed_by: profile.id,
  }

  if (body.status === 'cancelled') {
    updateData.cancelled_at = new Date().toISOString()
    updateData.cancelled_by = profile.id
  }

  const { data: updated, error } = await supabase
    .from('courses')
    .update(updateData)
    .eq('id', body.courseId)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Status update failed: ${error.message}` })
  }

  const wasWaitlist = course.status === 'waitlist'
  const isNowActive = body.status === 'active' || body.status === 'scheduled'

  if (body.notifyWaitlist && wasWaitlist && isNowActive) {
    notifyWaitlistEntries(supabase, body.courseId, course, profile.tenant_id)
      .catch((err: any) => logger.warn(`⚠️ Waitlist notification failed: ${err.message}`))
  }

  return { success: true, course: updated }
})

async function notifyWaitlistEntries(
  supabase: ReturnType<typeof import('~/server/utils/supabase-admin').getSupabaseAdmin>,
  courseId: string,
  course: { name: string; description?: string | null; course_sessions?: Array<{ start_time: string; end_time?: string | null }> | null },
  tenantId: string
) {
  const { data: entries } = await supabase
    .from('course_waitlist')
    .select('id, first_name, last_name, email')
    .eq('course_id', courseId)
    .in('status', ['waiting', 'offered'])

  if (!entries || entries.length === 0) return

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, contact_email, primary_color, slug, logo_wide_url, logo_url, logo_square_url')
    .eq('id', tenantId)
    .single()

  const tenantName = tenant?.name || 'Simy'

  const sessions = (course.course_sessions || [])
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

  const base = process.env.NUXT_PUBLIC_APP_URL || 'https://app.drivingteam.ch'
  const bookingUrl = tenant?.slug ? `${base}/customer/courses/${tenant.slug}#course-${courseId}` : base

  const now = new Date().toISOString()

  const toQueue = entries
    .filter((entry) => !!entry.email)
    .map((entry) => {
      const logoUrl = tenant?.logo_wide_url || tenant?.logo_url || (tenant as any)?.logo_square_url || null
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
        logoUrl,
      })

      return {
        tenant_id: tenantId,
        channel: 'email',
        recipient_email: entry.email,
        subject,
        body: html,
        status: 'pending',
        send_at: now,
        context_data: {
          stage: 'waitlist_available',
          entry_id: entry.id,
          course_id: courseId,
          course_name: course.name,
          tenant_name: tenantName,
        },
      }
    })

  const { error } = await supabase.from('outbound_messages_queue').insert(toQueue)
  if (error) {
    logger.warn(`⚠️ Failed to queue waitlist emails: ${error.message}`)
  } else {
    logger.info(`📬 Queued ${toQueue.length} waitlist-available emails for course "${course.name}"`)
  }
}
