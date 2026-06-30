import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

/**
 * Cross-table import search.
 * Searches imported_customers, imported_invoices and imported_records
 * simultaneously and returns grouped results with computed summaries.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const query = getQuery(event)
  const q = (query.q as string | undefined)?.trim()
  const tenantId = query.tenantId as string | undefined

  if (!q || q.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'Suchbegriff muss mindestens 2 Zeichen lang sein' })
  }
  if (!tenantId) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId ist erforderlich' })
  }

  const supabase = getSupabaseAdmin()
  const like = `%${q}%`

  logger.debug('🔍 Import search:', { q, tenantId })

  // Run all three searches in parallel
  const [customersRes, invoicesRes, recordsRes] = await Promise.all([
    supabase
      .from('imported_customers')
      .select('id, legacy_id, phone, postal_code, raw_json, created_at')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .ilike('raw_text', like)
      .order('created_at', { ascending: false })
      .limit(50),

    supabase
      .from('imported_invoices')
      .select('id, legacy_id, currency, raw_json, created_at')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .ilike('raw_text', like)
      .order('created_at', { ascending: false })
      .limit(100),

    supabase
      .from('imported_records')
      .select('id, data_type, raw_json, created_at')
      .eq('tenant_id', tenantId)
      .ilike('raw_json::text', like)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  if (customersRes.error) logger.warn('customers search error:', customersRes.error.message)
  if (invoicesRes.error) logger.warn('invoices search error:', invoicesRes.error.message)
  if (recordsRes.error) logger.warn('records search error:', recordsRes.error.message)

  const customers = (customersRes.data ?? []).map((c) => ({
    id: c.id,
    legacyId: c.legacy_id,
    name: c.raw_json?.Name ?? null,
    email: c.raw_json?.['E-Mail'] ?? null,
    phone: c.phone ?? c.raw_json?.Telefon ?? null,
    city: c.raw_json?.Ort ?? null,
    postalCode: c.postal_code ?? c.raw_json?.PLZ ?? null,
    type: c.raw_json?.Art ?? null,
    importedAt: c.created_at,
  }))

  const invoices = (invoicesRes.data ?? []).map((inv) => ({
    id: inv.id,
    legacyId: inv.legacy_id,
    orderNumber: inv.raw_json?.Auftragsnummer ?? null,
    title: inv.raw_json?.Titel ?? null,
    student: inv.raw_json?.['Schüler'] ?? null,
    date: inv.raw_json?.Datum ?? null,
    status: inv.raw_json?.Status ?? null,
    paidAt: inv.raw_json?.['Bezahlt am'] ?? null,
    total: inv.raw_json?.['Total inkl. Mwst'] ?? null,
    outstanding: inv.raw_json?.['Betrag ausstehend'] ?? null,
    currency: inv.currency ?? 'CHF',
    createdBy: inv.raw_json?.['Erstellt von'] ?? null,
    importedAt: inv.created_at,
  }))

  // Group generic records by data_type
  const recordsByType: Record<string, any[]> = {}
  for (const rec of recordsRes.data ?? []) {
    const type = rec.data_type ?? 'Unbekannt'
    if (!recordsByType[type]) recordsByType[type] = []
    recordsByType[type].push({ id: rec.id, data: rec.raw_json, importedAt: rec.created_at })
  }

  // Compute lesson summary if appointments are present
  let lessonSummary: { count: number; totalMinutes: number; lektionen45: number } | null = null
  const appointments = recordsByType['appointments'] ?? []
  if (appointments.length > 0) {
    let totalMinutes = 0
    for (const apt of appointments) {
      const zeit: string = apt.data?.Zeit ?? ''
      const hMatch = zeit.match(/(\d+)h/)
      const mMatch = zeit.match(/(\d+)m/)
      totalMinutes += (hMatch ? parseInt(hMatch[1]) * 60 : 0) + (mMatch ? parseInt(mMatch[1]) : 0)
    }
    lessonSummary = {
      count: appointments.length,
      totalMinutes,
      lektionen45: Math.round((totalMinutes / 45) * 100) / 100,
    }
  }

  return {
    success: true,
    query: q,
    totals: {
      customers: customers.length,
      invoices: invoices.length,
      records: (recordsRes.data ?? []).length,
    },
    customers,
    invoices,
    recordsByType,
    lessonSummary,
  }
})
