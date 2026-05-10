// server/api/notify/more-seats.post.ts
// Sent when a tenant reaches the 10-seat add-on limit on the upgrade page.
// Notifies the Simy team so they can offer a custom Enterprise deal.
import { defineEventHandler, readBody } from 'h3'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { tenantName, tenantEmail, selectedPlan } = body as {
    tenantName?: string
    tenantEmail?: string
    selectedPlan?: string
  }

  try {
    await sendEmail({
      to: 'info@simy.ch',
      subject: '🚀 Tenant möchte mehr als 10 Seats',
      html: `
        <h2>Seat-Limit erreicht</h2>
        <p>Ein Tenant hat beim Upgrade-Formular die maximale Anzahl von 10 Add-on Seats gewählt und benötigt möglicherweise mehr.</p>
        <table cellpadding="6" style="border-collapse:collapse">
          <tr><td><strong>Tenant</strong></td><td>${tenantName || '–'}</td></tr>
          <tr><td><strong>E-Mail</strong></td><td>${tenantEmail || '–'}</td></tr>
          <tr><td><strong>Gewählter Plan</strong></td><td>${selectedPlan || '–'}</td></tr>
        </table>
        <p>Bitte proaktiv kontaktieren und ein Enterprise-Angebot erstellen.</p>
      `
    })
    logger.info(`📧 More-seats notification sent for tenant: ${tenantName || 'unknown'}`)
  } catch (err) {
    logger.error('Failed to send more-seats notification:', err)
    // Don't throw — this is a background notification, not critical for the user
  }

  return { ok: true }
})
