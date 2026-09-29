import { createError, defineEventHandler } from 'h3'
import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import {
  sanitizeErrorSummary,
  startManualProspectDiscovery,
  superAdminActorId,
} from '~/server/utils/prospect-discovery-automation'

function httpStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object' || !('statusCode' in error)) return null
  const status = (error as { statusCode?: unknown }).statusCode
  return typeof status === 'number' ? status : null
}

export default defineEventHandler(async (event) => {
  const user = await requireSuperAdmin(event)
  try {
    const result = await startManualProspectDiscovery({
      triggeredBy: superAdminActorId(user),
    })
    if (result.skipped === 'already_running') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Ein Prospect-Discovery-Lauf läuft bereits.',
      })
    }
    return { success: result.ok, ...result, emailsSent: 0 }
  } catch (error) {
    const status = httpStatus(error)
    if (status) throw error
    console.error('[prospect-discovery] manual start failed', sanitizeErrorSummary(error))
    throw createError({
      statusCode: 500,
      statusMessage: 'Der Prospect-Discovery-Lauf konnte nicht gestartet werden.',
    })
  }
})
