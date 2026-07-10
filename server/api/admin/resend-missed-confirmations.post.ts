/**
 * ONE-TIME endpoint: Re-sends appointment confirmation emails that were missed
 * due to the paymentPromise scope bug (introduced 2026-07-09 15:44, fixed 2026-07-10 12:44).
 *
 * DELETE this file after use.
 */
import { defineEventHandler } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

// Affected appointments: created during the bug window, non-cancelled, with user
const AFFECTED = [
  { appointmentId: 'd3b50366-1302-468d-a513-271c305c327c', userId: '1db78c60-72c1-4c48-ab4d-75e56db871c4', tenantId: '64259d68-195a-4c68-8875-f1b44d962830', name: 'Martina Steiner', email: 'steiner-krieg@bluewin.ch' },
  { appointmentId: '742866ac-bbaf-49c1-94e2-a5a0db676b3d', userId: '1db78c60-72c1-4c48-ab4d-75e56db871c4', tenantId: '64259d68-195a-4c68-8875-f1b44d962830', name: 'Martina Steiner', email: 'steiner-krieg@bluewin.ch' },
  { appointmentId: '1192db88-a7e3-4bed-afdf-5809fda83393', userId: 'e82ed110-c603-4a29-b667-bfe54de7b169', tenantId: '64259d68-195a-4c68-8875-f1b44d962830', name: 'Jael Ronner', email: 'jael.ronner@bluewin.ch' },
  { appointmentId: 'f8041843-eea6-48d1-8a2a-67ef5edd4122', userId: '26970c1d-d95f-4d6e-add0-58587ebb3e8a', tenantId: '64259d68-195a-4c68-8875-f1b44d962830', name: 'Lena Langenbach', email: 'lenalangenbach08@icloud.com' },
  { appointmentId: '02012508-a41a-40e0-9920-344435a8c5ec', userId: '34613d8d-a377-4b1b-b379-b1ab750bed59', tenantId: '64259d68-195a-4c68-8875-f1b44d962830', name: 'Dylan Harry', email: 'harrypdylan@gmail.com' },
  { appointmentId: 'd233702a-4ad2-4f16-9329-a5aca100b474', userId: 'dbd937e5-e34f-44a9-b53b-5fbd0af4b580', tenantId: '64259d68-195a-4c68-8875-f1b44d962830', name: 'Maneerat Steiner', email: 'Steiner.maneerat@gmx.ch' },
  // Skipped: 926b6049 + 9eefa90b = test account "Max Mustermann"
  // Skipped: d7b59f77 + a6a9188f = status 'completed' (lesson already took place today)
]

export default defineEventHandler(async (event) => {
  await requireAdminProfile(event)

  const results: { appointmentId: string; name: string; status: 'sent' | 'error'; error?: string }[] = []

  for (const entry of AFFECTED) {
    try {
      await $fetch('/api/reminders/send-appointment-confirmation', {
        method: 'POST',
        body: {
          appointmentId: entry.appointmentId,
          userId: entry.userId,
          tenantId: entry.tenantId,
        },
      })
      logger.info(`✅ Resent confirmation to ${entry.name} (${entry.email}) for appointment ${entry.appointmentId}`)
      results.push({ appointmentId: entry.appointmentId, name: entry.name, status: 'sent' })
    } catch (err: any) {
      logger.error(`❌ Failed to resend confirmation to ${entry.name}:`, err?.message)
      results.push({ appointmentId: entry.appointmentId, name: entry.name, status: 'error', error: err?.message })
    }
  }

  const sentCount = results.filter(r => r.status === 'sent').length
  const errorCount = results.filter(r => r.status === 'error').length

  logger.info(`📧 Resend complete: ${sentCount} sent, ${errorCount} errors`)

  return {
    message: `${sentCount} / ${AFFECTED.length} Bestätigungs-E-Mails nachgesendet`,
    results,
  }
})
