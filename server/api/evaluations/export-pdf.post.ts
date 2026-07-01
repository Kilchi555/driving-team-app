// server/api/evaluations/export-pdf.post.ts
// Generiert ein gebrandetes Bewertungs-PDF für einen Schüler.
// Staff/Admin: erfordern student_id im Body.
// Customer: exportiert eigene Bewertungen (keine student_id nötig).

import { defineEventHandler, readBody, createError, setHeader, send } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getTenantBrandingExtended } from '~/server/utils/tenant-branding'
import { generateEvaluationPdfHtml } from '~/server/utils/evaluation-pdf'
import type { EvaluationPdfData, EvaluationLessonPdf } from '~/server/utils/evaluation-pdf'
import { logger } from '~/utils/logger'

// Lazy-load Puppeteer to avoid spawn issues on server start
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

// Load logo from Supabase Storage and convert to data URL for embedding in PDF
async function loadLogoDataUrl(logoUrl: string | null, supabase: any): Promise<string | null> {
  if (!logoUrl) return null
  if (logoUrl.startsWith('data:')) return logoUrl

  try {
    // Try to download via Supabase Storage API first (works with private buckets)
    const relMatch = logoUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/)
    const absMatch = logoUrl.match(/supabase\.co\/storage\/v1\/object\/public\/([^/]+)\/(.+)/)
    const match = relMatch || absMatch

    if (match) {
      const bucketName = match[1]
      const filePath = match[2].split('?')[0]
      const { data: blob, error } = await supabase.storage.from(bucketName).download(filePath)
      if (!error && blob) {
        const arrayBuffer = await blob.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        const ext = filePath.split('.').pop()?.toLowerCase()
        const mime = ext === 'svg' ? 'image/svg+xml'
          : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
          : ext === 'webp' ? 'image/webp'
          : 'image/png'
        return `data:${mime};base64,${base64}`
      }
    }

    // Fallback: plain HTTP fetch for external URLs
    const fullUrl = logoUrl.startsWith('http') ? logoUrl : `https://unyjaetebnaexaflpyoc.supabase.co${logoUrl}`
    const response = await fetch(fullUrl, { headers: { Accept: 'image/*' } })
    if (response.ok) {
      const buffer = await response.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const mime = response.headers.get('content-type') || 'image/png'
      return `data:${mime};base64,${base64}`
    }
  } catch (err) {
    logger.warn('⚠️ Could not load logo for evaluation PDF:', err)
  }
  return null
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    // Convert UTC → Europe/Zurich for display
    const localStr = d.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
    const local = new Date(localStr)
    return local.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return dateStr
  }
}

