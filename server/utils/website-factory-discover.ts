/**
 * Public discovery. Rate limit is fail-closed for this route: the shared
 * limiter is consulted, and a process-local cap still applies when that
 * limiter fails open.
 */
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { assertPublicHttpUrl, UnsafeUrlError } from '~/server/utils/ssrf-guard'
import { fetchWebsiteExtract } from '~/server/utils/website-factory-extract'
import { loadGoogleBusinessSource } from '~/server/utils/website-factory-google'
import { normalizeFactoryProfile, type FactoryManualInput, type FactoryMissingField } from '~/server/utils/website-factory-profile'
import { generateFactoryPreview, type FactorySupabase } from '~/server/utils/website-factory-generate'

const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 6
const buckets = new Map<string, number[]>()

export function enforceFactoryRateLimit(ip: string, now = Date.now()) {
  const key = String(ip || 'unknown').slice(0, 80) || 'unknown'
  const recent = (buckets.get(key) || []).filter((stamp) => stamp > now - WINDOW_MS)
  if (recent.length >= MAX_PER_WINDOW) {
    buckets.set(key, recent)
    return { allowed: false as const }
  }
  recent.push(now)
  buckets.set(key, recent)
  return { allowed: true as const }
}

export function resetFactoryRateLimit() {
  buckets.clear()
}

export type FactoryDiscoverInput = {
  ip?: string | null
  googleUrl?: string | null
  websiteUrl?: string | null
  manual?: FactoryManualInput | null
}

export type FactoryDiscoverResult =
  | { success: true; previewUrl: string }
  | {
      success: false
      status: number
      message: string
      missing?: FactoryMissingField[]
      known?: {
        businessName: string | null
        offer: string | null
        city: string | null
        phone: string | null
        email: string | null
        address: string | null
      }
    }

function manualOf(value: FactoryManualInput | null | undefined): FactoryManualInput {
  return value || {}
}

async function publicReferenceUrl(value: string | null) {
  if (!value || value === '#kontakt') return value
  try {
    const url = await assertPublicHttpUrl(value)
    return url.toString()
  } catch {
    return null
  }
}

export async function discoverWebsiteFactory(
  input: FactoryDiscoverInput,
  deps: {
    supabase: FactorySupabase
    baseUrl: string
    now?: number
    checkRateLimit?: typeof checkRateLimit
    loadGoogle?: typeof loadGoogleBusinessSource
    fetchWebsite?: typeof fetchWebsiteExtract
  },
): Promise<FactoryDiscoverResult> {
  const ip = String(input.ip || 'unknown')
  const limiter = deps.checkRateLimit || checkRateLimit
  let sharedAllowed: boolean
  try {
    const shared = await limiter(ip, 'website_factory_discover', MAX_PER_WINDOW, WINDOW_MS)
    sharedAllowed = !!shared?.allowed
  } catch {
    sharedAllowed = false
  }
  if (!sharedAllowed || !enforceFactoryRateLimit(ip, deps.now || Date.now()).allowed) {
    return { success: false, status: 429, message: 'Zu viele Anfragen. Bitte später erneut versuchen.' }
  }

  const googleUrl = String(input.googleUrl || '').trim()
  const websiteUrl = String(input.websiteUrl || '').trim()
  const manual = manualOf(input.manual)
  const hasManual = !!(manual.businessName || manual.offer || manual.city || manual.phone || manual.email)
  if (!googleUrl && !websiteUrl && !hasManual) {
    return { success: false, status: 400, message: 'Bitte eine Quelle oder die Mindestangaben eingeben.' }
  }
  if (googleUrl.length > 2048 || websiteUrl.length > 2048) {
    return { success: false, status: 400, message: 'Die Adresse ist zu lang.' }
  }

  try {
    const google = googleUrl ? await (deps.loadGoogle || loadGoogleBusinessSource)(googleUrl) : null
    const website = websiteUrl ? await (deps.fetchWebsite || fetchWebsiteExtract)(websiteUrl) : null
    const normalized = normalizeFactoryProfile({
      google,
      website,
      suppliedWebsiteUrl: websiteUrl || null,
      manual,
    })
    normalized.profile.websiteUrl = await publicReferenceUrl(normalized.profile.websiteUrl)
    normalized.profile.bookingUrl = await publicReferenceUrl(normalized.profile.bookingUrl)
    if (normalized.missing.length) {
      return {
        success: false,
        status: 200,
        message: 'Es fehlen noch ein paar Angaben.',
        missing: normalized.missing,
        known: normalized.suggestions,
      }
    }
    const generated = await generateFactoryPreview({
      supabase: deps.supabase,
      profile: normalized.profile,
      baseUrl: deps.baseUrl,
    })
    return { success: true, previewUrl: generated.previewUrl }
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return { success: false, status: 400, message: 'Diese Adresse kann nicht verwendet werden.' }
    }
    return { success: false, status: 500, message: 'Die Website konnte nicht erstellt werden.' }
  }
}
