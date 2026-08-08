import Anthropic from '@anthropic-ai/sdk'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getTerminologyDefaults } from '~/composables/useTerminology'
import { requireAdminProfile } from '~/server/utils/auth'

const client = new Anthropic()

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'tenant_admin'])
  const { tenantId, topic, categories, tenantName, offerContext } = await readBody(event)

  const effectiveTenantId =
    profile.role === 'super_admin' && tenantId ? tenantId : profile.tenant_id

  if (!effectiveTenantId || !topic) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId and topic are required' })
  }
  if (profile.role !== 'super_admin' && tenantId && tenantId !== profile.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden – tenant mismatch' })
  }

  const supabase = getSupabaseAdmin()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, business_type')
    .eq('id', effectiveTenantId)
    .single()

  const terms = getTerminologyDefaults(tenant?.business_type)
  const schoolName = tenant?.name ?? tenantName ?? terms.businessNoun
  const categoryList = Array.isArray(categories) && categories.length > 0
    ? categories.join(', ')
    : `alle ${terms.clientsPlural}`
  const month = new Date().toLocaleString('de-CH', { month: 'long' })
  const year = new Date().getFullYear()

  const offerLines: string[] = []
  if (offerContext && typeof offerContext === 'object') {
    if (offerContext.themeKey) offerLines.push(`Aktionsthema: ${offerContext.themeKey}`)
    if (offerContext.discount_percent) offerLines.push(`Rabatt: ${offerContext.discount_percent}`)
    if (offerContext.discount_code) offerLines.push(`Code: ${offerContext.discount_code}`)
    if (offerContext.discount_valid_until) offerLines.push(`Gültig bis: ${offerContext.discount_valid_until}`)
    if (offerContext.course_name) offerLines.push(`Kurs: ${offerContext.course_name}`)
    if (offerContext.category_label) offerLines.push(`Kategorie: ${offerContext.category_label}`)
  }
  const offerBlock = offerLines.length
    ? `\nAngebots-Details (bitte in Betreff und Text verwenden):\n- ${offerLines.join('\n- ')}\n`
    : ''

  const prompt = `Du bist ein erfahrener Marketing-Experte für ${terms.businessNoun}-Betriebe in der Schweiz.
Du hilfst "${schoolName}", eine Email-Marketingkampagne zu planen.

Kontext:
- Branche: ${terms.businessNoun}
- Terminbegriff: ${terms.appointment} / ${terms.appointmentsPlural}
- Kundenbegriff: ${terms.client} / ${terms.clientsPlural}
- Mitarbeiterbegriff: ${terms.staff} / ${terms.staffPlural}
- Monat: ${month} ${year}
- Zielgruppe (Lead-Kategorien): ${categoryList}
- Thema / Kampagnenziel: "${topic}"
${offerBlock}
Erstelle GENAU folgendes im JSON-Format:

1. "campaignIdeas": 3 konkrete Kampagnenideen (jede mit "title", "strategy", "timing")
2. "subjectLines": 5 verschiedene Email-Betreffzeilen für A/B/C/D/E-Tests (kurz, 40-60 Zeichen, direkt und prägnant)
3. "emailDraft": Ein kompletter, versandfertiger Email-Text (Anrede, Body, CTA, Signatur) — als Plain-Text mit Zeilenumbrüchen, KEIN HTML

Wichtige Regeln:
- Sprache: Deutsch (Schweizer Hochdeutsch, "Sie"-Form)
- Ton: professionell, freundlich, motivierend
- Keine leeren Floskeln, direkte Kommunikation
- Verwende die branchenspezifischen Begriffe oben (nicht pauschal "Fahrschule"/"Fahrstunde", sofern die Branche eine andere ist)
- Betreffzeilen sollen neugierig machen ohne Clickbait zu sein
- Nutze Platzhalter {{first_name}}, {{discount_code}}, {{discount_percent}}, {{discount_valid_until}}, {{course_name}}, {{category_label}}, {{cta_url}} wo sinnvoll
- Erwähne den CTA als Textzeile "Jetzt: {{cta_url}}" falls ein Angebot vorliegt

Antworte NUR als gültiges JSON:
{
  "campaignIdeas": [
    { "title": "...", "strategy": "...", "timing": "..." }
  ],
  "subjectLines": ["...", "...", "...", "...", "..."],
  "emailDraft": "Guten Tag {{first_name}},\\n\\n..."
}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1800,
    messages: [{ role: 'user', content: prompt }],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const parsed = JSON.parse(jsonMatch[0])
    return {
      success: true,
      campaignIdeas: parsed.campaignIdeas ?? [],
      subjectLines: parsed.subjectLines ?? [],
      emailDraft: parsed.emailDraft ?? '',
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
    }
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Failed to parse AI response' })
  }
})
