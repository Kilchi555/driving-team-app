/**
 * Upsert marketing leads safely from product events (register, courses, booking).
 * - Unique on (tenant_id, email)
 * - Merges categories/tags (union), never replaces wholesale
 * - Never re-activates unsubscribed / bounced
 * - Never throws into the caller flow (fire-and-forget safe)
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import logger from '~/utils/logger'

export interface UpsertMarketingLeadInput {
  tenantId: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  /** Categories to merge (e.g. B, VKU, PGS) */
  categories?: string[] | null
  /** Tags to merge (e.g. client) */
  tags?: string[] | null
  /** Only set on insert */
  source?: string
  sourceLabel?: string | null
  supabase?: SupabaseClient
}

function normalizeEmail(email?: string | null): string | null {
  const e = (email || '').trim().toLowerCase()
  if (!e || !e.includes('@')) return null
  return e
}

function normalizeList(list?: string[] | null): string[] {
  if (!Array.isArray(list)) return []
  return [...new Set(list.map(c => String(c || '').trim()).filter(Boolean))]
}

function union(a: string[] | null | undefined, b: string[]): string[] {
  return [...new Set([...(a || []), ...b])]
}

export async function upsertMarketingLead(input: UpsertMarketingLeadInput): Promise<{ id: string | null; created: boolean }> {
  const email = normalizeEmail(input.email)
  if (!email || !input.tenantId) return { id: null, created: false }

  const categories = normalizeList(input.categories)
  const tags = normalizeList(input.tags)
  const supabase = input.supabase || getSupabaseAdmin()

  try {
    const { data: existing, error: findErr } = await supabase
      .from('leads')
      .select('id, status, categories, tags, first_name, last_name, phone')
      .eq('tenant_id', input.tenantId)
      .eq('email', email)
      .maybeSingle()

    if (findErr) {
      logger.warn('[upsertMarketingLead] find failed:', findErr.message)
      return { id: null, created: false }
    }

    if (existing) {
      const patch: Record<string, any> = {
        categories: union(existing.categories, categories),
        tags: union(existing.tags, tags),
      }
      if (input.firstName && !existing.first_name) patch.first_name = String(input.firstName).trim()
      if (input.lastName && !existing.last_name) patch.last_name = String(input.lastName).trim()
      if (input.phone && !existing.phone) patch.phone = String(input.phone).trim()

      // Don't touch status for unsubscribed/bounced; leave active/pending as-is
      const { error: updErr } = await supabase
        .from('leads')
        .update(patch)
        .eq('id', existing.id)

      if (updErr) {
        logger.warn('[upsertMarketingLead] update failed:', updErr.message)
        return { id: existing.id, created: false }
      }
      return { id: existing.id, created: false }
    }

    const { data: created, error: insErr } = await supabase
      .from('leads')
      .insert({
        tenant_id: input.tenantId,
        email,
        first_name: input.firstName ? String(input.firstName).trim() : null,
        last_name: input.lastName ? String(input.lastName).trim() : null,
        phone: input.phone ? String(input.phone).trim() : null,
        categories,
        tags,
        status: 'pending_consent',
        source: input.source || 'auto_sync',
        source_label: input.sourceLabel || null,
      })
      .select('id')
      .single()

    if (insErr) {
      // Race on unique constraint — try update path once
      if ((insErr as any).code === '23505') {
        return upsertMarketingLead({ ...input, supabase })
      }
      logger.warn('[upsertMarketingLead] insert failed:', insErr.message)
      return { id: null, created: false }
    }

    return { id: created?.id || null, created: true }
  } catch (err: any) {
    logger.warn('[upsertMarketingLead] unexpected:', err?.message || err)
    return { id: null, created: false }
  }
}

/** Fire-and-forget wrapper — never rejects */
export function upsertMarketingLeadSafe(input: UpsertMarketingLeadInput): void {
  void upsertMarketingLead(input).catch(() => {})
}

export function categoriesFromUserCategory(category: unknown): string[] {
  if (Array.isArray(category)) return normalizeList(category as string[])
  if (typeof category === 'string' && category.trim()) return [category.trim()]
  return []
}

/** Map course / course_category fields to lead category codes (VKU, PGS, …). */
export function categoriesFromCourse(course: any, courseType?: string | null): string[] {
  const out: string[] = []
  const code = course?.course_category?.code || course?.category_code || course?.category
  if (typeof code === 'string' && code.trim()) out.push(code.trim())
  if (typeof courseType === 'string' && courseType.trim()) out.push(courseType.trim())

  const hay = [
    course?.course_category?.name,
    course?.course_category?.code,
    course?.name,
    course?.category,
    courseType,
  ].filter(Boolean).join(' ').toLowerCase()

  if (/\bvku\b|verkehrskunde/.test(hay)) out.push('VKU')
  if (/\bpgs\b|nothelfer|erste\s*hilfe/.test(hay)) out.push('PGS')
  if (/motorrad|motorcycle|\ba\b.*kurs/.test(hay)) out.push('Motorrad')

  return normalizeList(out)
}
