// composables/useProducts.ts
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

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
      const supabase = getSupabase()
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
        .order('name')

      if (fetchError) throw fetchError

      // Convert price from rappen to CHF and add computed properties
      products.value = (data || []).map(product => ({
        ...product,
        price_chf: product.price_rappen / 100
      }))

      console.log('✅ Products loaded:', products.value.length)
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

  // Save products to appointment
  const saveAppointmentProducts = async (appointmentId: string, productItems: ProductItem[]) => {
    if (productItems.length === 0) return []

    try {
      const supabase = getSupabase()
      
      // Prepare data for insertion
      const appointmentProducts = productItems.map(item => ({
        appointment_id: appointmentId,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price_rappen: item.product.price_rappen,
        total_price_rappen: item.total_rappen
      }))

      const { data, error } = await supabase
        .from('appointment_products')
        .insert(appointmentProducts)
        .select(`
          *,
          product:product_id(*)
        `)

      if (error) throw error

      console.log('✅ Appointment products saved:', data?.length)
      return data || []
    } catch (err: any) {
      console.error('❌ Error saving appointment products:', err)
      throw err
    }
  }

  // Load products for an appointment
  const loadAppointmentProducts = async (appointmentId: string): Promise<ProductItem[]> => {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('appointment_products')
        .select(`
          *,
          product:product_id(*)
        `)
        .eq('appointment_id', appointmentId)

      if (error) throw error

      // Convert to ProductItem format
      const productItems: ProductItem[] = (data || []).map(item => ({
        product: {
          ...item.product,
          price_chf: item.product.price_rappen / 100
        },
        quantity: item.quantity,
        total_rappen: item.total_price_rappen,
        total_chf: item.total_price_rappen / 100
      }))

      console.log('✅ Appointment products loaded:', productItems.length)
      return productItems
    } catch (err: any) {
      console.error('❌ Error loading appointment products:', err)
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
    saveAppointmentProducts,
    loadAppointmentProducts
  }
}