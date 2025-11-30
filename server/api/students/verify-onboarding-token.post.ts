// server/api/students/verify-onboarding-token.post.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export default defineEventHandler(async (event) => {
  try {
    const { token } = await readBody(event)

    if (!token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Token is required'
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Find user by token
    const { data: user, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, tenant_id, onboarding_token_expires')
      .eq('onboarding_token', token)
      .eq('onboarding_status', 'pending')
      .single()

    if (error || !user) {
      return {
        success: false,
        message: 'Invalid or expired token'
      }
    }

    // Check if token is expired
    const expiresAt = new Date(user.onboarding_token_expires)
    if (expiresAt < new Date()) {
      return {
        success: false,
        message: 'Token has expired'
      }
    }

    // Get tenant name
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', user.tenant_id)
      .single()

    return {
      success: true,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        tenant_id: user.tenant_id
      },
      tenantName: tenant?.name
    }

  } catch (error: any) {
    console.error('Token verification error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Token verification failed'
    })
  }
})

