// api/auth/register.post.ts
import { defineEventHandler, readBody } from 'h3'
import { getServerSession } from '#auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RegisterRequest {
  action: string
  email?: string
  password?: string
  first_name?: string
  last_name?: string
  phone?: string
  slug?: string
  tenant_id?: string
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<RegisterRequest>(event)
    const { action } = body

    if (action === 'register-customer') {
      return await registerCustomer(body)
    } else if (action === 'register-staff') {
      return await registerStaff(body)
    } else if (action === 'get-tenant-from-slug') {
      return await getTenantFromSlug(body)
    }

    throw new Error('Invalid action')
  } catch (err: any) {
    console.error('Auth register error:', err)
    return {
      success: false,
      error: err.message || 'Registration failed'
    }
  }
})

async function registerCustomer(body: RegisterRequest) {
  const { email, password, first_name, last_name, phone, slug, tenant_id } = body

  if (!email || !password || !first_name || !last_name || !phone) {
    throw new Error('Missing required fields')
  }

  // Get tenant ID if slug provided
  let finalTenantId = tenant_id
  if (!finalTenantId && slug) {
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single()

    if (tenantError || !tenant) {
      throw new Error('Tenant not found')
    }
    finalTenantId = tenant.id
  }

  // Sign up user with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: {
      first_name,
      last_name,
      phone
    }
  })

  if (authError || !authData.user) {
    throw new Error(authError?.message || 'Failed to create auth user')
  }

  // Create user profile
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      auth_user_id: authData.user.id,
      email,
      first_name,
      last_name,
      phone,
      role: 'client',
      tenant_id: finalTenantId,
      is_active: true
    })
    .select()
    .single()

  if (userError) {
    // Cleanup: delete auth user if profile creation fails
    await supabase.auth.admin.deleteUser(authData.user.id)
    throw new Error('Failed to create user profile')
  }

  return {
    success: true,
    data: {
      user: {
        id: userData.id,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name
      }
    }
  }
}

async function registerStaff(body: RegisterRequest) {
  const { email, password, first_name, last_name, phone, tenant_id } = body

  if (!email || !password || !first_name || !last_name || !tenant_id) {
    throw new Error('Missing required fields')
  }

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existingUser) {
    throw new Error('User with this email already exists')
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: {
      first_name,
      last_name,
      phone
    }
  })

  if (authError || !authData.user) {
    throw new Error(authError?.message || 'Failed to create auth user')
  }

  // Create user profile with staff role
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      auth_user_id: authData.user.id,
      email,
      first_name,
      last_name,
      phone: phone || null,
      role: 'staff',
      tenant_id,
      is_active: true
    })
    .select()
    .single()

  if (userError) {
    // Cleanup
    await supabase.auth.admin.deleteUser(authData.user.id)
    throw new Error('Failed to create staff profile')
  }

  return {
    success: true,
    data: {
      user: {
        id: userData.id,
        email: userData.email,
        role: userData.role
      }
    }
  }
}

async function getTenantFromSlug(body: RegisterRequest) {
  const { slug } = body

  if (!slug) {
    throw new Error('Slug is required')
  }

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (error || !tenant) {
    throw new Error('Tenant not found')
  }

  return {
    success: true,
    data: tenant
  }
}
