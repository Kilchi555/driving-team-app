// server/api/appointments/manage-products.post.ts
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'

interface ManageProductsBody {
  appointmentId: string
  action: 'delete' | 'save' | 'get'
  productData?: any[]
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<ManageProductsBody>(event)
    const { appointmentId, action, productData } = body
    
    if (!appointmentId) {
      throw new Error('Appointment ID is required')
    }
    
    logger.debug('📦 Managing products:', { appointmentId, action })
    
    const supabaseAdmin = getSupabaseAdmin()
    
    // Get current user from session (HTTP-only cookies)
    // First try to get user from session
    let user: any = null
    let userError: any = null
    
    const sessionResult = await supabaseAdmin.auth.getUser()
    if (!sessionResult.error && sessionResult.data?.user) {
      user = sessionResult.data.user
    } else {
      // Try with auth header as fallback
      userError = sessionResult.error
      const authorization = getHeader(event, 'authorization')
      const token = authorization?.replace('Bearer ', '')
      
      if (!token) {
        logger.error('❌ No authentication available (no session, no Bearer token)')
        throw new Error('No authentication available')
      }
      
      logger.debug('🔑 Using Bearer token authentication')
      const bearerResult = await supabaseAdmin.auth.getUser(token)
      if (bearerResult.error || !bearerResult.data?.user) {
        logger.error('❌ Bearer token invalid:', bearerResult.error?.message)
        throw new Error('Invalid authentication')
      }
      user = bearerResult.data.user
    }
    
    if (!user) {
      logger.error('❌ Failed to get user from session or Bearer token:', userError?.message)
      throw new Error('Unauthorized - no user found')
    }
    
    logger.debug('👤 Current user:', { userId: user.id, email: user.email })
    
    // Get user profile for role/tenant validation
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, role, tenant_id')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      logger.error('❌ Error fetching user profile:', {
        userId: user.id,
        errorCode: profileError.code,
        errorMessage: profileError.message
      })
      // Don't throw immediately - check if this is a missing profile issue
      // We'll handle it below
    }
    
    if (!userProfile && profileError) {
      logger.warn('⚠️ User profile not found in users table:', {
        authUserId: user.id,
        authEmail: user.email,
        errorMessage: profileError.message
      })
      
      // Fallback: Try to verify appointment access without user profile
      // This allows users to save their own appointments even if profile is incomplete
      logger.debug('🔄 Attempting authorization without user profile...')
      
      const { data: appointment, error: appointmentError } = await supabaseAdmin
        .from('appointments')
        .select('id, user_id, staff_id, tenant_id')
        .eq('id', appointmentId)
        .single()
      
      if (appointmentError || !appointment) {
        logger.error('❌ Appointment not found:', appointmentError?.message)
        throw new Error('Appointment not found')
      }
      
      // Allow if this is the appointment creator or staff member
      if (appointment.user_id !== user.id && appointment.staff_id !== user.id) {
        logger.error('❌ User not authorized for this appointment (profile missing):', {
          userId: user.id,
          appointmentUserId: appointment.user_id,
          appointmentStaffId: appointment.staff_id
        })
        throw new Error('User profile not found in users table')
      }
      
      logger.info('✅ User authorized via appointment relationship (profile missing)')
    } else if (userProfile) {
      logger.debug('✅ User profile found:', { role: userProfile.role, tenant_id: userProfile.tenant_id })
      
      // Verify user can access this appointment
      const { data: appointment, error: appointmentError } = await supabaseAdmin
        .from('appointments')
        .select('id, staff_id, tenant_id')
        .eq('id', appointmentId)
        .single()
      
      if (appointmentError || !appointment) {
        logger.error('❌ Appointment not found:', appointmentError?.message)
        throw new Error('Appointment not found')
      }
      
      // Authorization: Staff can only manage their own appointments
      // Admin/Tenant Admin can manage any appointment in their tenant
      const isStaff = userProfile.role === 'staff'
      const isAdmin = ['admin', 'tenant_admin', 'super_admin'].includes(userProfile.role)
      const isOwnAppointment = appointment.staff_id === user.id
      const isSameTenant = appointment.tenant_id === userProfile.tenant_id
      
      const isAuthorized = (isStaff && isOwnAppointment) || (isAdmin && isSameTenant)
      
      if (!isAuthorized) {
        logger.warn('❌ Unauthorized access to appointment products:', {
          userId: user.id,
          userRole: userProfile.role,
          appointmentId,
          staffId: appointment.staff_id,
          userTenant: userProfile.tenant_id,
          appointmentTenant: appointment.tenant_id
        })
        throw new Error('Unauthorized to manage products for this appointment')
      }
    }
    
    if (action === 'delete') {
      // Delete existing products
      logger.debug('🗑️ Deleting products for appointment')
      
      const { error: deleteError } = await supabaseAdmin
        .from('product_sales')
        .delete()
        .eq('appointment_id', appointmentId)
      
      if (deleteError) {
        logger.error('❌ Error deleting products:', deleteError)
        throw new Error(deleteError.message)
      }
      
      logger.debug('✅ Products deleted')
      return {
        success: true,
        message: 'Products deleted successfully'
      }
    }
    
    if (action === 'save') {
      // Save products
      if (!productData || productData.length === 0) {
        logger.debug('ℹ️ No products to save')
        return {
          success: true,
          data: [],
          message: 'No products to save'
        }
      }
      
      logger.debug('💾 Saving products:', productData.length)
      
      // First delete existing products
      await supabaseAdmin
        .from('product_sales')
        .delete()
        .eq('appointment_id', appointmentId)
      
      // Then insert new ones
      const { data: saved, error: insertError } = await supabaseAdmin
        .from('product_sales')
        .insert(productData)
        .select()
      
      if (insertError) {
        logger.error('❌ Error saving products:', insertError)
        throw new Error(insertError.message)
      }
      
      logger.debug('✅ Products saved:', saved.length)
      return {
        success: true,
        data: saved,
        message: 'Products saved successfully'
      }
    }
    
    if (action === 'get') {
      // Get products
      logger.debug('📖 Getting products for appointment')
      
      const { data: products, error } = await supabaseAdmin
        .from('product_sales')
        .select(`
          *,
          products (
            id,
            name,
            description,
            unit,
            category
          )
        `)
        .eq('appointment_id', appointmentId)
      
      if (error) {
        logger.error('❌ Error fetching products:', error)
        throw new Error(error.message)
      }
      
      logger.debug('✅ Products fetched:', products.length)
      return {
        success: true,
        data: products || []
      }
    }
    
    throw new Error('Unknown action: ' + action)
    
  } catch (error: any) {
    logger.error('❌ Error in manage-products:', error)
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Failed to manage products'
    })
  }
})
