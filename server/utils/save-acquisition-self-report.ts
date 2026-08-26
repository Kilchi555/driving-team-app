import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { stampFirstTouchAcquisition } from '~/server/utils/first-touch-acquisition'
import { logger } from '~/utils/logger'
import { normalizeAcquisitionSelfReport } from '~/utils/acquisition-self-report'

export type SaveSelfReportResult =
  | 'saved'
  | 'skipped_empty'
  | 'skipped_invalid'
  | 'failed'

export async function saveAcquisitionSelfReport(params: {
  userId: string
  tenantId: string
  source?: unknown
  note?: unknown
  /** If first-touch is still empty, stamp source/self_reported. Never overwrites ads. */
  fillFirstTouchIfEmpty?: boolean
  supabase?: SupabaseClient
}): Promise<SaveSelfReportResult> {
  if (params.source == null || params.source === '') return 'skipped_empty'
  const parsed = normalizeAcquisitionSelfReport(params.source, params.note)
  if (!parsed) return 'skipped_invalid'

  const supabase = params.supabase ?? getSupabaseAdmin()

  const { data: existing, error: lookupError } = await supabase
    .from('users')
    .select('acquisition_self_reported_at')
    .eq('id', params.userId)
    .eq('tenant_id', params.tenantId)
    .maybeSingle()

  if (lookupError || !existing) {
    logger.warn('self-report: user lookup failed', lookupError?.message)
    return 'failed'
  }

  const { error } = await supabase
    .from('users')
    .update({
      acquisition_self_reported: parsed.source,
      acquisition_self_reported_note: parsed.note,
      acquisition_self_reported_at: existing.acquisition_self_reported_at ?? new Date().toISOString(),
    })
    .eq('id', params.userId)
    .eq('tenant_id', params.tenantId)

  if (error) {
    logger.warn('self-report: update failed', error.message)
    return 'failed'
  }

  if (params.fillFirstTouchIfEmpty) {
    try {
      await stampFirstTouchAcquisition({
        userId: params.userId,
        tenantId: params.tenantId,
        fallbackSource: parsed.source,
        fallbackMedium: 'self_reported',
        supabase,
      })
    } catch (err: any) {
      logger.warn('self-report: first-touch fill failed', err?.message ?? err)
    }
  }

  return 'saved'
}
