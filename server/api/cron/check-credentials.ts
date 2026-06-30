import { defineEventHandler, createError, getHeader } from 'h3'
import { sendEmail } from '~/server/utils/email'
import { loadRotationLog, loadCredentialConfig, DEFAULT_INTERVALS } from '~/server/api/super-admin/credential-status.get'

// All credentials with rotation instructions for the email
const CREDENTIAL_META: Record<string, { service: string; description: string; steps: string[] }> = {
  SUPABASE_SERVICE_ROLE_KEY: {
    service: 'Supabase',
    description: 'Server-seitiger DB-Zugriff (neues sb_secret_ Format)',
    steps: [
      'Supabase Dashboard → Settings → API Keys → "Publishable and secret API keys"',
      '"New secret key" klicken → neuen Key kopieren',
      'In Vercel Env Var SUPABASE_SERVICE_ROLE_KEY aktualisieren',
      'Alten Key in Supabase widerrufen',
      'Vercel Redeploy auslösen',
    ],
  },
  SUPABASE_ANON_KEY: {
    service: 'Supabase',
    description: 'Öffentlicher Client-Key',
    steps: [
      'Supabase Dashboard → Settings → API Keys → "Publishable and secret API keys"',
      'Neuen publishable Key erstellen → in Vercel SUPABASE_ANON_KEY aktualisieren',
      'Alten Key widerrufen',
    ],
  },
  SUPABASE_DB_URL: {
    service: 'Supabase',
    description: 'Session Pooler URL für GitHub Actions',
    steps: [
      'Settings → Database → Reset database password',
      'Session Pooler Connection String unter Settings → Database → Connection Pooling kopieren',
      'GitHub Secret SUPABASE_DB_URL aktualisieren',
    ],
  },
  SUPABASE_S3_ACCESS_KEY_ID: {
    service: 'Supabase Storage',
    description: 'S3 Access Key für Storage-Backup',
    steps: [
      'Supabase Dashboard → Storage → Settings → S3 Access Keys',
      'Alten Key löschen → "New access key" erstellen',
      'Access Key ID und Secret Key kopieren (Secret nur einmal sichtbar!)',
      'GitHub Secrets SUPABASE_S3_ACCESS_KEY_ID und SUPABASE_S3_SECRET_ACCESS_KEY aktualisieren',
    ],
  },
  SUPABASE_S3_SECRET_ACCESS_KEY: {
    service: 'Supabase Storage',
    description: 'S3 Secret Key für Storage-Backup',
    steps: [
      'Gleichzeitig mit SUPABASE_S3_ACCESS_KEY_ID rotieren',
      'Supabase → Storage → Settings → alten Key löschen → neuen erstellen',
      'GitHub Secret SUPABASE_S3_SECRET_ACCESS_KEY aktualisieren',
    ],
  },
  R2_ACCESS_KEY_ID: {
    service: 'Cloudflare R2',
    description: 'Backup-Upload Schlüssel',
    steps: [
      'Cloudflare Dashboard → Manage Account → R2 → Manage R2 API Tokens',
      'Alten Token löschen → "Create API Token"',
      'Berechtigungen: Object Read & Write → nur Bucket "driving-team-backups"',
      'Access Key ID und Secret in Vercel + GitHub aktualisieren',
    ],
  },
  R2_SECRET_ACCESS_KEY: {
    service: 'Cloudflare R2',
    description: 'Backup-Upload Secret',
    steps: [
      'Gleichzeitig mit R2_ACCESS_KEY_ID rotieren',
      'Neuen Token im Cloudflare R2 Dashboard erstellen',
      'Secret in Vercel + GitHub aktualisieren',
    ],
  },
  RESEND_API_KEY: {
    service: 'Resend',
    description: 'E-Mail Versand API Key',
    steps: [
      'resend.com → API Keys → "Create API Key"',
      'Alten Key danach löschen',
      'Neuen Key in Vercel Env Var RESEND_API_KEY und GitHub Secret aktualisieren',
      'Test-E-Mail senden um Funktion zu verifizieren',
    ],
  },
  STRIPE_SECRET_KEY: {
    service: 'Stripe',
    description: 'Zahlungsabwicklung Secret Key',
    steps: [
      '⚠️ Nur ausserhalb der Geschäftszeiten rotieren',
      'Stripe Dashboard → Developers → API Keys → "Roll API Key"',
      'Übergangszeit für parallele Gültigkeit einstellen (24h empfohlen)',
      'In Vercel Env Var STRIPE_SECRET_KEY aktualisieren',
      'Redeploy und Zahlungsflows testen',
    ],
  },
  STRIPE_WEBHOOK_SECRET: {
    service: 'Stripe',
    description: 'Webhook Signatur-Verifikation',
    steps: [
      'Stripe Dashboard → Developers → Webhooks → Webhook auswählen',
      '"Reveal signing secret" → Wert kopieren',
      'In Vercel Env Var STRIPE_WEBHOOK_SECRET aktualisieren',
    ],
  },
  WALLEE_SECRET_KEY: {
    service: 'Wallee',
    description: 'Zahlungsabwicklung Application User',
    steps: [
      'Wallee Dashboard → Account → Application Users',
      'User auswählen → Authentication Key regenerieren',
      'In Vercel Env Var WALLEE_SECRET_KEY aktualisieren',
    ],
  },
  GH_API_TOKEN: {
    service: 'GitHub',
    description: 'API Zugang für Backup-Dashboard',
    steps: [
      'GitHub → Settings → Developer Settings → Personal Access Tokens',
      'Token löschen → "Generate new token (classic)"',
      'Scopes: repo + workflow',
      'In Vercel Env Var GH_API_TOKEN aktualisieren',
    ],
  },
  SIMY_GITHUB_PAT: {
    service: 'GitHub',
    description: 'PAT für Whitelabel App-Erstellung',
    steps: [
      'GitHub → Settings → Developer Settings → Personal Access Tokens',
      'Token löschen → "Generate new token (classic)"',
      'Scopes: repo (write) + workflow',
      'In Vercel Env Var SIMY_GITHUB_PAT aktualisieren',
    ],
  },
  GOOGLE_SA_PRIVATE_KEY: {
    service: 'Google Cloud',
    description: 'Service Account für GA4 & Search Console',
    steps: [
      'Google Cloud Console → IAM & Admin → Service Accounts',
      'Service Account auswählen → Keys → "Add Key" → JSON',
      'Alten Key danach löschen',
      'Neuen Private Key in Vercel Env Var GOOGLE_SA_PRIVATE_KEY aktualisieren',
    ],
  },
  GOOGLE_ADS_REFRESH_TOKEN: {
    service: 'Google Ads',
    description: 'OAuth Refresh Token für Ads API',
    steps: [
      'scripts/refresh-oauth-tokens.mjs ausführen: node scripts/refresh-oauth-tokens.mjs',
      'Oder Google OAuth Playground → Schritt 2 → Exchange authorization code for tokens',
      'Neuen Refresh Token in Vercel Env Var GOOGLE_ADS_REFRESH_TOKEN aktualisieren',
    ],
  },
  TWILIO_AUTH_TOKEN: {
    service: 'Twilio',
    description: 'SMS API Auth Token',
    steps: [
      'Twilio Console → Account → API Keys & Tokens',
      '"Rotate" neben dem Auth Token',
      'In Vercel Env Var TWILIO_AUTH_TOKEN aktualisieren',
    ],
  },
  CRON_SECRET: {
    service: 'Intern',
    description: 'Authentifiziert alle Vercel Cron Jobs',
    steps: [
      'Neuen zufälligen String generieren: openssl rand -hex 32',
      'In Vercel Env Var CRON_SECRET aktualisieren',
      'Redeploy und Cron-Jobs verifizieren',
    ],
  },
}

