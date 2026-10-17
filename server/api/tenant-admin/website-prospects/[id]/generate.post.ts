import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { generateWebsiteProspectSite } from '~/server/utils/website-prospect-generate'
import { isAllowedProspectVatRate } from '~/server/utils/website-prospect-vat'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })
  const body = (await readBody(event).catch(() => null)) || {}
  const vatRaw = body.vat_rate_percent ?? body.vatRatePercent
  const vatSelection =
    vatRaw === undefined || vatRaw === null || vatRaw === ''
      ? undefined
      : isAllowedProspectVatRate(Number(vatRaw))
        ? Number(vatRaw)
        : vatRaw
  const prospect = await generateWebsiteProspectSite(id, {
    vatSelection,
    forceRotatePreviewToken: body.force_rotate_preview_token === true,
  })
  return { success: true, prospect, generated: true }
})
