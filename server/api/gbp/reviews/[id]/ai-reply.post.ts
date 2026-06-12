import { defineEventHandler, createError, readBody, getRouterParam } from 'h3'
import Anthropic from '@anthropic-ai/sdk'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * POST /api/gbp/reviews/:id/ai-reply
 * Generates an AI reply suggestion for a GBP review.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const reviewId = getRouterParam(event, 'id')
  const { reviewText, reviewerName, starRating, businessName } = await readBody<{
    reviewText: string
    reviewerName: string
    starRating: number
    businessName?: string
  }>(event)

  if (!reviewText && !starRating) throw createError({ statusCode: 400, statusMessage: 'Review content required' })

  // Get tenant name if not provided
  let tenantName = businessName
  if (!tenantName) {
    const { data: tenant } = await getSupabaseAdmin()
      .from('tenants')
      .select('name')
      .eq('id', authUser.tenant_id)
      .single()
    tenantName = tenant?.name ?? 'Fahrschule'
  }

  const stars = starRating ?? 0
  const tone = stars >= 4 ? 'dankend und herzlich' : stars === 3 ? 'verständnisvoll und lösungsorientiert' : 'entschuldigend und konstruktiv'

  const prompt = `Du bist der Inhaber von "${tenantName}", einer Fahrschule in der Schweiz.
Antworte auf folgende Google-Bewertung professionell auf Deutsch (Schweizer Hochdeutsch).

Bewertung von ${reviewerName || 'einem Kunden'} (${stars}/5 Sterne):
"${reviewText || '(Kein Kommentar)'}"

Schreibe eine kurze, ${tone}e Antwort (max. 3 Sätze). 
Regeln:
- Persönlich ansprechen (Vorname falls bekannt)
- Authentisch, nicht übertrieben
- Bei negativen Reviews: konkreten Lösungsweg erwähnen
- Nie defensiv, immer professionell
- Kein "Sehr geehrte/r", stattdessen "Liebe/r [Name]"
- Signatur: "${tenantName}" am Ende

Antworte NUR mit dem Text der Antwort, kein JSON, keine Erklärungen.`

  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  const reply = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

  return { success: true, suggestedReply: reply, reviewId }
})
