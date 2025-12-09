// composables/useProductManagement.ts
import { useProducts } from './useProducts'
import type { ProductItem } from './useProducts'

export const useProductManagement = () => {
  const { loadAppointmentProducts } = useProducts()
  
  // ✅ ENTFERNT: saveToAppointment - wird nicht mehr benötigt
  // Alle Produkte werden jetzt über product_sales gespeichert
  
  const loadFromAppointment = async (appointmentId: string): Promise<ProductItem[]> => {
    try {
      logger.debug('📚 Loading products from appointment:', appointmentId)
      const products = await loadAppointmentProducts(appointmentId)
      logger.debug('✅ Products loaded:', products.length)
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
    loadFromAppointment,
    calculateTotal
  }
}