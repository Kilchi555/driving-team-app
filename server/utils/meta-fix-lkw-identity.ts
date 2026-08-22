import { metaGet, metaPost, getMetaCredentials } from '~/server/utils/meta-ads-api'
import { logger } from '../../utils/logger'

export const LKW_CAMPAIGN_ID = '52577814487671'

export async function resolveLachenPageId(token: string): Promise<{ id: string; name: string; source: string }> {
  const envId = (process.env.META_PAGE_ID_LACHEN ?? '').trim()
  if (envId) {
    const page = await metaGet(envId, { fields: 'id,name' }, token)
    return { id: String(page.id), name: String(page.name ?? ''), source: 'env' }
  }

  for (const slug of ['drivingteamlachen', 'DrivingTeamLachen']) {
    try {
      const page = await metaGet(slug, { fields: 'id,name' }, token)
      if (page?.id) return { id: String(page.id), name: String(page.name ?? slug), source: slug }
    } catch {
      // try next
    }
  }

  const creds = getMetaCredentials()
  const accounts = await metaGet(`${creds.adAccount}/assigned_pages`, { fields: 'id,name', limit: '50' }, token).catch(() => ({ data: [] }))
  const hit = (accounts.data ?? []).find((p: any) => String(p.name ?? '').toLowerCase().includes('lachen'))
  if (hit) return { id: String(hit.id), name: String(hit.name), source: 'assigned_pages' }

  throw new Error('Could not resolve Driving Team Lachen Facebook Page ID. Set META_PAGE_ID_LACHEN.')
}

export async function fixLkwMetaIdentity(opts: { dryRun: boolean }) {
  const { token, adAccount, pageId: zurichPageId } = getMetaCredentials()
  if (!token || !adAccount) {
    return { ok: false, reason: 'missing_meta_credentials' }
  }

  const lachen = await resolveLachenPageId(token)
  const ads = await metaGet(`${LKW_CAMPAIGN_ID}/ads`, {
    fields: 'id,name,status,adset_id,creative{id,name,object_story_spec,asset_feed_spec,effective_object_story_id}',
    limit: '50',
  }, token)

  const adList = ads.data ?? []
  const inspect = adList.map((ad: any) => ({
    ad_id: ad.id,
    name: ad.name,
    status: ad.status,
    adset_id: ad.adset_id,
    page_id: ad.creative?.object_story_spec?.page_id ?? null,
    creative_id: ad.creative?.id,
  }))

  const adsetsRes = await metaGet(`${LKW_CAMPAIGN_ID}/adsets`, {
    fields: 'id,name,status,daily_budget,targeting',
    limit: '20',
  }, token)
  const adsets = adsetsRes.data ?? []

  const lachenGeo = {
    geo_locations: {
      custom_locations: [
        { latitude: 47.1975, longitude: 8.8533, radius: 40, distance_unit: 'kilometer' },
      ],
    },
  }

  const report: Record<string, any> = {
    dry_run: opts.dryRun,
    ad_account: adAccount,
    zurich_page_env: zurichPageId || null,
    lachen_page: lachen,
    ads: inspect,
    adsets: adsets.map((s: any) => ({
      id: s.id,
      name: s.name,
      daily_budget_cents: s.daily_budget,
      locations: s.targeting?.geo_locations,
    })),
  }

  if (opts.dryRun) return { ok: true, ...report }

  const actions: string[] = []

  for (const ad of adList) {
    const currentPage = String(ad.creative?.object_story_spec?.page_id ?? '')
    if (currentPage === lachen.id) {
      actions.push(`ad_${ad.id}_already_lachen`)
      continue
    }

    const spec = ad.creative?.object_story_spec ?? {}
    const feed = ad.creative?.asset_feed_spec
    const creativePayload: Record<string, any> = {
      name: `${ad.creative?.name || ad.name} — Page Lachen`,
      object_story_spec: { ...spec, page_id: lachen.id },
    }
    if (feed) creativePayload.asset_feed_spec = feed

    const creative = await metaPost(`${adAccount}/adcreatives`, creativePayload, token)
    await metaPost(ad.id, { creative: { creative_id: creative.id } }, token)
    actions.push(`ad_${ad.id}_page_${currentPage || 'none'}→${lachen.id} creative=${creative.id}`)
  }

  for (const set of adsets) {
    const locs = set.targeting?.geo_locations?.custom_locations ?? []
    const hasZurich = locs.some((l: any) => Math.abs(Number(l.latitude) - 47.3688) < 0.02)
    if (!hasZurich && locs.length === 1) {
      actions.push(`adset_${set.id}_geo_already_lachen`)
      continue
    }
    const targeting = { ...(set.targeting ?? {}), ...lachenGeo }
    await metaPost(set.id, { targeting }, token)
    actions.push(`adset_${set.id}_geo_lachen_only`)
  }

  report.actions = actions
  logger.info('[meta-lkw-identity] applied', actions.join('; '))
  return { ok: true, ...report }
}