/**
 * POST /api/courses/category-waitlist-signup
 * Public endpoint – no auth required.
 * Adds a user to the category-based waitlist (e.g. CZV-G, Fahrlehrer, CZV).
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServiceCredentials } from '~/server/utils/supabase-service-env'
import { uploadInquiryConversionViaSimy, type WebsiteMarketingAttributionPayload } from '~/server/utils/google-ads-inquiry-upload'

/** Waitlist signups are a soft, early-funnel signal — valued lower than a full inquiry/registration. */
const WAITLIST_CONVERSION_VALUE_CHF = 15

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { category_code, first_name, email, tenant_id, marketing_attribution } = body

  if (!category_code || !first_name || !email || !tenant_id) {
    throw createError({ statusCode: 400, statusMessage: 'Fehlende Pflichtfelder' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige E-Mail-Adresse' })
  }

  const { supabaseUrl, supabaseServiceKey } = getSupabaseServiceCredentials(event)
  if (!supabaseUrl || !supabaseServiceKey) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase not configured' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // 1. Verify category exists and has waitlist enabled
  const { data: category, error: catError } = await supabase
    .from('course_categories')
    .select('id, name, waitlist_enabled')
    .eq('code', category_code)
    .eq('tenant_id', tenant_id)
    .maybeSingle()

  if (catError || !category) {
    throw createError({ statusCode: 404, statusMessage: 'Kursart nicht gefunden' })
  }

  if (!category.waitlist_enabled) {
    throw createError({ statusCode: 403, statusMessage: 'Warteliste für diese Kursart ist nicht aktiv' })
  }

  // 2. Duplicate check
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
    await supabase
      .from('course_waitlist')
      .update({ status: 'waiting', added_date: new Date().toISOString() })
      .eq('id', existing.id)
    return { success: true, message: `Sie wurden erneut auf die Warteliste für ${category.name} gesetzt.` }
  }

  // 3. Position
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
    throw createError({ statusCode: 500, statusMessage: 'Eintragung fehlgeschlagen' })
  }

  // 5. Queue confirmation email
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, contact_email, primary_color, logo_wide_url, logo_url, logo_square_url')
    .eq('id', tenant_id)
    .single()

  const tenantName = tenant?.name || 'Driving Team'
  const primaryColor = tenant?.primary_color || '#019ee5'
  const logoUrl = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null
  const now = new Date().toISOString()

  const logoHtml = logoUrl
    ? `<tr><td style="background:#fff;text-align:center;padding:20px 40px 0"><img src="${logoUrl}" alt="${tenantName}" style="height:44px;max-width:200px;object-fit:contain"></td></tr>`
    : ''

  const confirmHtml = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
      ${logoHtml}
      <tr><td style="background:${primaryColor};padding:32px 40px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">Warteliste bestätigt ✓</h1>
        <p style="color:rgba(255,255,255,.75);margin:8px 0 0;font-size:14px;">${tenantName}</p>
      </td></tr>
      <tr><td style="padding:40px;">
        <p style="font-size:16px;color:#111827;margin:0 0 16px;">Hallo ${first_name.trim()}</p>
        <p style="font-size:15px;color:#374151;margin:0 0 24px;">Du bist auf der Warteliste für <strong>${category.name}</strong> eingetragen (Position #${position}).</p>
        <p style="font-size:14px;color:#6b7280;margin:0;">Sobald ein neuer Kurs verfügbar ist, informieren wir dich per E-Mail mit einem direkten Buchungslink.</p>
      </td></tr>
      <tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
        <p style="font-size:12px;color:#9ca3af;margin:0;text-align:center;">${tenantName} · Diese E-Mail wurde gesendet, weil du dich auf die Warteliste eingetragen hast.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`

  const toQueue: any[] = [{
    tenant_id,
    channel: 'email',
    recipient_email: email.toLowerCase().trim(),
    subject: `Warteliste bestätigt: ${category.name}`,
    body: confirmHtml,
    status: 'pending',
    send_at: now,
    context_data: { stage: 'category_waitlist_signup', entry_id: entry.id, category_code },
  }]

  if (tenant?.contact_email) {
    toQueue.push({
      tenant_id,
      channel: 'email',
      recipient_email: tenant.contact_email,
      subject: `Neue Wartelisten-Anmeldung: ${category.name}`,
      body: `<p>${first_name.trim()} (${email}) hat sich auf die Warteliste für <strong>${category.name}</strong> eingetragen (Position #${position}).</p>`,
      status: 'pending',
      send_at: now,
      context_data: { stage: 'category_waitlist_signup_admin', entry_id: entry.id, category_code },
    })
  }

  await supabase.from('outbound_messages_queue').insert(toQueue)

  // Server-side Google Ads inquiry conversion (fire-and-forget)
  ;(async () => {
    await uploadInquiryConversionViaSimy(event, {
      entity_id: `waitlist_${entry.id}`,
      marketing_attribution: (marketing_attribution ?? null) as WebsiteMarketingAttributionPayload | null,
      email,
      conversion_value_chf: WAITLIST_CONVERSION_VALUE_CHF,
    })
  })()

  return {
    success: true,
    position: entry.position,
    message: `Du bist auf der Warteliste für ${category.name}. Wir melden uns, sobald ein neuer Kurs verfügbar ist.`,
  }
})
