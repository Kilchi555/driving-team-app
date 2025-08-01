// composables/useProductManagement.ts
import { useProducts } from './useProducts'
import type { ProductItem } from './useProducts'

export const useProductManagement = () => {
  const { saveAppointmentProducts, loadAppointmentProducts } = useProducts()
  
  const saveToAppointment = async (appointmentId: string, products: ProductItem[]) => {
    if (products.length === 0) return []
    
    try {
      console.log('📚 Saving products to appointment:', appointmentId)
      const result = await saveAppointmentProducts(appointmentId, products)
      console.log('✅ Products saved successfully')
      return result
    } catch (error) {
      console.error('❌ Error saving products:', error)
      throw error
    }
  }
  
  const loadFromAppointment = async (appointmentId: string): Promise<ProductItem[]> => {
    try {
      console.log('📚 Loading products from appointment:', appointmentId)
      const products = await loadAppointmentProducts(appointmentId)
      console.log('✅ Products loaded:', products.length)
      return products
    } catch (error) {
      console.error('❌ Error loading products:', error)
      return []
    }
  }
  
  const calculateTotal = (products: ProductItem[]): number => {
    return products.reduce((sum, item) => sum + item.total_chf, 0)
  }
  
  return {
    saveToAppointment,
    loadFromAppointment,
    calculateTotal
  }
}