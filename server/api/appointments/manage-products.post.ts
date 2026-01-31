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
    const authorization = getHeader(event, 'authorization')
    const token = authorization?.replace('Bearer ', '')
    
    if (!token) {
      throw new Error('No authorization token')
    }
    
    // Get current user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }
    
    // Verify user can access this appointment
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select('id, staff_id')
      .eq('id', appointmentId)
      .single()
    
    if (appointmentError || !appointment) {
      throw new Error('Appointment not found')
    }
    
    if (appointment.staff_id !== user.id) {
      throw new Error('Unauthorized to manage products for this appointment')
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
