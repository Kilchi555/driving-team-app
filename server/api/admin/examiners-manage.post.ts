import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const body = await readBody<{
    action: 'create' | 'update' | 'toggle_status'
    examiner_id?: string
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    is_active?: boolean
  }>(event)

  const { action } = body

  if (action === 'create') {
    if (!body.first_name || !body.last_name) {
      throw createError({ statusCode: 400, statusMessage: 'first_name and last_name are required' })
    }

    const { data, error } = await supabase
      .from('examiners')
      .insert({
        first_name: body.first_name.trim(),
        last_name: body.last_name.trim(),
        contact_info: {
          email: body.email?.trim() || null,
          phone: body.phone?.trim() || null,
        },
        tenant_id: profile.tenant_id,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true, data }
  }

  if (action === 'update') {
    if (!body.examiner_id) {
      throw createError({ statusCode: 400, statusMessage: 'examiner_id is required' })
    }
    if (!body.first_name || !body.last_name) {
      throw createError({ statusCode: 400, statusMessage: 'first_name and last_name are required' })
    }

    const { data, error } = await supabase
      .from('examiners')
      .update({
        first_name: body.first_name.trim(),
        last_name: body.last_name.trim(),
        contact_info: {
          email: body.email?.trim() || null,
          phone: body.phone?.trim() || null,
        },
      })
      .eq('id', body.examiner_id)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true, data }
  }

  if (action === 'toggle_status') {
    if (!body.examiner_id) {
      throw createError({ statusCode: 400, statusMessage: 'examiner_id is required' })
    }
    if (typeof body.is_active !== 'boolean') {
      throw createError({ statusCode: 400, statusMessage: 'is_active boolean is required' })
    }

    const { data, error } = await supabase
      .from('examiners')
      .update({ is_active: body.is_active })
      .eq('id', body.examiner_id)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true, data }
  }

  throw createError({ statusCode: 400, statusMessage: `Unknown action: ${action}` })
})
