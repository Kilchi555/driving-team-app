// api/auth/register.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { getServerSession } from '#auth'
import { createClient } from '@supabase/supabase-js'
import { validatePassword, logPasswordValidationAttempt } from '~/server/utils/password-validator'
import { logger } from '~/utils/logger'

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

/**
 * Multi-layer API Security:
 * Layer 1: Input Validation
 * Layer 2: Password Strength Validation
 * Layer 3: Database Checks
 * Layer 4: Auth Creation
 * Layer 5: Profile Creation
 * Layer 6: Audit Logging
 */
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

    logger.warn('❌ [REGISTER] Invalid action', { action })
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid registration action'
    })
  } catch (err: any) {
    logger.error('❌ [REGISTER] Registration error:', err.message || err)
    
    // Return generic error to avoid information leakage
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.statusMessage || 'Registration failed. Please try again later.'
    })
  }
})

async function registerCustomer(body: RegisterRequest) {
  const { email, password, first_name, last_name, phone, slug, tenant_id } = body

  // ===== LAYER 1: INPUT VALIDATION =====
  if (!email || !password || !first_name || !last_name || !phone) {
    logger.warn('❌ [REGISTER-CUSTOMER] Missing required fields')
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required registration fields'
    })
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    logger.warn('❌ [REGISTER-CUSTOMER] Invalid email format', { email: email.substring(0, 3) + '***' })
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid email format'
    })
  }

  // ===== LAYER 2: PASSWORD STRENGTH VALIDATION =====
  const passwordValidation = validatePassword(password)
  logPasswordValidationAttempt(null, email, passwordValidation.isValid, `Strength: ${passwordValidation.strength}`)
  
  if (!passwordValidation.isValid) {
    logger.warn('❌ [REGISTER-CUSTOMER] Password does not meet requirements', {
      email: email.substring(0, 3) + '***',
      errors: passwordValidation.errors
    })
    throw createError({
      statusCode: 400,
      statusMessage: 'Passwort erfüllt die Sicherheitsanforderungen nicht. ' + passwordValidation.errors[0]
    })
  }

  // ===== LAYER 3: DATABASE CHECKS =====
  // Get tenant ID if slug provided
  let finalTenantId = tenant_id
  if (!finalTenantId && slug) {
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single()

    if (tenantError || !tenant) {
      logger.warn('❌ [REGISTER-CUSTOMER] Tenant not found', { slug })
      throw createError({
        statusCode: 404,
        statusMessage: 'Tenant not found'
      })
    }
    finalTenantId = tenant.id
  }

  // Check if email already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .eq('tenant_id', finalTenantId)
    .single()

  if (existingUser) {
    logger.warn('❌ [REGISTER-CUSTOMER] Email already registered', { email: email.substring(0, 3) + '***' })
    throw createError({
      statusCode: 409,
      statusMessage: 'Diese E-Mail-Adresse ist bereits registriert'
    })
  }

  // ===== LAYER 4: AUTH CREATION =====
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
    logger.error('❌ [REGISTER-CUSTOMER] Auth creation failed', { 
      email: email.substring(0, 3) + '***',
      error: authError?.message 
    })
    throw createError({
      statusCode: 400,
      statusMessage: 'Failed to create account. Please try again.'
    })
  }

  // ===== LAYER 5: PROFILE CREATION =====
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
      is_active: true,
      password_strength_version: 2 // Mark as using new password requirements
    })
    .select()
    .single()

  if (userError) {
    // Cleanup: delete auth user if profile creation fails
    await supabase.auth.admin.deleteUser(authData.user.id)
    logger.error('❌ [REGISTER-CUSTOMER] Profile creation failed', { 
      email: email.substring(0, 3) + '***',
      error: userError.message 
    })
    throw createError({
      statusCode: 400,
      statusMessage: 'Failed to create user profile. Please try again.'
    })
  }

  // ===== LAYER 6: AUDIT LOGGING =====
  logger.info('✅ [REGISTER-CUSTOMER] Customer registered successfully', {
    userId: userData.id,
    email: userData.email.substring(0, 3) + '***',
    tenantId: finalTenantId
  })

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

  // ===== LAYER 1: INPUT VALIDATION =====
  if (!email || !password || !first_name || !last_name || !tenant_id) {
    logger.warn('❌ [REGISTER-STAFF] Missing required fields')
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required registration fields'
    })
  }

  // ===== LAYER 2: PASSWORD STRENGTH VALIDATION =====
  const passwordValidation = validatePassword(password)
  logPasswordValidationAttempt(null, email, passwordValidation.isValid, `Strength: ${passwordValidation.strength}`)
  
  if (!passwordValidation.isValid) {
    logger.warn('❌ [REGISTER-STAFF] Password does not meet requirements', {
      email: email.substring(0, 3) + '***',
      errors: passwordValidation.errors
    })
    throw createError({
      statusCode: 400,
      statusMessage: 'Passwort erfüllt die Sicherheitsanforderungen nicht. ' + passwordValidation.errors[0]
    })
  }

  // ===== LAYER 3: DATABASE CHECKS =====
  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .eq('tenant_id', tenant_id)
    .single()

  if (existingUser) {
    logger.warn('❌ [REGISTER-STAFF] Email already registered', { email: email.substring(0, 3) + '***' })
    throw createError({
      statusCode: 409,
      statusMessage: 'Diese E-Mail-Adresse ist bereits registriert'
    })
  }

  // ===== LAYER 4: AUTH CREATION =====
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
    logger.error('❌ [REGISTER-STAFF] Auth creation failed', { 
      email: email.substring(0, 3) + '***',
      error: authError?.message 
    })
    throw createError({
      statusCode: 400,
      statusMessage: 'Failed to create staff account. Please try again.'
    })
  }

  // ===== LAYER 5: PROFILE CREATION =====
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
      is_active: true,
      password_strength_version: 2 // Mark as using new password requirements
    })
    .select()
    .single()

  if (userError) {
    // Cleanup
    await supabase.auth.admin.deleteUser(authData.user.id)
    logger.error('❌ [REGISTER-STAFF] Profile creation failed', { 
      email: email.substring(0, 3) + '***',
      error: userError.message 
    })
    throw createError({
      statusCode: 400,
      statusMessage: 'Failed to create staff profile. Please try again.'
    })
  }

  // ===== LAYER 6: AUDIT LOGGING =====
  logger.info('✅ [REGISTER-STAFF] Staff member registered successfully', {
    userId: userData.id,
    email: userData.email.substring(0, 3) + '***',
    role: userData.role,
    tenantId: tenant_id
  })

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
    logger.warn('❌ [GET-TENANT] Slug is required')
    throw createError({
      statusCode: 400,
      statusMessage: 'Slug is required'
    })
  }

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (error || !tenant) {
    logger.warn('❌ [GET-TENANT] Tenant not found', { slug })
    throw createError({
      statusCode: 404,
      statusMessage: 'Tenant not found'
    })
  }

  return {
    success: true,
    data: tenant
  }
}
