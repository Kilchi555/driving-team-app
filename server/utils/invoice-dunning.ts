// server/utils/invoice-dunning.ts
// Gemeinsame Logik für das Mahnwesen (Dunning) von Rechnungen:
// Mahnstufen-Definition, Fristen-/Gebühren-Berechnung, Platzhalter-Rendering
// und das E-Mail-Layout für Zahlungserinnerungen/Mahnungen.

export type DunningStage = 1 | 2 | 3
export type DunningStageKey = 'reminder' | 'first_dunning' | 'second_dunning'

export interface DunningStageDef {
  stage: DunningStage
  key: DunningStageKey
  label: string
  shortLabel: string
}

export const DUNNING_STAGES: DunningStageDef[] = [
  { stage: 1, key: 'reminder', label: 'Zahlungserinnerung', shortLabel: 'Erinnerung' },
  { stage: 2, key: 'first_dunning', label: '1. Mahnung', shortLabel: '1. Mahnung' },
  { stage: 3, key: 'second_dunning', label: '2. / letzte Mahnung', shortLabel: '2. Mahnung' },
]

export function getStageDef(stage: number): DunningStageDef | undefined {
  return DUNNING_STAGES.find(s => s.stage === stage)
}

export function getStageKey(stage: number): DunningStageKey {
  return getStageDef(stage)?.key ?? 'reminder'
}

export interface DunningSettingsRow {
  is_enabled: boolean
  reminder_after_days: number
  first_dunning_after_days: number
  second_dunning_after_days: number
  reminder_fee_rappen: number
  first_dunning_fee_rappen: number
  second_dunning_fee_rappen: number
  add_fee_to_invoice_total: boolean
  apply_interest: boolean
  interest_rate_percent: number
  new_due_days: number
}

export const DUNNING_SETTINGS_DEFAULTS: DunningSettingsRow = {
  is_enabled: true,
  reminder_after_days: 10,
  first_dunning_after_days: 20,
  second_dunning_after_days: 30,
  reminder_fee_rappen: 0,
  first_dunning_fee_rappen: 2000,
  second_dunning_fee_rappen: 4000,
  add_fee_to_invoice_total: true,
  apply_interest: false,
  interest_rate_percent: 5.00,
  new_due_days: 10,
}

export function afterDaysForStage(settings: DunningSettingsRow, stage: number): number {
  if (stage === 1) return settings.reminder_after_days
  if (stage === 2) return settings.first_dunning_after_days
  return settings.second_dunning_after_days
}

export function feeRappenForStage(settings: DunningSettingsRow, stage: number): number {
  if (stage === 1) return settings.reminder_fee_rappen
  if (stage === 2) return settings.first_dunning_fee_rappen
  return settings.second_dunning_fee_rappen
}

