// server/api/invoices/send-draft.post.ts
// Speichert und verschickt einen Rechnungsentwurf.

import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { persistAndSendInvoiceDraft } from '~/server/utils/invoice-persist-and-send'
import { applyStudentCreditToPayments } from '~/server/utils/apply-student-credit'
import { computeVatAmountRappen } from '~/server/utils/invoice-vat'

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
  const { draft, send_email = true, apply_available_credit = false } = body

  if (!draft || !draft.user_id || !draft.items?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid draft data' })
  }

  if (draft.tenant_id !== staffUser.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Tenant mismatch' })
  }

  try {
    if (apply_available_credit && draft.payment_ids?.length) {
      const { data: payments, error: payErr } = await supabase
        .from('payments')
        .select(`
          id, user_id, tenant_id, appointment_id,
          total_amount_rappen, admin_fee_rappen, credit_used_rappen,
          amount_paid_rappen, payment_status,
          appointments(id, status, cancellation_charge_percentage, type)
        `)
        .in('id', draft.payment_ids)
        .eq('user_id', draft.user_id)
        .eq('tenant_id', staffUser.tenant_id)

      if (payErr) throw payErr

      const applied = await applyStudentCreditToPayments({
        supabase,
        tenantId: staffUser.tenant_id,
        actorUserId: staffUser.id,
        studentUserId: draft.user_id,
        payments: payments || [],
      })

      const extraCredit = applied.credit_used_rappen
      if (extraCredit > 0) {
        const covered = new Set(applied.fully_covered_payment_ids)
        draft.payment_ids = (draft.payment_ids as string[]).filter((id: string) => !covered.has(id))
        draft.items = (draft.items || []).filter((item: any) => !item.payment_id || !covered.has(item.payment_id))

        for (const item of draft.items || []) {
          const added = item.payment_id ? (applied.applied_by_payment_id[item.payment_id] || 0) : 0
          if (added > 0 && (item.credit_used_rappen || 0) >= 0 && !item.product_id) {
            item.credit_used_rappen = (item.credit_used_rappen || 0) + added
          }
        }

        const previousCredits = draft.credit_used_rappen || 0
        draft.credit_used_rappen = previousCredits + extraCredit
        draft.discount_amount_rappen = (draft.discount_amount_rappen || 0) + extraCredit

        const netAfter = Math.max(
          0,
          (draft.subtotal_rappen || 0) - (draft.discount_amount_rappen || 0)
        )
        draft.vat_amount_rappen = computeVatAmountRappen(netAfter, draft.vat_rate || 0)
        draft.total_amount_rappen = netAfter + (draft.vat_amount_rappen || 0)
      }

      if (!draft.payment_ids?.length || draft.total_amount_rappen <= 0 || !draft.items?.length) {
        return {
          success: true,
          paid_with_credit: true,
          invoice_id: null,
          invoice_number: null,
          total_amount_rappen: 0,
          credit_used_rappen: extraCredit,
          student_email: draft.billing_email,
        }
      }
    }

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
