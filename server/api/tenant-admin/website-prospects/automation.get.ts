import { defineEventHandler } from 'h3'
import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { readProspectAutomation } from '~/server/utils/prospect-discovery-automation'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const snapshot = await readProspectAutomation()
  return { success: true, ...snapshot }
})
