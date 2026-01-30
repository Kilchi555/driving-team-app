import { H3Event } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export async function getAuthenticatedUser(event: H3Event) {
  try {
    // ✅ First try to get token from Authorization header (for backward compatibility)
    let token = null
    const authHeader = event.node.req.headers.authorization
    
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
      logger.debug('🔐 Auth token from Authorization header')
    } else {
      // ✅ If no Authorization header, try to get from cookies (HTTP-only)
      const cookies = event.node.req.headers.cookie
      if (cookies) {
        // Parse cookies and look for auth token
        const cookieArray = cookies.split(';').map(c => c.trim())
        for (const cookie of cookieArray) {
          if (cookie.startsWith('sb-') && cookie.includes('=')) {
            // Found a Supabase session cookie
            const parts = cookie.split('=')
            const value = parts.slice(1).join('=') // Handle cookies with = in value
            try {
              const decoded = decodeURIComponent(value)
              const sessionData = JSON.parse(decoded)
              if (sessionData?.access_token) {
                token = sessionData.access_token
                logger.debug('🔐 Auth token from HTTP-only cookie')
                break
              }
            } catch (e) {
              // Cookie might not be JSON, try next one
            }
          }
        }
      }
    }
    
    if (!token) {
      logger.debug('⚠️ No authentication token found')
      return null
    }

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
      logger.debug('⚠️ Token verification failed:', response.statusText)
      return null
    }

    const user = await response.json()
    logger.debug(`✅ Token verified for auth user: ${user?.id}`)
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