// Default rating colors when evaluation_scale data is incomplete
const DEFAULT_RATING_COLORS: Record<number, string> = {
  1: '#6b7280',
  2: '#3b82f6',
  3: '#ef4444',
  4: '#f59e0b',
  5: '#22c55e',
  6: '#10b981',
}
const DEFAULT_RATING_LABELS: Record<number, string> = {
  1: 'Besprochen',
  2: 'Geübt',
  3: 'Ungenügend',
  4: 'Genügend',
  5: 'Gut',
  6: 'Prüfungsreif',
}

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const dbUserId: string = authUser.db_user_id || authUser.id
  const userRole: string = authUser.profile?.role || authUser.role || 'customer'
  const tenantId: string | null = authUser.tenant_id || authUser.profile?.tenant_id || null

  const body = await readBody(event).catch(() => ({}))
  const requestedStudentId: string | undefined = body?.student_id

  const supabase = getSupabaseAdmin()

  // Resolve the target user: staff/admin can request any student in same tenant;
  // customers always export their own data.
  let studentUserId: string
  let studentProfile: { first_name: string; last_name: string } | null = null

  const isStaffOrAdmin = ['admin', 'tenant_admin', 'staff'].includes(userRole)

  if (isStaffOrAdmin && requestedStudentId) {
    // Verify student belongs to the same tenant
    const { data: studentRow, error: studentError } = await supabase
      .from('users')
      .select('id, first_name, last_name, tenant_id')
      .eq('id', requestedStudentId)
      .single()

    if (studentError || !studentRow) {
      throw createError({ statusCode: 404, statusMessage: 'Student not found' })
    }
    if (studentRow.tenant_id !== tenantId) {
      throw createError({ statusCode: 403, statusMessage: 'Access denied' })
    }
    studentUserId = studentRow.id
    studentProfile = { first_name: studentRow.first_name || '', last_name: studentRow.last_name || '' }
  } else {
    // Customer: export own data
    studentUserId = dbUserId
    const { data: ownProfile } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', studentUserId)
      .single()
    studentProfile = { first_name: ownProfile?.first_name || '', last_name: ownProfile?.last_name || '' }
  }

  if (!tenantId) {
    throw createError({ statusCode: 403, statusMessage: 'Tenant not configured' })
  }

  logger.debug('📄 Generating evaluation PDF for student:', studentUserId)

  // ── Load evaluation scale (rating labels + colors) ──────────────────────────
  const { data: scaleRows } = await supabase
    .from('evaluation_scale')
    .select('rating, label, color')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('rating')

  const ratingLabel: Record<number, string> = { ...DEFAULT_RATING_LABELS }
  const ratingColor: Record<number, string> = { ...DEFAULT_RATING_COLORS }
  ;(scaleRows || []).forEach((s: any) => {
    if (s.rating && s.label) ratingLabel[s.rating] = s.label
    if (s.rating && s.color) ratingColor[s.rating] = s.color
  })

  // ── Load evaluation categories + criteria ────────────────────────────────────
  const { data: categoriesRaw } = await supabase
    .from('evaluation_categories')
    .select('id, name, color, display_order')
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    .eq('is_active', true)
    .order('display_order')

  const { data: criteriaRaw } = await supabase
    .from('evaluation_criteria')
    .select('id, name, category_id, display_order')
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    .eq('is_active', true)
    .order('display_order')

  // ── Load appointments + notes for the student ─────────────────────────────
  const { data: appointmentsRaw } = await supabase
    .from('appointments')
    .select(`
      id,
      start_time,
      end_time,
      type,
      title,
      duration_minutes,
      status,
      staff:users!staff_id (first_name, last_name),
      notes (
        id,
        evaluation_criteria_id,
        criteria_rating,
        criteria_note,
        staff_note
      )
    `)
    .eq('user_id', studentUserId)
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true })

  // ── Build criteria lookup ─────────────────────────────────────────────────
  const criteriaById: Record<string, { name: string; category_id: string }> = {}
  ;(criteriaRaw || []).forEach((c: any) => { criteriaById[c.id] = { name: c.name, category_id: c.category_id } })

  const categoryById: Record<string, { name: string; color: string }> = {}
  ;(categoriesRaw || []).forEach((c: any) => { categoryById[c.id] = { name: c.name, color: c.color || '#6b7280' } })

  // ── Build per-lesson data with criteria ─────────────────────────────────
  const lessonHistory: EvaluationPdfData['lessons'] = []

  let totalLessons = 0
  let evaluatedLessons = 0

  ;(appointmentsRaw || []).forEach((apt: any) => {
    const criteriaEvals = (apt.notes || []).filter((n: any) => n.evaluation_criteria_id && n.criteria_rating)
    const staffNote = (apt.notes || []).find((n: any) => !n.evaluation_criteria_id && n.staff_note)?.staff_note || null

    totalLessons++

    const criteria: EvaluationLessonPdf['criteria'] = criteriaEvals
      .map((n: any) => {
        const criteriaInfo = criteriaById[n.evaluation_criteria_id]
        if (!criteriaInfo) return null
        const categoryInfo = categoryById[criteriaInfo.category_id]
        return {
          name: criteriaInfo.name,
          categoryName: categoryInfo?.name || 'Sonstige',
          rating: n.criteria_rating,
          ratingLabel: ratingLabel[n.criteria_rating] || `${n.criteria_rating}/6`,
          ratingColor: ratingColor[n.criteria_rating] || '#6b7280',
          note: n.criteria_note || null,
        }
      })
      .filter(Boolean) as EvaluationLessonPdf['criteria']

    if (criteria.length > 0) evaluatedLessons++

    lessonHistory.push({
      date: formatDate(apt.start_time),
      durationMinutes: apt.duration_minutes || 0,
      type: apt.type || apt.title || 'Fahrstunde',
      staffName: apt.staff
        ? `${apt.staff.first_name || ''} ${apt.staff.last_name || ''}`.trim() || null
        : null,
      staffNote,
      criteria,
    })
  })

  // ── Assemble PDF data ─────────────────────────────────────────────────────
  const pdfData: EvaluationPdfData = {
    student: {
      firstName: studentProfile?.first_name || '',
      lastName: studentProfile?.last_name || '',
    },
    generatedAt: new Date().toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Zurich',
    }),
    summary: {
      totalLessons,
      evaluatedLessons,
    },
    lessons: lessonHistory,
  }

  // ── Branding + logo ───────────────────────────────────────────────────────
  const branding = await getTenantBrandingExtended(tenantId)
  const logoDataUrl = await loadLogoDataUrl(branding.logoUrl, supabase)

  // ── Render HTML → PDF via Puppeteer ──────────────────────────────────────
  const html = generateEvaluationPdfHtml(pdfData, branding, logoDataUrl)

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
      // Continue even if timeout; content is usually loaded
    }

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '8mm', left: '0mm' },
      timeout: 30000,
    })

    await page.close()
    await browser.close()

    const studentName = `${studentProfile?.first_name || ''}_${studentProfile?.last_name || ''}`.replace(/\s+/g, '_')
    const filename = `Bewertungen_${studentName}_${new Date().toISOString().split('T')[0]}.pdf`

    logger.debug('✅ Evaluation PDF generated successfully for student:', studentUserId, 'size:', pdfBuffer?.length)

    // Upload to Supabase Storage and return a URL (same pattern as receipts)
    // so that native app clients can open it via Browser.open()
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    const filepath = `evaluations/${year}/${month}/${filename}`

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filepath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

    if (uploadError) {
      logger.error('❌ Evaluation PDF upload to storage failed:', uploadError)
      throw createError({ statusCode: 500, statusMessage: `PDF upload failed: ${uploadError.message}` })
    }

    const { data: publicData } = supabase.storage
      .from('receipts')
      .getPublicUrl(filepath)

    return { success: true, pdfUrl: publicData?.publicUrl, filename }
  } catch (err: any) {
    if (browser) {
      try { await browser.close() } catch { /* ignore */ }
    }
    logger.error('❌ Evaluation PDF generation failed:', err)
    throw createError({ statusCode: 500, statusMessage: `PDF generation failed: ${err.message}` })
  }
})
