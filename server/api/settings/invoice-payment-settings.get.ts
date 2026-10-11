/**
 * GET /api/settings/invoice-payment-settings
 * Returns invoice ("Rechnung") payment settings for the current tenant.
 * Accessible to all authenticated users (staff + customers), and also to
 * anonymous guests on the public booking page via `?slug=<tenant-slug>`
 * (no sensitive data is returned — just feature flags).
 *
 * Scoped keys:
 *   - course_invoice_payments_enabled → public course enrollment
 *   - individual_appointment_invoice_payments_enabled → public appointment booking
 * Legacy invoice_payments_enabled is returned raw and used as fallback when a
 * scoped key is absent (never treat a missing scoped key as false).
 */
import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  COURSE_INVOICE_PAYMENTS_KEY,
  APPOINTMENT_INVOICE_PAYMENTS_KEY,
  LEGACY_INVOICE_PAYMENTS_KEY,
  parsePaymentSettings,
  resolveCourseInvoicePaymentsEnabled,
  resolveIndividualAppointmentInvoicePaymentsEnabled,
} from '~/server/utils/tenant-default-payment-method'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  const supabase = getSupabaseAdmin()

  let tenantId = authUser?.tenant_id as string | undefined

  if (!tenantId) {
    // Anonymous guest on the public booking page: resolve tenant via slug instead.
    const { slug } = getQuery(event)
    if (!slug || typeof slug !== 'string') {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single()
    if (!tenant) throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
    tenantId = tenant.id
  }

  const { data } = await supabase
    .from('tenant_settings')
    .select('setting_value')
    .eq('tenant_id', tenantId as string)
    .eq('category', 'payment')
    .eq('setting_key', 'payment_settings')
    .maybeSingle()

  const settings = parsePaymentSettings(data?.setting_value)
  const courseEnabled = resolveCourseInvoicePaymentsEnabled(settings)
  const appointmentEnabled = resolveIndividualAppointmentInvoicePaymentsEnabled(settings)

  return {
    // Legacy raw flag (compat). Prefer the scoped resolved fields below.
    [LEGACY_INVOICE_PAYMENTS_KEY]: settings[LEGACY_INVOICE_PAYMENTS_KEY] === true,
    // Resolved effective flags (explicit scoped key, else legacy fallback).
    [COURSE_INVOICE_PAYMENTS_KEY]: courseEnabled,
    [APPOINTMENT_INVOICE_PAYMENTS_KEY]: appointmentEnabled,
  }
})
