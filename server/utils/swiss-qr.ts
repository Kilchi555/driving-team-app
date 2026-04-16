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

  // Both creditor and debtor use type 'K' (combined address) for robustness.
  // K: line1 = street + number, line2 = zip + city, zip and city fields MUST be empty.
  const creditorAddrLine1 = [pad(p.creditor_street), pad(p.creditor_street_nr)].filter(Boolean).join(' ')
  const creditorAddrLine2 = [pad(p.creditor_zip), pad(p.creditor_city)].filter(Boolean).join(' ')

  const debtorAddrLine1 = pad(p.debtor_street)
  const debtorAddrLine2 = [pad(p.debtor_zip), pad(p.debtor_city)].filter(Boolean).join(' ')

  const lines = [
    // Header (3 fields)
    'SPC',
    '0200',
    '1',
    // Account (1 field)
    pad(p.qr_iban),
    // Creditor (7 fields) – type K
    'K',
    pad(p.creditor_name),
    creditorAddrLine1,
    creditorAddrLine2,
    '',   // must be empty for type K
    '',   // must be empty for type K
    'CH',
    // Ultimate Creditor – exactly 7 empty fields (mandatory per SPS 2.2)
    '', '', '', '', '', '', '',
    // Amount (2 fields)
    amount,
    currency,
    // Debtor (7 fields) – type K
    'K',
    pad(p.debtor_name),
    debtorAddrLine1,
    debtorAddrLine2,
    '',   // must be empty for type K
    '',   // must be empty for type K
    'CH',
    // Reference (2 fields)
    refType,
    ref,
    // Additional info + Trailer
    pad(p.additional_info || ''),
    'EPD',
  ]

  return lines.join('\r\n')
}

export async function generateSwissQRBase64(params: SwissQRParams): Promise<string> {
  const data = buildSwissQRData(params)
  const dataUrl = await QRCode.toDataURL(data, {
    errorCorrectionLevel: 'M',
    margin: 4,   // SPS 2.2 requires ≥4 quiet-zone modules
    width: 300,
    color: { dark: '#000000', light: '#FFFFFF' },
  })
  return dataUrl
}
