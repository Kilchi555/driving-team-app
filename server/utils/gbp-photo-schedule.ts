/**
 * Shared GBP photo drip schedule: week quota, min gap, candidate ranking, slot prediction.
 * Used by cron publish-gbp-photos and GET /api/gbp/media/schedule.
 */

export const GBP_PHOTO_CRON_UTC_HOUR = 8
export const GBP_PHOTO_CRON_UTC_MINUTE = 15

export type GbpPhotoScheduleSettings = {
  photo_mode: 'off' | 'approved_only' | 'pool_auto'
  photos_per_week: number
  timezone: string
}

export type GbpPhotoQueueAsset = {
  id: string
  tenant_id: string
  location_id: string | null
  storage_path?: string | null
  public_url: string
  category: string
  approved: boolean
  source?: string | null
  notes: string | null
  last_published_at: string | null
  publish_count: number | null
  queue_priority?: number | null
  created_at?: string | null
}

export type GbpPhotoScheduleSlot = {
  assetId: string
  estimatedAt: string
  rank: number
}

/**
 * Monday 00:00 in `timezone`, returned as UTC ISO.
 */
export function startOfWeekIso(timezone: string, now = new Date()): string {
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(now)

  const get = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parts.find(p => p.type === type)?.value || ''

  const year = Number(get(dateParts, 'year'))
  const month = Number(get(dateParts, 'month'))
  const day = Number(get(dateParts, 'day'))
  const weekdayIndex: Record<string, number> = {
    Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
  }
  const offsetDays = weekdayIndex[weekday] ?? 0

  const monday = new Date(Date.UTC(year, month - 1, day - offsetDays))
  const my = monday.getUTCFullYear()
  const mm = monday.getUTCMonth() + 1
  const md = monday.getUTCDate()

  const noonUtc = Date.UTC(my, mm - 1, md, 12, 0, 0)
  for (let deltaMin = -14 * 60; deltaMin <= 14 * 60; deltaMin += 15) {
    const candidate = new Date(noonUtc + deltaMin * 60 * 1000)
    const local = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(candidate)
    const ly = Number(get(local, 'year'))
    const lm = Number(get(local, 'month'))
    const ld = Number(get(local, 'day'))
    const lh = Number(get(local, 'hour'))
    const lmin = Number(get(local, 'minute'))
    if (ly === my && lm === mm && ld === md && lh === 0 && lmin === 0) {
      return candidate.toISOString()
    }
  }

  return new Date(Date.UTC(my, mm - 1, md, 0, 0, 0)).toISOString()
}

export function normalizePhotosPerWeek(raw: number | null | undefined): number {
  return Math.min(7, Math.max(1, Number(raw) || 2))
}

export function photoMinGapMs(photosPerWeek: number): number {
  return Math.floor((7 * 24 * 60 * 60 * 1000) / normalizePhotosPerWeek(photosPerWeek))
}

/** Rank assets for drip order: higher priority first, then least-recently published. */
export function sortPhotoQueueAssets(assets: GbpPhotoQueueAsset[]): GbpPhotoQueueAsset[] {
  return [...assets].sort((a, b) => {
    const pa = a.queue_priority ?? 0
    const pb = b.queue_priority ?? 0
    if (pb !== pa) return pb - pa

    const la = a.last_published_at
    const lb = b.last_published_at
    if (!la && lb) return -1
    if (la && !lb) return 1
    if (la && lb && la !== lb) return la < lb ? -1 : 1

    const ca = a.created_at || ''
    const cb = b.created_at || ''
    if (ca !== cb) return ca < cb ? -1 : 1
    return a.id < b.id ? -1 : 1
  })
}

/**
 * Next daily cron run at 08:15 UTC on or after `from`.
 */
export function nextCronRunUtc(from = new Date()): Date {
  const d = new Date(from)
  const candidate = new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    GBP_PHOTO_CRON_UTC_HOUR,
    GBP_PHOTO_CRON_UTC_MINUTE,
    0,
    0,
  ))
  if (candidate.getTime() <= from.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + 1)
  }
  return candidate
}

