/**
 * One-shot endpoint to send a preview marketing email.
 * Used for testing email templates before campaign launch.
 */
import { sendEmail } from '~/server/utils/email'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { to, subject, html } = body

  if (!to || !subject || !html) {
    throw createError({ statusCode: 400, statusMessage: 'to, subject and html are required' })
  }

  const result = await sendEmail({
    to,
    subject,
    html,
    fromName: 'Fahrschule Driving Team',
  })

  return { success: true, messageId: result.messageId }
})
