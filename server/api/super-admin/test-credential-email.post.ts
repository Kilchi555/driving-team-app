import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { loadRotationLog, loadCredentialConfig, DEFAULT_INTERVALS } from '~/server/api/super-admin/credential-status.get'
import { sendEmail } from '~/server/utils/email'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data: caller } = await supabase.from('users').select('role').eq('auth_user_id', authUser.id).single()
  if (caller?.role !== 'super_admin') throw createError({ statusCode: 403, message: 'Super admin only' })

  const [rotationLog, config] = await Promise.all([
    loadRotationLog(),
    loadCredentialConfig(),
  ])

  const allKeys = Object.keys(DEFAULT_INTERVALS)
  const overdue: Array<{ key: string; daysOverdue: number; lastRotated?: string }> = []
  const dueSoon: Array<{ key: string; daysUntilDue: number; lastRotated?: string }> = []

  for (const key of allKeys) {
    const intervalDays = config.intervals?.[key] ?? DEFAULT_INTERVALS[key] ?? 90
    if (intervalDays === 0) continue

    const lastRotated = rotationLog[key]
    const ageDays = lastRotated
      ? (Date.now() - new Date(lastRotated).getTime()) / (1000 * 60 * 60 * 24)
      : Infinity
    const daysOverdue = ageDays - intervalDays

    if (daysOverdue > 0) {
      overdue.push({ key, daysOverdue, lastRotated })
    } else if (daysOverdue > -config.reminderDaysAhead) {
      dueSoon.push({ key, daysUntilDue: -daysOverdue, lastRotated })
    }
  }

  const appUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Nie rotiert'

  const overdueList = overdue.map(c => `<li style="margin-bottom:4px"><code style="background:#fef3c7;padding:2px 6px;border-radius:4px;font-size:13px">${c.key}</code> — <strong>${Math.round(c.daysOverdue)} Tage überfällig</strong> (zuletzt: ${formatDate(c.lastRotated)})</li>`).join('')
  const dueSoonList = dueSoon.map(c => `<li style="margin-bottom:4px"><code style="background:#dbeafe;padding:2px 6px;border-radius:4px;font-size:13px">${c.key}</code> — in <strong>${Math.round(c.daysUntilDue)} Tagen</strong> fällig (zuletzt: ${formatDate(c.lastRotated)})</li>`).join('')

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:32px 16px">
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:12px;padding:24px 28px;margin-bottom:24px">
        <h1 style="margin:0;font-size:20px;font-weight:800;color:#fff">🔐 [TEST] Credential Rotation Reminder</h1>
        <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75)">Simy Super Admin · ${new Date().toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
      </div>
      <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;margin-bottom:20px">
        <strong style="color:#92400e">Dies ist eine Test-E-Mail.</strong> <span style="color:#78350f">So sieht deine wöchentliche Credential-Erinnerung aus.</span>
      </div>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin-bottom:20px">
        <p style="margin:0 0 8px;font-size:14px;color:#374151">
          <strong>${overdue.length}</strong> Credential${overdue.length !== 1 ? 's sind' : ' ist'} überfällig,
          <strong>${dueSoon.length}</strong> weitere werden bald fällig.
        </p>
      </div>
      ${overdue.length > 0 ? `<h3 style="font-size:13px;color:#dc2626;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">⚠ Überfällig</h3><ul style="padding:0 0 0 4px;list-style:none;margin:0 0 20px">${overdueList}</ul>` : ''}
      ${dueSoon.length > 0 ? `<h3 style="font-size:13px;color:#2563eb;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">⏰ Bald fällig</h3><ul style="padding:0 0 0 4px;list-style:none;margin:0 0 20px">${dueSoonList}</ul>` : ''}
      <div style="text-align:center;margin-top:24px">
        <a href="${appUrl}/tenant-admin/credentials" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-weight:700;border-radius:10px;text-decoration:none">Credentials verwalten →</a>
      </div>
      <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:20px">Wird automatisch jeden Montag 08:00 Uhr gesendet, wenn Credentials überfällig sind.</p>
    </div>`

  await sendEmail({
    to: config.notificationEmail,
    subject: `[TEST] Credential Rotation Reminder — ${overdue.length} überfällig, ${dueSoon.length} bald fällig`,
    html,
  })

  return { sent: true, to: config.notificationEmail, overdueCount: overdue.length, dueSoonCount: dueSoon.length }
})
