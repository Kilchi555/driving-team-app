/**
 * Inspect final URLs of all active RSA ads across all campaigns.
 * Used to verify whether each ad group points to the correct landing page.
 *
 * USAGE:
 *   curl https://app.simy.ch/api/admin/gads-inspect-final-urls \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */

import { resolveGadsAuth, buildGadsCustomer } from '~/server/utils/gads-auth'

export default defineEventHandler(async (event) => {
  // ── Auth + Credentials (tenant-aware) ────────────────────────────────────────
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const customer = buildGadsCustomer(gads)

  const response = await customer.query(`
    SELECT
      campaign.name,
      ad_group.name,
      ad_group_ad.ad.final_urls,
      ad_group_ad.ad.type,
      ad_group_ad.status
    FROM ad_group_ad
    WHERE
      ad_group_ad.status = 'ENABLED'
      AND campaign.status = 'ENABLED'
      AND ad_group.status = 'ENABLED'
      AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
    ORDER BY campaign.name, ad_group.name
  `)

  const ads = response as any[]

  const result = ads.map(ad => ({
    campaign: ad.campaign?.name ?? '',
    ad_group: ad.ad_group?.name ?? '',
    final_urls: ad.ad_group_ad?.ad?.final_urls ?? [],
  }))

  // Group by campaign for readability
  const grouped: Record<string, Array<{ ad_group: string; final_urls: string[] }>> = {}
  for (const ad of result) {
    if (!grouped[ad.campaign]) grouped[ad.campaign] = []
    grouped[ad.campaign].push({ ad_group: ad.ad_group, final_urls: ad.final_urls })
  }

  return { ads: grouped, total: result.length }
})
