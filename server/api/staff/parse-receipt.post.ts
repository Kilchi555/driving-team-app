import { defineEventHandler, createError, readBody } from 'h3'
import OpenAI from 'openai'
import { getAuthenticatedUser } from '~/server/utils/auth'

export interface ReceiptParseResult {
  amount_chf: number | null
  date: string | null        // ISO YYYY-MM-DD
  merchant: string | null
  iban: string | null        // Swiss IBAN from QR bill if present
  reference: string | null   // QR reference number if present
  vat_rate: number | null
  vat_amount_chf: number | null
  category_hint: string | null
  confidence: 'high' | 'medium' | 'low'
}

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const role = user.role || user.profile?.role || ''
  if (!['admin', 'staff', 'super_admin', 'tenant_admin', 'accountant'].includes(role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden – staff role required' })
  }

  const { receipt_url } = await readBody<{ receipt_url: string }>(event)
  if (!receipt_url) {
    throw createError({ statusCode: 400, statusMessage: 'receipt_url is required' })
  }

  // SSRF guard: only allow http(s) URLs to known storage hosts
  let parsedUrl: URL
  try {
    parsedUrl = new URL(receipt_url)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid receipt_url' })
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw createError({ statusCode: 400, statusMessage: 'receipt_url must be http(s)' })
  }
  const allowedHosts = [
    'unyjaetebnaexaflpyoc.supabase.co',
    new URL(process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co').host,
  ].filter(Boolean)
  const hostOk = allowedHosts.some((h) => parsedUrl.host === h || parsedUrl.host.endsWith('.supabase.co'))
  if (!hostOk) {
    throw createError({ statusCode: 400, statusMessage: 'receipt_url host not allowed' })
  }

  const apiKey = process.env.NUXT_OPENAI_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw createError({ statusCode: 503, statusMessage: 'OpenAI API key not configured' })
  }

  const client = new OpenAI({ apiKey })

  // Download the image server-side and send as base64 so OpenAI can always access it
  // regardless of whether the Supabase bucket is publicly readable.
  let imageContent: { type: 'image_url'; image_url: { url: string; detail: 'low' } }
  try {
    const imgRes = await fetch(parsedUrl.toString(), {
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    })
    if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`)
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
    const buffer = await imgRes.arrayBuffer()
    if (buffer.byteLength > 8 * 1024 * 1024) {
      throw createError({ statusCode: 400, statusMessage: 'Receipt image too large' })
    }
    const base64 = Buffer.from(buffer).toString('base64')
    const mimeType = contentType.split(';')[0].trim()
    // For PDFs, OpenAI Vision doesn't support them — skip and return empty result
    if (mimeType === 'application/pdf') {
      return {
        success: true,
        data: {
          amount_chf: null, date: null, merchant: null, iban: null, reference: null,
          vat_rate: null, vat_amount_chf: null, category_hint: null, confidence: 'low',
        },
      }
    }
    imageContent = { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'low' } }
  } catch (fetchErr: any) {
    if (fetchErr?.statusCode) throw fetchErr
    throw createError({ statusCode: 502, statusMessage: `Could not fetch receipt image: ${fetchErr.message}` })
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 300,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You extract structured data from receipt and invoice images, including Swiss QR-bills.
Return a JSON object with exactly these fields:
- amount_chf: the total amount as a number (e.g. 12.50). Use null if not found.
- date: the document date as YYYY-MM-DD string. Use null if not found.
- merchant: the creditor/store name as a short string. Use null if not found.
- iban: the IBAN from a Swiss QR-bill or invoice (format CH.. or LI..). Use null if not present.
- reference: the QR reference or ESR reference number if visible. Use null if not present.
- vat_rate: VAT percent if printed (8.1, 2.6, 3.8 or 0). Use null if not shown.
- vat_amount_chf: VAT amount as a number if printed. Use null if not shown.
- category_hint: one of Fahrzeugkosten, Miete & Raumkosten, Versicherungen, Marketing & Werbung, Büro & Verwaltung, IT & Software, Aus- & Weiterbildung, Steuern & Abgaben, Eigenverbrauch / Privat, Sonstige Ausgaben. Use null if unsure.
- confidence: "high" if amount and date are clearly found, "medium" if one is uncertain, "low" if little found.
Only return the JSON, no explanation.`,
      },
      {
        role: 'user',
        content: [
          imageContent,
          {
            type: 'text',
            text: 'Extract total amount, date, merchant, IBAN, reference, VAT and a category hint from this receipt.',
          },
        ],
      },
    ],
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Failed to parse OCR response' })
  }

  return {
    success: true,
    data: {
      amount_chf: asNumber(parsed.amount_chf),
      date: typeof parsed.date === 'string' ? parsed.date : null,
      merchant: typeof parsed.merchant === 'string' ? parsed.merchant : null,
      iban: typeof parsed.iban === 'string' ? parsed.iban : null,
      reference: typeof parsed.reference === 'string' ? parsed.reference : null,
      vat_rate: asNumber(parsed.vat_rate),
      vat_amount_chf: asNumber(parsed.vat_amount_chf),
      category_hint: typeof parsed.category_hint === 'string' ? parsed.category_hint : null,
      confidence: parsed.confidence === 'high' || parsed.confidence === 'medium' ? parsed.confidence : 'low',
    } satisfies ReceiptParseResult,
  }
})

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number.parseFloat(value.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}