export function countPublishedThisWeek(
  assets: GbpPhotoQueueAsset[],
  locationId: string,
  weekStartIso: string,
): number {
  return assets.filter(a =>
    a.location_id === locationId
    && a.last_published_at
    && a.last_published_at >= weekStartIso,
  ).length
}

export function lastPublishAtForLocation(
  assets: GbpPhotoQueueAsset[],
  locationId: string,
): string | null {
  let latest: string | null = null
  for (const a of assets) {
    if (a.location_id !== locationId || !a.last_published_at) continue
    if (!latest || a.last_published_at > latest) latest = a.last_published_at
  }
  return latest
}

/**
 * Eligible assets for the current week window (not yet published this week).
 * Location-specific first; shared (null) only if URL not already present for location.
 */
export function eligiblePhotoCandidates(params: {
  assets: GbpPhotoQueueAsset[]
  locationId: string
  weekStartIso: string
}): GbpPhotoQueueAsset[] {
  const { assets, locationId, weekStartIso } = params
  const localUrls = new Set(
    assets.filter(a => a.location_id === locationId).map(a => a.public_url),
  )

  const eligible = (a: GbpPhotoQueueAsset) =>
    a.approved
    && (!a.last_published_at || a.last_published_at < weekStartIso)

  const locationSpecific = sortPhotoQueueAssets(
    assets.filter(a => a.location_id === locationId && eligible(a)),
  )
  const shared = sortPhotoQueueAssets(
    assets.filter(a =>
      a.location_id == null
      && eligible(a)
      && !localUrls.has(a.public_url),
    ),
  )

  // Prefer location-specific, then shared — but merge by queue order within each group
  return [...locationSpecific, ...shared]
}

/**
 * Pick the single next asset the cron would publish right now (or null if blocked).
 */
export function pickNextPhotoAsset(params: {
  settings: GbpPhotoScheduleSettings
  assets: GbpPhotoQueueAsset[]
  locationId: string
  now?: Date
}): { asset: GbpPhotoQueueAsset | null; reason: string | null; remainingThisWeek: number } {
  const now = params.now || new Date()
  const settings = params.settings
  if (settings.photo_mode === 'off') {
    return { asset: null, reason: 'off', remainingThisWeek: 0 }
  }

  const perWeek = normalizePhotosPerWeek(settings.photos_per_week)
  const weekStart = startOfWeekIso(settings.timezone || 'Europe/Zurich', now)
  const weekCount = countPublishedThisWeek(params.assets, params.locationId, weekStart)
  const remainingThisWeek = Math.max(0, perWeek - weekCount)

  if (remainingThisWeek <= 0) {
    return { asset: null, reason: 'quota_full', remainingThisWeek: 0 }
  }

  const minGap = photoMinGapMs(perWeek)
  const lastAt = lastPublishAtForLocation(params.assets, params.locationId)
  if (lastAt && now.getTime() - new Date(lastAt).getTime() < minGap) {
    return { asset: null, reason: 'gap', remainingThisWeek }
  }

  const candidates = eligiblePhotoCandidates({
    assets: params.assets,
    locationId: params.locationId,
    weekStartIso: weekStart,
  })
  if (!candidates.length) {
    return { asset: null, reason: 'no_assets', remainingThisWeek }
  }

  return { asset: candidates[0], reason: null, remainingThisWeek }
}

/**
 * Predict upcoming publish slots over the next weeks (same rules as cron).
 */
