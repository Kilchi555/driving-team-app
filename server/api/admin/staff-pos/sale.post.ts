import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendTenantEmail } from '~/server/utils/email'
import { StaffProductSaleError } from '~/server/utils/staff-product-sale'
import { executeStaffProductSale } from '~/server/utils/staff-product-sale-orchestrator'
import { sendStaffPosInvoice } from '~/server/utils/send-staff-pos-invoice'
import { startStaffPosWallee } from '~/server/utils/staff-product-sale-wallee'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const body = await readBody(event)

  const { data: actor } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, tenant_id')
    .eq('id', profile.id)
    .eq('tenant_id', profile.tenant_id)
    .maybeSingle()

  if (!actor) {
    throw createError({ statusCode: 403, statusMessage: 'Keine Berechtigung' })
  }

  try {
    return await executeStaffProductSale({
      actor,
      body,
      rpc: async (args) => {
        const { data, error } = await supabase.rpc('staff_pos_sale', args)
        if (error) throw error
        return data
      },
      sendInvoice: (invoiceId) => sendStaffPosInvoice({
        supabase,
        tenantId: profile.tenant_id,
        invoiceId,
        actor,
      }),
      startWallee: (input) => startStaffPosWallee({
        tenantId: profile.tenant_id,
        ...input,
      }),
      sendPaymentLink: async ({ to, paymentUrl, customerName, totalRappen }) => {
        const total = (totalRappen / 100).toFixed(2)
        await sendTenantEmail(profile.tenant_id, {
          to,
          subject: `Zahlungslink – CHF ${total}`,
          html: `<p>Guten Tag ${customerName},</p><p>bitte bezahlen Sie den Produktverkauf über CHF ${total}:</p><p><a href="${paymentUrl}">Zur Zahlung</a></p>`,
        })
      },
    })
  } catch (error: any) {
    if (error instanceof StaffProductSaleError) {
      throw createError({ statusCode: error.statusCode, statusMessage: error.message })
    }
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Verkauf konnte nicht gespeichert werden',
    })
  }
})
