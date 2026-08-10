/**
 * Resolve marketing click IDs for conversion upload.
 *
 * Prefer client-provided attribution, then marketing_attributions by session,
 * then booking_redirects (cross-domain funnel from drivingteam.ch).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  mergeAttributionFields,
  hasClickId,
  type AttributionFields,
} from '~/server/utils/marketing-attribution-merge'

const ATTR_SELECT =
  'gclid, gbraid, wbraid, fbclid, fbc, fbp, utm_source, utm_medium, utm_campaign, utm_content, utm_term'

/**
 * Merge client payload + DB attribution + booking_redirects fallback.
 * Always safe to call — returns {} when nothing is found.
 */
export async function resolveMarketingAttribution(
  supabase: SupabaseClient,
  sessionId?: string | null,
  clientAttr?: AttributionFields | null,
): Promise<AttributionFields> {
  let merged = mergeAttributionFields(null, clientAttr)

  if (!sessionId) return merged

  const { data: attrRow } = await supabase
    .from('marketing_attributions')
    .select(ATTR_SELECT)
    .eq('session_id', sessionId)
    .maybeSingle()

  if (attrRow) {
    merged = mergeAttributionFields(attrRow, merged)
  }

  if (!hasClickId(merged)) {
    const { data: redirectRow } = await supabase
      .from('booking_redirects')
      .select('gclid, gbraid, wbraid, utm_source, utm_medium, utm_campaign, utm_content, utm_term')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (redirectRow) {
      merged = mergeAttributionFields(merged, redirectRow)
    }
  }

  return merged
}
