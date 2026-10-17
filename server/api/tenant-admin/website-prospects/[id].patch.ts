import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { WEBSITE_PROSPECT_STATUSES } from '~/server/utils/website-prospect-types'
import {
  isAllowedProspectVatRate,
  mergeVatSelectionIntoAnalysis,
} from '~/server/utils/website-prospect-vat'

export default defineEventHandler(async (event) => {
  const auth = await requireSuperAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })

  const body = (await readBody(event)) || {}
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.status) {
    if (!WEBSITE_PROSPECT_STATUSES.includes(body.status)) {
      throw createError({ statusCode: 400, statusMessage: 'Ungültiger Status' })
    }
    patch.status = body.status
    if (['approved', 'skipped', 'rejected'].includes(body.status)) {
      patch.reviewed_at = new Date().toISOString()
      patch.reviewed_by = auth.id
    }
    if (body.status === 'approved') patch.email_approved_at = new Date().toISOString()
  }
  if (typeof body.notes === 'string') patch.notes = body.notes
  if (body.email_draft && typeof body.email_draft === 'object') {
    patch.email_draft = {
      subject: String(body.email_draft.subject || ''),
      text: String(body.email_draft.text || ''),
      html: String(body.email_draft.html || ''),
    }
  }

  const vatRaw = body.vat_rate_percent ?? body.vatRatePercent
  const supabase = getSupabaseAdmin()

  if (vatRaw !== undefined && vatRaw !== null && vatRaw !== '') {
    const rate = Number(vatRaw)
    if (!isAllowedProspectVatRate(rate)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Ungültiger MwSt-Satz. Erlaubt: 0, 2.6, 3.8, 8.1.',
      })
    }
    const { data: current, error: loadError } = await supabase
      .from('website_prospects')
      .select('analysis')
      .eq('id', id)
      .maybeSingle()
    if (loadError) throw createError({ statusCode: 500, statusMessage: loadError.message })
    if (!current) throw createError({ statusCode: 404, statusMessage: 'Prospect nicht gefunden' })
    patch.analysis = mergeVatSelectionIntoAnalysis(current.analysis || {}, {
      rate_percent: rate,
      source: 'explicit_selection',
      selected_at: new Date().toISOString(),
    })
  }

  const { data, error } = await supabase
    .from('website_prospects')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, prospect: data }
})
