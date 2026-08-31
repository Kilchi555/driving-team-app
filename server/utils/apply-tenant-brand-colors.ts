import { isStockEventTypeColor } from '~/server/utils/stock-event-type-color'
import { logger } from '~/utils/logger'

type AdminClient = {
  from: (table: string) => any
}

type PreviousColors = string | null | undefined | Array<string | null | undefined>

function normalizeHex(color: unknown): string {
  if (typeof color !== 'string') return ''
  return color.trim().toLowerCase()
}

export function shouldSyncEventTypeColor(color: unknown, previousColors?: PreviousColors): boolean {
  if (isStockEventTypeColor(color)) return true
  const hex = normalizeHex(color)
  if (!hex) return false
  const list = Array.isArray(previousColors) ? previousColors : [previousColors]
  return list.some((candidate) => hex === normalizeHex(candidate))
}

export async function applyTenantBrandColors(
  supabase: AdminClient,
  tenantId: string,
  colors: { primary: string; secondary: string; accent: string },
  options?: { previousColors?: PreviousColors },
): Promise<void> {
  const now = new Date().toISOString()
  let previousColors = options?.previousColors
  if (previousColors === undefined) {
    const { data: current } = await supabase
      .from('tenants')
      .select('primary_color, secondary_color, accent_color')
      .eq('id', tenantId)
      .maybeSingle()
    previousColors = [current?.primary_color, current?.secondary_color, current?.accent_color]
  }

  const { error: tenantErr } = await supabase
    .from('tenants')
    .update({
      primary_color: colors.primary,
      secondary_color: colors.secondary,
      accent_color: colors.accent,
      updated_at: now,
    })
    .eq('id', tenantId)
  if (tenantErr) {
    logger.warn('Could not apply tenant brand colors:', tenantErr)
    return
  }

  const { error: websiteErr } = await supabase
    .from('website_tenants')
    .update({
      primary_color: colors.primary,
      secondary_color: colors.secondary,
      accent_color: colors.accent,
      updated_at: now,
    })
    .eq('tenant_id', tenantId)
  if (websiteErr) {
    logger.warn('Could not sync website_tenants brand colors:', websiteErr)
  }

  const { data: eventTypes } = await supabase
    .from('event_types')
    .select('id, default_color')
    .eq('tenant_id', tenantId)
  const syncIds = (eventTypes || [])
    .filter((et: { default_color?: string | null }) => shouldSyncEventTypeColor(et.default_color, previousColors))
    .map((et: { id: string }) => et.id)
  if (syncIds.length > 0) {
    const { error: etErr } = await supabase
      .from('event_types')
      .update({ default_color: colors.primary, updated_at: now })
      .in('id', syncIds)
    if (etErr) logger.warn('Could not sync event_types brand colors:', etErr)
  }
}
