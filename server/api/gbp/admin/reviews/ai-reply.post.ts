import { defineEventHandler, createError, readBody } from 'h3'
import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import Anthropic from '@anthropic-ai/sdk'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const { reviewText, reviewerName, starRating, businessName } = await readBody<{
    reviewText: string; reviewerName: string; starRating: number; businessName: string
  }>(event)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw createError({ statusCode: 500, statusMessage: 'AI not configured' })

  const client = new Anthropic({ apiKey })
  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Du schreibst eine professionelle Google-Bewertungsantwort für ${businessName}.
Bewertung: ${starRating}/5 Sterne von ${reviewerName}
Kommentar: "${reviewText || '(kein Kommentar)'}"

Schreibe eine kurze, authentische Antwort auf Deutsch (max. 3 Sätze). Kein JSON, nur der Text.`,
    }],
  })

  const suggestedReply = (message.content[0] as any).text?.trim() ?? ''
  return { success: true, suggestedReply }
})
