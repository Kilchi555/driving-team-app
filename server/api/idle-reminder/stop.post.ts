import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { verifyIdleStopToken } from '~/server/utils/idle-stop-token'
import {
  normalizeNoFurtherLessonsReason,
  setNoFurtherLessons
} from '~/server/utils/no-further-lessons'

async function resolveClientId(event: any, token: unknown): Promise<string | null> {
  const fromToken = verifyIdleStopToken(typeof token === 'string' ? token : null)
  if (fromToken) return fromToken

  const authUser = await getAuthenticatedUser(event)
  if (!authUser) return null

  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .eq('role', 'client')
    .is('deleted_at', null)
    .maybeSingle()

  return data?.id || null
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const userId = await resolveClientId(event, body?.token)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Ungültiger Link' })
  }

  const action = body?.action === 'resume' ? 'resume' : 'stop'
  const reason = action === 'stop' ? normalizeNoFurtherLessonsReason(body?.reason) : null
  if (action === 'stop' && !reason) {
    throw createError({ statusCode: 400, statusMessage: 'Bitte einen Grund wählen' })
  }

  const supabase = getSupabaseAdmin()
  const { data: student } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', userId)
    .eq('role', 'client')
    .is('deleted_at', null)
    .maybeSingle()

  if (!student) {
    throw createError({ statusCode: 404, statusMessage: 'Nicht gefunden' })
  }

  await setNoFurtherLessons(supabase, userId, reason)

  return {
    success: true,
    stopped: action === 'stop',
    reason
  }
})
