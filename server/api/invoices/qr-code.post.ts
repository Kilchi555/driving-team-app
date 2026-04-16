// server/api/invoices/qr-code.post.ts
// Returns a Swiss QR payment code as base64 data URL

import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { generateSwissQRBase64, type SwissQRParams } from '~/server/utils/swiss-qr'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)

  if (!body.qr_iban) {
    throw createError({ statusCode: 400, statusMessage: 'qr_iban required' })
  }

  try {
    const params: SwissQRParams = {
      qr_iban: body.qr_iban,
      creditor_name: body.creditor_name || '',
      creditor_street: body.creditor_street || '',
      creditor_street_nr: body.creditor_street_nr || '',
      creditor_zip: body.creditor_zip || '',
      creditor_city: body.creditor_city || '',
      debtor_name: body.debtor_name || '',
      debtor_street: body.debtor_street || '',
      debtor_zip: body.debtor_zip || '',
      debtor_city: body.debtor_city || '',
      amount_rappen: body.amount_rappen || 0,
      currency: 'CHF',
      reference: body.reference || '',
      invoice_number: body.invoice_number || '',
      additional_info: body.additional_info || '',
    }

    const dataUrl = await generateSwissQRBase64(params)
    return { dataUrl }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message })
  }
})
