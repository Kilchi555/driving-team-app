// server/api/admin/create-user.post.ts
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const requestId = Math.random().toString(36).substr(2, 9)
  console.log(`🚀 [${requestId}] API Request started for create-user`)
  
  try {
    console.log(`📥 [${requestId}] Reading request body...`)
    const body = await readBody(event)
    console.log(`📋 [${requestId}] Body received:`, !!body)
    
    console.log(`⚙️ [${requestId}] Getting runtime config...`)
    const config = useRuntimeConfig()
    console.log(`⚙️ [${requestId}] Config loaded:`, !!config)
    
    // Validate request
    console.log(`✅ [${requestId}] Validating required fields...`)
    if (!body.email || !body.password || !body.role) {
      console.error(`❌ [${requestId}] Missing required fields:`, {
        email: !!body.email,
        password: !!body.password,
        role: !!body.role
      })
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }
    console.log(`✅ [${requestId}] Required fields validated`)

    console.log(`🔑 [${requestId}] Server-side user creation for:`, body.email)
    console.log(`📋 [${requestId}] Request body:`, {
      email: body.email,
      role: body.role,
      tenant_id: body.tenant_id,
      has_categories: !!body.categories,
      has_password: !!body.password
    })

    // Create admin Supabase client with service role key
    console.log(`🔑 [${requestId}] Supabase URL:`, config.public.supabaseUrl)
    console.log(`🔑 [${requestId}] Service role key available:`, !!config.supabaseServiceRoleKey)
    
    if (!config.supabaseServiceRoleKey) {
      console.error(`❌ [${requestId}] No service role key available!`)
      throw createError({
        statusCode: 500,
        statusMessage: 'Service role key not configured'
      })
    }
    
    const supabaseAdmin = createClient(
      config.public.supabaseUrl,
      config.supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    console.log(`✅ [${requestId}] Admin client created successfully`)

    // Check if email already exists in users table (including inactive/deleted users)
    const { data: existingUsers, error: checkError } = await supabaseAdmin
      .from('users')
      .select('email, first_name, last_name, auth_user_id, is_active, deleted_at')
      .eq('email', body.email)

    if (checkError) {
      console.error(`❌ [${requestId}] Error checking existing user:`, checkError)
      throw createError({
        statusCode: 400,
        statusMessage: `Error checking existing user: ${checkError.message}`
      })
    }

    console.log(`🔍 [${requestId}] Found ${existingUsers?.length || 0} existing users with email ${body.email}`)

    if (existingUsers && existingUsers.length > 0) {
      // Log all existing users for debugging
      existingUsers.forEach((user, index) => {
        console.log(`📋 [${requestId}] Existing user ${index + 1}:`, {
          name: `${user.first_name} ${user.last_name}`,
          is_active: user.is_active,
          deleted_at: user.deleted_at,
          has_auth: !!user.auth_user_id
        })
      })

      // Check for active users
      const activeUser = existingUsers.find(user => user.is_active && !user.deleted_at)
      if (activeUser) {
        throw createError({
          statusCode: 400,
          statusMessage: `E-Mail bereits registriert für ${activeUser.first_name} ${activeUser.last_name}. Bitte verwenden Sie eine andere E-Mail-Adresse.`
        })
      }

      // Clean up any inactive/deleted users with same email
      console.log(`🧹 [${requestId}] Cleaning up ${existingUsers.length} inactive/deleted users...`)
      
      const { error: deleteError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('email', body.email)
      
      if (deleteError) {
        console.error(`❌ [${requestId}] Failed to delete existing users:`, deleteError)
      } else {
        console.log(`✅ [${requestId}] Cleaned up existing users`)
      }
    }

    // Also check auth system for orphaned auth users
    try {
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
      const existingAuthUser = authUsers.users.find(user => user.email === body.email)
      
      if (existingAuthUser) {
        console.log('⚠️ Found orphaned auth user, attempting cleanup...')
        
        // Try to delete the orphaned auth user
        await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id)
        console.log('🧹 Cleaned up orphaned auth user:', existingAuthUser.id)
      }
    } catch (authCheckError) {
      console.warn('⚠️ Could not check/cleanup auth users:', authCheckError)
      // Continue anyway - this is not critical
    }

    // 1. Create Auth User FIRST (critical step)
    console.log('🔐 Creating auth user...')
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      user_metadata: {
        first_name: body.first_name,
        last_name: body.last_name,
        role: body.role,
        tenant_id: body.tenant_id
      },
      email_confirm: true // Auto-confirm for development
    })

    if (authError) {
      console.error('❌ Auth user creation failed:', authError)
      throw createError({
        statusCode: 400,
        statusMessage: `Auth user creation failed: ${authError.message}`
      })
    }

    if (!authUser.user?.id) {
      console.error('❌ Auth user created but no ID returned')
      throw createError({
        statusCode: 400,
        statusMessage: 'Auth user creation failed: No user ID returned'
      })
    }

    console.log(`✅ [${requestId}] Auth user created:`, authUser.user.id)

    // 2. Create user record manually (since trigger is disabled)
    console.log(`📊 [${requestId}] Creating user record manually...`)
    
    // Validate created_by if provided
    if (body.created_by) {
      const { data: creatorUser, error: creatorError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', body.created_by)
        .single()
      
      if (creatorError || !creatorUser) {
        console.log(`⚠️ [${requestId}] created_by user not found: ${body.created_by}, setting to null`)
        body.created_by = null
      } else {
        console.log(`✅ [${requestId}] created_by user validated: ${body.created_by}`)
      }
    }
    
    const userData = {
      id: crypto.randomUUID(),
      auth_user_id: authUser.user.id,
      email: body.email,
      first_name: body.first_name,
      last_name: body.last_name,
      phone: body.phone,
      birthdate: body.birthdate || null,
      street: body.street || null,
      street_nr: body.street_nr || null,
      zip: body.zip || null,
      city: body.city || null,
      role: body.role === 'sub_admin' ? 'admin' : body.role,
      admin_level: body.admin_level || null,
      is_primary_admin: false,
      tenant_id: body.tenant_id,
      created_by: body.created_by || null,
      category: body.categories && body.categories.length > 0 ? body.categories : null,
      is_active: true,
      created_at: new Date().toISOString()
    }

    const { data: businessUser, error: businessError } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select()
      .single()

    if (businessError) {
      console.error('❌ Business user creation failed:', businessError)
      
      // Cleanup: Delete auth user if business user creation failed
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user!.id)
        console.log('🧹 Cleaned up auth user after business user creation failure')
      } catch (cleanupError) {
        console.error('❌ Failed to cleanup auth user:', cleanupError)
      }
      
      // Provide user-friendly error message
      let errorMessage = businessError.message
      if (businessError.code === '23505' && businessError.message.includes('users_email_active_unique')) {
        errorMessage = `E-Mail bereits registriert. Bitte verwenden Sie eine andere E-Mail-Adresse.`
      }
      
      throw createError({
        statusCode: 400,
        statusMessage: `User creation failed: ${errorMessage}`
      })
    }

    console.log(`✅ [${requestId}] User created successfully:`, businessUser.id)

    return {
      success: true,
      user: {
        id: businessUser.id,
        auth_user_id: authUser.user!.id,
        email: businessUser.email,
        role: businessUser.role
      },
      requestId
    }

  } catch (error: any) {
    console.error('❌ Server error:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Internal server error'
    })
  }
})
