import { describe, expect, it } from 'vitest'
import {
  addDaysIso,
  documentDisplayNumber,
  canAcceptQuote,
  DEFAULT_QUOTE_INTRO,
  DEFAULT_QUOTE_TERMS,
  defaultQuoteValidUntil,
  isQuoteDocument,
  isQuoteExpired,
  quoteLifecycle,
  QUOTE_LIFECYCLE_LABELS,
  resolveQuoteDocumentTexts,
  swapDocumentBodyTexts,
} from '../invoice-quote'

describe('invoice-quote', () => {
  it('detects quotes only', () => {
    expect(isQuoteDocument('quote')).toBe(true)
    expect(isQuoteDocument('invoice')).toBe(false)
    expect(isQuoteDocument(null)).toBe(false)
  })

  it('shows RE number after quote conversion, not OF', () => {
    expect(documentDisplayNumber({
      document_kind: 'quote',
      quote_number: 'OF-2026-0001',
      invoice_number: 'OF-2026-0001',
    })).toBe('OF-2026-0001')

    expect(documentDisplayNumber({
      document_kind: 'invoice',
      quote_number: 'OF-2026-0001',
      invoice_number: 'RE-2026-0057',
    })).toBe('RE-2026-0057')
  })

  it('defaults validity to 30 days', () => {
    expect(defaultQuoteValidUntil('2026-08-19')).toBe('2026-09-18')
    expect(addDaysIso('2026-01-31', 1)).toBe('2026-02-01')
  })

  it('expires on the day after valid_until', () => {
    expect(isQuoteExpired('2026-08-19', '2026-08-19')).toBe(false)
    expect(isQuoteExpired('2026-08-19', '2026-08-20')).toBe(true)
  })

  it('blocks accept after expiry, decline, or convert', () => {
    expect(canAcceptQuote({
      document_kind: 'quote',
      status: 'sent',
      valid_until: '2026-08-01',
    }, { today: '2026-08-19' }).ok).toBe(false)

    expect(canAcceptQuote({
      document_kind: 'quote',
      status: 'sent',
      declined_at: '2026-08-10',
      valid_until: '2026-09-01',
    }).ok).toBe(false)

    expect(canAcceptQuote({
      document_kind: 'invoice',
      quote_number: 'OF-2026-0001',
      accepted_at: '2026-08-10',
      status: 'sent',
    }).ok).toBe(false)

    expect(canAcceptQuote({
      document_kind: 'quote',
      status: 'sent',
      valid_until: '2026-09-01',
    }, { today: '2026-08-19' })).toEqual({ ok: true })
  })

  it('maps lifecycle for list badges', () => {
    expect(quoteLifecycle({
      document_kind: 'quote',
      status: 'pdf_created',
      valid_until: '2026-09-01',
    }, '2026-08-19')).toBe('draft')

    expect(quoteLifecycle({
      document_kind: 'quote',
      status: 'sent',
      valid_until: '2026-08-01',
    }, '2026-08-19')).toBe('expired')

    expect(quoteLifecycle({
      document_kind: 'invoice',
      quote_number: 'OF-2026-0001',
      accepted_at: '2026-08-10',
      status: 'sent',
    })).toBe('accepted')

    expect(QUOTE_LIFECYCLE_LABELS.expired).toBe('Abgelaufen')
    expect(QUOTE_LIFECYCLE_LABELS.accepted).toBe('Angenommen')
  })

  it('uses offer wording, not invoice wording', () => {
    const texts = resolveQuoteDocumentTexts(null)
    expect(texts.intro).toBe(DEFAULT_QUOTE_INTRO)
    expect(texts.terms).toBe(DEFAULT_QUOTE_TERMS)
    expect(texts.intro).not.toMatch(/Rechnung/i)
    expect(texts.terms).not.toMatch(/Zahlbar/i)
  })

  it('swaps only unchanged template fields', () => {
    const from = { intro: 'Rechnungstext', terms: 'Zahlbar', footer: 'Grüsse' }
    const to = { intro: DEFAULT_QUOTE_INTRO, terms: DEFAULT_QUOTE_TERMS, footer: 'Grüsse' }
    const swapped = swapDocumentBodyTexts({
      notes: 'Rechnungstext',
      payment_terms: 'angepasst',
      footer_text: 'Grüsse',
    }, from, to)
    expect(swapped.notes).toBe(DEFAULT_QUOTE_INTRO)
    expect(swapped.payment_terms).toBe('angepasst')
    expect(swapped.footer_text).toBe('Grüsse')
  })
})
