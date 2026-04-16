// server/utils/swiss-qr.ts
// Generates Swiss QR payment data string (SPS 2.2) and base64 QR image

import QRCode from 'qrcode'

export interface SwissQRParams {
  qr_iban: string
  creditor_name: string
  creditor_street: string
  creditor_street_nr: string
  creditor_zip: string
  creditor_city: string
  debtor_name: string
  debtor_street: string
  debtor_zip: string
  debtor_city: string
  amount_rappen: number
  currency?: string
  reference?: string
  additional_info?: string
}

function pad(str: string) {
  return (str || '').trim()
}

export function buildSwissQRData(p: SwissQRParams): string {
  const amount = (p.amount_rappen / 100).toFixed(2)
  const currency = p.currency || 'CHF'

  // NON = unstructured reference (no 27-digit QRR needed)
  const ref = pad(p.reference || '')
  const refType = 'NON'

  // Debtor: use type 'K' (combined) so street+nr can be in one line
  // This is more robust when street already contains the number
  const debtorAddrLine2 = [pad(p.debtor_zip), pad(p.debtor_city)].filter(Boolean).join(' ')

  const lines = [
    // Header (3 fields)
    'SPC',
    '0200',
    '1',
    // Creditor (7 fields)
    pad(p.qr_iban),
    'S',
    pad(p.creditor_name),
    pad(p.creditor_street),
    pad(p.creditor_street_nr),
    pad(p.creditor_zip),
    pad(p.creditor_city),
    'CH',
    // Ultimate Creditor – exactly 7 empty fields (mandatory per SPS 2.2)
    '', '', '', '', '', '', '',
    // Amount (2 fields)
    amount,
    currency,
    // Debtor (7 fields) – type K = combined address
    'K',
    pad(p.debtor_name),
    pad(p.debtor_street),     // line 1: street incl. number
    debtorAddrLine2,          // line 2: zip + city
    '',                       // must be empty for type K
    '',                       // must be empty for type K
    'CH',
    // Reference (3 fields)
    refType,
    ref,
    pad(p.additional_info || ''),
    // Trailer
    'EPD',
  ]

  return lines.join('\r\n')
}

export async function generateSwissQRBase64(params: SwissQRParams): Promise<string> {
  const data = buildSwissQRData(params)
  const dataUrl = await QRCode.toDataURL(data, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 200,
    color: { dark: '#000000', light: '#FFFFFF' },
  })
  return dataUrl
}
