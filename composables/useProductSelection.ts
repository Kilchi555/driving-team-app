// composables/useProductSelection.ts - Mit Datenbank Integration
import { ref, computed, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'

// ✅ Interfaces basierend auf Ihrer DB-Struktur
interface Product {
  id: string
  name: string
  price_rappen: number
  description?: string
  category?: string
  is_active?: boolean
  stock_quantity?: number
  track_stock?: boolean
  image_url?: string
  display_order?: number
  created_at?: string
}

interface ProductItem {
  id?: string
  product_id: string
  quantity: number
  unit_price_rappen: number
  total_price_rappen: number
  product?: Product // Referenz zum vollständigen Produkt
}

interface AppointmentProduct {
  id?: string
  created_at?: string
  appointment_id?: string
  product_id: string
  quantity: number
  unit_price_rappen: number
  total_price_rappen: number
}

export const useProductSelection = (appointmentId?: string, initialProducts: ProductItem[] = []) => {
  const supabase = getSupabase()
  
  // State
  const showProductSelector = ref(false)
  const selectedProducts = ref<ProductItem[]>([...initialProducts])
  const availableProducts = ref<Product[]>([])
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)

  // ✅ Produkte aus Datenbank laden
  const loadProducts = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      console.log('🔄 Loading products from database...')
      
      const { data, error: dbError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price_rappen,
          description,
          category,
          is_active,
          stock_quantity,
          track_stock,
          image_url,
          display_order,
          created_at
        `)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      
      if (dbError) {
        throw dbError
      }
      
      availableProducts.value = data || []
      console.log('✅ Products loaded from DB:', availableProducts)

        } catch (err: any) {
      console.error('❌ Error loading products:', err)
      error.value = err.message
      
      // Fallback: Leeres Array
      availableProducts.value = []
    } finally {
      isLoading.value = false
    }
  }

  // ✅ Bestehende Produkte aus product_sales für einen Termin laden
  const loadAppointmentProducts = async (id: string) => {
    if (!id) return
    
    try {
      console.log('🔄 Loading products from product_sales for:', id)
      
      // Lade Produkte aus product_sales über product_sale_items
      const { data, error: dbError } = await supabase
        .from('product_sales')
        .select(`
          id,
          total_amount_rappen,
          product_sale_items (
            id,
            quantity,
            unit_price_rappen,
            total_price_rappen,
            products (
              id,
              name,
              description,
              category,
              image_url,
              price_rappen
            )
          )
        `)
        .eq('appointment_id', id)
      
      if (dbError) {
        throw dbError
      }
      
      // Sammle alle Produkte aus allen product_sales Einträgen
      const allProducts: any[] = []
      data?.forEach(sale => {
        if (sale.product_sale_items && sale.product_sale_items.length > 0) {
          sale.product_sale_items.forEach(item => {
            allProducts.push({
              id: item.id,
              product_id: item.products?.id,
              quantity: item.quantity,
              unit_price_rappen: item.unit_price_rappen,
              total_price_rappen: item.total_price_rappen,
              product: item.products ? {
                id: item.products.id,
                name: item.products.name,
                price_rappen: item.products.price_rappen,
                description: item.products.description,
                category: item.products.category,
                image_url: item.products.image_url
              } as Product : undefined
            })
          })
        }
      })
      
      // Konvertiere zu ProductItem Format
      selectedProducts.value = allProducts
      
      console.log('✅ Products loaded from product_sales:', selectedProducts.value.length)
      
    } catch (err: any) {
      console.error('❌ Error loading products from product_sales:', err)
      error.value = err.message
    }
  }

  // ✅ Produkte für einen Termin in product_sales speichern
  const saveAppointmentProducts = async (id: string) => {
    if (!id || selectedProducts.value.length === 0) return
    
    try {
      isSaving.value = true
      console.log('💾 Saving products to product_sales for:', id)
      
      // Verwende useProductSales Composable für konsistente Datenspeicherung
      const { createProductSale } = useProductSales()
      
      // Lade Termin-Daten für user_id und staff_id
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('user_id, staff_id')
        .eq('id', id)
        .single()
      
      if (appointmentError) throw appointmentError
      
      // Erstelle Produktverkauf
      const saleData = {
        appointment_id: id,
        user_id: appointment.user_id,
        staff_id: appointment.staff_id,
        items: selectedProducts.value.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price_rappen: item.unit_price_rappen,
          total_price_rappen: item.total_price_rappen
        })),
        total_amount_rappen: selectedProducts.value.reduce((sum, item) => sum + item.total_price_rappen, 0),
        discount_amount_rappen: 0,
        discount_type: undefined,
        discount_reason: undefined,
        payment_method: 'pending',
        status: 'pending'
      }
      
      const result = await createProductSale(saleData)
      
      if (result) {
        console.log('✅ Products saved to product_sales:', result.id)
      } else {
        throw new Error('Failed to create product sale')
      }
      
    } catch (err: any) {
      console.error('❌ Error saving products to product_sales:', err)
      error.value = err.message
      throw err
    } finally {
      isSaving.value = false
    }
  }

  // Computed
  const totalProductsValue = computed(() => 
    selectedProducts.value.reduce((sum, item) => sum + item.total_price_rappen, 0)
  )

  const totalProductsValueChf = computed(() => 
    (totalProductsValue.value / 100).toFixed(2)
  )

  const hasProducts = computed(() => selectedProducts.value.length > 0)

  // Methods
  const openProductSelector = () => {
    showProductSelector.value = true
  }

  const closeProductSelector = () => {
    showProductSelector.value = false
  }

  const addProduct = (product: Product) => {
    const existing = selectedProducts.value.find(item => item.product_id === product.id)
    
    if (existing) {
      existing.quantity += 1
      existing.total_price_rappen = existing.quantity * existing.unit_price_rappen
    } else {
      selectedProducts.value.push({
        product_id: product.id,
        quantity: 1,
        unit_price_rappen: product.price_rappen,
        total_price_rappen: product.price_rappen,
        product: product
      })
    }
    
    console.log('✅ Product added:', product.name)
  }

  const removeProduct = (productId: string) => {
    const index = selectedProducts.value.findIndex(item => item.product_id === productId)
    if (index > -1) {
      const product = selectedProducts.value[index]
      selectedProducts.value.splice(index, 1)
      console.log('🗑️ Product removed:', product.product?.name)
    }
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    const item = selectedProducts.value.find(item => item.product_id === productId)
    if (item && newQuantity > 0) {
      item.quantity = newQuantity
      item.total_price_rappen = item.quantity * item.unit_price_rappen
      console.log('📊 Quantity updated:', item.product?.name, 'x', newQuantity)
    } else if (item && newQuantity <= 0) {
      removeProduct(productId)
    }
  }

  const clearProducts = () => {
    selectedProducts.value = []
    console.log('🗑️ All products cleared')
  }

  const setProducts = (products: ProductItem[]) => {
    selectedProducts.value = [...products]
    console.log('📦 Products set:', products.length)
  }

  // Helper: CHF formatting
  const formatPriceChf = (rappen: number): string => {
    return `CHF ${(rappen / 100).toFixed(2)}`
  }

  // Lifecycle
  onMounted(() => {
    loadProducts()
    
    // Lade bestehende Produkte falls appointmentId vorhanden
    if (appointmentId) {
      loadAppointmentProducts(appointmentId)
    }
  })

  return {
    // State
    selectedProducts: computed(() => selectedProducts.value),
    availableProducts: computed(() => availableProducts.value),
    showProductSelector: computed(() => showProductSelector.value),
    isLoading: computed(() => isLoading.value),
    isSaving: computed(() => isSaving.value),
    error: computed(() => error.value),
    
    // Computed values
    totalProductsValue,
    totalProductsValueChf,
    hasProducts,
    
    // Methods
    loadProducts,
    loadAppointmentProducts,
    saveAppointmentProducts,
    openProductSelector,
    closeProductSelector,
    addProduct,
    removeProduct,
    updateQuantity,
    clearProducts,
    setProducts,
    formatPriceChf
  }
}