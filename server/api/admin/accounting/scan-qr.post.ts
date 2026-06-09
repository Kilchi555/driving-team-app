import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminProfile(event)

  const config = useRuntimeConfig()
  const billScanKey = config.billScanApiKey as string | undefined

  if (!billScanKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'BillScan API-Key nicht konfiguriert (BILLSCAN_API_KEY)',
    })
  }

  const formData = await readMultipartFormData(event)
  if (!formData) throw createError({ statusCode: 400, statusMessage: 'Keine Datei übermittelt' })

  const file = formData.find(f => f.name === 'file')
  if (!file?.data) throw createError({ statusCode: 400, statusMessage: 'Kein file-Feld gefunden' })

  const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
  if (file.type && !allowed.includes(file.type)) {
    throw createError({ statusCode: 400, statusMessage: 'Nur PDF, PNG oder JPEG unterstützt' })
  }

  // BillScan REST API: POST https://api.billscan.ch/api/parse
  const blob = new Blob([file.data], { type: file.type ?? 'application/pdf' })
  const fd = new FormData()
  fd.append('file', blob, file.filename ?? 'invoice.pdf')

  const response = await fetch('https://api.billscan.ch/api/parse', {
    method: 'POST',
    headers: { Authorization: `Bearer ${billScanKey}` },
    body: fd,
  })

  if (!response.ok) {
    const text = await response.text()
    throw createError({
      statusCode: response.status,
      statusMessage: `BillScan Fehler: ${text}`,
    })
  }

  const result = await response.json() as {
    iban: string
    currency: string
    amount: number | null
    reference_type: string
    reference: string | null
    creditor: { name: string; address: string; postal_code: string; city: string; country: string }
    debtor: { name: string | null; address: string | null; postal_code: string | null; city: string | null; country: string | null } | null
    additional_info: string | null
    parsed_at: string
  }

  return {
    success: true,
    data: {
      iban: result.iban,
      currency: result.currency,
      amount_rappen: result.amount != null ? Math.round(result.amount * 100) : null,
      reference_type: result.reference_type,
      reference: result.reference,
      creditor_name: result.creditor?.name ?? null,
      creditor_address: [result.creditor?.address, result.creditor?.postal_code, result.creditor?.city].filter(Boolean).join(', '),
      additional_info: result.additional_info,
      raw: result,
    },
  }
})