export function daysOverdue(dueDate: string | Date, reference: Date = new Date()): number {
  const due = new Date(dueDate)
  const diffMs = reference.setHours(0, 0, 0, 0) - new Date(due).setHours(0, 0, 0, 0)
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Ermittelt die vorgeschlagene nächste Mahnstufe für eine überfällige Rechnung.
 * Gibt 0 zurück, wenn (noch) keine weitere Stufe fällig ist.
 *
 * Stufen werden IMMER sequenziell durchlaufen (nie überspringen): die einzige
 * jemals fällige Stufe ist currentLevel + 1. Es reicht nicht, dass die
 * Rechnung insgesamt schon lange genug überfällig ist, um z.B. die 2. Mahnung
 * zu rechtfertigen — wurde noch nie eine Zahlungserinnerung (Stufe 1)
 * versendet, ist genau Stufe 1 die nächste, unabhängig davon, wie viele Tage
 * bereits vergangen sind. Nur an der letzten definierten Stufe darf erneut
 * dieselbe Stufe vorgeschlagen werden (z.B. für eine weitere Inkasso-Mahnung).
 */
export function suggestedNextStage(
  overdueDays: number,
  currentLevel: number,
  settings: DunningSettingsRow
): DunningStage | 0 {
  if (!settings.is_enabled) return 0

  const maxStage = DUNNING_STAGES[DUNNING_STAGES.length - 1]
  const nextDef = getStageDef(currentLevel + 1) ?? (currentLevel >= maxStage.stage ? maxStage : undefined)
  if (!nextDef) return 0

  return overdueDays >= afterDaysForStage(settings, nextDef.stage) ? nextDef.stage : 0
}

/** Einfache Zinsberechnung (linear, Bankjahr 360 Tage – üblich für Verzugszins CH). */
export function computeInterestRappen(
  outstandingRappen: number,
  ratePercent: number,
  overdueDays: number
): number {
  if (overdueDays <= 0 || ratePercent <= 0 || outstandingRappen <= 0) return 0
  return Math.round((outstandingRappen * (ratePercent / 100) * overdueDays) / 360)
}

export function formatChf(rappen: number): string {
  return `CHF ${(rappen / 100).toFixed(2)}`
}

export function formatDateCH(date: string | Date): string {
  try {
    return new Date(date).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return String(date)
  }
}

export interface DunningPlaceholderInput {
  customerName: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  outstandingRappen: number
  overdueDays: number
  feeRappen: number
  interestRappen: number
  newDueDate: string
  staffName: string
  tenantName: string
}

/** Baut das Datenobjekt für die Platzhalter-Ersetzung im Betreff/Text der Vorlage. */
export function buildDunningPlaceholders(input: DunningPlaceholderInput): Record<string, string> {
  const totalWithFee = input.outstandingRappen + input.feeRappen + input.interestRappen
  return {
    kunde_name: input.customerName,
    rechnungsnummer: input.invoiceNumber,
    rechnungsdatum: formatDateCH(input.invoiceDate),
    faelligkeitsdatum: formatDateCH(input.dueDate),
    offener_betrag: formatChf(input.outstandingRappen),
    ueberfaellige_tage: String(Math.max(0, input.overdueDays)),
    mahngebuehr: formatChf(input.feeRappen),
    verzugszins: formatChf(input.interestRappen),
    gesamtbetrag_mit_gebuehr: formatChf(totalWithFee),
    neues_zahlungsziel: formatDateCH(input.newDueDate),
    absender_name: input.staffName,
    firma_name: input.tenantName,
  }
}

export const DUNNING_PLACEHOLDER_HELP: { key: string; label: string }[] = [
  { key: 'kunde_name', label: 'Name des Kunden' },
  { key: 'rechnungsnummer', label: 'Rechnungsnummer' },
  { key: 'rechnungsdatum', label: 'Rechnungsdatum' },
  { key: 'faelligkeitsdatum', label: 'Ursprüngliches Fälligkeitsdatum' },
  { key: 'offener_betrag', label: 'Noch offener Rechnungsbetrag' },
  { key: 'ueberfaellige_tage', label: 'Anzahl Tage überfällig' },
  { key: 'mahngebuehr', label: 'Mahngebühr dieser Stufe' },
  { key: 'verzugszins', label: 'Berechneter Verzugszins' },
  { key: 'gesamtbetrag_mit_gebuehr', label: 'Offener Betrag + Mahngebühr + Verzugszins' },
  { key: 'neues_zahlungsziel', label: 'Neue Zahlungsfrist' },
  { key: 'absender_name', label: 'Name des Absenders (Staff)' },
  { key: 'firma_name', label: 'Firmenname' },
]

/** Ersetzt {placeholder} und {{placeholder}} Vorkommen im Text. */
export function renderDunningText(template: string, data: Record<string, string>): string {
  let out = template
  for (const key in data) {
    const value = data[key] ?? ''
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    out = out.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return out
}

export interface DunningEmailData {
  stageLabel: string
  stage: number
  bodyText: string
  invoiceNumber: string
  outstandingRappen: number
  feeRappen: number
  interestRappen: number
  totalDueRappen: number
  newDueDate: string
  tenantName: string
  primaryColor?: string | null
  qrCodeDataUrl?: string | null
  qrIban?: string | null
  creditorName?: string
  scorRef?: string | null
}

/** Professionelles, responsives HTML-Layout für Zahlungserinnerungen/Mahnungen. */
export function buildDunningEmailHtml(data: DunningEmailData): string {
  const brand = data.primaryColor || '#1E40AF'
  const isDunning = data.stage > 1
  const accentColor = isDunning ? (data.stage === 3 ? '#DC2626' : '#D97706') : brand
  const bodyHtml = data.bodyText
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.65;white-space:pre-line;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('')

  const qrSection = data.qrCodeDataUrl ? `
  <div style="margin-top:24px;padding-top:20px;border-top:2px dashed #e2e8f0;">
    <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;">Swiss QR-Rechnung</p>
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-right:16px;vertical-align:top;">
          <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:8px;display:inline-block;">
            <img src="${data.qrCodeDataUrl}" alt="QR" width="100" height="100" style="display:block;" />
          </div>
        </td>
        <td style="vertical-align:top;">
          <p style="margin:0 0 6px;font-size:12px;color:#64748b;">Mit Banking-App (PostFinance, UBS, Raiffeisen) oder TWINT scannen.</p>
          ${data.qrIban ? `<p style="margin:0 0 2px;font-size:11px;color:#94a3b8;">QR-IBAN: <span style="color:#1e293b;font-family:monospace;font-weight:600;font-size:10px;">${data.qrIban}</span></p>` : ''}
          ${data.creditorName ? `<p style="margin:0 0 2px;font-size:11px;color:#94a3b8;">Empfänger: <span style="color:#1e293b;font-weight:600;">${data.creditorName}</span></p>` : ''}
          ${data.scorRef ? `<p style="margin:0 0 2px;font-size:11px;color:#94a3b8;">Referenz: <span style="color:#1e293b;font-family:monospace;font-weight:600;font-size:10px;">${data.scorRef}</span></p>` : ''}
          <p style="margin:10px 0 0;font-size:16px;font-weight:800;color:${accentColor};">${formatChf(data.totalDueRappen)}</p>
        </td>
      </tr>
    </table>
  </div>` : ''

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${data.stageLabel} ${data.invoiceNumber}</title>
  <style>
    body { margin:0; padding:0; background:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; }
    .outer { background:#f1f5f9; padding:24px 12px; }
    .wrap { max-width:600px; width:100%; margin:0 auto; }
    .header { background:${accentColor}; border-radius:16px 16px 0 0; padding:28px 32px; }
    .header-inner { display:table; width:100%; }
    .header-l { display:table-cell; vertical-align:middle; }
    .header-r { display:table-cell; vertical-align:middle; text-align:right; }
    .body-wrap { background:white; padding:28px 24px; }
    .footer-wrap { background:#f8fafc; border-radius:0 0 16px 16px; padding:16px 24px; border-top:1px solid #e2e8f0; }
    .summary { width:100%; border-collapse:collapse; border-radius:10px; overflow:hidden; border:1px solid #e2e8f0; margin-top:8px; }
    .summary td { padding:9px 14px; font-size:13px; }
    @media (max-width:480px) {
      .outer { padding:12px 4px !important; }
      .header { padding:20px 16px !important; border-radius:12px 12px 0 0 !important; }
      .body-wrap { padding:20px 14px !important; }
      .footer-wrap { padding:14px 16px !important; }
    }
  </style>
</head>
<body>
<div class="outer">
<table class="wrap" cellpadding="0" cellspacing="0">

  <tr><td class="header">
    <div class="header-inner">
      <div class="header-l">
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.7);">${data.stageLabel.toUpperCase()}</p>
        <p style="margin:0;font-size:20px;font-weight:800;color:white;font-family:monospace;">Rechnung ${data.invoiceNumber}</p>
      </div>
      <div class="header-r">
        <p style="margin:0 0 2px;font-size:11px;color:rgba(255,255,255,0.7);">Offen inkl. Gebühr</p>
        <p style="margin:0;font-size:24px;font-weight:800;color:white;">${formatChf(data.totalDueRappen)}</p>
      </div>
    </div>
  </td></tr>

  <tr><td class="body-wrap">
    ${bodyHtml}

    <table class="summary" cellpadding="0" cellspacing="0">
      <tr style="background:#f8fafc;">
        <td style="color:#64748b;">Offener Rechnungsbetrag</td>
        <td style="text-align:right;font-weight:600;color:#1e293b;">${formatChf(data.outstandingRappen)}</td>
      </tr>
      ${data.feeRappen > 0 ? `
      <tr>
        <td style="color:#64748b;border-top:1px solid #f1f5f9;">Mahngebühr</td>
        <td style="text-align:right;font-weight:600;color:#1e293b;border-top:1px solid #f1f5f9;">${formatChf(data.feeRappen)}</td>
      </tr>` : ''}
      ${data.interestRappen > 0 ? `
      <tr>
        <td style="color:#64748b;border-top:1px solid #f1f5f9;">Verzugszins</td>
        <td style="text-align:right;font-weight:600;color:#1e293b;border-top:1px solid #f1f5f9;">${formatChf(data.interestRappen)}</td>
      </tr>` : ''}
      <tr style="background:${accentColor};">
        <td style="color:white;font-weight:700;">Total fällig bis ${formatDateCH(data.newDueDate)}</td>
        <td style="text-align:right;font-weight:800;color:white;font-size:15px;">${formatChf(data.totalDueRappen)}</td>
      </tr>
    </table>

    ${qrSection}

    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;">${data.tenantName}</p>
  </td></tr>

  <tr><td class="footer-wrap">
    <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">${data.tenantName} · Diese Mitteilung wurde automatisch von Simy erstellt</p>
  </td></tr>

</table>
</div>
</body>
</html>`
}
