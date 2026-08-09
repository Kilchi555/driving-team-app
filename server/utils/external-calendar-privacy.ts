import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

/**
 * Tenant setting: whether external calendar event titles are stored as "Privat".
 * Default false (show real titles) when the setting is missing.
 *
 * category: calendar
 * setting_key: anonymize_external_event_titles
 * setting_type: boolean
 */
export async function shouldAnonymizeExternalEventTitles(
  supabase: SupabaseClient,
  tenantId: string,
  cache?: Map<string, boolean>,
): Promise<boolean> {
  if (cache?.has(tenantId)) return cache.get(tenantId)!

  const { data, error } = await supabase
    .from('tenant_settings')
    .select('setting_value')
    .eq('tenant_id', tenantId)
    .eq('category', 'calendar')
    .eq('setting_key', 'anonymize_external_event_titles')
    .maybeSingle()

  if (error) {
    logger.warn('⚠️ Could not load anonymize_external_event_titles, defaulting to false:', error.message)
  }

  let anonymize = false
  if (data?.setting_value != null) {
    const raw = String(data.setting_value).trim().toLowerCase()
    // Accept plain "true"/"false" and JSON-quoted booleans / 0/1
    anonymize = raw === 'true' || raw === '1' || raw === '"true"'
  }

  cache?.set(tenantId, anonymize)
  return anonymize
}

/** Resolve the title to store for an external busy event. */
export function resolveExternalEventTitle(
  summary: string | undefined | null,
  anonymize: boolean,
): string {
  if (anonymize) return 'Privat'
  const title = (summary || '').replace(/[\u0000-\u001f\u007f]/g, '').trim()
  if (!title) return 'Privat'
  return title.slice(0, 255)
}
