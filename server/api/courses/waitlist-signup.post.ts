/**
 * POST /api/courses/waitlist-signup
 *
 * Public endpoint — no auth required.
 * Allows anyone to join the waitlist for a course with status='waitlist'.
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { generateWaitlistConfirmationEmail } from '~/server/utils/email-templates'
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

  // 1. Verify course exists and is in waitlist mode
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, name, status, tenant_id, max_participants')
    .eq('id', course_id)
    .eq('is_public', true)
    .single()

  if (courseError || !course) {
    throw createError({ statusCode: 404, statusMessage: 'Kurs nicht gefunden' })
  }

  if (course.status !== 'waitlist') {
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
    // Previously declined/expired → allow re-entry by updating existing row
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

  // 5. Get tenant info for email
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, contact_email')
    .eq('id', course.tenant_id)
    .single()

  // 6. Send confirmation email (non-blocking)
  try {
    const { subject, html } = generateWaitlistConfirmationEmail({
      firstName: first_name.trim(),
      lastName: last_name.trim(),
      courseName: course.name,
      position,
      tenantName: tenant?.name,
      tenantEmail: tenant?.contact_email
    })
    await sendEmail({ to: email, subject, html })
    logger.debug(`✅ Waitlist confirmation sent to ${email}`)
  } catch (emailErr: any) {
    logger.warn(`⚠️ Waitlist confirmation email failed: ${emailErr.message}`)
  }

  logger.info(`✅ Waitlist signup: ${first_name} ${last_name} → course ${course.name} (pos #${position})`)

  return {
    success: true,
    position: entry.position,
    message: `Sie wurden auf Position #${position} der Warteliste eingetragen. Eine Bestätigungs-E-Mail wurde an ${email} gesendet.`
  }
})
