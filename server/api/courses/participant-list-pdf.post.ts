import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'
import { loadCourseRoster } from '~/server/utils/course-roster'
import { getTenantBranding } from '~/server/utils/tenant-branding'
import { loadTenantLogoForPdf } from '~/server/utils/tenant-logo-for-pdf'
import { uploadPdfAndGetPublicUrl } from '~/server/utils/upload-pdf-public'
import { buildParticipantListHtml } from '~/utils/print-participant-list'
import { logger } from '~/utils/logger'

let puppeteer: any
async function getPuppeteer() {
  if (!puppeteer) { puppeteer = await import('puppeteer-core') }
  return puppeteer
}

let chromiumModule: any
async function getChromium() {
  if (!chromiumModule) {
    chromiumModule = (await import('@sparticuz/chromium')).default
  }
  return chromiumModule
}

/**
 * POST /api/courses/participant-list-pdf
 * Body: { courseId?: string, appointmentId?: string }
 *
 * Renders the same participant-list layout as a real PDF and returns an HTTPS URL
 * so the native iOS/Android app can open it via Capacitor Browser.
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event).catch(() => ({}))
  const courseId = typeof body?.courseId === 'string' ? body.courseId : null
  const appointmentId = typeof body?.appointmentId === 'string' ? body.appointmentId : null

  const supabase = getSupabaseAdmin()
  const roster = await loadCourseRoster(supabase, profile, { courseId, appointmentId })
  const participants = roster.all_participants || []

  if (!roster.course?.name || participants.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Keine Teilnehmer für die Liste' })
  }

  const branding = await getTenantBranding(profile.tenant_id)
  const logo = await loadTenantLogoForPdf(branding.logoUrl)
  const logoUrl = logo ? `data:image/png;base64,${logo.base64}` : ''

  const html = buildParticipantListHtml({
    course: roster.course,
    participants,
    brand: {
      color: branding.primaryColor || '#1E40AF',
      tenant: branding.tenantName || 'Unternehmen',
      logoUrl,
    },
  })

  if (!html) {
    throw createError({ statusCode: 400, statusMessage: 'Teilnehmerliste konnte nicht erzeugt werden' })
  }

  const { default: Puppeteer } = await getPuppeteer()
  const isProduction = !!(process.env.NODE_ENV === 'production' || process.env.VERCEL || process.env.USE_SPARTICUZ_CHROMIUM)

  let launchOptions: any
  if (isProduction) {
    const chromium = await getChromium()
    launchOptions = {
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    }
  } else {
    const { existsSync } = await import('node:fs')
    const chromePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
    ]
    const executablePath = chromePaths.find(p => existsSync(p))
    launchOptions = {
      headless: 'new',
      pipe: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      ...(executablePath ? { executablePath } : {}),
    }
  }

  let browser: any
  try {
    browser = await Puppeteer.launch(launchOptions)
    const page = await browser.newPage()
    page.setDefaultNavigationTimeout(30000)
    page.setDefaultTimeout(30000)

    try {
      await page.setContent(html, { waitUntil: 'load', timeout: 30000 })
    } catch {
      // Content is usually loaded even if networkidle times out
    }

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
      timeout: 30000,
    })

    await page.close()
    await browser.close()
    browser = null

    const filename = `Teilnehmerliste_${roster.course.name || 'Kurs'}.pdf`

    const uploaded = await uploadPdfAndGetPublicUrl(supabase, {
      folder: 'participant-lists',
      filename,
      pdfBuffer: Buffer.from(pdfBuffer),
    })

    logger.debug('✅ Participant list PDF generated for course', roster.course.id)
    return { success: true, pdfUrl: uploaded.pdfUrl, filename: uploaded.filename }
  } catch (err: any) {
    if (browser) {
      try { await browser.close() } catch { /* ignore */ }
    }
    logger.error('❌ Participant list PDF generation failed:', err)
    throw createError({
      statusCode: 500,
      statusMessage: `PDF generation failed: ${err?.message || 'unknown error'}`,
    })
  }
})
