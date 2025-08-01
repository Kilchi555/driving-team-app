// composables/useProductSale.ts - NEUE DATEI ERSTELLEN

import { ref, computed, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'

interface SimpleProduct {
  id: string
  name: string
  price: number
  description?: string
}

interface ProductItem {
  product: SimpleProduct
  quantity: number
  total: number
}

export const useProductSale = (appointmentId?: any, initialProducts: ProductItem[] = []) => {
  const supabase = getSupabase()
  
  // State
  const selectedProducts = ref<ProductItem[]>([...initialProducts])
  const availableProducts = ref<SimpleProduct[]>([])
  const showProductSelector = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const hasProducts = computed(() => selectedProducts.value.length > 0)
const totalProductsValue = computed(() => 
  selectedProducts.value.reduce((sum, item) => sum + item.total, 0)
)
selectedProducts.value.reduce((sum, item) => sum + item.total, 0)
  

  // Methods

const openProductSelector = () => {
  showProductSelector.value = true
  
  // ✅ FIX: loadProducts ohne Parameter aufrufen (lädt verfügbare Produkte)
  if (availableProducts.value.length === 0) {
    loadAvailableProducts() // Neue Funktion für verfügbare Produkte
  }
}

// ✅ NEUE FUNKTION: Verfügbare Produkte laden (ohne appointmentId)
const loadAvailableProducts = async () => {
  try {
    isLoading.value = true
    const supabase = getSupabase()
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
    
    if (error) throw error
    
    // Convert to SimpleProduct format
    availableProducts.value = (data || []).map(product => ({
      id: product.id,
      name: product.name,
      price: product.price_rappen / 100, // Convert to CHF
      description: product.description
    }))
    
    console.log('✅ Available products loaded:', availableProducts.value.length)
    
  } catch (err) {
    console.error('❌ Error loading available products:', err)
  } finally {
    isLoading.value = false
  }
}

// ✅ KORRIGIERTE loadProducts Funktion (für Appointment-spezifische Produkte)
const loadProducts = async (appointmentId: string) => {
  if (!appointmentId) return

  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('appointment_products')
      .select(`
        *,
        products!inner(id, name, price_rappen, description)
      `)
      .eq('appointment_id', appointmentId)

    if (error) throw error

    // Convert to selectedProducts format
    selectedProducts.value = (data || []).map(item => ({
      product: {
        id: item.products.id,
        name: item.products.name,
        price: item.products.price_rappen / 100,
        description: item.products.description
      },
      quantity: item.quantity,
      total: item.total_price_rappen / 100
    }))

    console.log('✅ Appointment products loaded:', selectedProducts.value.length)
    
  } catch (err: any) {
    console.error('❌ Error loading appointment products:', err)
  }
}

  const addProduct = (product: SimpleProduct) => {
    const existing = selectedProducts.value.find(item => item.product.id === product.id)
    
    if (existing) {
      existing.quantity += 1
      existing.total = existing.quantity * existing.product.price
    } else {
      selectedProducts.value.push({
        product,
        quantity: 1,
        total: product.price
      })
    }
    
    console.log('📦 Product added:', product.name)
  }

  const removeProduct = (productId: string) => {
    const index = selectedProducts.value.findIndex(item => item.product.id === productId)
    if (index > -1) {
      selectedProducts.value.splice(index, 1)
      console.log('🗑️ Product removed')
    }
  }

  const closeProductSelector = () => {
    showProductSelector.value = false
  }

const saveAppointmentProducts = async (appointmentId: string) => {
  if (!appointmentId || selectedProducts.value.length === 0) {
    console.log('❌ No appointmentId or products to save')
    return
  }

  try {
    const supabase = getSupabase()
    
    // Zuerst bestehende Produkte löschen
    const { error: deleteError } = await supabase
      .from('appointment_products')
      .delete()
      .eq('appointment_id', appointmentId)
    
    if (deleteError) throw deleteError

    // Neue Produkte einfügen
    const appointmentProducts = selectedProducts.value.map(item => ({
      appointment_id: appointmentId,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price_rappen: Math.round(item.product.price * 100),
      total_price_rappen: Math.round(item.total * 100),
      is_paid: false
    }))

    const { error: insertError } = await supabase
      .from('appointment_products')
      .insert(appointmentProducts)

    if (insertError) throw insertError

    console.log('✅ Products saved successfully:', appointmentProducts.length)
    
  } catch (err: any) {
    console.error('❌ Error saving products:', err)
    throw err
  }
}

  // Load products on mount if appointmentId exists
  onMounted(() => {
    if (appointmentId?.value) {
      // Load existing appointment products here if needed
    }
  })

  return {
    selectedProducts,
    availableProducts,
    showProductSelector,
    isLoading,
    error,
    hasProducts,
    totalProductsValue,
    addProduct,
    removeProduct,
    openProductSelector,
    closeProductSelector,
    saveAppointmentProducts,
    loadProducts
  }
}