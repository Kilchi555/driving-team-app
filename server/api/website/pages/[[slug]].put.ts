// server/api/website/pages/[[slug]].put.ts
// Legacy page update — hardened: no raw blocks overwrite; use /api/website/slots-save

import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { applySlotPatch, isLandingPayload } from '~/utils/website-slot-schema'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const { slug } = getRouterParams(event)
  const body = await readBody(event)
  const supabase = getSupabaseAdmin()

  const { data: user } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!user?.tenant_id) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User or tenant not found',
    })
  }

  const { data: website } = await supabase
    .from('website_tenants')
    .select('id')
    .eq('tenant_id', user.tenant_id)
    .single()

  if (!website) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Website not found',
    })
  }

  const { data: existing } = await supabase
    .from('website_pages')
    .select('*')
    .eq('website_id', website.id)
    .eq('slug', slug || 'index')
    .maybeSingle()

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  }

  // Prefer explicit slot patch; reject raw blocks overwrite
  if (body?.blocks != null && !body?.slots) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Raw blocks overwrite is disabled. Use POST /api/website/slots-save with { slots }.',
    })
  }

  let nextBlocks = existing.blocks
  if (body?.slots && isLandingPayload(existing.blocks)) {
    try {
      nextBlocks = applySlotPatch(existing.blocks, body.slots).payload
    } catch (err: any) {
      throw createError({
        statusCode: err?.statusCode || 400,
        statusMessage: err?.message || 'Slot-Patch ungültig',
      })
    }
  }

  const seoTitle = body?.seo_title ?? (nextBlocks as any)?.seo?.title ?? existing.seo_title
  const seoDescription =
    body?.seo_description ?? (nextBlocks as any)?.seo?.description ?? existing.seo_description
  const seoKeywords =
    body?.seo_keywords ?? (nextBlocks as any)?.seo?.keywords ?? existing.seo_keywords

  // Sync SEO into payload when provided via top-level fields
  if (isLandingPayload(nextBlocks) && (body?.seo_title || body?.seo_description || body?.seo_keywords)) {
    const patch: Record<string, unknown> = {}
    if (body?.seo_title) patch['seo.title'] = body.seo_title
    if (body?.seo_description) patch['seo.description'] = body.seo_description
    if (body?.seo_keywords) patch['seo.keywords'] = body.seo_keywords
    nextBlocks = applySlotPatch(nextBlocks, patch).payload
  }

  const { data: page, error } = await supabase
    .from('website_pages')
    .update({
      title: body.title ?? existing.title,
      seo_title: seoTitle,
      seo_description: seoDescription,
      seo_keywords: seoKeywords,
      og_image: body.og_image ?? existing.og_image,
      blocks: nextBlocks,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .select()
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  return {
    success: true,
    page,
  }
})
