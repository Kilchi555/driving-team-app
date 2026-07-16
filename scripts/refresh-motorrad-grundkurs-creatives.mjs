// Refresh creative images for the Motorrad Grundkurs Zürich + Lachen ads with
// the new "Roller Google Max Ad Portrait" visuals (blau/grün/weiss per Standort).
// Uploads the 6 new images, creates 2 new ad creatives (same copy/spec as the
// existing ones, only `images` swapped), then re-points each ad's `creative`
// field to the new creative — this is the supported way to refresh creative
// without recreating the ad (ad_id / stats history / adset stay untouched).

import fs from 'fs'

function loadEnvFile(path) {
  const out = {}
  const raw = fs.readFileSync(path, 'utf8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    let val = m[2]
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    out[m[1]] = val.replace(/\\n/g, '').trim()
  }
  return out
}

const env = { ...loadEnvFile('.env.moto-visuals') }
const TOKEN = env.META_SYSTEM_USER_TOKEN
const AD_ACCOUNT = `act_${env.META_AD_ACCOUNT_ID.replace('act_', '')}`
const GRAPH = 'https://graph.facebook.com/v19.0'

const ASSET_DIR = '/Users/pascalkilchenmann/.cursor/projects/Users-pascalkilchenmann-driving-team-app/assets'

const ZURICH_AD_ID = '52581135139671'
const ZURICH_CREATIVE_ID = '2272857050189513'
const LACHEN_AD_ID = '52581134757871'
const LACHEN_CREATIVE_ID = '982539784624024'

async function metaGet(path) {
  const res = await fetch(`${GRAPH}/${path}${path.includes('?') ? '&' : '?'}access_token=${TOKEN}`)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(`[GET ${path}] ${JSON.stringify(data.error ?? data)}`)
  return data
}

async function metaPost(path, body) {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: TOKEN }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(`[POST ${path}] ${JSON.stringify(data.error ?? data)}`)
  return data
}

async function metaPostForm(path, formFields, fileFieldName) {
  const form = new FormData()
  for (const [k, v] of Object.entries(formFields)) {
    if (k === fileFieldName) form.append(k, v, formFields.filename)
    else form.append(k, v)
  }
  form.append('access_token', TOKEN)
  const res = await fetch(`${GRAPH}/${path}`, { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(`[${path}] ${JSON.stringify(data.error ?? data)}`)
  return data
}

async function uploadImage(filename) {
  const bytes = fs.readFileSync(`${ASSET_DIR}/${filename}`)
  const blob = new Blob([bytes], { type: 'image/png' })
  const data = await metaPostForm(`${AD_ACCOUNT}/adimages`, { filename, source: blob }, 'source')
  const entry = Object.values(data.images)[0]
  console.log(`  uploaded ${filename} -> ${entry.hash}`)
  return entry.hash
}

async function main() {
  console.log('Uploading new creative images...')
  const zurichHashes = {
    blau: await uploadImage('Roller_Google_Max_Ad_Portrait_blau_Zu_rich-6000923c-27c4-48ec-8856-a90b014b1b26.png'),
    gruen: await uploadImage('Roller_Google_Max_Ad_Portrait_gru_n_Zu_rich-7783f2c2-5f1d-4760-a1b9-544b13be0b58.png'),
    weiss: await uploadImage('Roller_Google_Max_Ad_Portrait_weiss_Zu_rich-86ff72d4-3202-4205-8199-92633fa2f0ce.png'),
  }
  const lachenHashes = {
    blau: await uploadImage('Roller_Google_Max_Ad_Portrait_blau_Lachen-fb95c64d-43fe-4d79-9268-a1c4693623b6.png'),
    gruen: await uploadImage('Roller_Google_Max_Ad_Portrait_gru_n_Lachen-1657e52b-5b6a-4c2a-8c25-2d98521f89b7.png'),
    weiss: await uploadImage('Roller_Google_Max_Ad_Portrait_weiss_Lachen-a59e28b4-5f58-4200-91d4-00f0e475ec26.png'),
  }

  console.log('\nFetching current creative specs...')
  const zurichCurrent = await metaGet(`${ZURICH_CREATIVE_ID}?fields=asset_feed_spec,object_story_spec,degrees_of_freedom_spec,name`)
  const lachenCurrent = await metaGet(`${LACHEN_CREATIVE_ID}?fields=asset_feed_spec,object_story_spec,degrees_of_freedom_spec,name`)

  // Strip fields that require special app capabilities we don't have via API
  // (Click-to-WhatsApp message_extensions / page_welcome_message, shopping
  // extras) — these were added by the Ads Manager UI on the original creative
  // and the system-user token can't set them when creating a new creative.
  const stripUnsupported = (spec) => {
    const { additional_data, message_extensions, reasons_to_shop, shops_bundle, ...rest } = spec
    return rest
  }

  console.log('\nCreating refreshed Zürich creative...')
  const zurichNewSpec = {
    ...stripUnsupported(zurichCurrent.asset_feed_spec),
    images: [{ hash: zurichHashes.weiss }, { hash: zurichHashes.gruen }, { hash: zurichHashes.blau }],
  }
  const zurichNewCreative = await metaPost(`${AD_ACCOUNT}/adcreatives`, {
    name: 'Motorrad Grundkurs Zürich — Weiss/Grün/Blau (Roller-Visuals, 16.07.)',
    object_story_spec: zurichCurrent.object_story_spec,
    asset_feed_spec: zurichNewSpec,
  })
  console.log(`  new creative id: ${zurichNewCreative.id}`)

  console.log('Pointing Zürich ad to new creative...')
  await metaPost(ZURICH_AD_ID, { creative: JSON.stringify({ creative_id: zurichNewCreative.id }) })
  console.log('  done.')

  console.log('\nCreating refreshed Lachen creative...')
  const lachenNewSpec = {
    ...stripUnsupported(lachenCurrent.asset_feed_spec),
    images: [{ hash: lachenHashes.weiss }, { hash: lachenHashes.blau }, { hash: lachenHashes.gruen }],
  }
  // Drop instagram_user_id: the ad account/token isn't authorized to create a
  // *new* creative against that IG account via API (even though the existing
  // creative already has it) — page_id alone is what worked for Zürich.
  const { instagram_user_id, ...lachenStorySpec } = lachenCurrent.object_story_spec
  const lachenNewCreative = await metaPost(`${AD_ACCOUNT}/adcreatives`, {
    name: 'Motorrad Grundkurs Lachen — Weiss/Blau/Grün (Roller-Visuals, 16.07.)',
    object_story_spec: lachenStorySpec,
    asset_feed_spec: lachenNewSpec,
  })
  console.log(`  new creative id: ${lachenNewCreative.id}`)

  console.log('Pointing Lachen ad to new creative...')
  await metaPost(LACHEN_AD_ID, { creative: JSON.stringify({ creative_id: lachenNewCreative.id }) })
  console.log('  done.')

  console.log('\n✅ Both ads now serve the new Roller visuals.')
}

main().catch((err) => {
  console.error('FAILED:', err.message)
  process.exit(1)
})
