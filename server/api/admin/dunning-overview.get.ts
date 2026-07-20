// server/api/admin/dunning-overview.get.ts
// Liefert alle überfälligen, unbezahlten Rechnungen des Tenants inkl. der
// vorgeschlagenen nächsten Mahnstufe — Datengrundlage für das
// Mahnwesen-Dashboard (pages/admin/dunning.vue).
//
// Fragt bewusst die invoices-Basistabelle direkt an (statt invoices_with_details):
// die View wurde vor Einführung der dunning_*-Spalten erstellt und ein SELECT i.*
// wird beim Anlegen einer View fixiert, enthält die neuen Spalten also nicht.

import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  DUNNING_SETTINGS_DEFAULTS, daysOverdue, suggestedNextStage, getStageDef,
} from '~/server/utils/invoice-dunning'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const todayIso = new Date().toISOString().slice(0, 10)

  const [{ data: settingsRow }, { data: platformSettingsRow }] = await Promise.all([
    supabase.from('dunning_settings').select('*').eq('tenant_id', profile.tenant_id).maybeSingle(),
    supabase.from('dunning_settings').select('*').is('tenant_id', null).maybeSingle(),
  ])
  const settings = { ...DUNNING_SETTINGS_DEFAULTS, ...(platformSettingsRow || {}), ...(settingsRow || {}) }

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, invoice_date, due_date, dunning_due_date, status, payment_status, total_amount_rappen, paid_amount_rappen, billing_email, billing_company_name, dunning_level, dunning_paused, last_dunning_sent_at, customer:users!user_id(first_name, last_name, email)')
    .eq('tenant_id', profile.tenant_id)
    .lt('due_date', todayIso)
    .not('status', 'in', '("paid","cancelled","draft")')
    .neq('payment_status', 'paid')
    .order('due_date', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const candidates = (invoices || []).map((inv: any) => {
    const outstandingRappen = Math.max(0, (inv.total_amount_rappen || 0) - (inv.paid_amount_rappen || 0))
    // Stufen-Fristen beziehen sich auf das Original-Fälligkeitsdatum; Anzeige nutzt das aktuelle Zahlungsziel
    const overdueDays = daysOverdue(inv.due_date)
    const currentLevel = inv.dunning_level || 0
    const nextStage = inv.dunning_paused ? 0 : suggestedNextStage(overdueDays, currentLevel, settings)
    const nextStageDef = nextStage ? getStageDef(nextStage) : null
    const currentStageDef = currentLevel ? getStageDef(currentLevel) : null
    const customer = inv.customer || {}
    const effectiveDue = inv.dunning_due_date || inv.due_date
    return {
      id: inv.id,
      invoice_number: inv.invoice_number,
      due_date: effectiveDue,
      original_due_date: inv.due_date,
      dunning_due_date: inv.dunning_due_date || null,
      invoice_date: inv.invoice_date,
      customer_name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || inv.billing_company_name || '—',
      billing_email: inv.billing_email || customer.email || null,
      total_amount_rappen: inv.total_amount_rappen,
      outstanding_rappen: outstandingRappen,
      overdue_days: overdueDays,
      dunning_level: currentLevel,
      dunning_level_label: currentStageDef?.shortLabel || null,
      dunning_paused: !!inv.dunning_paused,
      last_dunning_sent_at: inv.last_dunning_sent_at,
      next_stage: nextStage || null,
      next_stage_label: nextStageDef?.label || null,
      status: inv.status,
      payment_status: inv.payment_status,
    }
  }).filter((c: any) => c.outstanding_rappen > 0)

  const summary = {
    total: candidates.length,
    actionable: candidates.filter((c: any) => c.next_stage).length,
    paused: candidates.filter((c: any) => c.dunning_paused).length,
    total_outstanding_rappen: candidates.reduce((sum: number, c: any) => sum + c.outstanding_rappen, 0),
    by_next_stage: {
      1: candidates.filter((c: any) => c.next_stage === 1).length,
      2: candidates.filter((c: any) => c.next_stage === 2).length,
      3: candidates.filter((c: any) => c.next_stage === 3).length,
    },
  }

  return { candidates, summary, settings }
})
