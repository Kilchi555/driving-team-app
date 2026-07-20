// POST /api/tenant-admin/business-type-templates
// Create or update a single template category / event type (tenant_id IS NULL).
// Super-admin only. Body: { kind: 'category' | 'event_type', id?, business_type, ...fields }
//
// These template rows are what register.post.ts's applyCategoryAndEventTypeDefaults()
// copies onto every new tenant of that business type — this is the editor for them.

import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const body = await readBody(event)
  const { kind, id, business_type: businessType } = body || {}

  if (!businessType || typeof businessType !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'business_type is required' })
  }
  if (kind !== 'category' && kind !== 'event_type') {
    throw createError({ statusCode: 400, statusMessage: "kind must be 'category' or 'event_type'" })
  }

  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()

  if (kind === 'category') {
    const code = String(body.code || '').trim()
    const name = String(body.name || '').trim()
    if (!code || !name) throw createError({ statusCode: 400, statusMessage: 'code and name are required' })

    const row = {
      code,
      name,
      description: body.description ?? null,
      color: body.color || '#6366f1',
      is_active: body.is_active ?? true,
      parent_category_id: body.parent_category_id ?? null,
      exam_duration_minutes: body.exam_duration_minutes ?? null,
      lesson_duration_minutes: body.lesson_duration_minutes ?? [45],
      business_type: businessType,
      tenant_id: null,
      updated_at: now,
    }

    if (id) {
      // Safety: only ever update rows that are actually templates (tenant_id IS NULL)
      const { data, error } = await supabase.from('categories').update(row).eq('id', id).is('tenant_id', null).select().single()
      if (error) throw createError({ statusCode: 500, statusMessage: `Update failed: ${error.message}` })
      return { category: data }
    } else {
      const { data, error } = await supabase.from('categories').insert({ ...row, created_at: now }).select().single()
      if (error) {
        const msg = error.code === '23505'
          ? `Kategorie-Code «${code}» existiert bereits als Template`
          : `Insert failed: ${error.message}`
        throw createError({ statusCode: 500, statusMessage: msg })
      }
      return { category: data }
    }
  }

  // kind === 'event_type'
  const code = String(body.code || '').trim()
  const name = String(body.name || '').trim()
  if (!code || !name) throw createError({ statusCode: 400, statusMessage: 'code and name are required' })

  const row = {
    code,
    name,
    emoji: body.emoji ?? '📝',
    description: body.description ?? null,
    default_duration_minutes: body.default_duration_minutes ?? 45,
    default_color: body.default_color ?? '#666666',
    is_active: body.is_active ?? true,
    require_payment: body.require_payment ?? false,
    public_bookable: body.public_bookable ?? true,
    display_order: body.display_order ?? 0,
    allowed_roles: body.allowed_roles ?? ['staff', 'admin'],
    business_type: businessType,
    tenant_id: null,
    updated_at: now,
  }

  if (id) {
    const { data, error } = await supabase.from('event_types').update(row).eq('id', id).is('tenant_id', null).select().single()
    if (error) throw createError({ statusCode: 500, statusMessage: `Update failed: ${error.message}` })
    return { eventType: data }
  } else {
    const { data, error } = await supabase.from('event_types').insert({ ...row, created_at: now }).select().single()
    if (error) {
      const msg = error.code === '23505'
        ? `Terminart-Code «${code}» existiert bereits als Template (tenant_id NULL). Bitte anderen Code wählen.`
        : `Insert failed: ${error.message}`
      throw createError({ statusCode: 500, statusMessage: msg })
    }
    return { eventType: data }
  }
})
