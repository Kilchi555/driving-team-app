import { defineEventHandler, getQuery, sendRedirect, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { canAccessUserDocument, throwAccess } from '~/server/utils/access-control'
import {
  createUserDocumentSignedUrl,
  normalizeUserDocumentPath,
  ownerIdFromDocumentPath,
  pathBelongsToUser,
} from '~/server/utils/user-document-url'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const query = getQuery(event)
  const path = normalizeUserDocumentPath(typeof query.path === 'string' ? query.path : '')
  if (!path) {
    throw createError({ statusCode: 400, statusMessage: 'path is required' })
  }

  const requestedUserId = typeof query.userId === 'string' ? query.userId : null
  const ownerId = ownerIdFromDocumentPath(path, requestedUserId)
  if (!ownerId || !pathBelongsToUser(path, ownerId)) {
    throw createError({ statusCode: 403, statusMessage: 'document owner mismatch' })
  }

  const supabase = getSupabaseAdmin()
  const { data: owner, error } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('id', ownerId)
    .maybeSingle()
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to verify document owner' })
  }

  const access = canAccessUserDocument({
    callerId: authUser.db_user_id,
    callerRole: authUser.role,
    callerTenantId: authUser.tenant_id,
    owner,
    pathBelongsToOwner: pathBelongsToUser(path, owner?.id || ownerId),
  })
  if (!access.allow) throwAccess(access)

  const url = await createUserDocumentSignedUrl(supabase, path)
  if (!url) {
    throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  }

  if (query.redirect === '1' || query.redirect === 'true') {
    return sendRedirect(event, url, 302)
  }

  return { success: true, url }
})
