// composables/useProducts.ts
import { ref, computed } from 'vue'
import { logger } from '~/utils/logger'

export interface Product {
  id: string
  name: string
  description?: string
  price_rappen: number
  price_chf: number // computed
  category: string
  is_active: boolean
  display_order: number
  image_url?: string
  stock_quantity?: number
  track_stock: boolean
  min_amount_rappen?: number
  max_amount_rappen?: number
  allow_custom_amount?: boolean
}

export interface ProductItem {
  product: Product
  quantity: number
  total_rappen: number
  total_chf: number // computed
}

export const useProducts = () => {
  const products = ref<Product[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const activeProducts = computed(() => 
    products.value.filter(p => p.is_active).sort((a, b) => a.display_order - b.display_order)
  )

  const productsByCategory = computed(() => {
    const grouped: Record<string, Product[]> = {}
    activeProducts.value.forEach(product => {
      if (!grouped[product.category]) {
        grouped[product.category] = []
      }
      grouped[product.category].push(product)
    })
    return grouped
  })

  // Methods
  const loadProducts = async () => {
    isLoading.value = true
    error.value = null

    try {
      logger.debug('🔄 Loading products via secure API...')
      
      // Use secure API to get products
      const response = await $fetch('/api/products/list', {
        method: 'GET'
      }) as any

      if (!response?.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response from products API')
      }

      // Convert price from rappen to CHF and add computed properties
      products.value = (response.data || []).map((product: any) => ({
        ...product,
        price_chf: product.price_rappen / 100
      }))

      logger.debug('✅ Products loaded via API:', products.value.length)
    } catch (err: any) {
      console.error('❌ Error loading products:', err)
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  const getProductById = (id: string): Product | undefined => {
    return products.value.find(p => p.id === id)
  }

  const calculateProductTotal = (product: Product, quantity: number): ProductItem => {
    const total_rappen = product.price_rappen * quantity
    return {
      product,
      quantity,
      total_rappen,
      total_chf: total_rappen / 100
    }
  }

  // ✅ ENTFERNT: saveAppointmentProducts - wird nicht mehr benötigt
  // Alle Produkte werden jetzt über product_sales gespeichert

  // Load products for an appointment from product_sales
  const loadAppointmentProducts = async (appointmentId: string): Promise<ProductItem[]> => {
    try {
      const response = await $fetch('/api/products/get-appointment-products', {
        method: 'GET',
        query: { appointment_id: appointmentId }
      }) as any

      if (!response?.data || !Array.isArray(response.data)) {
        return []
      }

      // Convert prices to CHF
      const allProducts = response.data.map((item: any) => ({
        product: {
          ...item.product,
          price_chf: item.product.price_rappen / 100
        },
        quantity: item.quantity,
        total_rappen: item.total_rappen,
        total_chf: item.total_rappen / 100
      }))

      logger.debug('✅ Products loaded from API:', allProducts.length)
      return allProducts
    } catch (err: any) {
      console.error('❌ Error loading products from API:', err)
      return []
    }
  }

  return {
    // State
    products,
    isLoading,
    error,
    
    // Computed
    activeProducts,
    productsByCategory,
    
    // Methods
    loadProducts,
    getProductById,
    calculateProductTotal,
    loadAppointmentProducts
  }
}