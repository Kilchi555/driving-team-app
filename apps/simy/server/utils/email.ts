import { Resend } from 'resend'

let resendClient: Resend | null = null

function getResendClient() {
  if (!resendClient) {
    const config = useRuntimeConfig()
    const apiKey = config.resendApiKey || process.env.RESEND_API_KEY
    if (!apiKey) throw new Error('RESEND_API_KEY is not configured')
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  from?: string
  senderName?: string
}

export async function sendEmail({ to, subject, html, from, senderName }: SendEmailOptions) {
  const resend = getResendClient()
  const config = useRuntimeConfig()
  const baseFrom = config.resendFromEmail || process.env.RESEND_FROM_EMAIL || 'noreply@simy.ch'
  const resolvedFrom = from || (senderName ? `${senderName} <${baseFrom}>` : baseFrom)

  const { data, error } = await resend.emails.send({ from: resolvedFrom, to, subject, html })
  if (error) throw error
  return { success: true, messageId: data?.id }
}
