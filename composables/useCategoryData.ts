// composables/useCategoryData.ts - Mit Supabase Database

import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

interface Category {
  id: number
  created_at: string
  name: string
  description?: string
  code: string
  price_per_lesson: number
  price_unit: string
  lesson_duration: number
  color?: string
  is_active: boolean
  display_order: number
}

// Global shared state
const allCategories = ref<Category[]>([])
const isLoading = ref(false)
const isLoaded = ref(false)

export const useCategoryData = () => {
  const supabase = getSupabase()

  // Fallback data wenn DB nicht verfügbar
  const fallbackCategories: Record<string, Partial<Category>> = {
    'B': { name: 'Autoprüfung Kategorie B', price_per_lesson: 95, color: 'hellgrün' },
    'A1': { name: 'Motorrad A1/A35kW/A', price_per_lesson: 95, color: 'hellgrün' },
    'BE': { name: 'Anhänger BE', price_per_lesson: 120, color: 'orange' },
    'C1': { name: 'LKW C1/D1', price_per_lesson: 150, color: 'gelb' },
    'C': { name: 'LKW C', price_per_lesson: 170, color: 'rot' },
    'CE': { name: 'LKW CE', price_per_lesson: 200, color: 'violett' },
    'D': { name: 'Bus D', price_per_lesson: 200, color: 'türkis' },
    'Motorboot': { name: 'Motorboot', price_per_lesson: 95, color: 'hellblau' },
    'BPT': { name: 'Berufsprüfung Transport', price_per_lesson: 100, color: 'dunkelblau' }
  }

  // Admin Fees aus den Projektunterlagen
  const adminFees: Record<string, number> = {
    'B': 120, 'A1': 0, 'A35kW': 0, 'A': 0, 'BE': 120,
    'C1': 200, 'D1': 200, 'C': 200, 'CE': 250, 'D': 300,
    'Motorboot': 120, 'BPT': 120
  }

  // Kategorien aus Datenbank laden
  const loadCategories = async () => {
    if (isLoaded.value || isLoading.value) return
    
    isLoading.value = true
    
    try {
      console.log('🔄 Loading categories from database...')
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error

      allCategories.value = data || []
      isLoaded.value = true
      
      console.log('✅ Categories loaded:', data?.length)
      
    } catch (err: any) {
      console.error('❌ Error loading categories:', err)
      // Bei Fehler: Fallback verwenden
      allCategories.value = []
    } finally {
      isLoading.value = false
    }
  }

  // Category by code finden
  const getCategoryByCode = (code: string): Category | null => {
    if (!code) return null
    
    // Aus geladenen Kategorien suchen
    const dbCategory = allCategories.value.find(cat => cat.code === code)
    if (dbCategory) return dbCategory
    
    // Fallback auf statische Daten
    const fallback = fallbackCategories[code]
    if (fallback) {
      return {
        id: 0,
        code,
        name: fallback.name || code,
        price_per_lesson: fallback.price_per_lesson || 95,
        lesson_duration: 45,
        color: fallback.color || 'grau',
        is_active: true,
        display_order: 0,
        price_unit: 'per_lesson',
        created_at: new Date().toISOString()
      } as Category
    }
    
    return null
  }

  // Helper Funktionen
  const getCategoryName = (code: string): string => {
    const category = getCategoryByCode(code)
    return category?.name || code || 'Unbekannte Kategorie'
  }

  const getCategoryPrice = (code: string): number => {
    const category = getCategoryByCode(code)
    return category?.price_per_lesson || 95
  }

  const getCategoryColor = (code: string): string => {
    const category = getCategoryByCode(code)
    return category?.color || 'grau'
  }

  const getAdminFee = (code: string): number => {
    return adminFees[code] || 120
  }

  const getCategoryIcon = (code: string): string => {
    const icons: Record<string, string> = {
      'B': '🚗', 'A1': '🏍️', 'A35kW': '🏍️', 'A': '🏍️',
      'BE': '🚛', 'C1': '🚚', 'D1': '🚌', 'C': '🚚',
      'CE': '🚛', 'D': '🚌', 'Motorboot': '🛥️', 'BPT': '📋'
    }
    return icons[code] || '🚗'
  }

  // Computed properties
  const categoriesLoaded = computed(() => isLoaded.value)
  const categoriesLoading = computed(() => isLoading.value)

  return {
    // State
    allCategories: computed(() => allCategories.value),
    categoriesLoaded,
    categoriesLoading,

    // Methods
    loadCategories,
    getCategoryByCode,
    getCategoryName,
    getCategoryPrice,
    getCategoryColor,
    getCategoryIcon,
    getAdminFee
  }
}