// server/api/vouchers/download-pdf.post.ts
// Gutschein-PDF Download API

import { getSupabaseAdmin } from '~/utils/supabase'
import { generateVoucherPDFContent, type VoucherBranding } from '~/utils/voucherGenerator'
import { setHeader, send } from 'h3'

// Use dynamic import for puppeteer to avoid issues in some environments
let puppeteer: any
async function getPuppeteer() {
  if (!puppeteer) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    puppeteer = await import('puppeteer')
  }
  return puppeteer
}

interface DownloadRequest {
  voucherId: string
}

export default defineEventHandler(async (event) => {
  try {
    const { voucherId }: DownloadRequest = await readBody(event)
    
    if (!voucherId) {
      throw new Error('Voucher ID is required')
    }

    console.log('🎁 Generating PDF for voucher:', voucherId)

    // Gutschein-Daten aus der Datenbank abrufen (server-side admin client to bypass RLS)
    const supabase = getSupabaseAdmin()
    const { data: voucher, error: voucherError } = await supabase
      .from('discounts')
      .select('*')
      .eq('id', voucherId)
      .eq('is_voucher', true)
      .single()

    if (voucherError || !voucher) {
      throw new Error('Voucher not found')
    }

    // Branding laden (optional)
    let branding: VoucherBranding = {}
    const tenantId = voucher.tenant_id || voucher.metadata?.tenant_id || null
    if (tenantId) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('primary_color, secondary_color, logo_url')
        .eq('id', tenantId)
        .single()
      if (tenant) {
        branding = {
          primaryColor: tenant.primary_color || undefined,
          secondaryColor: tenant.secondary_color || undefined,
          logoUrl: tenant.logo_url || undefined
        }
      }
    }

    // Betrag robust ermitteln (CHF)
    const parseNum = (v: any) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : undefined
    }

    let amountChf: number | undefined

    // 1) Feste Beträge werden in discount_value (CHF) gespeichert
    if (voucher.discount_type === 'fixed') {
      const dv = parseNum(voucher.discount_value)
      if (dv && dv > 0) amountChf = dv
    }

    // 2) Fallbacks auf Rappen-Felder
    if (amountChf === undefined) {
      const remaining = parseNum(voucher.remaining_amount_rappen)
      if (remaining && remaining > 0) amountChf = remaining / 100
    }
    if (amountChf === undefined) {
      const maxDisc = parseNum(voucher.max_discount_rappen)
      if (maxDisc && maxDisc > 0) amountChf = maxDisc / 100
    }
    if (amountChf === undefined) {
      const valueRappen = parseNum(voucher.value_rappen)
      if (valueRappen && valueRappen > 0) amountChf = valueRappen / 100
    }

    // 3) Letzter Fallback: 0
    if (amountChf === undefined) amountChf = 0

    const recipient: string | undefined = voucher.voucher_recipient_name || undefined
    const description: string | undefined = voucher.description || voucher.voucher_note || undefined

    // HTML für PDF generieren
    const htmlContent = generateVoucherPDFContent({
      code: voucher.code,
      name: voucher.name || 'Gutschein',
      amount_chf: amountChf,
      recipient_name: recipient,
      valid_until: voucher.valid_until || new Date(Date.now() + 365*24*60*60*1000).toISOString(),
      description
    }, branding)

    // ECHTES PDF mit Puppeteer rendern
    const { default: Puppeteer } = await getPuppeteer()
    const browser = await Puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    const page = await browser.newPage()
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    })

    await page.close()
    await browser.close()

    console.log('✅ Voucher PDF generated successfully for:', voucher.code)

    // Stream als echtes PDF zurückgeben
    setHeader(event, 'Content-Type', 'application/pdf')
    setHeader(event, 'Content-Disposition', `attachment; filename="Gutschein_${voucher.code}.pdf"`)
    return send(event, pdfBuffer)

  } catch (error: any) {
    console.error('❌ Error generating voucher PDF:', error)
    setHeader(event, 'Content-Type', 'application/json')
    return { success: false, error: error.message || 'Error generating voucher PDF' }
  }
})
