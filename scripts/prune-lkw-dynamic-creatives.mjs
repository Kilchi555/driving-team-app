#!/usr/bin/env node
/**
 * Prune LKW Dynamic Creative image feed to the assets that actually work.
 * Keep: Portrait Grün, branded-23, branded-204, branded-207
 * Drop: Weiss, Blau, 12, 201, 202, 205, 22, 09, 203, …
 *
 *   node --env-file=.env.backfill scripts/prune-lkw-dynamic-creatives.mjs --dry-run
 *   node --env-file=.env.backfill scripts/prune-lkw-dynamic-creatives.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const env = {}
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    let val = m[2]
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    env[m[1]] = val.replace(/\\n$/i, '').replace(/\r?\n$/g, '').trim()
  }
  return env
}

const env = {
  ...loadEnvFile(path.join(process.cwd(), '.env.vercel.production')),
  ...loadEnvFile(path.join(process.cwd(), '.env.backfill')),
  ...process.env,
}

const TOKEN = env.META_SYSTEM_USER_TOKEN || env.META_ACCESS_TOKEN
const AD_ACCOUNT = `act_${String(env.META_AD_ACCOUNT_ID || '').replace(/^act_/, '')}`
const GRAPH = 'https://graph.facebook.com/v19.0'
const LKW_CAMPAIGN_ID = '52577814487671'
const dryRun = process.argv.includes('--dry-run')

const KEEP_NAME = [
  /portrait_gruen/i,
  /lkw-branded-23\.jpg/i,
  /lkw-branded-204\.jpg/i,
  /lkw-branded-207\.jpg/i,
]

/** Grün was dropped from the 20. Aug creative — add it back by hash. */
const FORCE_KEEP_HASHES = {
  '4ee95740388e141d0504cd21a62c9d5f': 'LKW_Portrait_Gruen_Jun26.png_105',
}

function keepName(name) {
  return KEEP_NAME.some((re) => re.test(String(name || '')))
}

function stripUnsupported(spec) {
  if (!spec) return spec
  const { additional_data, message_extensions, reasons_to_shop, shops_bundle, ...rest } = spec
  return rest
}

async function metaGet(p) {
  const res = await fetch(`${GRAPH}/${p}${p.includes('?') ? '&' : '?'}access_token=${TOKEN}`)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(`[GET ${p}] ${JSON.stringify(data.error ?? data)}`)
  return data
}

async function metaPost(p, body) {
  const res = await fetch(`${GRAPH}/${p}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: TOKEN }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(`[POST ${p}] ${JSON.stringify(data.error ?? data)}`)
  return data
}

async function main() {
  if (!TOKEN || AD_ACCOUNT === 'act_') {
    throw new Error('Missing META_SYSTEM_USER_TOKEN / META_AD_ACCOUNT_ID')
  }

  const ads = await metaGet(
    `${LKW_CAMPAIGN_ID}/ads?fields=id,name,status,adset_id,creative{id,name,object_story_spec,asset_feed_spec,degrees_of_freedom_spec}&limit=50`,
  )
  const ad = (ads.data ?? []).find((a) => /Dynamic Creative Jun 2026/i.test(a.name))
  if (!ad) {
    throw new Error(`Ad "LKW — Dynamic Creative Jun 2026" not found. Have: ${(ads.data ?? []).map((a) => a.name).join(' | ')}`)
  }

  const feed = ad.creative?.asset_feed_spec
  const images = feed?.images ?? []
  if (!images.length) {
    throw new Error(`Ad ${ad.id} has no asset_feed_spec.images`)
  }

  const hashes = images.map((img) => img.hash).filter(Boolean)
  const named = await metaGet(
    `${AD_ACCOUNT}/adimages?hashes=${encodeURIComponent(JSON.stringify(hashes))}&fields=hash,name`,
  )
  const nameByHash = Object.fromEntries((named.data ?? []).map((img) => [img.hash, img.name]))

  const kept = []
  const dropped = []
  for (const img of images) {
    const name = nameByHash[img.hash] || img.hash
    if (keepName(name)) kept.push({ hash: img.hash, name })
    else dropped.push({ hash: img.hash, name })
  }
  for (const [hash, name] of Object.entries(FORCE_KEEP_HASHES)) {
    if (!kept.some((img) => img.hash === hash)) kept.push({ hash, name, added: true })
  }

  console.log(JSON.stringify({
    dry_run: dryRun,
    ad_id: ad.id,
    ad_name: ad.name,
    ad_status: ad.status,
    creative_id: ad.creative?.id,
    image_count: images.length,
    keep: kept,
    drop: dropped,
  }, null, 2))

  if (kept.length < 3) {
    throw new Error(`Refusing to apply: only ${kept.length} keep-images matched. Check names above.`)
  }

  if (dryRun) {
    console.log('Dry-run — no changes.')
    return
  }

  const newSpec = {
    ...stripUnsupported(feed),
    images: kept.map((img) => (img.hash ? { hash: img.hash } : img)),
  }
  const storySpec = { ...(ad.creative?.object_story_spec ?? {}) }
  delete storySpec.instagram_user_id

  const created = await metaPost(`${AD_ACCOUNT}/adcreatives`, {
    name: 'LKW — Dynamic Creative Aug 2026 (Grün / 23 / 204 / 207)',
    object_story_spec: storySpec,
    asset_feed_spec: newSpec,
  })
  await metaPost(ad.id, { creative: JSON.stringify({ creative_id: created.id }) })

  console.log(JSON.stringify({
    ok: true,
    new_creative_id: created.id,
    pointed_ad: ad.id,
    kept: kept.length,
    dropped: dropped.length,
  }, null, 2))
}

main().catch((err) => {
  console.error('FAILED:', err.message)
  process.exit(1)
})
