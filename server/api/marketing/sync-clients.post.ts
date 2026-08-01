/**
 * POST /api/marketing/sync-clients
 *
 * Backfill / refresh marketing leads from existing client users.
 * Merges categories + tag `client`. Does NOT send consent emails.
 */
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { upsertMarketingLead, categoriesFromUserCategory } from '~/server/utils/upsert-marketing-lead'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const tenantId = profile.tenant_id
  const supabase = getSupabaseAdmin()

  const PAGE = 500
  let offset = 0
  let created = 0
  let updated = 0
  let skipped = 0

  while (true) {
    const { data: clients, error } = await supabase
      .from('users')
      .select('email, first_name, last_name, phone, category')
      .eq('tenant_id', tenantId)
      .eq('role', 'client')
      .not('email', 'is', null)
      .neq('email', '')
      .range(offset, offset + PAGE - 1)

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    if (!clients?.length) break

    for (const c of clients) {
      const result = await upsertMarketingLead({
        tenantId,
        email: c.email,
        firstName: c.first_name,
        lastName: c.last_name,
        phone: c.phone,
        categories: categoriesFromUserCategory(c.category),
        tags: ['client'],
        source: 'client_sync',
        sourceLabel: 'Sync aus Kunden',
        supabase,
      })
      if (!result.id) skipped++
      else if (result.created) created++
      else updated++
    }

    if (clients.length < PAGE) break
    offset += PAGE
  }

  return { success: true, created, updated, skipped, total: created + updated + skipped }
})
