// server/api/admin/wallee-activate.post.ts
// Super-admin only: set Wallee Space ID + User ID for a tenant and mark as active.
// Also handles the enable/disable toggle (deactivate: true = disable without wiping credentials).

import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (authUser.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Super-Admin role required' })
  }

  const { tenant_id, wallee_space_id, wallee_user_id, deactivate } = await readBody(event)
  if (!tenant_id) throw createError({ statusCode: 400, statusMessage: 'tenant_id erforderlich' })

  const supabase = getSupabaseAdmin()

  // ── Disable toggle (credentials stay intact) ───────────────────────────────
  if (deactivate) {
    const { error } = await supabase
      .from('tenants')
      .update({ wallee_enabled: false, updated_at: new Date().toISOString() })
      .eq('id', tenant_id)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true, message: 'Online-Zahlungen deaktiviert (Credentials bleiben erhalten)' }
  }

  // ── Full activation: requires Space ID + User ID ───────────────────────────
  if (!wallee_space_id || !wallee_user_id) {
    throw createError({ statusCode: 400, statusMessage: 'wallee_space_id und wallee_user_id erforderlich' })
  }

  const { error } = await supabase
    .from('tenants')
    .update({
      wallee_space_id:          parseInt(wallee_space_id),
      wallee_user_id:           parseInt(wallee_user_id),
      wallee_onboarding_status: 'active',
      wallee_enabled:           true,
      updated_at:               new Date().toISOString(),
    })
    .eq('id', tenant_id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Notify tenant by email
  try {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('contact_email, name')
      .eq('id', tenant_id)
      .single()

    if (tenant?.contact_email) {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@simy.ch',
        to: tenant.contact_email,
        subject: '✅ Online-Zahlungen aktiviert – simy.ch',
        html: `
          <h2>Online-Zahlungen sind jetzt aktiv!</h2>
          <p>Hallo ${tenant.name} Team,</p>
          <p>wir haben euer Wallee-Konto eingerichtet. Ab sofort können eure Kunden online per Karte, TWINT und mehr bezahlen.</p>
          <p>Ihr könnt die Online-Zahlungen in den Einstellungen jederzeit ein- und ausschalten.</p>
          <p>→ <a href="https://app.simy.ch/admin/profile">Zu den Zahlungseinstellungen</a></p>
          <p>Bei Fragen: <a href="mailto:info@simy.ch">info@simy.ch</a></p>
        `,
      })
    }
  } catch (e: any) {
    console.error('⚠️ Tenant activation email failed (non-fatal):', e.message)
  }

  return { success: true, message: `Online-Zahlungen für Tenant ${tenant_id} aktiviert` }
})
