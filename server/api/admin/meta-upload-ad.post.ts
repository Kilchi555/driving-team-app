/**
 * Meta Ads — Upload Image + Create Creative + Create Ad
 *
 * Flow:
 *   1. Upload base64 image → /adimages → get hash
 *   2. Create ad creative with image hash
 *   3. Create ad in given ad set (PAUSED by default)
 *
 * POST /api/admin/meta-upload-ad
 * Body: {
 *   imageBase64: string       // base64 encoded image (data: prefix stripped automatically)
 *   imageName: string         // e.g. "lkw-ad-gruen.jpg"
 *   adSetId: string           // Meta ad set ID to attach the ad to
 *   adName: string            // display name for the ad
 *   primaryText: string       // main ad body text
 *   headline: string          // ad headline
 *   linkUrl: string           // destination URL
 *   callToAction?: string     // default: LEARN_MORE
 *   status?: string           // default: PAUSED
 * }
 */

import { logger } from '~/utils/logger'
import { metaPost, getMetaCredentials } from '~/server/utils/meta-ads-api'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { token, adAccount, pageId } = getMetaCredentials()
  if (!token || !adAccount || !pageId) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing Meta credentials (META_SYSTEM_USER_TOKEN, META_AD_ACCOUNT_ID, META_PAGE_ID)',
    })
  }

  const body = await readBody(event) as {
    imageBase64: string
    imageName: string
    adSetId: string
    adName: string
    primaryText: string
    headline: string
    description?: string
    linkUrl: string
    callToAction?: string
    status?: string
  }

  const { imageBase64, imageName, adSetId, adName, primaryText, headline, description, linkUrl, callToAction = 'LEARN_MORE', status = 'PAUSED' } = body

  if (!imageBase64 || !imageName || !adSetId || !primaryText || !headline || !linkUrl) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields: imageBase64, imageName, adSetId, primaryText, headline, linkUrl' })
  }

  const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '')
  logger.info(`meta-upload-ad: uploading "${imageName}" to ${adAccount}`)

  // 1. Upload image → get hash
  const imageUpload = await metaPost(`${adAccount}/adimages`, { bytes: cleanBase64, name: imageName }, token)
  const imageData = imageUpload.images?.[imageName]
  if (!imageData?.hash) throw createError({ statusCode: 500, statusMessage: `Image upload succeeded but no hash: ${JSON.stringify(imageUpload)}` })
  logger.info(`meta-upload-ad: hash=${imageData.hash}`)

  // 2. Create creative
  const linkData: Record<string, any> = {
    image_hash: imageData.hash,
    link: linkUrl,
    message: primaryText,
    name: headline,
    call_to_action: { type: callToAction },
  }
  if (description) linkData.description = description

  const creative = await metaPost(`${adAccount}/adcreatives`, {
    name: `Creative — ${adName}`,
    object_story_spec: { page_id: pageId, link_data: linkData },
  }, token)
  logger.info(`meta-upload-ad: creative=${creative.id}`)

  // 3. Create ad in ad set
  const ad = await metaPost(`${adAccount}/ads`, {
    name: adName,
    adset_id: adSetId,
    creative: { creative_id: creative.id },
    status,
  }, token)
  logger.info(`meta-upload-ad: ad=${ad.id} status=${status}`)

  return {
    success: true,
    imageHash: imageData.hash,
    imageUrl: imageData.url,
    creativeId: creative.id,
    adId: ad.id,
    status,
    message: `Ad "${adName}" erstellt (${status}). Im Meta Ads Manager aktivieren wenn bereit.`,
  }
})
