/**
 * POST /api/courses/category-waitlist-signup
 *
 * Public endpoint — no auth required.
 * Allows anyone to join a category-based waitlist (e.g. "CZV-G", "Fahrlehrer", "CZV").
 * Requires only first_name + email (minimal friction).
 *
 * The waitlist_enabled flag must be true on the course_category.
 * When a new course of that category is published, all waitlist entries are notified.
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { generateWaitlistConfirmationEmail, generateAdminWaitlistNotificationEmail } from '~/server/utils/email-templates'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { category_code, first_name, email, tenant_id } = body

  if (!category_code || !first_name || !email || !tenant_id) {
    throw createError({ statusCode: 400, statusMessage: 'Fehlende Pflichtfelder: category_code, first_name, email, tenant_id' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige E-Mail-Adresse' })
  }

  const supabase = getSupabaseAdmin()

  // 1. Verify category exists, is active, and has waitlist enabled
  const { data: category, error: catError } = await supabase
    .from('course_categories')
    .select('id, name, waitlist_enabled, is_active')
    .eq('code', category_code)
    .eq('tenant_id', tenant_id)
    .maybeSingle()

  if (catError || !category) {
    throw createError({ statusCode: 404, statusMessage: 'Kursart nicht gefunden' })
  }

  if (!category.waitlist_enabled) {
    throw createError({ statusCode: 403, statusMessage: 'Warteliste für diese Kursart ist nicht aktiv' })
  }

  // 2. Check for duplicate
  const { data: existing } = await supabase
    .from('course_waitlist')
    .select('id, status')
    .eq('category_code', category_code)
    .eq('tenant_id', tenant_id)
    .eq('email', email.toLowerCase().trim())
    .is('course_id', null)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'waiting' || existing.status === 'offered') {
      throw createError({ statusCode: 409, statusMessage: 'Sie sind bereits auf der Warteliste eingetragen' })
    }
    // Previously declined/expired → allow re-entry
    await supabase
      .from('course_waitlist')
      .update({ status: 'waiting', added_date: new Date().toISOString() })
      .eq('id', existing.id)
    return { success: true, message: `Sie wurden erneut auf die Warteliste für ${category.name} gesetzt.` }
  }

  // 3. Calculate position
  const { count } = await supabase
    .from('course_waitlist')
    .select('*', { count: 'exact', head: true })
    .eq('category_code', category_code)
    .eq('tenant_id', tenant_id)
    .is('course_id', null)
    .in('status', ['waiting', 'offered'])

  const position = (count || 0) + 1

  // 4. Insert
  const { data: entry, error: insertError } = await supabase
    .from('course_waitlist')
    .insert({
      category_code,
      course_id: null,
      tenant_id,
      first_name: first_name.trim(),
      last_name: '',
      email: email.toLowerCase().trim(),
      position,
      status: 'waiting',
      added_date: new Date().toISOString(),
    })
    .select('id, position')
    .single()

  if (insertError) {
    logger.error('❌ Category waitlist insert failed:', insertError.message)
    throw createError({ statusCode: 500, statusMessage: 'Eintragung fehlgeschlagen' })
  }

  // 5. Fetch tenant info for emails
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, contact_email, primary_color, logo_wide_url, logo_url, logo_square_url')
    .eq('id', tenant_id)
    .single()

  const tenantName = tenant?.name || 'Ihre Fahrschule'
  const logoUrl = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null
  const now = new Date().toISOString()
  const toQueue: any[] = []

  const { subject: confirmSubject, html: confirmHtml } = generateWaitlistConfirmationEmail({
    firstName: first_name.trim(),
    lastName: '',
    courseName: category.name,
    courseDescription: `Wir benachrichtigen Sie per E-Mail, sobald ein neuer ${category.name} verfügbar ist. Sie können sich dann direkt anmelden.`,
    position,
    tenantName,
    tenantEmail: tenant?.contact_email,
    primaryColor: tenant?.primary_color || undefined,
    logoUrl,
  })

  toQueue.push({
    tenant_id,
    channel: 'email',
    recipient_email: email.toLowerCase().trim(),
    subject: confirmSubject,
    body: confirmHtml,
    status: 'pending',
    send_at: now,
    context_data: {
      stage: 'category_waitlist_signup',
      entry_id: entry.id,
      category_code,
      category_name: category.name,
      tenant_name: tenantName,
    },
  })

  if (tenant?.contact_email) {
    const { subject: adminSubject, html: adminHtml } = generateAdminWaitlistNotificationEmail({
      participantFirstName: first_name.trim(),
      participantLastName: '',
      participantEmail: email,
      courseName: category.name,
      position,
      tenantName,
      primaryColor: tenant?.primary_color || undefined,
      logoUrl,
    })

    toQueue.push({
      tenant_id,
      channel: 'email',
      recipient_email: tenant.contact_email,
      subject: adminSubject,
      body: adminHtml,
      status: 'pending',
      send_at: now,
      context_data: {
        stage: 'category_waitlist_signup_admin',
        entry_id: entry.id,
        category_code,
        category_name: category.name,
        tenant_name: tenantName,
      },
    })
  }

  const { error: queueError } = await supabase.from('outbound_messages_queue').insert(toQueue)
  if (queueError) {
    logger.warn(`⚠️ Failed to queue waitlist emails: ${queueError.message}`)
  } else {
    logger.debug(`✅ Category waitlist signup: ${first_name} → ${category.name} (pos #${position})`)
  }

  return {
    success: true,
    position: entry.position,
    message: `Sie wurden auf die Warteliste für ${category.name} gesetzt. Wir melden uns, sobald ein neuer Kurs verfügbar ist.`,
  }
})
