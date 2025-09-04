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

// ✅ KORRIGIERTE loadProducts Funktion (lädt aus beiden Systemen)
const loadProducts = async (appointmentId: string) => {
  if (!appointmentId) return

  try {
    const supabase = getSupabase()
    
    // ✅ NEU: Lade Produkte nur noch aus product_sales (neues System)
    const { loadProductSaleForAppointment } = useProductSales()
    const productSale = await loadProductSaleForAppointment(appointmentId)
    
    if (productSale && productSale.product_sale_items) {
      // Convert to selectedProducts format
      selectedProducts.value = productSale.product_sale_items.map((item: any) => ({
        product: {
          id: item.products.id,
          name: item.products.name,
          price: item.products.price_rappen / 100,
          description: item.products.description
        },
        quantity: item.quantity,
        total: item.total_price_rappen / 100
      }))

      console.log('✅ Products loaded from product_sales:', selectedProducts.value.length)
    } else {
      console.log('📦 No products found in product_sales')
      selectedProducts.value = []
    }
    
  } catch (err: any) {
    console.error('❌ Error loading products:', err)
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
    
    // ✅ NEU: Produktkatalog nach Auswahl automatisch schließen
    showProductSelector.value = false
    console.log('✅ Product selector closed automatically after selection')
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

// ✅ ENTFERNT: saveAppointmentProducts - wird nicht mehr benötigt
// Alle Produkte werden jetzt über saveToProductSales in product_sales gespeichert

// ✅ NEUE FUNKTION: Produkte in product_sales kopieren
const saveToProductSales = async (appointmentId: string) => {
  if (!appointmentId || selectedProducts.value.length === 0) {
    console.log('❌ No appointmentId or products to copy')
    return
  }

  try {
    // ✅ NEUE LOGIK: Verwende product_sales statt appointment_products
    const { createProductSale } = useProductSales()
    
    // Erstelle Produktverkauf
    const saleData = {
      appointment_id: appointmentId,
      user_id: '', // Wird aus dem Termin geladen
      staff_id: '', // Wird aus dem Termin geladen
      items: selectedProducts.value.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price_rappen: Math.round(item.product.price * 100),
        total_price_rappen: Math.round(item.total * 100)
      }))
    }
    
    // Lade Termin-Daten für user_id und staff_id
    const supabase = getSupabase()
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('user_id, staff_id')
      .eq('id', appointmentId)
      .is('deleted_at', null) // ✅ Soft Delete Filter
      .single()
    
    if (appointmentError) throw appointmentError
    
    saleData.user_id = appointment.user_id
    saleData.staff_id = appointment.staff_id
    
    // Erstelle Produktverkauf
    const result = await createProductSale(saleData)
    
    if (result) {
      console.log('✅ Product sale created successfully:', result.id)
    } else {
      throw new Error('Failed to create product sale')
    }
    
  } catch (err: any) {
    console.error('❌ Error saving products to product_sales:', err)
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
    saveToProductSales,
    loadProducts
  }
}