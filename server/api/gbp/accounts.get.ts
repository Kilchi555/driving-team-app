import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getValidAccessToken, listGbpAccounts, listGbpLocations } from '~/server/utils/gbp'

/**
 * GET /api/gbp/accounts
 * Returns all GBP accounts and their locations for the authenticated tenant.
 * Used to allow manual location linking in the admin UI.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  let accessToken: string
  try {
    accessToken = await getValidAccessToken(authUser.tenant_id)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'GBP not connected' })
  }

  const accountsData = await listGbpAccounts(accessToken)
  const accounts = accountsData.accounts ?? []

  const result = []
  for (const account of accounts) {
    let locations: { name: string; title: string }[] = []
    try {
      const locData = await listGbpLocations(accessToken, account.name)
      locations = locData.locations ?? []
    } catch {
      // ignore per-account errors
    }
    result.push({
      name: account.name,
      accountName: account.accountName,
      type: account.type,
      locations,
    })
  }

  return { accounts: result }
})
