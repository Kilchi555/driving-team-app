/**
 * POST /api/admin/rental-partners
 * Create, update or delete an external rental partner.
 * Body: { action: 'create'|'update'|'delete'|'send_link', ...fields }
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data: dbUser } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!dbUser || !['admin', 'superadmin'].includes(dbUser.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  const { action, id, name, email, phone, company_name, billing_address, notes, is_active } = body

  if (action === 'create') {
    if (!name || !email) throw createError({ statusCode: 400, statusMessage: 'name and email are required' })

    const { data, error } = await supabase
      .from('external_partners')
      .insert({
        tenant_id: dbUser.tenant_id,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        company_name: company_name?.trim() || null,
        billing_address: billing_address?.trim() || null,
        notes: notes?.trim() || null,
        is_active: true,
        access_token: crypto.randomUUID(),
        access_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') throw createError({ statusCode: 409, statusMessage: 'Ein Partner mit dieser E-Mail existiert bereits.' })
      throw createError({ statusCode: 500, statusMessage: 'Failed to create partner' })
    }

    return { success: true, partner: data }
  }

  if (action === 'update') {
    if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name.trim()
    if (email !== undefined) updates.email = email.toLowerCase().trim()
    if (phone !== undefined) updates.phone = phone?.trim() || null
    if (company_name !== undefined) updates.company_name = company_name?.trim() || null
    if (billing_address !== undefined) updates.billing_address = billing_address?.trim() || null
    if (notes !== undefined) updates.notes = notes?.trim() || null
    if (is_active !== undefined) updates.is_active = is_active

    const { error } = await supabase
      .from('external_partners')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', dbUser.tenant_id)

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to update partner' })
    return { success: true }
  }

  if (action === 'delete') {
    if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

    // Soft-delete by deactivating (keep history)
    const { error } = await supabase
      .from('external_partners')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', dbUser.tenant_id)

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to deactivate partner' })
    return { success: true }
  }

  if (action === 'send_link') {
    if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

    const newToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: partner, error: updateErr } = await supabase
      .from('external_partners')
      .update({ access_token: newToken, access_token_expires_at: expiresAt })
      .eq('id', id)
      .eq('tenant_id', dbUser.tenant_id)
      .select('name, email, tenant_id, tenants(slug, name, primary_color)')
      .single()

    if (updateErr || !partner) throw createError({ statusCode: 500, statusMessage: 'Failed to generate link' })

    const appUrl = process.env.APP_URL || 'https://app.drivingteam.ch'
    const tenant = (partner as any).tenants
    const magicLink = `${appUrl}/partners/${tenant.slug}?token=${newToken}`

    try {
      await $fetch('/api/email/send-generic', {
        method: 'POST',
        body: {
          to: partner.email,
          subject: `Zugang zur Fahrzeugvermietung — ${tenant.name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
              <h2>Hallo ${partner.name}</h2>
              <p>Hier ist dein persönlicher Zugangslink zur Fahrzeugvermietung von <strong>${tenant.name}</strong>:</p>
              <p style="margin: 24px 0;">
                <a href="${magicLink}" style="background:${tenant.primary_color || '#2563eb'}; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">
                  Jetzt anmelden &amp; Fahrzeug buchen
                </a>
              </p>
              <p style="color:#666; font-size:13px;">Gültig für 30 Tage.</p>
            </div>
          `,
        },
      })
    } catch (emailErr: any) {
      logger.warn('⚠️ Failed to send partner invite email:', emailErr.message)
    }

    return {
      success: true,
      magic_link: magicLink,
      message: `Link wurde an ${partner.email} gesendet.`,
    }
  }

  throw createError({ statusCode: 400, statusMessage: 'Unknown action' })
})
