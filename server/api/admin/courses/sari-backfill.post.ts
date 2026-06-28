/**
 * POST /api/admin/courses/sari-backfill
 * 
 * Backfills missing personal data (street, zip, city, birthdate) on
 * course_registrations that have a sari_faberid by calling SARI's
 * getCustomer API.
 * 
 * Birthdate is sourced from payments.metadata.sari_birthdate when missing.
 * 
 * Body: { dryRun?: boolean } — if true, returns what would be updated without writing
 */
import { defineEventHandler, readBody } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getSARICredentialsSecure } from '~/server/utils/sari-credentials-secure'
import { SARIClient } from '~/utils/sariClient'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event).catch(() => ({}))
  const dryRun = body?.dryRun === true

  const supabase = getSupabaseAdmin()

  // 1. Load all registrations with missing data where we can get birthdate from payment
  const { data: rows, error } = await supabase
    .from('course_registrations')
    .select(`
      id, sari_faberid, birthdate, street, zip, city, street_nr,
      tenant_id, first_name, last_name,
      payment:payments!course_registrations_payment_id_fkey(metadata)
    `)
    .eq('tenant_id', profile.tenant_id)
    .not('sari_faberid', 'is', null)
    .is('deleted_at', null)

  if (error) {
    return { success: false, error: error.message }
  }

  // Filter to rows that are missing at least one field AND have a recoverable birthdate
  const candidates = (rows || []).filter((r: any) => {
    const missingData = !r.street || !r.birthdate || !r.zip || !r.city
    if (!missingData) return false
    // Need birthdate either from the row itself or from payment metadata
    const birthdate = r.birthdate || r.payment?.metadata?.sari_birthdate
    return !!birthdate
  })

  if (candidates.length === 0) {
    return { success: true, updated: 0, skipped: 0, errors: 0, message: 'Keine Registrierungen zum Ergänzen gefunden.' }
  }

  // 2. Load SARI credentials for this tenant
  const credentials = await getSARICredentialsSecure(profile.tenant_id, 'SARI_BACKFILL').catch(() => null)
  if (!credentials) {
    return { success: false, error: 'SARI-Zugangsdaten nicht konfiguriert für diesen Tenant.' }
  }

  const sari = new SARIClient(credentials)

  const results = { updated: 0, skipped: 0, errors: 0, details: [] as any[] }

  for (const reg of candidates) {
    const faberid = reg.sari_faberid.replace(/\./g, '')
    const birthdate = reg.birthdate || (reg.payment as any)?.metadata?.sari_birthdate

    try {
      const customer = await sari.getCustomer(faberid, birthdate)

      const updates: Record<string, any> = {}

      if (!reg.birthdate && birthdate) updates.birthdate = birthdate
      if (!reg.street && customer.address) updates.street = customer.address
      if (!reg.zip && customer.zip) updates.zip = String(customer.zip)
      if (!reg.city && customer.city) updates.city = customer.city
      // SARI returns address as a combined string — no separate street_nr

      if (Object.keys(updates).length === 0) {
        results.skipped++
        results.details.push({ id: reg.id, name: `${reg.first_name} ${reg.last_name}`, status: 'skipped', reason: 'Bereits vollständig' })
        continue
      }

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('course_registrations')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', reg.id)

        if (updateError) {
          results.errors++
          results.details.push({ id: reg.id, name: `${reg.first_name} ${reg.last_name}`, status: 'error', error: updateError.message })
          continue
        }
      }

      results.updated++
      results.details.push({
        id: reg.id,
        name: `${reg.first_name} ${reg.last_name}`,
        status: dryRun ? 'would_update' : 'updated',
        fields: Object.keys(updates),
        values: updates
      })

      // Small delay to avoid hammering SARI API
      await new Promise(r => setTimeout(r, 200))

    } catch (err: any) {
      logger.warn(`⚠️ SARI backfill failed for ${faberid}:`, err.message)
      results.errors++
      results.details.push({ id: reg.id, name: `${reg.first_name} ${reg.last_name}`, status: 'error', error: err.message })
    }
  }

  logger.info(`✅ SARI backfill complete: ${results.updated} updated, ${results.skipped} skipped, ${results.errors} errors`)

  return {
    success: true,
    dryRun,
    candidates: candidates.length,
    ...results,
    message: dryRun
      ? `Dry-run: ${results.updated} würden aktualisiert, ${results.skipped} bereits vollständig, ${results.errors} Fehler.`
      : `${results.updated} Registrierungen aktualisiert, ${results.skipped} bereits vollständig, ${results.errors} Fehler.`
  }
})
