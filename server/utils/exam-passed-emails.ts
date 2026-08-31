import { getAppUrl } from '~/server/utils/app-url'
import { escapeAttr, escapeHtml } from '~/server/utils/branded-email'
import { getTenantPlaceIds } from '~/server/utils/tenant-google-reviews'
import type { Terminology } from '~/composables/useTerminology'
import {
  applyExamPassedPlaceholders,
  DEFAULT_EXAM_PASSED_EMAIL_COPY,
  DEFAULT_EXAM_PASSED_EMAIL_SETTINGS,
  type ExamPassedEmailSettings,
} from '~/server/utils/exam-passed-email-settings'

export type ExamReviewPlace = { name: string; placeId: string }

export type ExamPassedEmailInput = {
  firstName: string
  tenantName: string
  tenantSlug?: string | null
  primaryColor?: string | null
  logoWideUrl?: string | null
  logoUrl?: string | null
  logoSquareUrl?: string | null
  googleReviewPlaces?: unknown
  affiliateEnabled: boolean
  terms?: Partial<Terminology> | null
  settings?: Partial<ExamPassedEmailSettings> | null
}

export type ExamPassedQueuedEmail = {
  subject: string
  html: string
  stage: 'exam_passed_review_followup' | 'exam_passed_affiliate_promo'
  sendAfterDays: number
}

export type ExamPassedEmailPlan = {
  reviewPlaces: ExamReviewPlace[]
  congratulations: { subject: string; html: string } | null
  reviewFollowup: ExamPassedQueuedEmail | null
  affiliatePromo: ExamPassedQueuedEmail | null
}

const DEFAULT_COLOR = '#2563eb'

export function resolveExamReviewPlaces(raw: unknown): ExamReviewPlace[] {
  return getTenantPlaceIds(raw).map((p) => ({
    name: p.label,
    placeId: p.placeId,
  }))
}

export function safeEmailColor(raw: string | null | undefined, fallback = DEFAULT_COLOR): string {
  const value = String(raw || '').trim()
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) ? value : fallback
}

function appBaseUrl(): string {
  const raw = getAppUrl().replace(/\/$/, '')
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
}

export function examPassedAppLinks(tenantSlug?: string | null): { affiliateUrl: string; customerUrl: string } {
  const base = appBaseUrl()
  const slug = String(tenantSlug || '').trim()
  return {
    affiliateUrl: slug ? `${base}/affiliate-dashboard?tenant=${encodeURIComponent(slug)}` : `${base}/affiliate-dashboard`,
    customerUrl: slug ? `${base}/${encodeURIComponent(slug)}` : `${base}/login`,
  }
}

function usableHttpsLogo(...urls: Array<string | null | undefined>): string | null {
  for (const url of urls) {
    const value = String(url || '').trim()
    if (value.startsWith('https://')) return value
  }
  return null
}

function reviewWriteUrl(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`
}

function logoHtml(tenantName: string, primaryColor: string, logoSrc: string | null): string {
  if (logoSrc) {
    return `<img src="${escapeAttr(logoSrc)}" alt="${escapeAttr(tenantName)}" style="height:40px;max-width:180px;object-fit:contain;display:block;margin:0 auto 24px">`
  }
  const initial = escapeHtml((tenantName.trim().charAt(0) || 'S').toUpperCase())
  return `<div style="display:inline-block;width:44px;height:44px;border-radius:10px;background:${primaryColor};color:white;font-size:22px;font-weight:700;line-height:44px;text-align:center;margin:0 auto 24px">${initial}</div>`
}

function reviewButtons(places: ExamReviewPlace[], primaryColor: string, compact = false): string {
  const labelPrefix = compact ? '⭐ Bewertung – ' : '⭐ Bewertung schreiben – '
  return `<table width="100%" cellpadding="0" cellspacing="0">
    ${places.map((p) => `<tr><td style="padding:5px 0;text-align:center">
      <a href="${escapeAttr(reviewWriteUrl(p.placeId))}"
         style="display:inline-block;background:${primaryColor};color:#ffffff;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;min-width:200px;text-align:center">
        ${labelPrefix}${escapeHtml(p.name)}
      </a>
    </td></tr>`).join('\n')}
  </table>`
}

function emailShell(opts: {
  logo: string
  headerEmoji: string
  title: string
  tenantName: string
  primaryColor: string
  body: string
}): string {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
        <tr><td style="text-align:center;padding-bottom:8px">${opts.logo}</td></tr>
        <tr><td style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
          <div style="background:${opts.primaryColor};padding:32px 32px 24px;text-align:center">
            <div style="font-size:48px;margin-bottom:8px">${opts.headerEmoji}</div>
            <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff">${opts.title}</h1>
            <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85)">${escapeHtml(opts.tenantName)}</p>
          </div>
          <div style="padding:28px 32px">
            ${opts.body}
          </div>
          <div style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center">
            <p style="margin:0;font-size:12px;color:#9ca3af">${escapeHtml(opts.tenantName)}</p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function examPassedDelayPhrase(days: number): string {
  if (days === 1) return 'gestern'
  if (days === 7) return 'vor einer Woche'
  if (days === 14) return 'vor zwei Wochen'
  if (days === 30) return 'vor einem Monat'
  return `vor ${days} Tagen`
}

function customOrDefaultParagraph(
  custom: string,
  fallback: string,
  vars: { firstName: string; tenantName: string },
): string {
  const source = custom.trim() || fallback
  const withVars = applyExamPassedPlaceholders(source, vars)
  const html = escapeHtml(withVars).replace(/\n/g, '<br>')
  return `<p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6">${html}</p>`
}

