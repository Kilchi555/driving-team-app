// server/api/invoices/send-draft.post.ts
// Speichert und verschickt einen Rechnungsentwurf.

import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { persistAndSendInvoiceDraft } from '~/server/utils/invoice-persist-and-send'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  const { data: staffUser } = await supabase
    .from('users')
    .select('id, tenant_id, role, first_name, last_name, email')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!staffUser || !['admin', 'staff'].includes(staffUser.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  const { draft, send_email = true } = body

  if (!draft || !draft.user_id || !draft.items?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid draft data' })
  }

  if (draft.tenant_id !== staffUser.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Tenant mismatch' })
  }

  try {
    const result = await persistAndSendInvoiceDraft({
      supabase,
      tenantId: staffUser.tenant_id,
      actor: staffUser,
      draft,
      sendEmailFlag: !!send_email,
    })

    return {
      success: true,
      invoice_id: result.invoice_id,
      invoice_number: result.invoice_number,
      total_amount_rappen: result.total_amount_rappen,
      student_email: draft.billing_email,
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: err?.message || 'Failed to create invoice',
    })
  }
})
