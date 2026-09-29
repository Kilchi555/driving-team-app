import { createError, defineEventHandler, readBody } from 'h3'
import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import {
  parseAutomationSettings,
  sanitizeErrorSummary,
  saveProspectAutomationSettings,
  superAdminActorId,
} from '~/server/utils/prospect-discovery-automation'

export default defineEventHandler(async (event) => {
  const user = await requireSuperAdmin(event)
  const parsed = parseAutomationSettings(await readBody(event))
  if (!parsed.ok) throw createError({ statusCode: 400, statusMessage: parsed.error })
  try {
    await saveProspectAutomationSettings(parsed.settings, superAdminActorId(user))
  } catch (error) {
    console.error('[prospect-discovery] settings save failed', sanitizeErrorSummary(error))
    throw createError({ statusCode: 500, statusMessage: 'Die Automation konnte nicht gespeichert werden.' })
  }
  return { success: true, settings: parsed.settings }
})
