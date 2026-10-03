import { describe, expect, it } from 'vitest'
import { briefingFromWhy, historicalMailStates } from '../sales-detail-briefing'

describe('sales detail briefing display', () => {
  it('turns existing why-lines into scannable labels without calling signatures employees', () => {
    const signals = briefingFromWhy([
      'August-Kampagne geklickt',
      'Eigene Domain',
      'Telefon vorhanden',
      'E-Mail vorhanden',
      'Ort vorhanden',
      '4 Kontaktsignaturen erkannt',
      'SMS-Notiz vorhanden',
      'Keine gespeicherte Antwort gefunden',
    ])
    expect(signals.map((item) => `${item.label}: ${item.value}`)).toEqual([
      'August-Kampagne: Geklickt',
      'Domain: Eigene Domain',
      'Telefon: Vorhanden',
      'E-Mail: Vorhanden',
      'Ort: Vorhanden',
      '4 Kontaktsignaturen: Erkannte Kontaktsignaturen',
      'SMS-Notiz: Vorhanden',
      'Antwort: Keine gespeicherte Antwort',
    ])
    const signatures = signals.find((item) => item.key.startsWith('signatures'))
    expect(`${signatures?.label} ${signatures?.value}`).not.toMatch(/mitarbeiter|employee|company size/i)
    expect(signals.find((item) => item.key === 'no-response')?.tone).toBe('neutral')
  })

  it('keeps an unrecognized why-line instead of dropping it', () => {
    expect(briefingFromWhy(['Neuer Hinweis'])[0].label).toBe('Neuer Hinweis')
  })

  it('shows sent, opened, and clicked as text, including the negative states', () => {
    expect(historicalMailStates({ sent: true, opened: true, clicked: true }).map((item) => item.text)).toEqual([
      'Gesendet',
      'Geöffnet',
      'Geklickt',
    ])
    expect(historicalMailStates({ sent: true, opened: true, clicked: false }).map((item) => item.text)).toEqual([
      'Gesendet',
      'Geöffnet',
      'Kein Klick',
    ])
    expect(historicalMailStates({ sent: true, opened: false, clicked: false }).map((item) => item.text)).toEqual([
      'Gesendet',
      'Nicht geöffnet',
      'Kein Klick',
    ])
    expect(historicalMailStates(undefined).every((item) => item.mark === '—')).toBe(true)
  })
})