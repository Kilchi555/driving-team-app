import { SIMY_STARTER_CHF, WEBSITE_HOSTING_META, WEBSITE_SETUP_CHF } from '~/utils/website-billing'
import type { ProspectEmailDraft, ProspectRevenueModel } from '~/server/utils/website-prospect-types'
import { formatChf } from '~/server/utils/website-prospect-revenue'

export function buildProspectEmailDraft(input: {
  name: string
  city?: string | null
  existingUrl?: string | null
  previewUrl?: string | null
  revenue: ProspectRevenueModel
  findings: Array<{ title: string }>
}): ProspectEmailDraft {
  const cityBit = input.city ? ` in ${input.city}` : ''
  const subject = `${input.name}: neue Website fertig – Vorschau ansehen`
  const range = `${formatChf(input.revenue.monthly_low_chf)}–${formatChf(input.revenue.monthly_high_chf)}`
  const findingLines = input.findings.slice(0, 4).map((f) => `• ${f.title}`)
  const preview = input.previewUrl || 'folgt nach interner Prüfung'
  const theirSite = input.existingUrl || 'Ihre aktuelle Homepage'

  const text = [
    `Guten Tag`,
    ``,
    `wir haben uns die Website von ${input.name}${cityBit} angeschaut (${theirSite}).`,
    ``,
    `Kurz der Befund:`,
    ...(findingLines.length ? findingLines : ['• Die Seite ist schwach für lokale Suche und Anfragen.']),
    ``,
    `Deshalb haben wir eine neue, SEO-starke Version gebaut — noch nicht öffentlich, nur als Vorschau:`,
    preview,
    ``,
    `Sie können Texte und Bilder vor dem Kauf anpassen. Live geht die Seite erst nach der Zahlung.`,
    ``,
    `Angebot Website: einmalig ${formatChf(WEBSITE_SETUP_CHF)} für die Übernahme, danach ${formatChf(WEBSITE_HOSTING_META.host.chf)} / Monat Hosting inkl. Login.`,
    `Darin: Kontakt, Anfrage und WhatsApp. Die Online-Terminbuchung (Kalender, freie Slots) ist nicht enthalten — das ist das Simy Starter-Paket ab ${formatChf(SIMY_STARTER_CHF)} / Monat, optional dazu.`,
    ``,
    `Konservative Schätzung, wenn die neue Seite Anfragen sauber aufnimmt: zusätzlich ${range} Deckungsbeitrag pro Monat.`,
    `Die Rechnung mit Annahmen schicken wir gerne mit — das ist keine Garantie.`,
    ``,
    `Wenn Sie wollen, schalten wir live, sobald Sie bereit sind.`,
    ``,
    `Freundliche Grüsse`,
    `Pascal`,
    `Simy`,
    `https://www.simy.ch/website`,
  ].join('\n')

  const findingsHtml = findingLines.length
    ? `<ul>${findingLines.map((l) => `<li>${escapeHtml(l.replace(/^•\s*/, ''))}</li>`).join('')}</ul>`
    : '<p>Die aktuelle Seite ist schwach für lokale Suche und Anfragen.</p>'

  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#111827;line-height:1.55;font-size:15px;">
<p>Guten Tag</p>
<p>wir haben uns die Website von <strong>${escapeHtml(input.name)}</strong>${cityBit ? ` in ${escapeHtml(input.city || '')}` : ''} angeschaut.</p>
<p>Kurz der Befund:</p>
${findingsHtml}
<p>Deshalb haben wir eine neue Version gebaut — noch nicht öffentlich:</p>
<p><a href="${escapeHtml(preview)}">${escapeHtml(preview)}</a></p>
<p>Texte und Bilder können Sie vor dem Kauf anpassen. Live erst nach Zahlung.</p>
<p><strong>Website:</strong> einmalig ${formatChf(WEBSITE_SETUP_CHF)}, danach ${formatChf(WEBSITE_HOSTING_META.host.chf)} / Monat Hosting inkl. Login. Kontakt und Anfrage sind enthalten. <strong>Online-Terminbuchung</strong> (Kalender) nur mit Simy Starter ab ${formatChf(SIMY_STARTER_CHF)} / Monat — optional.</p>
<p>Konservative Schätzung zusätzlicher Deckungsbeitrag: <strong>${range} / Monat</strong>. Das ist eine Range mit Annahmen, keine Garantie.</p>
<p>Freundliche Grüsse<br>Pascal<br>Simy</p>
</body></html>`

  return { subject, text, html }
}

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
