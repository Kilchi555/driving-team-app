// server/api/vouchers/download-pdf.post.ts
// Gutschein-PDF Download API — nur für eingeloggte User (eigener Gutschein)

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { generateVoucherPDFContent } from '~/utils/voucherGenerator'
import { getTenantBranding } from '~/server/utils/tenant-branding'
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
  // ── Auth ──────────────────────────────────────────────
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Authentication required' })

  const userId = authUser.db_user_id || authUser.id

  try {
    const { voucherId }: DownloadRequest = await readBody(event)
    
    if (!voucherId) {
      throw createError({ statusCode: 400, statusMessage: 'Voucher ID is required' })
    }

    logger.debug('🎁 Generating PDF for voucher:', voucherId)

    const supabase = getSupabaseAdmin()
    const { data: voucher, error: voucherError } = await supabase
      .from('vouchers')
      .select('*')
      .eq('id', voucherId)
      .single()

    if (voucherError || !voucher) {
      throw createError({ statusCode: 404, statusMessage: 'Voucher not found' })
    }

    // ── Ownership check: only buyer or admin can download ─
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, role, tenant_id')
      .eq('id', userId)
      .single()

    const isAdmin = userProfile && ['admin', 'tenant_admin', 'staff'].includes(userProfile.role)
    const isOwner = voucher.redeemed_by === userId || voucher.tenant_id === userProfile?.tenant_id

    if (!isAdmin && !isOwner) {
      throw createError({ statusCode: 403, statusMessage: 'Access denied' })
    }

    // Load tenant branding (name, color, logo)
    const tenantId = voucher.tenant_id || voucher.metadata?.tenant_id || null
    const branding = tenantId ? await getTenantBranding(tenantId) : {}

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
    if (error.statusCode) throw error
    console.error('❌ Error generating voucher PDF:', error)
    setHeader(event, 'Content-Type', 'application/json')
    return { success: false, error: error.message || 'Error generating voucher PDF' }
  }
})
