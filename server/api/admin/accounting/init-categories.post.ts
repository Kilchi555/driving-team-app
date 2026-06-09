import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

const DEFAULT_CATEGORIES = [
  // Einnahmen
  { name: 'Fahrstunden', type: 'income', color: '#10b981' },
  { name: 'Kurse', type: 'income', color: '#059669' },
  { name: 'Produkte & Materialien', type: 'income', color: '#34d399' },
  { name: 'Sonstige Einnahmen', type: 'income', color: '#6ee7b7' },
  // Ausgaben
  { name: 'Lohnaufwand', type: 'expense', color: '#ef4444' },
  { name: 'Fahrzeugkosten', type: 'expense', color: '#f97316' },
  { name: 'Miete & Raumkosten', type: 'expense', color: '#f59e0b' },
  { name: 'Versicherungen', type: 'expense', color: '#eab308' },
  { name: 'Marketing & Werbung', type: 'expense', color: '#84cc16' },
  { name: 'Büro & Verwaltung', type: 'expense', color: '#06b6d4' },
  { name: 'IT & Software', type: 'expense', color: '#6366f1' },
  { name: 'Aus- & Weiterbildung', type: 'expense', color: '#8b5cf6' },
  { name: 'Steuern & Abgaben', type: 'expense', color: '#ec4899' },
  { name: 'Sonstige Ausgaben', type: 'expense', color: '#94a3b8' },
] as const

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const { data: existing } = await supabase
    .from('accounting_categories')
    .select('id')
    .eq('tenant_id', profile.tenant_id)
    .limit(1)

  if (existing && existing.length > 0) {
    return { success: true, message: 'Kategorien bereits vorhanden', created: 0 }
  }

  const toInsert = DEFAULT_CATEGORIES.map(c => ({ ...c, tenant_id: profile.tenant_id }))

  const { data, error } = await supabase
    .from('accounting_categories')
    .insert(toInsert)
    .select()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true, created: data?.length ?? 0 }
})
