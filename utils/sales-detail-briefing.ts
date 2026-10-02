export type BriefingSignal = {
  key: string
  icon: string
  label: string
  value: string
  tone: 'signal' | 'neutral'
}

export type MailState = {
  key: 'sent' | 'opened' | 'clicked'
  label: string
  text: string
  mark: '✓' | '—'
  on: boolean
}

const KNOWN: Record<string, Omit<BriefingSignal, 'key'>> = {
  'August-Kampagne geklickt': { icon: '✉', label: 'August-Kampagne', value: 'Geklickt', tone: 'signal' },
  'August-Kampagne geöffnet, kein Click': { icon: '✉', label: 'August-Kampagne', value: 'Geöffnet, kein Klick', tone: 'signal' },
  'August-Kampagne gesendet, kein Open': { icon: '✉', label: 'August-Kampagne', value: 'Gesendet, nicht geöffnet', tone: 'signal' },
  'Kein gespeichertes Kampagnensignal': { icon: '✉', label: 'August-Kampagne', value: 'Kein gespeichertes Signal', tone: 'neutral' },
  'Eigene Domain': { icon: '⌂', label: 'Domain', value: 'Eigene Domain', tone: 'signal' },
  'Telefon vorhanden': { icon: '☎', label: 'Telefon', value: 'Vorhanden', tone: 'signal' },
  'E-Mail vorhanden': { icon: '@', label: 'E-Mail', value: 'Vorhanden', tone: 'signal' },
  'Ort vorhanden': { icon: '⌖', label: 'Ort', value: 'Vorhanden', tone: 'signal' },
  'SMS-Notiz vorhanden': { icon: '💬', label: 'SMS-Notiz', value: 'Vorhanden', tone: 'signal' },
}

export function briefingFromWhy(lines: readonly string[]): BriefingSignal[] {
  return lines.map((line, index) => {
    const signatures = line.match(/^(\d+) Kontaktsignaturen erkannt$/)
    if (signatures) {
      return {
        key: `signatures-${signatures[1]}`,
        icon: '✶',
        label: `${signatures[1]} Kontaktsignaturen`,
        value: 'Erkannte Kontaktsignaturen',
        tone: 'signal',
      }
    }
    if (line === 'Keine gespeicherte Antwort gefunden') {
      return {
        key: 'no-response',
        icon: '○',
        label: 'Antwort',
        value: 'Keine gespeicherte Antwort',
        tone: 'neutral',
      }
    }
    const known = KNOWN[line]
    if (known) return { key: `${known.label}-${index}`, ...known }
    return { key: `line-${index}`, icon: '•', label: line, value: line, tone: 'signal' }
  })
}

export function historicalMailStates(mail: { sent?: boolean; opened?: boolean; clicked?: boolean } | null | undefined): MailState[] {
  const sent = !!mail?.sent
  const opened = !!mail?.opened
  const clicked = !!mail?.clicked
  return [
    { key: 'sent', label: 'Gesendet', text: sent ? 'Gesendet' : 'Nicht gesendet', mark: sent ? '✓' : '—', on: sent },
    { key: 'opened', label: 'Geöffnet', text: opened ? 'Geöffnet' : 'Nicht geöffnet', mark: opened ? '✓' : '—', on: opened },
    { key: 'clicked', label: 'Geklickt', text: clicked ? 'Geklickt' : 'Kein Klick', mark: clicked ? '✓' : '—', on: clicked },
  ]
}
