import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getValidAccessToken } from '~/server/utils/gbp'

/**
 * GET /api/gbp/debug-accounts
 * Returns raw API responses from Google to debug account/location discovery.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  let accessToken: string
  try {
    accessToken = await getValidAccessToken(authUser.tenant_id)
  } catch (e: any) {
    return { error: 'no_token', message: e.message }
  }

  const [accountsMgmt, myBusiness] = await Promise.all([
    fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(r => r.json()),
    fetch('https://mybusiness.googleapis.com/v4/accounts', {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(r => r.json()),
  ])

  return {
    accountManagementApi: accountsMgmt,
    myBusinessV4Api: myBusiness,
  }
})
