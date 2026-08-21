export const QUOTE_VALIDITY_DAYS = 30

export function isQuoteDocument(kind: string | null | undefined): boolean {
  return kind === 'quote'
}

/** Offerte: OF-… · Rechnung: RE-… (quote_number bleibt nach Umwandlung erhalten) */
export function documentDisplayNumber(row: {
  document_kind?: string | null
  quote_number?: string | null
  invoice_number?: string | null
}): string {
  if (isQuoteDocument(row.document_kind)) {
    return String(row.quote_number || row.invoice_number || '').trim()
  }
  return String(row.invoice_number || '').trim()
}

export function addDaysIso(dateIso: string, days: number): string {
  const [y, m, d] = dateIso.slice(0, 10).split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

export function defaultQuoteValidUntil(invoiceDate: string, days = QUOTE_VALIDITY_DAYS): string {
  return addDaysIso(invoiceDate.slice(0, 10), days)
}

export function todayZurichIso(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Europe/Zurich' })
}

export function isQuoteExpired(validUntil: string | null | undefined, today = todayZurichIso()): boolean {
  if (!validUntil) return false
  return validUntil.slice(0, 10) < today
}

export type QuoteLifecycle =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'cancelled'

export function quoteLifecycle(row: {
  document_kind?: string | null
  status?: string | null
  valid_until?: string | null
  accepted_at?: string | null
  declined_at?: string | null
}, today = todayZurichIso()): QuoteLifecycle {
  if (row.accepted_at || (row.document_kind === 'invoice' && row.quote_number)) return 'accepted'
  if (row.declined_at) return 'declined'
  if (row.status === 'cancelled') return 'cancelled'
  if (row.status === 'draft' || row.status === 'pdf_created') return 'draft'
  if (isQuoteExpired(row.valid_until, today)) return 'expired'
  if (row.status === 'sent') return 'sent'
  return 'draft'
}

export function canAcceptQuote(row: {
  document_kind?: string | null
  status?: string | null
  valid_until?: string | null
  accepted_at?: string | null
  declined_at?: string | null
}, opts?: { allowDraft?: boolean; today?: string }): { ok: true } | { ok: false; reason: string } {
  if (!isQuoteDocument(row.document_kind)) {
    return { ok: false, reason: 'Dokument ist keine Offerte' }
  }
  if (row.accepted_at) return { ok: false, reason: 'Offerte wurde bereits angenommen' }
  if (row.declined_at || row.status === 'cancelled') {
    return { ok: false, reason: 'Offerte wurde abgelehnt' }
  }
  if (isQuoteExpired(row.valid_until, opts?.today)) {
    return { ok: false, reason: 'Offerte ist abgelaufen' }
  }
  if (!opts?.allowDraft && row.status !== 'sent') {
    return { ok: false, reason: 'Offerte wurde noch nicht versendet' }
  }
  return { ok: true }
}

export function appBaseUrl(): string {
  return (
    process.env.NUXT_PUBLIC_BASE_URL
    || process.env.NUXT_PUBLIC_APP_URL
    || process.env.APP_URL
    || 'https://app.simy.ch'
  ).replace(/\/$/, '')
}

export function quoteAcceptUrl(token: string): string {
  return `${appBaseUrl()}/o/${token}`
}

export const DEFAULT_QUOTE_INTRO =
  'Guten Tag\n\nVielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen folgendes Angebot:'

export const DEFAULT_QUOTE_TERMS =
  'Dieses Angebot ist gültig bis {valid_until}.'

export type DocumentBodyTexts = {
  intro: string
  terms: string
  footer: string
}

export function resolveQuoteDocumentTexts(tenant?: {
  quote_intro_text?: string | null
  quote_terms_text?: string | null
  quote_footer_text?: string | null
  invoice_footer_text?: string | null
} | null): DocumentBodyTexts {
  return {
    intro: tenant?.quote_intro_text?.trim() || DEFAULT_QUOTE_INTRO,
    terms: tenant?.quote_terms_text?.trim() || DEFAULT_QUOTE_TERMS,
    footer: tenant?.quote_footer_text?.trim() || tenant?.invoice_footer_text?.trim() || '',
  }
}

export function resolveInvoiceDocumentTexts(tenant?: {
  invoice_intro_text?: string | null
  invoice_payment_terms?: string | null
  invoice_footer_text?: string | null
} | null): DocumentBodyTexts {
  return {
    intro: tenant?.invoice_intro_text?.trim() || '',
    terms: tenant?.invoice_payment_terms?.trim() || '',
    footer: tenant?.invoice_footer_text?.trim() || '',
  }
}

function sameText(a?: string | null, b?: string | null): boolean {
  return (a || '').trim() === (b || '').trim()
}

/** Swap template texts when the field still matches the previous template. */
export function swapDocumentBodyTexts(
  current: { notes?: string | null; payment_terms?: string | null; footer_text?: string | null },
  from: DocumentBodyTexts,
  to: DocumentBodyTexts,
): { notes: string; payment_terms: string; footer_text: string } {
  return {
    notes: sameText(current.notes, from.intro) ? to.intro : (current.notes || ''),
    payment_terms: sameText(current.payment_terms, from.terms) ? to.terms : (current.payment_terms || ''),
    footer_text: sameText(current.footer_text, from.footer) ? to.footer : (current.footer_text || ''),
  }
}

export const QUOTE_LIFECYCLE_LABELS: Record<QuoteLifecycle, string> = {
  draft: 'Entwurf',
  sent: 'Versendet',
  accepted: 'Angenommen',
  declined: 'Abgelehnt',
  expired: 'Abgelaufen',
  cancelled: 'Zurückgezogen',
}

export const QUOTE_LIFECYCLE_BADGE_CLASS: Record<QuoteLifecycle, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-gray-100 text-gray-600',
  expired: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
}

export function quoteShowsInvoiceStatus(state: QuoteLifecycle): boolean {
  return state === 'draft' || state === 'sent'
}

export function quoteDocumentLabels(isQuote: boolean) {
  if (!isQuote) {
    return {
      documentTitle: 'RECHNUNG',
      dateLabel: 'Rechnungsdatum',
      dueLabel: 'Fällig am',
      paymentBlockTitle: 'Zahlungsbedingungen',
      emailKindLabel: 'RECHNUNG',
      defaultIntro: 'anbei erhalten Sie Ihre Rechnung. Bitte überweisen Sie den Betrag fristgerecht.',
      filenamePrefix: 'Rechnung',
      subjectPrefix: 'Rechnung',
    }
  }
  return {
    documentTitle: 'OFFERTE',
    dateLabel: 'Offertendatum',
    dueLabel: 'Gültig bis',
    paymentBlockTitle: 'Angebot',
    emailKindLabel: 'OFFERTE',
    defaultIntro: 'anbei erhalten Sie unser Angebot. Sie können es über den Link in dieser E-Mail annehmen.',
    filenamePrefix: 'Offerte',
    subjectPrefix: 'Offerte',
  }
}
