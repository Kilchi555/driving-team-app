import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * POST /api/admin/accounting/approve-expense
 * Body: { id, action: 'approve' | 'reject', rejection_reason? }
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'superadmin'])
  const supabase = getSupabaseAdmin()
  const { id, action, rejection_reason } = await readBody(event)

  if (!id || !['approve', 'reject'].includes(action)) {
    throw createError({ statusCode: 400, statusMessage: 'id und action (approve|reject) erforderlich' })
  }

  // Verify entry belongs to this tenant and is pending
  const { data: entry, error: fetchErr } = await supabase
    .from('accounting_entries')
    .select('id, approval_status')
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (fetchErr || !entry) throw createError({ statusCode: 404, statusMessage: 'Eintrag nicht gefunden' })
  if (entry.approval_status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: 'Eintrag ist nicht im Status "pending"' })
  }

  const patch: Record<string, any> = {
    approval_status:    action === 'approve' ? 'approved' : 'rejected',
    approved_by_user_id: profile.id,
    approved_at:        new Date().toISOString(),
    updated_at:         new Date().toISOString(),
  }
  if (action === 'reject') {
    patch.rejection_reason = rejection_reason?.trim() ?? null
    patch.deleted_at = new Date().toISOString() // soft-delete rejected entries
  }

  const { error } = await supabase
    .from('accounting_entries')
    .update(patch)
    .eq('id', id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true }
})
