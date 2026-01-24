import { H3Event } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export async function getAuthenticatedUser(event: H3Event) {
  try {
    // Get the Authorization header
    const authHeader = event.node.req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    // Extract the token
    const token = authHeader.substring(7)
    
    // Verify the token with Supabase
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials not configured')
      return null
    }

    // Call Supabase auth endpoint to verify token
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseKey
      }
    })

    if (!response.ok) {
      console.warn('⚠️ Token verification failed:', response.statusText)
      return null
    }

    const user = await response.json()
    return user

  } catch (error: any) {
    console.error('❌ Error getting authenticated user:', error)
    return null
  }
}

/**
 * Get authenticated user with database user ID
 * This resolves the auth user ID to the actual database user record
 */
export async function getAuthenticatedUserWithDbId(event: H3Event) {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.id) return null

    const authUserId = authUser.id
    logger.debug(`✅ Token verified for auth user: ${authUserId}`)

    // Get the database user record using the auth user ID
    const supabase = getSupabaseAdmin()
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id, auth_user_id, role')
      .eq('auth_user_id', authUserId)
      .single()

    if (userError || !dbUser?.id) {
      logger.warn(`❌ User not found in database for auth_user_id: ${authUserId}`)
      return null
    }

    logger.debug(`✅ Database user found: ${dbUser.id} (auth_user_id: ${authUserId})`)

    // Return the database user (with the correct id)
    return {
      id: dbUser.id,
      auth_user_id: authUserId,
      email: authUser.email,
      tenant_id: dbUser.tenant_id,
      role: dbUser.role
    }

  } catch (error: any) {
    console.error('❌ Error getting authenticated user with DB ID:', error)
    return null
  }
}

