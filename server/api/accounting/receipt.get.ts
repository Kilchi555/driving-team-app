import { defineEventHandler, getQuery, sendRedirect, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  inferReceiptLocation,
  normalizeReceiptPath,
  RECEIPT_SIGNED_TTL_SECONDS,
  tenantOwnsReceiptPath,
} from '~/server/utils/receipt-storage'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event)
  const query = getQuery(event)
  const path = normalizeReceiptPath(typeof query.path === 'string' ? query.path : '')
  if (!path) {
    throw createError({ statusCode: 400, statusMessage: 'path is required' })
  }

  const location = inferReceiptLocation(path)
  if (!location || !tenantOwnsReceiptPath(profile.tenant_id, path)) {
    throw createError({ statusCode: 403, statusMessage: 'receipt tenant mismatch' })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.storage
    .from(location.bucket)
    .createSignedUrl(location.path, RECEIPT_SIGNED_TTL_SECONDS)
  if (error || !data?.signedUrl) {
    throw createError({ statusCode: 404, statusMessage: 'Receipt not found' })
  }

  if (query.redirect === '1' || query.redirect === 'true') {
    return sendRedirect(event, data.signedUrl, 302)
  }

  return { success: true, url: data.signedUrl }
})
