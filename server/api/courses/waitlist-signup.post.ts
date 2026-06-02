/**
 * POST /api/courses/waitlist-signup
 *
 * Public endpoint — no auth required.
 * Allows anyone to join the waitlist for a course with status='waitlist'
 * or for a fully-booked (free_slots=0) active/scheduled course.
 *
 * Emails are queued via outbound_messages_queue (processed by cron).
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { generateWaitlistConfirmationEmail, generateAdminWaitlistNotificationEmail } from '~/server/utils/email-templates'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { course_id, first_name, last_name, email, phone } = body

  if (!course_id || !first_name || !last_name || !email) {
    throw createError({ statusCode: 400, statusMessage: 'Fehlende Pflichtfelder: course_id, first_name, last_name, email' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige E-Mail-Adresse' })
  }

  const supabase = getSupabaseAdmin()

  // 1. Verify course exists and accepts waitlist entries
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, name, description, status, tenant_id, max_participants, free_slots')
    .eq('id', course_id)
    .eq('is_public', true)
    .single()

  if (courseError || !course) {
    throw createError({ statusCode: 404, statusMessage: 'Kurs nicht gefunden' })
  }

  const isWaitlistMode = course.status === 'waitlist'
  const isFullCourse = (course.status === 'active' || course.status === 'scheduled') && (course.free_slots ?? 1) === 0

  if (!isWaitlistMode && !isFullCourse) {
    throw createError({ statusCode: 409, statusMessage: 'Dieser Kurs nimmt keine Wartelisten-Einträge an' })
  }

  // 2. Check for duplicate email
  const { data: existing } = await supabase
    .from('course_waitlist')
    .select('id, status')
    .eq('course_id', course_id)
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (existing) {
    if (existing.status === 'waiting' || existing.status === 'offered') {
      throw createError({ statusCode: 409, statusMessage: 'Sie sind bereits auf der Warteliste eingetragen' })
    }
    // Previously declined/expired → allow re-entry
    const { data: updated } = await supabase
      .from('course_waitlist')
      .update({ status: 'waiting', added_date: new Date().toISOString() })
      .eq('id', existing.id)
      .select('position')
      .single()

    return { success: true, position: updated?.position || 1 }
  }

  // 3. Calculate next position
  const { count } = await supabase
    .from('course_waitlist')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', course_id)
    .in('status', ['waiting', 'offered'])

  const position = (count || 0) + 1

  // 4. Insert into course_waitlist
  const { data: entry, error: insertError } = await supabase
    .from('course_waitlist')
    .insert({
      course_id,
      tenant_id: course.tenant_id,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      position,
      status: 'waiting',
      added_date: new Date().toISOString()
    })
    .select('id, position')
    .single()

  if (insertError) {
    logger.error('❌ Waitlist insert failed:', insertError.message)
    throw createError({ statusCode: 500, statusMessage: 'Eintragung fehlgeschlagen' })
  }

  // 5. Get tenant info for emails
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, contact_email, primary_color')
    .eq('id', course.tenant_id)
    .single()

  // 6. Queue confirmation + optional admin notification via outbound_messages_queue
  const now = new Date().toISOString()
  const tenantName = tenant?.name || 'Simy'
  const toQueue: any[] = []

  const { subject: confirmSubject, html: confirmHtml } = generateWaitlistConfirmationEmail({
    firstName: first_name.trim(),
    lastName: last_name.trim(),
    courseName: course.name,
    courseDescription: isFullCourse && !course.description
      ? 'Dieser Kurs ist derzeit ausgebucht. Sie werden benachrichtigt, sobald ein Platz frei wird.'
      : (course.description || undefined),
    position,
    tenantName,
    tenantEmail: tenant?.contact_email,
    primaryColor: tenant?.primary_color || undefined,
  })

  toQueue.push({
    tenant_id: course.tenant_id,
    channel: 'email',
    recipient_email: email.toLowerCase().trim(),
    subject: confirmSubject,
    body: confirmHtml,
    status: 'pending',
    send_at: now,
    context_data: {
      stage: 'waitlist_signup',
      entry_id: entry.id,
      course_id,
      course_name: course.name,
      tenant_name: tenantName,
    },
  })

  if (tenant?.contact_email) {
    const { subject: adminSubject, html: adminHtml } = generateAdminWaitlistNotificationEmail({
      participantFirstName: first_name.trim(),
      participantLastName: last_name.trim(),
      participantEmail: email,
      participantPhone: phone?.trim() || undefined,
      courseName: course.name,
      position,
      tenantName,
    })

    toQueue.push({
      tenant_id: course.tenant_id,
      channel: 'email',
      recipient_email: tenant.contact_email,
      subject: adminSubject,
      body: adminHtml,
      status: 'pending',
      send_at: now,
      context_data: {
        stage: 'waitlist_signup_admin',
        entry_id: entry.id,
        course_id,
        course_name: course.name,
        tenant_name: tenantName,
      },
    })
  }

  const { error: queueError } = await supabase.from('outbound_messages_queue').insert(toQueue)
  if (queueError) {
    logger.warn(`⚠️ Failed to queue waitlist emails: ${queueError.message}`)
  } else {
    logger.debug(`✅ Queued ${toQueue.length} waitlist email(s) for entry ${entry.id}`)
  }

  logger.info(`✅ Waitlist signup: ${first_name} ${last_name} → course ${course.name} (pos #${position})`)

  return {
    success: true,
    position: entry.position,
    message: `Sie wurden auf Position #${position} der Warteliste eingetragen. Eine Bestätigungs-E-Mail wurde an ${email} gesendet.`
  }
})
