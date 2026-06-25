// server/api/admin/wallee-activate.post.ts
// Super-admin only: set Wallee credentials for a tenant and mark as active.
// Saves Space ID + User ID in the tenants table AND the API secret in tenant_secrets
// — all in one atomic operation so the tenant is always fully configured.
// Also handles the enable/disable toggle (deactivate: true = disable without wiping credentials).

import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { encryptSecret } from '~/server/utils/encryption'
import { invalidateWalleeConfigCache } from '~/server/utils/wallee-config'
import { clearProviderCache } from '~/server/payment-providers/factory'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (authUser.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Super-Admin role required' })
  }

  const { tenant_id, wallee_space_id, wallee_user_id, wallee_secret_key, deactivate } = await readBody(event)
  if (!tenant_id) throw createError({ statusCode: 400, statusMessage: 'tenant_id erforderlich' })

  const supabase = getSupabaseAdmin()

  // ── Disable toggle (credentials stay intact) ───────────────────────────────
  if (deactivate) {
    const { error } = await supabase
      .from('tenants')
      .update({ wallee_enabled: false, updated_at: new Date().toISOString() })
      .eq('id', tenant_id)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    invalidateWalleeConfigCache(tenant_id)
    clearProviderCache(tenant_id)
    return { success: true, message: 'Online-Zahlungen deaktiviert (Credentials bleiben erhalten)' }
  }

  // ── Full activation: requires Space ID + User ID + Secret ─────────────────
  if (!wallee_space_id || !wallee_user_id) {
    throw createError({ statusCode: 400, statusMessage: 'wallee_space_id und wallee_user_id erforderlich' })
  }
  if (!wallee_secret_key?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'wallee_secret_key (API Secret) ist erforderlich' })
  }

  // 1. Update tenants table (non-secret IDs)
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

  // 2. Store all three credentials encrypted in tenant_secrets so wallee-config
  //    can load them without any env-var fallback
  const secretsToUpsert = [
    { secret_name: 'wallee_space_id',   secret_value: String(wallee_space_id) },
    { secret_name: 'wallee_user_id',    secret_value: String(wallee_user_id) },
    { secret_name: 'wallee_secret_key', secret_value: wallee_secret_key.trim() },
  ].map(({ secret_name, secret_value }) => ({
    tenant_id,
    secret_type: 'wallee_api_key',
    secret_name,
    secret_value: encryptSecret(secret_value),
    updated_at: new Date().toISOString(),
  }))

  const { error: secretsError } = await supabase
    .from('tenant_secrets')
    .upsert(secretsToUpsert, { onConflict: 'tenant_id,secret_type,secret_name' })

  if (secretsError) {
    // Roll back the tenants update to keep the state consistent
    await supabase
      .from('tenants')
      .update({ wallee_enabled: false, wallee_onboarding_status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', tenant_id)
    throw createError({ statusCode: 500, statusMessage: `Credentials konnten nicht gespeichert werden: ${secretsError.message}` })
  }

  // 3. Invalidate in-process credential caches so new credentials take effect immediately
  invalidateWalleeConfigCache(tenant_id)
  clearProviderCache(tenant_id)
  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY
    if (stripeSecret) {
      const { data: tenantForStripe } = await supabase
        .from('tenants')
        .select('stripe_customer_id, stripe_subscription_id')
        .eq('id', tenant_id)
        .single()

      const subId = tenantForStripe?.stripe_subscription_id
      if (subId) {
        const Stripe = (await import('stripe')).default
        const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' as any })
        const sub = await stripe.subscriptions.retrieve(subId)
        if (sub.status === 'trialing') {
          await stripe.subscriptions.update(subId, { trial_end: 'now' })
          console.log(`✅ Stripe trial ended for tenant ${tenant_id} (sub ${subId})`)
        }
      }
    }
  } catch (stripeErr: any) {
    console.error('⚠️ Could not end Stripe trial (non-fatal):', stripeErr.message)
  }

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
