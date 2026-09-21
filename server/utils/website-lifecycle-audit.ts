export const WEBSITE_LIFECYCLE_EVENTS = [
  'website_generated',
  'website_claimed',
  'checkout_started',
  'payment_confirmed',
  'qa_passed',
  'published',
  'rollback',
  'unpublished',
] as const

export type WebsiteLifecycleEventName = (typeof WEBSITE_LIFECYCLE_EVENTS)[number]

const SECRET_KEY = /preview_token|claim_token|password|session|secret|authorization|cookie|stripe_signature/i

export function sanitizeWebsiteAuditMetadata(input: Record<string, unknown> | null | undefined) {
  const clean: Record<string, unknown> = {}
  if (!input) return clean
  for (const [key, value] of Object.entries(input)) {
    if (SECRET_KEY.test(key)) continue
    if (typeof value === 'string' && SECRET_KEY.test(value)) continue
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      clean[key] = sanitizeWebsiteAuditMetadata(value as Record<string, unknown>)
      continue
    }
    clean[key] = value
  }
  return clean
}

export function isMissingWebsiteRelation(error: { code?: string; message?: string } | null | undefined) {
  const message = String(error?.message || '')
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    /website_revisions|website_lifecycle_events|published_revision_id|schema cache|does not exist/i.test(message)
  )
}

export async function recordWebsiteLifecycleEvent(opts: {
  supabase: { from: (table: string) => any }
  event: WebsiteLifecycleEventName
  websiteId?: string | null
  tenantId?: string | null
  revisionId?: string | null
  actorId?: string | null
  metadata?: Record<string, unknown>
}): Promise<{ recorded: boolean; skipped: boolean }> {
  const { error } = await opts.supabase.from('website_lifecycle_events').insert({
    event: opts.event,
    website_id: opts.websiteId || null,
    tenant_id: opts.tenantId || null,
    revision_id: opts.revisionId || null,
    actor_id: opts.actorId || null,
    metadata: sanitizeWebsiteAuditMetadata(opts.metadata),
  })
  if (!error) return { recorded: true, skipped: false }
  if (isMissingWebsiteRelation(error)) return { recorded: false, skipped: true }
  throw new Error(error.message || 'website lifecycle audit insert failed')
}
