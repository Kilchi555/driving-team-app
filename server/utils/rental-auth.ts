/**
 * Rental portal authentication.
 *
 * Validates the Supabase session and returns the active user.
 * Any user with status = 'active' can rent vehicles — own students,
 * own staff, and external instructors from other schools who registered.
 */
import { H3Event, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export interface RentalUser {
  id: string          // users.id
  auth_user_id: string
  email: string
  name: string
  tenant_id: string   // the tenant the user belongs to
  role: string
}

export async function getRentalUser(event: H3Event): Promise<RentalUser> {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Nicht angemeldet. Bitte melde dich zuerst an.' })
  }

  const supabase = getSupabaseAdmin()
  const { data: dbUser } = await supabase
    .from('users')
    .select('id, tenant_id, role, status, first_name, last_name, email')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  if (!dbUser) {
    throw createError({ statusCode: 403, statusMessage: 'Kein Benutzerprofil gefunden.' })
  }
  if (dbUser.status !== 'active') {
    throw createError({ statusCode: 403, statusMessage: 'Dein Konto ist noch nicht aktiv. Bitte kontaktiere die Fahrschule.' })
  }

  return {
    id: dbUser.id,
    auth_user_id: authUser.id,
    email: dbUser.email || authUser.email || '',
    name: [dbUser.first_name, dbUser.last_name].filter(Boolean).join(' '),
    tenant_id: dbUser.tenant_id,
    role: dbUser.role,
  }
}
