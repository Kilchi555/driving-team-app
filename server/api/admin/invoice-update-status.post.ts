import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { releaseInvoicePayments } from '~/server/utils/release-invoice-payments'

export default defineEventHandler(async (event) => {
  // ✅ Auth check — Bearer header with HTTP-only-cookie fallback + token
  // refresh, instead of a raw Bearer-only check that would 401 whenever the
  // client's access token had just expired.
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()

  // ✅ Check if user is admin/staff
  const userData = authUser.db_user_id
    ? { role: authUser.role, tenant_id: authUser.tenant_id }
    : null

  if (!userData) {
    throw createError({ statusCode: 403, message: 'User not found' })
  }

  if (!['admin', 'staff', 'super_admin'].includes(userData.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  // ✅ Get body
  const body = await readBody(event)
  const { invoice_id, action } = body

  if (!invoice_id || !action) {
    throw createError({ statusCode: 400, message: 'invoice_id and action required' })
  }

  // ✅ Validate action
  const validActions = ['draft', 'sent', 'paid', 'cancelled']
  if (!validActions.includes(action)) {
    throw createError({ statusCode: 400, message: `Invalid action. Valid: ${validActions.join(', ')}` })
  }

  try {
    // ✅ Verify invoice belongs to tenant
    const { data: existingInvoice, error: checkError } = await supabase
      .from('invoices')
      .select('id, tenant_id, status, payment_status')
      .eq('id', invoice_id)
      .single()

    if (checkError || !existingInvoice) {
      throw createError({ statusCode: 404, message: 'Invoice not found' })
    }

    if (existingInvoice.tenant_id !== userData.tenant_id && userData.role !== 'super_admin') {
      throw createError({ statusCode: 403, message: 'Access denied' })
    }

    // ✅ Build update data based on action
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    switch (action) {
      case 'draft':
        updateData.status = 'draft'
        break
      case 'sent':
        updateData.status = 'sent'
        break
      case 'cancelled':
        updateData.status = 'cancelled'
        break
      case 'paid':
        updateData.payment_status = 'paid'
        break
    }

    // ✅ Update invoice
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoice_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating invoice status:', updateError)
      throw createError({ statusCode: 500, message: 'Failed to update invoice status' })
    }

    // Storno: Zahlungen wieder als offen / nicht verrechnet freigeben
    if (action === 'cancelled') {
      try {
        await releaseInvoicePayments(supabase, invoice_id)
      } catch (releaseError: any) {
        console.error('[invoice-update-status] Failed to release payments after cancel:', releaseError?.message)
        throw createError({
          statusCode: 500,
          message: 'Rechnung storniert, aber Zahlungen konnten nicht freigegeben werden',
        })
      }
    }

    return {
      success: true,
      invoice: updatedInvoice
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Error updating invoice status:', error)
    throw createError({ statusCode: 500, message: 'Failed to update invoice status' })
  }
})