export function predictNextPhotoSlots(params: {
  settings: GbpPhotoScheduleSettings
  assets: GbpPhotoQueueAsset[]
  locationId: string
  now?: Date
  maxSlots?: number
}): {
  status: 'off' | 'ok' | 'quota_full' | 'gap' | 'no_assets'
  photosPerWeek: number
  remainingThisWeek: number
  nextPublishAt: string | null
  upcoming: GbpPhotoScheduleSlot[]
} {
  const now = params.now || new Date()
  const maxSlots = params.maxSlots ?? 8
  const settings = params.settings
  const perWeek = normalizePhotosPerWeek(settings.photos_per_week)

  if (settings.photo_mode === 'off') {
    return {
      status: 'off',
      photosPerWeek: perWeek,
      remainingThisWeek: 0,
      nextPublishAt: null,
      upcoming: [],
    }
  }

  // Working copy so we can simulate publishes
  const simAssets: GbpPhotoQueueAsset[] = params.assets.map(a => ({ ...a }))
  const upcoming: GbpPhotoScheduleSlot[] = []
  let cursor = new Date(now)
  const horizon = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000)

  while (upcoming.length < maxSlots && cursor < horizon) {
    const weekStart = startOfWeekIso(settings.timezone || 'Europe/Zurich', cursor)
    const weekCount = countPublishedThisWeek(simAssets, params.locationId, weekStart)
    const remainingThisWeek = Math.max(0, perWeek - weekCount)
    const minGap = photoMinGapMs(perWeek)
    const lastAt = lastPublishAtForLocation(simAssets, params.locationId)

    let slotTime = nextCronRunUtc(cursor)

    // Respect min gap: first cron run at/after lastPublish + gap
    if (lastAt) {
      const earliest = new Date(new Date(lastAt).getTime() + minGap)
      if (slotTime < earliest) {
        slotTime = nextCronRunUtc(earliest)
      }
    }

    // If this week's quota is full, jump to next week Monday after weekStart
    if (remainingThisWeek <= 0) {
      const nextWeek = new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000)
      cursor = nextWeek > cursor ? nextWeek : new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
      continue
    }

    // Week of slotTime might differ — re-check quota for that week
    const slotWeekStart = startOfWeekIso(settings.timezone || 'Europe/Zurich', slotTime)
    const slotWeekCount = countPublishedThisWeek(simAssets, params.locationId, slotWeekStart)
    if (slotWeekCount >= perWeek) {
      cursor = new Date(new Date(slotWeekStart).getTime() + 7 * 24 * 60 * 60 * 1000)
      continue
    }

    const candidates = eligiblePhotoCandidates({
      assets: simAssets,
      locationId: params.locationId,
      weekStartIso: slotWeekStart,
    })
    if (!candidates.length) break

    const asset = candidates[0]
    upcoming.push({
      assetId: asset.id,
      estimatedAt: slotTime.toISOString(),
      rank: upcoming.length + 1,
    })

    // Simulate publish on location-specific row (or promote shared → local clone in sim)
    const nowIso = slotTime.toISOString()
    if (asset.location_id) {
      const idx = simAssets.findIndex(a => a.id === asset.id)
      if (idx >= 0) {
        simAssets[idx] = {
          ...simAssets[idx],
          last_published_at: nowIso,
          publish_count: (simAssets[idx].publish_count || 0) + 1,
          queue_priority: 0,
        }
      }
    } else {
      simAssets.push({
        ...asset,
        id: `sim-${asset.id}-${upcoming.length}`,
        location_id: params.locationId,
        last_published_at: nowIso,
        publish_count: 1,
        queue_priority: 0,
      })
      // Bump shared so it won't win again this week
      const sharedIdx = simAssets.findIndex(a => a.id === asset.id)
      if (sharedIdx >= 0) {
        simAssets[sharedIdx] = {
          ...simAssets[sharedIdx],
          last_published_at: nowIso,
          queue_priority: 0,
        }
      }
    }

    cursor = new Date(slotTime.getTime() + 60 * 1000)
  }

  const live = pickNextPhotoAsset({
    settings,
    assets: params.assets,
    locationId: params.locationId,
    now,
  })

  let status: 'ok' | 'quota_full' | 'gap' | 'no_assets' = 'ok'
  if (live.reason === 'quota_full') status = 'quota_full'
  else if (live.reason === 'gap') status = 'gap'
  else if (live.reason === 'no_assets' || !upcoming.length) status = 'no_assets'

  return {
    status,
    photosPerWeek: perWeek,
    remainingThisWeek: live.remainingThisWeek,
    nextPublishAt: upcoming[0]?.estimatedAt ?? null,
    upcoming,
  }
}
