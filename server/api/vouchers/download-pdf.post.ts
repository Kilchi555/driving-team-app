// server/api/vouchers/download-pdf.post.ts
// Gutschein-PDF Download API

import { getSupabaseAdmin } from '~/utils/supabase'
import { generateVoucherPDFContent, type VoucherBranding } from '~/utils/voucherGenerator'
import { setHeader, send } from 'h3'
import chromium from '@sparticuz/chromium'
import { logger } from '~/utils/logger'

// Use dynamic import for puppeteer to avoid issues in some environments
let puppeteer: any
async function getPuppeteer() {
  if (!puppeteer) {
    puppeteer = await import('puppeteer-core')
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

    logger.debug('🎁 Generating PDF for voucher:', voucherId)

    // Gutschein-Daten aus der Datenbank abrufen (server-side admin client to bypass RLS)
    const supabase = getSupabaseAdmin()
    const { data: voucher, error: voucherError } = await supabase
      .from('vouchers')
      .select('*')
      .eq('id', voucherId)
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

    // 1) Vouchers Tabelle: amount_rappen (neu)
    const amountRappen = parseNum(voucher.amount_rappen)
    if (amountRappen && amountRappen > 0) amountChf = amountRappen / 100

    // 2) Fallback: 0
    if (amountChf === undefined) amountChf = 0

    const recipient: string | undefined = voucher.recipient_name || undefined
    const description: string | undefined = voucher.description || undefined

    // HTML für PDF generieren
    const htmlContent = generateVoucherPDFContent({
      code: voucher.code,
      name: voucher.name || 'Gutschein',
      amount_chf: amountChf,
      recipient_name: recipient,
      valid_until: voucher.valid_until || new Date(Date.now() + 365*24*60*60*1000).toISOString(),
      description
    }, branding)

    // ECHTES PDF mit Puppeteer rendern (mit Vercel Chromium Support)
    const { default: Puppeteer } = await getPuppeteer()
    
    const browser = await Puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
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

    logger.debug('✅ Voucher PDF generated successfully for:', voucher.code)

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
