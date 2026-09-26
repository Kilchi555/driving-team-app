/**
 * Preview responses must never enter a shared/public cache.
 * Authorization is the token gate; these headers are an extra layer.
 * /s/** also disables ISR in nuxt.config — headers alone do not disable ISR.
 */
import {
  WEBSITE_NO_STORE_HEADERS,
  shouldApplyWebsitePreviewNoStore,
} from '~/utils/website-ssr-route-policy'

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  if (!shouldApplyWebsitePreviewNoStore(url.pathname, url.searchParams.get('preview'))) return
  setHeader(event, 'Cache-Control', WEBSITE_NO_STORE_HEADERS['Cache-Control'])
  setHeader(event, 'CDN-Cache-Control', WEBSITE_NO_STORE_HEADERS['CDN-Cache-Control'])
  setHeader(event, 'Vercel-CDN-Cache-Control', WEBSITE_NO_STORE_HEADERS['Vercel-CDN-Cache-Control'])
})
