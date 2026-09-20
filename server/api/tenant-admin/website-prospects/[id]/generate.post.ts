import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { generateWebsiteProspectSite } from '~/server/utils/website-prospect-generate'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })
  const generated = await generateWebsiteProspectSite(id)
  const { claim_token, ...prospect } = generated
  return { success: true, prospect, generated: true, claim_token: claim_token || null }
})
