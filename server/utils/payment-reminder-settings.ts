// server/utils/payment-reminder-settings.ts
// ============================================================
// Shared helper for the payment-reminder crons (send-payment-reminders,
// send-overdue-payment-reminders, send-admin-payment-report,
// send-staff-payment-report). Lets admins opt individual payment methods
// in/out of the direct customer reminders and the weekly admin/staff
// summary reports, via tenant_settings (category='payment',
// setting_key='payment_reminder_settings' — configured in
// pages/admin/profile.vue).
//
// Defaults below match the previously hardcoded cron behavior exactly, so
// tenants without an explicit setting see no change in behavior.
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js'

export interface PaymentReminderSettings {
  customer_reminders: Record<string, boolean>
  admin_report: { enabled: boolean } & Record<string, boolean>
  staff_report: { enabled: boolean } & Record<string, boolean>
}

export const PAYMENT_REMINDER_DEFAULTS: PaymentReminderSettings = {
  // Previously hardcoded: only wallee got direct customer reminders.
  customer_reminders: { wallee: true, invoice: false, cash: false, twint: false },
  // Previously hardcoded: admin report covered every method, always on.
  admin_report: { enabled: true, wallee: true, invoice: true, cash: true, twint: true },
  // Previously hardcoded: staff report covered every method, always on.
  staff_report: { enabled: true, wallee: true, invoice: true, cash: true, twint: true },
}

/**
 * Loads payment reminder settings for the given tenants and returns a map
 * of tenant_id -> settings, with missing tenants/fields filled from defaults.
 */
export async function loadPaymentReminderSettingsByTenant(
  supabase: SupabaseClient,
  tenantIds: string[]
): Promise<Map<string, PaymentReminderSettings>> {
  const map = new Map<string, PaymentReminderSettings>()
  if (tenantIds.length === 0) return map

  const { data } = await supabase
    .from('tenant_settings')
    .select('tenant_id, setting_value')
    .eq('category', 'payment')
    .eq('setting_key', 'payment_reminder_settings')
    .in('tenant_id', tenantIds)

  const rowsByTenant = new Map<string, any>((data || []).map((r: any) => [r.tenant_id, r.setting_value]))

  for (const tenantId of tenantIds) {
    const raw = rowsByTenant.get(tenantId)
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw || {})

    map.set(tenantId, {
      customer_reminders: { ...PAYMENT_REMINDER_DEFAULTS.customer_reminders, ...parsed.customer_reminders },
      admin_report: { ...PAYMENT_REMINDER_DEFAULTS.admin_report, ...parsed.admin_report },
      staff_report: { ...PAYMENT_REMINDER_DEFAULTS.staff_report, ...parsed.staff_report },
    })
  }

  return map
}
