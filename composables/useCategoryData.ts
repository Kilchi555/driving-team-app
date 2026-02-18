// composables/useCategoryData.ts - Mit Supabase Database

import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'
import { toLocalTimeString } from '~/utils/dateUtils'
import { logger } from '~/utils/logger'

interface Category {
  id: number
  created_at: string
  name: string
  description?: string
  code: string
  color?: string
  is_active: boolean
  exam_duration_minutes?: number
  lesson_duration_minutes?: number[]
  theory_durations?: number[]
  parent_category_id?: string | null // <<< NEU
}

// Global shared state
const allCategories = ref<Category[]>([])
const isLoading = ref(false)
const isLoaded = ref(false)

export const useCategoryData = () => {
  const supabase = getSupabase()

  // Fallback data wenn DB nicht verfügbar
  const fallbackCategories: Record<string, Partial<Category>> = {
    'B': { name: 'Autoprüfung Kategorie B', color: '#10b981', lesson_duration_minutes: [45, 90], exam_duration_minutes: 60 },
    'A1': { name: 'Motorrad A1/A35kW/A', color: '#10b981', lesson_duration_minutes: [45, 90], exam_duration_minutes: 60 },
    'BE': { name: 'Anhänger BE', color: '#f97316', lesson_duration_minutes: [45, 90], exam_duration_minutes: 60 },
    'C1': { name: 'LKW C1/D1', color: '#eab308', lesson_duration_minutes: [135], exam_duration_minutes: 90 },
    'C': { name: 'LKW C', color: '#dc2626', lesson_duration_minutes: [135], exam_duration_minutes: 90 },
    'CE': { name: 'LKW CE', color: '#8b5cf6', lesson_duration_minutes: [135], exam_duration_minutes: 90 },
    'D': { name: 'Bus D', color: '#06b6d4', lesson_duration_minutes: [135], exam_duration_minutes: 90 },
    'Motorboot': { name: 'Motorboot', color: '#3b82f6', lesson_duration_minutes: [45, 90], exam_duration_minutes: 60 },
    'BPT': { name: 'Berufsprüfung Transport', color: '#1e40af', lesson_duration_minutes: [45, 90], exam_duration_minutes: 60 }
  }



  // Kategorien aus Datenbank laden
  const loadCategories = async () => {
    if (isLoaded.value || isLoading.value) return
    
    isLoading.value = true
    
    try {
      logger.debug('🔄 Loading categories from database...')
      
      // Get tenant_id from auth store
      const authStore = useAuthStore()
      const tenantId = authStore.userProfile?.tenant_id
      if (!tenantId) {
        throw new Error('User has no tenant assigned')
      }

      // Get tenant business_type
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('business_type')
        .eq('id', tenantId)
        .single()

      if (tenantError) throw tenantError
      
      // Only load categories if business_type is driving_school
      if (tenantData?.business_type !== 'driving_school') {
        logger.debug('🚫 Categories not available for business_type:', tenantData?.business_type)
        allCategories.value = []
        isLoaded.value = true
        return
      }
      
      const { data, error } = await supabase
      .from('categories')
      .select('id, created_at, name, description, code, color, is_active, exam_duration_minutes, lesson_duration_minutes, theory_durations, parent_category_id') // <<< parent_category_id hinzugefügt
      .eq('is_active', true)
        .eq('tenant_id', tenantId)
        .order('code', { ascending: true })

      if (error) throw error

      // ✅ CONVERT STRING VALUES TO NUMBERS
      const processedData = (data || []).map(cat => ({
        ...cat,
        // Convert lesson_duration_minutes from string array to number array
        lesson_duration_minutes: Array.isArray(cat.lesson_duration_minutes) 
          ? cat.lesson_duration_minutes.map((d: any) => {
              const num = parseInt(d.toString(), 10)
              return isNaN(num) ? 45 : num
            })
          : cat.lesson_duration_minutes ? [parseInt(cat.lesson_duration_minutes.toString(), 10)] : [45],
        
        // Convert theory_durations from string array to number array  
        theory_durations: Array.isArray(cat.theory_durations)
          ? cat.theory_durations.map((d: any) => {
              const num = parseInt(d.toString(), 10)
              return isNaN(num) ? 45 : num
            })
          : cat.theory_durations ? [parseInt(cat.theory_durations.toString(), 10)] : [],
        
        // Convert exam_duration_minutes from string to number
        exam_duration_minutes: cat.exam_duration_minutes 
          ? parseInt(cat.exam_duration_minutes.toString(), 10) 
          : 135
      }))

      allCategories.value = processedData
      isLoaded.value = true
      
      logger.debug('✅ Categories loaded and processed:', processedData.length)
      
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
        color: fallback.color || 'grau',
        is_active: true,
        created_at: toLocalTimeString(new Date),
        lesson_duration_minutes: fallback.lesson_duration_minutes || [45],
        exam_duration_minutes: fallback.exam_duration_minutes || 60,
        theory_durations: fallback.theory_durations || [45]
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
    // ✅ Standard-Preis für alle Kategorien (wird jetzt dynamisch berechnet)
    return 95
  }

  const getCategoryColor = (code: string): string => {
    const category = getCategoryByCode(code)
    return category?.color || 'grau'
  }

  const getAdminFee = (code: string): number => {
    // ✅ Standard-Admin-Fee für alle Kategorien (wird jetzt dynamisch berechnet)
    return 120
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