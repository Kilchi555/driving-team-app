import { H3Event } from 'h3'

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

