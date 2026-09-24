import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { analyzeWebsiteProspect } from '~/server/utils/website-prospect-analyze'
import { generateWebsiteProspectSite } from '~/server/utils/website-prospect-generate'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = (await readBody(event)) || {}
  const prospect = await analyzeWebsiteProspect({
    url: body.url,
    name: body.name,
    city: body.city,
    businessType: body.business_type,
  })

  if (body.generate === false) {
    return { success: true, prospect, generated: false }
  }

  try {
    const generated = await generateWebsiteProspectSite(prospect.id)
    const { claim_token, ...next } = generated
    return { success: true, prospect: next, generated: true, claim_token: claim_token || null }
  } catch (err: any) {
    return {
      success: true,
      prospect,
      generated: false,
      generate_error: err?.statusMessage || err?.message || 'Generieren fehlgeschlagen',
    }
  }
})
