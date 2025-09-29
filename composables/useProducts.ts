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
      const supabase = getSupabase()
      
      // Get current user's tenant_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()
      
      if (userError) throw userError
      if (!userData?.tenant_id) throw new Error('User has no tenant assigned')

      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('tenant_id', userData.tenant_id) // Filter by tenant
        .order('display_order')
        .order('name')

      if (fetchError) throw fetchError

      // Convert price from rappen to CHF and add computed properties
      products.value = (data || []).map(product => ({
        ...product,
        price_chf: product.price_rappen / 100
      }))

      console.log('✅ Products loaded for tenant:', userData.tenant_id, products.value.length)
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
      const supabase = getSupabase()
      
      // Get current user's tenant_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()
      
      if (userError) throw userError
      if (!userData?.tenant_id) throw new Error('User has no tenant assigned')
      
      const { data, error } = await supabase
        .from('product_sales')
        .select(`
          id,
          product_sale_items (
            id,
            quantity,
            unit_price_rappen,
            total_price_rappen,
            products (
              id,
              name,
              price_rappen,
              description,
              category,
              image_url
            )
          )
        `)
        .eq('appointment_id', appointmentId)
        .eq('tenant_id', userData.tenant_id)

      if (error) throw error

      // Sammle alle Produkte aus allen product_sales Einträgen
      const allProducts: any[] = []
      data?.forEach(sale => {
        if (sale.product_sale_items && sale.product_sale_items.length > 0) {
          sale.product_sale_items.forEach(item => {
            allProducts.push({
              product: {
                ...item.products,
                price_chf: item.products.price_rappen / 100
              },
              quantity: item.quantity,
              total_rappen: item.total_price_rappen,
              total_chf: item.total_price_rappen / 100
            })
          })
        }
      })

      console.log('✅ Products loaded from product_sales:', allProducts.length)
      return allProducts
    } catch (err: any) {
      console.error('❌ Error loading products from product_sales:', err)
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