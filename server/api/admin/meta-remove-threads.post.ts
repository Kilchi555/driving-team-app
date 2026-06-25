/**
 * Removes Threads from all ad set placements in the Meta ad account.
 *
 * For each ad set:
 *  - If publisher_platforms is set and includes 'threads' → remove it
 *  - If publisher_platforms is not set (Advantage+ / automatic) → explicitly
 *    set all platforms except 'threads' so Meta keeps the rest unchanged
 *
 * POST /api/admin/meta-remove-threads
 * Body: { dry_run?: boolean }
 */

import { metaGet, metaPost, getMetaCredentials } from '~/server/utils/meta-ads-api'

const ALL_PLATFORMS_EXCEPT_THREADS = ['facebook', 'instagram', 'audience_network', 'messenger']

const DEFAULT_POSITIONS: Record<string, string[]> = {
  facebook_positions: ['feed', 'right_hand_column', 'marketplace', 'video_feeds', 'story', 'search', 'instream_video', 'reels'],
  instagram_positions: ['stream', 'story', 'reels', 'explore', 'explore_home', 'ig_search'],
  audience_network_positions: ['classic', 'rewarded_video'],
  messenger_positions: ['messenger_home', 'story'],
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const dryRun: boolean = body?.dry_run ?? false

  const { adAccount, token } = getMetaCredentials()
  if (!adAccount || !token) {
    throw createError({ statusCode: 500, message: 'META_AD_ACCOUNT_ID or token not configured' })
  }

  // Fetch all ad sets (up to 200)
  const adSetsData = await metaGet(
    `act_${adAccount}/adsets`,
    {
      fields: 'id,name,status,targeting',
      limit: '200',
    },
    token,
  )

  const adSets: Array<{ id: string; name: string; status: string; targeting: any }> = adSetsData.data ?? []

  const results: Array<{
    id: string
    name: string
    status: string
    action: 'skipped' | 'removed' | 'no_change'
    reason?: string
    error?: string
  }> = []

  for (const adSet of adSets) {
    const targeting = adSet.targeting ?? {}
    const platforms: string[] | undefined = targeting.publisher_platforms

    const hasThreads = platforms?.includes('threads') ?? false
    const isAutomatic = !platforms || platforms.length === 0

    if (!hasThreads && !isAutomatic) {
      results.push({ id: adSet.id, name: adSet.name, status: adSet.status, action: 'no_change', reason: 'Threads not in placements' })
      continue
    }

    if (!hasThreads && isAutomatic) {
      // Automatic placements → need to explicitly exclude threads
    }

    const newPlatforms = isAutomatic
      ? ALL_PLATFORMS_EXCEPT_THREADS
      : platforms!.filter(p => p !== 'threads')

    // Build new targeting: keep all existing fields, update publisher_platforms
    // and set explicit positions if switching from automatic
    const newTargeting: Record<string, any> = { ...targeting, publisher_platforms: newPlatforms }

    if (isAutomatic) {
      // When switching from automatic to manual, set default positions for each platform
      for (const [key, positions] of Object.entries(DEFAULT_POSITIONS)) {
        if (!newTargeting[key]) {
          newTargeting[key] = positions
        }
      }
    }

    // Remove threads_positions if present
    delete newTargeting.threads_positions

    if (dryRun) {
      results.push({
        id: adSet.id,
        name: adSet.name,
        status: adSet.status,
        action: 'removed',
        reason: isAutomatic ? 'Was automatic → switched to manual without Threads' : 'Removed Threads from publisher_platforms',
      })
      continue
    }

    try {
      await metaPost(adSet.id, { targeting: newTargeting }, token)
      results.push({
        id: adSet.id,
        name: adSet.name,
        status: adSet.status,
        action: 'removed',
        reason: isAutomatic ? 'Was automatic → switched to manual without Threads' : 'Removed Threads from publisher_platforms',
      })
    } catch (err: any) {
      results.push({
        id: adSet.id,
        name: adSet.name,
        status: adSet.status,
        action: 'skipped',
        error: err?.message ?? 'Unknown error',
      })
    }
  }

  return {
    dry_run: dryRun,
    total: adSets.length,
    changed: results.filter(r => r.action === 'removed').length,
    skipped: results.filter(r => r.action === 'skipped').length,
    no_change: results.filter(r => r.action === 'no_change').length,
    results,
  }
})
