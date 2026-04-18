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
  reference?: string       // Pre-computed reference (RF… or 26-digit QRR) or leave empty to auto-generate
  invoice_number?: string  // Used to auto-generate reference if not provided
  additional_info?: string
}

function pad(str: string) {
  return (str || '').trim()
}

// IBAN must have no spaces in QR data (SPS 2.2)
function cleanIban(iban: string) {
  return (iban || '').replace(/\s+/g, '')
}

/**
 * Swiss QR-IBAN detection: QR-IID is in range 30000–31999
 * (positions 5–9 of the IBAN after the 4-char country+check prefix)
 */
export function isQrIban(iban: string): boolean {
  const clean = cleanIban(iban).toUpperCase()
  if (!clean.startsWith('CH')) return false
  const qrIid = parseInt(clean.slice(4, 9), 10)
  return qrIid >= 30000 && qrIid <= 31999
}

/**
 * Mod10 recursive (Luhn-like) check digit — used for QRR references
 */
function mod10Recursive(digits: string): number {
  const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5]
  let n = 0
  for (const d of digits) {
    n = table[(n + parseInt(d, 10)) % 10]
  }
  return (10 - n) % 10
}

/**
 * Generates a 26-digit QRR reference from an invoice number.
 * Suitable for use with QR-IBANs.
 */
export function generateQRR(invoiceNumber: string): string {
  const digits = invoiceNumber.replace(/\D/g, '').slice(0, 25).padStart(25, '0')
  const check = mod10Recursive(digits)
  return digits + check
}

/**
 * Generates an ISO 11649 Creditor Reference (SCOR) from any string, e.g. invoice number.
 * Format: RF<2 check digits><alphanumeric reference>
 * Suitable for use with regular IBANs (not QR-IBANs).
 */
export function generateSCOR(invoiceNumber: string): string {
  const cleaned = invoiceNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase()
  if (!cleaned) return ''

  // Convert letters to digits (A=10 … Z=35), then compute mod 97
  const numeric = (cleaned + 'RF00').split('').map(c => {
    const code = c.charCodeAt(0)
    return code >= 65 && code <= 90 ? (code - 55).toString() : c
  }).join('')

  let remainder = 0
  for (const ch of numeric) {
    remainder = (remainder * 10 + parseInt(ch, 10)) % 97
  }

  const checkDigits = String(98 - remainder).padStart(2, '0')
  return 'RF' + checkDigits + cleaned
}

/**
 * Auto-selects the right reference type based on IBAN:
 * - QR-IBAN → QRR (26-digit numeric)
 * - Regular IBAN → SCOR (RF...)
 */
export function generateReference(invoiceNumber: string, iban: string): { ref: string; refType: 'QRR' | 'SCOR' | 'NON' } {
  if (!invoiceNumber) return { ref: '', refType: 'NON' }
  if (isQrIban(iban)) {
    return { ref: generateQRR(invoiceNumber), refType: 'QRR' }
  }
  const ref = generateSCOR(invoiceNumber)
  return { ref, refType: ref ? 'SCOR' : 'NON' }
}

export function buildSwissQRData(p: SwissQRParams): string {
  const amount = (p.amount_rappen / 100).toFixed(2)
  const currency = p.currency || 'CHF'

  let ref = pad(p.reference || '')
  let refType: 'QRR' | 'SCOR' | 'NON' = 'NON'

  if (!ref && p.invoice_number) {
    const generated = generateReference(p.invoice_number, p.qr_iban)
    ref = generated.ref
    refType = generated.refType
  } else if (ref) {
    if (/^\d{26}$/.test(ref)) refType = 'QRR'
    else if (ref.startsWith('RF')) refType = 'SCOR'
  }

  // Both creditor and debtor use type 'K' (combined address) for robustness.
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
    cleanIban(p.qr_iban),
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
