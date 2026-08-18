import { getAuthenticatedUser } from '~/server/utils/auth'
import { isValidHostname, normalizeHostname } from '~/server/utils/custom-domain'
import {
  checkDomainAvailability,
  infomaniakDnsGuideUrl,
  infomaniakShopUrl,
  suggestDomains,
} from '~/server/utils/domain-availability'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const q = String(getQuery(event).q || '').trim()
  const names = suggestDomains(q)
  if (!names.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bitte einen Domainnamen eingeben — z.B. meine-firma oder meine-firma.ch',
    })
  }

  const results = []
  for (const name of names.slice(0, 3)) {
    if (!isValidHostname(normalizeHostname(name))) continue
    results.push(await checkDomainAvailability(name))
  }

  if (!results.length) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiger Domainname' })
  }

  return {
    query: q,
    results,
    infomaniak_dns_guide: infomaniakDnsGuideUrl(),
    fallback_shop: infomaniakShopUrl(results[0].domain),
  }
})