function getEffectiveInterval(key: string, config: { intervals?: Record<string, number> }): number {
  return config.intervals?.[key] ?? DEFAULT_INTERVALS[key] ?? 90
}

function getDaysOverdue(lastRotated: string | undefined, intervalDays: number): number {
  if (!lastRotated) return Infinity
  const age = (Date.now() - new Date(lastRotated).getTime()) / (1000 * 60 * 60 * 24)
  return age - intervalDays
}

function buildEmailHtml(
  overdue: Array<{ key: string; daysOverdue: number; lastRotated?: string }>,
  dueSoon: Array<{ key: string; daysUntilDue: number; lastRotated?: string }>,
  appUrl: string,
): string {
  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Nie rotiert'

  const renderSteps = (steps: string[]) =>
    steps.map((s, i) => `
      <tr>
        <td style="padding:4px 8px 4px 0;vertical-align:top;color:#6366f1;font-weight:700;font-size:12px;white-space:nowrap">${i + 1}.</td>
        <td style="padding:4px 0;font-size:13px;color:#374151;line-height:1.5">${s}</td>
      </tr>`).join('')

  const renderCredentialCard = (key: string, badge: string, badgeColor: string, badgeBg: string, subtitle: string) => {
    const meta = CREDENTIAL_META[key]
    if (!meta) return ''
    return `
    <div style="margin-bottom:16px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="padding:14px 18px;background:#f9fafb;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between">
        <div>
          <span style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">${meta.service}</span>
          <div style="font-size:15px;font-weight:700;color:#111827;font-family:monospace;margin-top:2px">${key}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:1px">${meta.description}</div>
        </div>
        <div>
          <span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;background:${badgeBg};color:${badgeColor}">${badge}</span>
          <div style="font-size:11px;color:#9ca3af;text-align:right;margin-top:4px">${subtitle}</div>
        </div>
      </div>
      <div style="padding:14px 18px">
        <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em">Schritt-für-Schritt Anleitung</div>
        <table style="width:100%;border-collapse:collapse">${renderSteps(meta.steps)}</table>
      </div>
    </div>`
  }

  const overdueHtml = overdue.map(c => renderCredentialCard(
    c.key,
    `⚠ Überfällig seit ${Math.round(c.daysOverdue)} Tagen`,
    '#92400e', '#fef3c7',
    `Zuletzt: ${formatDate(c.lastRotated)}`,
  )).join('')

  const dueSoonHtml = dueSoon.map(c => renderCredentialCard(
    c.key,
    `Fällig in ${Math.round(c.daysUntilDue)} Tagen`,
    '#1e40af', '#dbeafe',
    `Zuletzt: ${formatDate(c.lastRotated)}`,
  )).join('')

  const summaryBg = overdue.length > 0 ? '#fef2f2' : '#f0fdf4'
  const summaryBorder = overdue.length > 0 ? '#fca5a5' : '#86efac'
  const summaryColor = overdue.length > 0 ? '#991b1b' : '#166534'
  const summaryText = overdue.length > 0
    ? `${overdue.length} Credential${overdue.length !== 1 ? 's sind' : ' ist'} überfällig und ${dueSoon.length} weitere werden bald fällig.`
    : `${dueSoon.length} Credential${dueSoon.length !== 1 ? 's werden' : ' wird'} in Kürze fällig.`

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
  <tr><td align="center">
    <table width="100%" style="max-width:620px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:28px 32px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px">🔐</div>
          <div>
            <div style="font-size:20px;font-weight:800;color:#ffffff">Credential Rotation Reminder</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:2px">Simy Super Admin — ${new Date().toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</div>
          </div>
        </div>
      </td></tr>

      <!-- Summary -->
      <tr><td style="padding:24px 32px 8px">
        <div style="border:1px solid ${summaryBorder};background:${summaryBg};border-radius:10px;padding:16px 20px;margin-bottom:8px">
          <div style="font-size:15px;font-weight:700;color:${summaryColor}">${summaryText}</div>
          <div style="font-size:13px;color:#6b7280;margin-top:4px">Bitte rotiere die folgenden Credentials gemäss der Anleitung unterhalb.</div>
        </div>
      </td></tr>

      <!-- Overdue section -->
      ${overdue.length > 0 ? `
      <tr><td style="padding:8px 32px">
        <div style="font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px">⚠ Überfällig (${overdue.length})</div>
        ${overdueHtml}
      </td></tr>` : ''}

      <!-- Due soon section -->
      ${dueSoon.length > 0 ? `
      <tr><td style="padding:8px 32px">
        <div style="font-size:13px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px">⏰ Bald fällig (${dueSoon.length})</div>
        ${dueSoonHtml}
      </td></tr>` : ''}

      <!-- CTA -->
      <tr><td style="padding:24px 32px 32px;text-align:center">
        <a href="${appUrl}/tenant-admin/credentials"
          style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;font-size:15px;font-weight:700;border-radius:10px;text-decoration:none;box-shadow:0 4px 12px rgba(99,102,241,0.35)">
          Credentials jetzt rotieren →
        </a>
        <div style="margin-top:12px;font-size:12px;color:#9ca3af">
          Diese E-Mail wird jeden Montag automatisch gesendet, wenn Credentials überfällig oder bald fällig sind.
        </div>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center">
        <div style="font-size:11px;color:#9ca3af">Simy Super Admin · Automatische Erinnerung · <a href="${appUrl}/tenant-admin/credentials" style="color:#6366f1;text-decoration:none">Einstellungen</a></div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`
}

export default defineEventHandler(async (event) => {
  // Verify cron secret
  const secret = getHeader(event, 'authorization')?.replace('Bearer ', '')
  const sendTest = getHeader(event, 'x-test-email') === '1'

  if (!sendTest && secret !== process.env.CRON_SECRET) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const [rotationLog, config] = await Promise.all([
    loadRotationLog(),
    loadCredentialConfig(),
  ])

  const allKeys = Object.keys(DEFAULT_INTERVALS)
  const overdue: Array<{ key: string; daysOverdue: number; lastRotated?: string }> = []
  const dueSoon: Array<{ key: string; daysUntilDue: number; lastRotated?: string }> = []

  for (const key of allKeys) {
    const intervalDays = getEffectiveInterval(key, config)
    if (intervalDays === 0) continue // skip "never rotate" credentials

    const lastRotated = rotationLog[key]
    const daysOverdue = getDaysOverdue(lastRotated, intervalDays)

    if (daysOverdue > 0) {
      overdue.push({ key, daysOverdue, lastRotated })
    } else if (daysOverdue > -config.reminderDaysAhead) {
      dueSoon.push({ key, daysUntilDue: -daysOverdue, lastRotated })
    }
  }

  // Nothing to report
  if (overdue.length === 0 && dueSoon.length === 0 && !sendTest) {
    return { skipped: true, message: 'Alle Credentials sind aktuell — keine E-Mail gesendet.' }
  }

  const appUrl = process.env.NUXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL || 'https://app.simy.ch'
  const subject = overdue.length > 0
    ? `⚠️ ${overdue.length} Credential${overdue.length !== 1 ? 's' : ''} überfällig — Rotation erforderlich`
    : `⏰ ${dueSoon.length} Credential${dueSoon.length !== 1 ? 's' : ''} bald fällig`

  // For test emails, if nothing overdue/due-soon, create dummy entries to show format
  const overdueToSend = sendTest && overdue.length === 0 && dueSoon.length === 0
    ? [{ key: 'EXAMPLE_KEY', daysOverdue: 5, lastRotated: new Date(Date.now() - 95 * 86400000).toISOString() }]
    : overdue

  await sendEmail({
    to: config.notificationEmail,
    subject: sendTest ? `[TEST] ${subject}` : subject,
    html: buildEmailHtml(overdueToSend, dueSoon, appUrl),
  })

  return {
    sent: true,
    to: config.notificationEmail,
    overdueCount: overdue.length,
    dueSoonCount: dueSoon.length,
    overdue: overdue.map(c => c.key),
    dueSoon: dueSoon.map(c => c.key),
  }
})
