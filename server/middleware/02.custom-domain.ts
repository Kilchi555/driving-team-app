/**
 * Custom-host gate. App hosts are untouched.
 * A non-app host is rewritten only when isCustomDomainRoutingEnabled is true
 * for that exact hostname. There is no allow-cache.
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  type CustomDomainLookup,
  customDomainLookupFromQuery,
  customDomainNotFoundMessage,
  decideCustomDomainRoute,
  isAppHost,
  normalizeHostname,
} from '~/server/utils/custom-domain'

async function lookupDomain(host: string): Promise<CustomDomainLookup> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('website_tenants')
    .select(
      'subdomain, custom_domain, custom_domain_verified, custom_domain_status, custom_domain_verification, is_published',
    )
    .eq('custom_domain', host)
    .maybeSingle()

  return customDomainLookupFromQuery({ data, error })
}

export default defineEventHandler(async (event) => {
  const hostHeader = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host') || ''
  const host = normalizeHostname(hostHeader.split(',')[0] || '')
  const path = getRequestURL(event).pathname || '/'
  if (!host || isAppHost(host)) return

  const decision = await decideCustomDomainRoute({
    host,
    path,
    lookup: await lookupDomain(host),
  })

  if (decision.action === 'app') return
  if (decision.action === 'not_found') {
    throw createError({
      statusCode: 404,
      statusMessage: customDomainNotFoundMessage(),
    })
  }

  event.context.customDomain = {
    host,
    subdomain: decision.subdomain,
    verified: true,
  }

  const url = getRequestURL(event)
  event.node.req.url = `/s/${encodeURIComponent(decision.subdomain)}${decision.suffix}${url.search || ''}`
})
