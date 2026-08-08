import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.map(v => String(v || '').trim()).filter(Boolean))]
  }
  if (typeof value === 'string' && value.trim()) {
    return [...new Set(value.split(',').map(s => s.trim()).filter(Boolean))]
  }
  return []
}

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'tenant_admin'])

  const query = getQuery(event)
  const {
    tenantId,
    status,
    category,
    categories,
    exclude_categories,
    require_tags,
    tag,
    search,
    page = '1',
    limit = '50',
  } = query as Record<string, string | string[]>

  // Force tenant from authenticated profile — ignore cross-tenant tenantId
  const effectiveTenantId = profile.role === 'super_admin' && typeof tenantId === 'string'
    ? tenantId
    : profile.tenant_id

  if (!effectiveTenantId) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId is required' })
  }

  const supabase = getSupabaseAdmin()
  const pageNum = Math.max(1, parseInt(String(page)))
  const pageSize = Math.min(100, Math.max(1, parseInt(String(limit))))
  const offset = (pageNum - 1) * pageSize

  const includeCats = parseList(categories?.length ? categories : category)
  const excludeCats = parseList(exclude_categories)
  const requireTags = parseList(require_tags?.length ? require_tags : tag)
  const needsClientFilter = excludeCats.length > 0 || requireTags.length > 0

  const applyFilters = (q: any) => {
    let next = q.eq('tenant_id', effectiveTenantId)
    if (status && status !== 'all') {
      if (status === 'not_unsubscribed') next = next.neq('status', 'unsubscribed')
      else next = next.eq('status', String(status))
    }
    if (includeCats.length === 1) next = next.contains('categories', [includeCats[0]])
    else if (includeCats.length > 1) next = next.overlaps('categories', includeCats)
    if (requireTags.length) next = next.overlaps('tags', requireTags)
    if (excludeCats.length) {
      const literal = `{${excludeCats.map(c => `"${String(c).replace(/"/g, '')}"`).join(',')}}`
      next = next.not('categories', 'ov', literal)
    }
    if (search && typeof search === 'string') {
      next = next.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    }
    return next
  }

  // For exclude/require accuracy, fetch matching rows and filter in memory
  if (needsClientFilter && pageSize <= 1) {
    // Estimate mode: pull ids+categories+tags only
    let eq = applyFilters(
      supabase.from('leads').select('id, categories, tags')
    )
    const { data, error } = await eq.limit(10000)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    let rows = data ?? []
    if (excludeCats.length) {
      const excludeSet = new Set(excludeCats.map(c => c.toLowerCase()))
      rows = rows.filter((l: any) => {
        const cats = Array.isArray(l.categories) ? l.categories.map((c: string) => String(c).toLowerCase()) : []
        return !cats.some((c: string) => excludeSet.has(c))
      })
    }
    if (requireTags.length) {
      const need = requireTags.map(t => t.toLowerCase())
      rows = rows.filter((l: any) => {
        const tags = Array.isArray(l.tags) ? l.tags.map((t: string) => String(t).toLowerCase()) : []
        return need.some(t => tags.includes(t))
      })
    }
    return { leads: [], total: rows.length, page: pageNum, limit: pageSize }
  }

  let q = applyFilters(
    supabase.from('leads').select(
      'id, tenant_id, email, first_name, last_name, phone, status, categories, tags, notes, source, created_at, consent_given_at, last_emailed_at, source_label',
      { count: 'exact' }
    )
  )
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  const { data, error, count } = await q
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  let leads = data ?? []
  if (excludeCats.length && leads.length) {
    const excludeSet = new Set(excludeCats.map(c => c.toLowerCase()))
    leads = leads.filter((l: any) => {
      const cats = Array.isArray(l.categories) ? l.categories.map((c: string) => String(c).toLowerCase()) : []
      return !cats.some((c: string) => excludeSet.has(c))
    })
  }
  if (requireTags.length && leads.length) {
    const need = requireTags.map(t => t.toLowerCase())
    leads = leads.filter((l: any) => {
      const tags = Array.isArray(l.tags) ? l.tags.map((t: string) => String(t).toLowerCase()) : []
      return need.some(t => tags.includes(t))
    })
  }

  return { leads, total: count ?? 0, page: pageNum, limit: pageSize }
})
