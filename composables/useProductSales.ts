// composables/useProductSales.ts
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

interface ProductSale {
  id: string
  appointment_id?: string
  user_id: string
  staff_id: string
  created_at: string
  total_amount_rappen: number
  discount_amount_rappen: number
  discount_type: 'fixed' | 'percentage'
  discount_reason?: string
  payment_method?: string
  status: 'pending' | 'paid' | 'cancelled'
}

interface ProductSaleItem {
  id: string
  product_sale_id: string
  product_id: string
  quantity: number
  unit_price_rappen: number
  total_price_rappen: number
  created_at: string
  product?: {
    id: string
    name: string
    description?: string
    price_rappen: number
  }
}

interface CreateProductSaleData {
  appointment_id?: string
  user_id: string
  staff_id: string
  items: Array<{
    product_id: string
    quantity: number
    unit_price_rappen: number
    total_price_rappen: number
  }>
  discount_amount_rappen?: number
  discount_type?: 'fixed' | 'percentage'
  discount_reason?: string
  payment_method?: string
}

export const useProductSales = () => {
  const supabase = getSupabase()
  
  // State
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ✅ Produktverkauf erstellen (mit oder ohne Termin)
  const createProductSale = async (data: CreateProductSaleData): Promise<ProductSale | null> => {
    try {
      isLoading.value = true
      error.value = null
      
      logger.debug('💾 Creating product sale:', data)
      
      // Berechne Gesamtbetrag
      const totalAmount = data.items && data.items.length > 0 
        ? data.items.reduce((sum, item) => sum + item.total_price_rappen, 0)
        : 0
      const finalAmount = totalAmount - (data.discount_amount_rappen || 0)
      
      // 1. Produktverkauf erstellen
      const { data: saleData, error: saleError } = await supabase
        .from('product_sales')
        .insert({
          appointment_id: data.appointment_id || null,
          user_id: data.user_id,
          staff_id: data.staff_id,
          total_amount_rappen: finalAmount,
          discount_amount_rappen: data.discount_amount_rappen || 0,
          discount_type: data.discount_type || 'fixed',
          discount_reason: data.discount_reason || null,
          payment_method: data.payment_method || null
        })
        .select()
        .single()
      
      if (saleError) throw saleError
      
      logger.debug('✅ Product sale created:', saleData.id)
      
      // 2. Produktverkauf-Items erstellen (nur wenn Produkte vorhanden sind)
      if (data.items && data.items.length > 0) {
        const saleItems = data.items.map(item => ({
          product_sale_id: saleData.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price_rappen: item.unit_price_rappen,
          total_price_rappen: item.total_price_rappen
        }))
        
        const { error: itemsError } = await supabase
          .from('product_sale_items')
          .insert(saleItems)
        
        if (itemsError) throw itemsError
        
        logger.debug('✅ Product sale items created:', saleItems.length)
      } else {
        logger.debug('ℹ️ No products to save in product_sale_items (discount-only sale)')
      }
      
      return saleData
      
    } catch (err: any) {
      console.error('❌ Error creating product sale:', err)
      error.value = err.message
      return null
    } finally {
      isLoading.value = false
    }
  }

  // ✅ Produktverkauf für einen Termin laden
  const loadProductSaleForAppointment = async (appointmentId: string): Promise<ProductSale | null> => {
    try {
      logger.debug('📦 Loading product sale for appointment:', appointmentId)
      
      const { data, error: dbError } = await supabase
        .from('product_sales')
        .select(`
          *,
          product_sale_items (
            *,
            products (
              id,
              name,
              description,
              price_rappen
            )
          )
        `)
        .eq('appointment_id', appointmentId)
        .single()
      
      if (dbError) {
        if (dbError.code === 'PGRST116') {
          // Kein Produktverkauf gefunden
          logger.debug('📦 No product sale found for appointment')
          return null
        }
        throw dbError
      }
      
      logger.debug('✅ Product sale loaded:', data)
      return data
      
    } catch (err: any) {
      console.error('❌ Error loading product sale:', err)
      error.value = err.message
      return null
    }
  }

  // ✅ Produktverkauf aktualisieren
  const updateProductSale = async (saleId: string, data: Partial<ProductSale>): Promise<boolean> => {
    try {
      logger.debug('💾 Updating product sale:', saleId, data)
      
      const { error } = await supabase
        .from('product_sales')
        .update(data)
        .eq('id', saleId)
      
      if (error) throw error
      
      logger.debug('✅ Product sale updated')
      return true
      
    } catch (err: any) {
      console.error('❌ Error updating product sale:', err)
      error.value = err.message
      return false
    }
  }

  // ✅ Produktverkauf löschen
  const deleteProductSale = async (saleId: string): Promise<boolean> => {
    try {
      logger.debug('🗑️ Deleting product sale:', saleId)
      
      const { error } = await supabase
        .from('product_sales')
        .delete()
        .eq('id', saleId)
      
      if (error) throw error
      
      logger.debug('✅ Product sale deleted')
      return true
      
    } catch (err: any) {
      console.error('❌ Error deleting product sale:', err)
      error.value = err.message
      return false
    }
  }

  // ✅ Alle Produktverkäufe für einen User laden
  const loadProductSalesForUser = async (userId: string): Promise<ProductSale[]> => {
    try {
      logger.debug('📦 Loading product sales for user:', userId)
      
      const { data, error } = await supabase
        .from('product_sales')
        .select(`
          *,
          product_sale_items (
            *,
            products (
              id,
              name,
              description,
              price_rappen
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      logger.debug('✅ Product sales loaded:', data?.length || 0)
      return data || []
      
    } catch (err: any) {
      console.error('❌ Error loading product sales:', err)
      error.value = err.message
      return []
    }
  }

  // ✅ Alle Produktverkäufe für einen Staff laden
  const loadProductSalesForStaff = async (staffId: string): Promise<ProductSale[]> => {
    try {
      logger.debug('📦 Loading product sales for staff:', staffId)
      
      const { data, error } = await supabase
        .from('product_sales')
        .select(`
          *,
          product_sale_items (
            *,
            products (
              id,
              name,
              description,
              price_rappen
            )
          )
        `)
        .eq('staff_id', staffId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      logger.debug('✅ Product sales loaded:', data?.length || 0)
      return data || []
      
    } catch (err: any) {
      console.error('❌ Error loading product sales:', err)
      error.value = err.message
      return []
    }
  }

  return {
    isLoading,
    error,
    createProductSale,
    loadProductSaleForAppointment,
    updateProductSale,
    deleteProductSale,
    loadProductSalesForUser,
    loadProductSalesForStaff
  }
}
