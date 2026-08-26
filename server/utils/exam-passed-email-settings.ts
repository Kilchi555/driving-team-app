import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export interface ExamPassedEmailSettings {
  congratulationsEnabled: boolean
  reviewFollowupEnabled: boolean
  reviewFollowupDays: number
  affiliatePromoEnabled: boolean
  affiliatePromoDays: number
  congratulationsSubject: string
  congratulationsBody: string
  reviewFollowupSubject: string
  reviewFollowupBody: string
  affiliatePromoSubject: string
  affiliatePromoBody: string
}

export const DEFAULT_EXAM_PASSED_EMAIL_COPY = {
  congratulationsSubject: 'Herzlichen Glückwunsch – Prüfung bestanden!',
  congratulationsBody: 'du hast deine Prüfung bestanden!\nWir von {tenantName} gratulieren dir ganz herzlich – du hast es verdient!',
  reviewFollowupSubject: 'Hinterlasse uns eine Bewertung – wir freuen uns auf dein Feedback!',
  reviewFollowupBody: 'vor einer Woche hast du deine Prüfung bestanden – herzlichen Glückwunsch nochmal!\n\nWenn du zufrieden warst und uns weiterempfehlen möchtest, würden wir uns über eine kurze Google-Bewertung sehr freuen.',
  affiliatePromoSubject: 'Freunde empfehlen & Geld verdienen – so funktioniert\'s',
  affiliatePromoBody: 'vor einem Monat hast du deine Prüfung bestanden – herzlichen Glückwunsch nochmal!\n\nHast du Freunde oder Bekannte, die noch eine Ausbildung vor sich haben? Mit unserem Empfehlungsprogramm verdienst du ganz einfach Geld.',
} as const

export const DEFAULT_EXAM_PASSED_EMAIL_SETTINGS: ExamPassedEmailSettings = {
  congratulationsEnabled: true,
  reviewFollowupEnabled: true,
  reviewFollowupDays: 7,
  affiliatePromoEnabled: true,
  affiliatePromoDays: 30,
  congratulationsSubject: '',
  congratulationsBody: '',
  reviewFollowupSubject: '',
  reviewFollowupBody: '',
  affiliatePromoSubject: '',
  affiliatePromoBody: '',
}

const SUBJECT_MAX = 140
const BODY_MAX = 1000

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\r\n/g, '\n').trim().slice(0, max)
}

export function parseExamPassedEmailSettings(raw: unknown): ExamPassedEmailSettings {
  const value = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {}

  return {
    congratulationsEnabled: value.congratulationsEnabled !== false,
    reviewFollowupEnabled: value.reviewFollowupEnabled !== false,
    reviewFollowupDays: clampInt(value.reviewFollowupDays, 7, 1, 90),
    affiliatePromoEnabled: value.affiliatePromoEnabled !== false,
    affiliatePromoDays: clampInt(value.affiliatePromoDays, 30, 1, 180),
    congratulationsSubject: cleanText(value.congratulationsSubject, SUBJECT_MAX),
    congratulationsBody: cleanText(value.congratulationsBody, BODY_MAX),
    reviewFollowupSubject: cleanText(value.reviewFollowupSubject, SUBJECT_MAX),
    reviewFollowupBody: cleanText(value.reviewFollowupBody, BODY_MAX),
    affiliatePromoSubject: cleanText(value.affiliatePromoSubject, SUBJECT_MAX),
    affiliatePromoBody: cleanText(value.affiliatePromoBody, BODY_MAX),
  }
}

export function applyExamPassedPlaceholders(
  template: string,
  vars: { firstName: string; tenantName: string },
): string {
  return String(template || '')
    .replaceAll('{firstName}', vars.firstName)
    .replaceAll('{tenantName}', vars.tenantName)
}

function parseStoredConfig(raw: unknown): unknown {
  if (raw == null) return null
  if (typeof raw === 'object') return raw
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return null }
  }
  return null
}

export async function loadExamPassedEmailSettings(tenantId: string): Promise<ExamPassedEmailSettings> {
  if (!tenantId) return { ...DEFAULT_EXAM_PASSED_EMAIL_SETTINGS }

  const { data } = await getSupabaseAdmin()
    .from('tenant_settings')
    .select('setting_value')
    .eq('tenant_id', tenantId)
    .eq('category', 'exam_passed_emails')
    .eq('setting_key', 'config')
    .maybeSingle()

  return parseExamPassedEmailSettings(parseStoredConfig(data?.setting_value))
}