function resolveSubject(custom: string, fallback: string, vars: { firstName: string; tenantName: string }): string {
  return applyExamPassedPlaceholders(custom.trim() || fallback, vars)
}

function affiliateTeaserHtml(primaryColor: string, affiliateUrl: string): string {
  return `<div style="margin:0 0 28px;background:#f9fafb;border-radius:10px;padding:20px 24px;border-top:3px solid ${primaryColor}">
    <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Übrigens</p>
    <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#374151">Wusstest du schon, dass du bares Geld mit Weiterempfehlung verdienen kannst?</p>
    <p style="margin:0 0 14px;font-size:14px;color:#6b7280;line-height:1.6">
      Mit unserem Empfehlungsprogramm erhältst du für jede Person, die du zu uns schickst, eine Gutschrift auf dein Konto – die du jederzeit auszahlen lassen kannst.
    </p>
    <a href="${escapeAttr(affiliateUrl)}"
       style="display:inline-block;background:${primaryColor};color:#ffffff;padding:11px 24px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none">
      Empfehlungs-Dashboard →
    </a>
  </div>`
}

export function planExamPassedEmails(input: ExamPassedEmailInput): ExamPassedEmailPlan {
  const tenantName = (input.tenantName || '').trim() || 'Ihr Unternehmen'
  const firstName = (input.firstName || '').trim() || 'du'
  const primaryColor = safeEmailColor(input.primaryColor)
  const reviewPlaces = resolveExamReviewPlaces(input.googleReviewPlaces)
  const affiliateEnabled = input.affiliateEnabled === true
  const settings = { ...DEFAULT_EXAM_PASSED_EMAIL_SETTINGS, ...(input.settings || {}) }
  const terms = input.terms || {}
  const businessNoun = terms.businessNoun || 'nächste Ausbildung'
  const appointment = terms.appointment || 'Termin'
  const { affiliateUrl, customerUrl } = examPassedAppLinks(input.tenantSlug)
  const logo = logoHtml(
    tenantName,
    primaryColor,
    usableHttpsLogo(input.logoWideUrl, input.logoUrl, input.logoSquareUrl),
  )
  const safeFirst = escapeHtml(firstName)
  const vars = { firstName, tenantName }

  const reviewSection = reviewPlaces.length > 0
    ? `<div style="margin:28px 0">
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;text-align:center">
          Wir würden uns sehr freuen, wenn du dir kurz Zeit nimmst und uns eine Google-Bewertung hinterlässt –<br>das hilft anderen, uns zu finden.
        </p>
        ${reviewButtons(reviewPlaces, primaryColor)}
        <p style="margin:14px 0 0;font-size:12px;color:#9ca3af;text-align:center">Dauert nur 1 Minute – wir sind dankbar für jedes Feedback!</p>
      </div>`
    : `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6">
        Herzlichen Glückwunsch – wir freuen uns mit dir!
      </p>`

  const congratulations = settings.congratulationsEnabled
    ? {
        subject: resolveSubject(settings.congratulationsSubject, DEFAULT_EXAM_PASSED_EMAIL_COPY.congratulationsSubject, vars),
        html: emailShell({
          logo,
          headerEmoji: '🏆',
          title: 'Herzlichen Glückwunsch!',
          tenantName,
          primaryColor,
          body: `<p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.6">
            Hallo ${safeFirst},
          </p>
          ${customOrDefaultParagraph(
            settings.congratulationsBody,
            `du hast deine Prüfung bestanden!\nWir von ${tenantName} gratulieren dir ganz herzlich – du hast es verdient!`,
            vars,
          )}
          ${reviewSection}`,
        }),
      }
    : null

  const reviewFollowup = settings.reviewFollowupEnabled && reviewPlaces.length > 0
    ? {
        subject: resolveSubject(settings.reviewFollowupSubject, DEFAULT_EXAM_PASSED_EMAIL_COPY.reviewFollowupSubject, vars),
        html: emailShell({
          logo,
          headerEmoji: '⭐',
          title: 'Wie war deine Erfahrung?',
          tenantName,
          primaryColor,
          body: `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6">
            Hallo ${safeFirst},
          </p>
          ${customOrDefaultParagraph(
            settings.reviewFollowupBody,
            `${examPassedDelayPhrase(settings.reviewFollowupDays)} hast du deine Prüfung bestanden – herzlichen Glückwunsch nochmal!\n\nWenn du zufrieden warst und uns weiterempfehlen möchtest, würden wir uns über eine kurze Google-Bewertung sehr freuen. Das hilft anderen, uns zu finden und gibt uns wichtiges Feedback.`,
            vars,
          )}
          ${reviewButtons(reviewPlaces, primaryColor, true)}
          <p style="margin:16px 0 24px;font-size:14px;color:#6b7280;line-height:1.6;text-align:center">
            Falls du bereits eine Bewertung hinterlassen hast – vielen herzlichen Dank!<br>
            Das bedeutet uns sehr viel und hilft anderen, den richtigen Weg zu uns zu finden.
          </p>
          ${affiliateEnabled && settings.affiliatePromoEnabled ? affiliateTeaserHtml(primaryColor, affiliateUrl) : ''}
          <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;text-align:center">
            Alles Gute und bis bald!
          </p>`,
        }),
        stage: 'exam_passed_review_followup' as const,
        sendAfterDays: settings.reviewFollowupDays,
      }
    : null

  const affiliatePromo = settings.affiliatePromoEnabled && affiliateEnabled
    ? {
        subject: resolveSubject(settings.affiliatePromoSubject, DEFAULT_EXAM_PASSED_EMAIL_COPY.affiliatePromoSubject, vars),
        html: emailShell({
          logo,
          headerEmoji: '💸',
          title: 'Geld verdienen mit Empfehlungen',
          tenantName,
          primaryColor,
          body: `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6">
            Hallo ${safeFirst},
          </p>
          ${customOrDefaultParagraph(
            settings.affiliatePromoBody,
            `${examPassedDelayPhrase(settings.affiliatePromoDays)} hast du deine Prüfung bestanden – herzlichen Glückwunsch nochmal!\n\nHast du Freunde oder Bekannte, die noch ${businessNoun} vor sich haben? Mit unserem Empfehlungsprogramm verdienst du ganz einfach Geld:`,
            vars,
          )}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
            <tr>
              <td style="padding:12px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e">
                <p style="margin:0;font-size:14px;color:#374151;font-weight:600">① Link teilen</p>
                <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Teile deinen persönlichen Link mit Freunden.</p>
              </td>
            </tr>
            <tr><td style="height:8px"></td></tr>
            <tr>
              <td style="padding:12px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e">
                <p style="margin:0;font-size:14px;color:#374151;font-weight:600">② Freund bucht</p>
                <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Sobald dein Freund eine ${escapeHtml(appointment)} bezahlt, wird der Betrag auf deinem Guthaben-Konto gutgeschrieben.</p>
              </td>
            </tr>
            <tr><td style="height:8px"></td></tr>
            <tr>
              <td style="padding:12px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e">
                <p style="margin:0;font-size:14px;color:#374151;font-weight:600">③ Geld auszahlen</p>
                <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Du kannst die Auszahlung deines Guthabens jederzeit per Banküberweisung beantragen.</p>
              </td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:5px 0;text-align:center">
              <a href="${escapeAttr(affiliateUrl)}"
                 style="display:inline-block;background:${primaryColor};color:#ffffff;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;min-width:220px;text-align:center">
                Jetzt Geld verdienen
              </a>
            </td></tr>
            <tr><td style="padding:8px 0;text-align:center">
              <a href="${escapeAttr(customerUrl)}"
                 style="display:inline-block;color:${primaryColor};padding:10px 24px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none">
                Zum Kundenkonto →
              </a>
            </td></tr>
          </table>`,
        }),
        stage: 'exam_passed_affiliate_promo' as const,
        sendAfterDays: settings.affiliatePromoDays,
      }
    : null

  return { reviewPlaces, congratulations, reviewFollowup, affiliatePromo }
}
