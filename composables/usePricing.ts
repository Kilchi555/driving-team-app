// composables/usePricing.ts

import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Types
interface PricingRule {
  id: string
  category_code: string
  price_per_minute_rappen: number
  admin_fee_rappen: number
  admin_fee_applies_from: number
  base_duration_minutes: number
  is_active: boolean
  valid_from: string | null
  valid_until: string | null
  rule_name: string
}

interface CalculatedPrice {
  base_price_rappen: number
  admin_fee_rappen: number
  total_rappen: number
  base_price_chf: string
  admin_fee_chf: string
  total_chf: string
  category_code: string
  duration_minutes: number
  appointment_number: number
}

export const usePricing = () => {
  const supabase = getSupabase()
  
  // State
  const pricingRules = ref<PricingRule[]>([])
  const isLoadingPrices = ref(false)
  const pricingError = ref<string>('')
  const lastLoaded = ref<Date | null>(null)
  
  // Cache für 5 Minuten
  const CACHE_DURATION = 5 * 60 * 1000 // 5 Minuten

  // Load pricing rules from database
  const loadPricingRules = async (forceReload = false): Promise<void> => {
    // Prüfe Cache
    if (!forceReload && lastLoaded.value && 
        (Date.now() - lastLoaded.value.getTime()) < CACHE_DURATION) {
      return // Cache noch gültig
    }

    isLoadingPrices.value = true
    pricingError.value = ''

    try {
      console.log('🔄 Loading pricing rules from database...')

      const { data, error } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('rule_type', 'category_pricing')
        .eq('is_active', true)
        .order('category_code')

      if (error) {
        console.error('❌ Database error:', error)
        throw new Error(`Database error: ${error.message}`)
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No pricing rules found, using fallback')
        await createFallbackPricingRules()
        return
      }

      // Filter nur gültige Regeln (Datumsbereich)
      const today = new Date().toISOString().split('T')[0]
      const validRules = data.filter(rule => {
        const validFrom = rule.valid_from || '1900-01-01'
        const validUntil = rule.valid_until || '2099-12-31'
        return today >= validFrom && today <= validUntil
      })

      pricingRules.value = validRules
      lastLoaded.value = new Date()

      console.log('✅ Pricing rules loaded:', validRules.length, 'rules')
      console.log('📊 Categories:', validRules.map(r => r.category_code))

    } catch (err: any) {
      console.error('❌ Error loading pricing rules:', err)
      pricingError.value = err.message || 'Fehler beim Laden der Preisregeln'
      
      // Fallback auf hard-coded Werte bei Fehler
      await createFallbackPricingRules()
    } finally {
      isLoadingPrices.value = false
    }
  }

  // Fallback: Hard-coded Werte in Memory laden
  const createFallbackPricingRules = async (): Promise<void> => {
    console.log('🔄 Using fallback pricing rules...')
    
    const fallbackRules: PricingRule[] = [
      { id: 'fallback-B', category_code: 'B', price_per_minute_rappen: 211, admin_fee_rappen: 12000, admin_fee_applies_from: 2, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback B' },
      { id: 'fallback-A1', category_code: 'A1', price_per_minute_rappen: 211, admin_fee_rappen: 0, admin_fee_applies_from: 999, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback A1' },
      { id: 'fallback-A35kW', category_code: 'A35kW', price_per_minute_rappen: 211, admin_fee_rappen: 0, admin_fee_applies_from: 999, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback A35kW' },
      { id: 'fallback-A', category_code: 'A', price_per_minute_rappen: 211, admin_fee_rappen: 0, admin_fee_applies_from: 999, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback A' },
      { id: 'fallback-BE', category_code: 'BE', price_per_minute_rappen: 267, admin_fee_rappen: 12000, admin_fee_applies_from: 2, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback BE' },
      { id: 'fallback-C1', category_code: 'C1', price_per_minute_rappen: 333, admin_fee_rappen: 20000, admin_fee_applies_from: 2, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback C1' },
      { id: 'fallback-D1', category_code: 'D1', price_per_minute_rappen: 333, admin_fee_rappen: 20000, admin_fee_applies_from: 2, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback D1' },
      { id: 'fallback-C', category_code: 'C', price_per_minute_rappen: 378, admin_fee_rappen: 20000, admin_fee_applies_from: 2, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback C' },
      { id: 'fallback-CE', category_code: 'CE', price_per_minute_rappen: 444, admin_fee_rappen: 25000, admin_fee_applies_from: 2, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback CE' },
      { id: 'fallback-D', category_code: 'D', price_per_minute_rappen: 444, admin_fee_rappen: 30000, admin_fee_applies_from: 2, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback D' },
      { id: 'fallback-Motorboot', category_code: 'Motorboot', price_per_minute_rappen: 211, admin_fee_rappen: 12000, admin_fee_applies_from: 2, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback Motorboot' },
      { id: 'fallback-BPT', category_code: 'BPT', price_per_minute_rappen: 222, admin_fee_rappen: 12000, admin_fee_applies_from: 2, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback BPT' }
    ]
    
    pricingRules.value = fallbackRules
    lastLoaded.value = new Date()
    console.log('✅ Fallback pricing rules loaded')
  }

  // Get pricing rule for specific category
  const getPricingRule = (categoryCode: string): PricingRule | null => {
    const rule = pricingRules.value.find(rule => rule.category_code === categoryCode)
    if (!rule) {
      console.warn(`⚠️ No pricing rule found for category: ${categoryCode}`)
      return null
    }
    return rule
  }

  // Get appointment count for user
  const getAppointmentCount = async (userId: string): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['completed', 'confirmed'])

      if (error) {
        console.error('❌ Error counting appointments:', error)
        return 1
      }

      return (count || 0) + 1
    } catch (error) {
      console.error('❌ Error in getAppointmentCount:', error)
      return 1
    }
  }

  // Calculate price based on category, duration, and appointment count
  const calculatePrice = async (
    categoryCode: string,
    durationMinutes: number,
    userId?: string
  ): Promise<CalculatedPrice> => {
    // Lade Pricing Rules falls noch nicht geladen
    if (pricingRules.value.length === 0) {
      await loadPricingRules()
    }

    const rule = getPricingRule(categoryCode)
    if (!rule) {
      throw new Error(`Keine Preisregel für Kategorie ${categoryCode} gefunden`)
    }

    // Appointment count ermitteln
    const appointmentNumber = userId ? await getAppointmentCount(userId) : 1

    // Grundpreis berechnen (skaliert auf Dauer)
    const basePriceRappen = Math.round(rule.price_per_minute_rappen * durationMinutes)
    
    // Admin-Fee nur ab entsprechendem Termin
    const adminFeeRappen = appointmentNumber >= rule.admin_fee_applies_from ? rule.admin_fee_rappen : 0
    
    // Gesamtpreis
    const totalRappen = basePriceRappen + adminFeeRappen

    const result: CalculatedPrice = {
      base_price_rappen: basePriceRappen,
      admin_fee_rappen: adminFeeRappen,
      total_rappen: totalRappen,
      base_price_chf: (basePriceRappen / 100).toFixed(2),
      admin_fee_chf: (adminFeeRappen / 100).toFixed(2),
      total_chf: (totalRappen / 100).toFixed(2),
      category_code: categoryCode,
      duration_minutes: durationMinutes,
      appointment_number: appointmentNumber
    }

    console.log('💰 Price calculated:', {
      category: categoryCode,
      duration: durationMinutes,
      appointment: appointmentNumber,
      basePrice: result.base_price_chf,
      adminFee: result.admin_fee_chf,
      total: result.total_chf
    })

    return result
  }

  // Get admin fee for category (legacy support)
  const getAdminFeeForCategory = (categoryCode: string): number => {
    const rule = getPricingRule(categoryCode)
    return rule ? rule.admin_fee_rappen / 100 : 0
  }

  // Get price per minute for category
  const getPricePerMinuteForCategory = (categoryCode: string): number => {
    const rule = getPricingRule(categoryCode)
    return rule ? rule.price_per_minute_rappen / 100 : 0
  }

  // Get all available categories
  const getAvailableCategories = (): string[] => {
    return pricingRules.value.map(rule => rule.category_code).sort()
  }

  // Update single pricing rule
  const updatePricingRule = async (
    categoryCode: string, 
    updates: Partial<Pick<PricingRule, 'price_per_minute_rappen' | 'admin_fee_rappen' | 'admin_fee_applies_from'>>
  ): Promise<boolean> => {
    try {
      console.log('💾 Updating pricing rule:', categoryCode, updates)

      const { error } = await supabase
        .from('pricing_rules')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('category_code', categoryCode)
        .eq('rule_type', 'category_pricing')

      if (error) {
        console.error('❌ Error updating pricing rule:', error)
        throw new Error(error.message)
      }

      // Cache invalidieren und neu laden
      await loadPricingRules(true)
      
      console.log('✅ Pricing rule updated successfully')
      return true

    } catch (err: any) {
      console.error('❌ Error in updatePricingRule:', err)
      pricingError.value = err.message || 'Fehler beim Aktualisieren der Preisregel'
      return false
    }
  }

  // Computed
  const isLoaded = computed(() => pricingRules.value.length > 0)
  const categoriesCount = computed(() => pricingRules.value.length)

  return {
    // State
    pricingRules,
    isLoadingPrices,
    pricingError,
    isLoaded,
    categoriesCount,
    
    // Methods
    loadPricingRules,
    calculatePrice,
    getPricingRule,
    getAdminFeeForCategory,
    getPricePerMinuteForCategory,
    getAvailableCategories,
    updatePricingRule,
    
    // Legacy support
    getAppointmentCount
  }
}