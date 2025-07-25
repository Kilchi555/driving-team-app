// composables/usePricing.ts - Optimiert mit erweiterten Caching-Strategien
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

interface PricingRule {
  id: string
  category_code: string
  price_per_minute_rappen: number
  admin_fee_rappen: number
  admin_fee_applies_from: number
  base_duration_minutes: number
  is_active: boolean
  rule_name: string
  valid_from: string | null
  valid_until: string | null
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

interface CachedPrice {
  data: CalculatedPrice
  timestamp: number
  key: string
}

interface CachedAppointmentCount {
  count: number
  timestamp: number
}

export const usePricing = () => {
  const supabase = getSupabase()
  
  // State
  const pricingRules = ref<PricingRule[]>([])
  const isLoadingPrices = ref(false)
  const pricingError = ref<string>('')
  const lastLoaded = ref<Date | null>(null)
  
  // ✅ ERWEITERTE CACHING-STRATEGIEN
  
  // Cache-Konfiguration
  const PRICING_RULES_CACHE_DURATION = 10 * 60 * 1000  // 10 Minuten für Pricing Rules
  const PRICE_CALCULATION_CACHE_DURATION = 2 * 60 * 1000  // 2 Minuten für Berechnungen
  const APPOINTMENT_COUNT_CACHE_DURATION = 30 * 1000     // 30 Sekunden für Appointment Counts
  
  // Cache-Speicher
  const priceCalculationCache = ref<Map<string, CachedPrice>>(new Map())
  const appointmentCountCache = ref<Map<string, CachedAppointmentCount>>(new Map())
  
  // ✅ CACHE-HELPER FUNKTIONEN
  
  const generatePriceKey = (categoryCode: string, durationMinutes: number, userId?: string): string => {
    return `${categoryCode}-${durationMinutes}${userId ? `-${userId}` : '-guest'}`
  }
  
  const isCacheValid = (timestamp: number, duration: number): boolean => {
    return (Date.now() - timestamp) < duration
  }
  
  const clearExpiredCache = () => {
    const now = Date.now()
    
    // Bereinige Price Calculations Cache
    for (const [key, cached] of priceCalculationCache.value.entries()) {
      if (!isCacheValid(cached.timestamp, PRICE_CALCULATION_CACHE_DURATION)) {
        priceCalculationCache.value.delete(key)
      }
    }
    
    // Bereinige Appointment Count Cache  
    for (const [userId, cached] of appointmentCountCache.value.entries()) {
      if (!isCacheValid(cached.timestamp, APPOINTMENT_COUNT_CACHE_DURATION)) {
        appointmentCountCache.value.delete(userId)
      }
    }
    
    console.log('🧹 Cache cleaned:', {
      priceCalculations: priceCalculationCache.value.size,
      appointmentCounts: appointmentCountCache.value.size
    })
  }
  
  // Cache-Cleanup alle 60 Sekunden
  setInterval(clearExpiredCache, 60 * 1000)
  
  // ✅ PRICING RULES MIT CACHE
  
  const loadPricingRules = async (forceReload = false): Promise<void> => {
    console.log('🔄 Loading pricing rules from database...')
    
    // Prüfe Cache für Pricing Rules
    if (!forceReload && lastLoaded.value && 
        isCacheValid(lastLoaded.value.getTime(), PRICING_RULES_CACHE_DURATION)) {
      console.log('📦 Using cached pricing rules')
      return
    }

    isLoadingPrices.value = true
    pricingError.value = ''

    try {
      const { data, error } = await supabase
        .from('pricing_rules')
        .select('*')
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

      // Kombiniere die Regeln nach category_code
      const rulesByCategory = data.reduce((acc, rule) => {
        if (!acc[rule.category_code]) {
          acc[rule.category_code] = {}
        }
        acc[rule.category_code][rule.rule_type] = rule
        return acc
      }, {} as Record<string, Record<string, any>>)

      const combinedRules = Object.entries(rulesByCategory).map(([categoryCode, rules]) => {
        const baseRule = (rules as any).base_price
        const adminRule = (rules as any).admin_fee

        return {
          id: baseRule?.id || adminRule?.id || `combined-${categoryCode}`,
          category_code: categoryCode,
          rule_name: `${categoryCode} - Kombiniert`,
          price_per_minute_rappen: baseRule?.price_per_minute_rappen || 212,
          admin_fee_rappen: adminRule?.admin_fee_rappen || (
            ['A', 'A1', 'A35kW'].includes(categoryCode) ? 0 : 12000
          ),
          admin_fee_applies_from: adminRule?.admin_fee_applies_from || (
            ['A', 'A1', 'A35kW'].includes(categoryCode) ? 999 : 2
          ),
          base_duration_minutes: baseRule?.base_duration_minutes || 45,
          is_active: true,
          valid_from: baseRule?.valid_from || null,
          valid_until: baseRule?.valid_until || null
        }
      })

      pricingRules.value = combinedRules
      lastLoaded.value = new Date()

      // ✅ CACHE INVALIDIERUNG: Lösche alle Preis-Caches wenn neue Rules geladen werden
      priceCalculationCache.value.clear()
      appointmentCountCache.value.clear()

      console.log('✅ Pricing rules loaded:', combinedRules.length, 'categories')
      console.log('🗑️ Price caches cleared due to new rules')

    } catch (err: any) {
      console.error('❌ Error loading pricing rules:', err)
      pricingError.value = err.message || 'Fehler beim Laden der Preisregeln'
      await createFallbackPricingRules()
    } finally {
      isLoadingPrices.value = false
    }
  }

  // ✅ APPOINTMENT COUNT MIT CACHE
  
  const getAppointmentCount = async (userId: string): Promise<number> => {
    console.log('🔢 Getting appointment count for user:', userId)
    
    // Prüfe Cache
    const cached = appointmentCountCache.value.get(userId)
    if (cached && isCacheValid(cached.timestamp, APPOINTMENT_COUNT_CACHE_DURATION)) {
      console.log('📦 Using cached appointment count:', cached.count)
      return cached.count
    }

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

      const appointmentNumber = (count || 0) + 1
      
      // ✅ CACHE SPEICHERN
      appointmentCountCache.value.set(userId, {
        count: appointmentNumber,
        timestamp: Date.now()
      })
      
      console.log('✅ Appointment count cached:', appointmentNumber)
      return appointmentNumber

    } catch (error) {
      console.error('❌ Error in getAppointmentCount:', error)
      return 1
    }
  }

  // ✅ PRICE CALCULATION MIT CACHE
  
  const calculatePrice = async (
    categoryCode: string,
    durationMinutes: number,
    userId?: string
  ): Promise<CalculatedPrice> => {
    const cacheKey = generatePriceKey(categoryCode, durationMinutes, userId)
    console.log('💰 Calculating price for:', cacheKey)
    
    // ✅ PRÜFE PRICE CALCULATION CACHE
    const cachedPrice = priceCalculationCache.value.get(cacheKey)
    if (cachedPrice && isCacheValid(cachedPrice.timestamp, PRICE_CALCULATION_CACHE_DURATION)) {
      console.log('📦 Using cached price calculation:', cachedPrice.data.total_chf)
      return cachedPrice.data
    }

    // Lade Pricing Rules falls noch nicht geladen
    if (pricingRules.value.length === 0) {
      await loadPricingRules()
    }

    const rule = getPricingRule(categoryCode)
    if (!rule) {
      throw new Error(`Keine Preisregel für Kategorie ${categoryCode} gefunden`)
    }

    // Appointment count ermitteln (auch mit Cache)
    const appointmentNumber = userId ? await getAppointmentCount(userId) : 1

    // Grundpreis berechnen
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

    // ✅ CACHE SPEICHERN
    priceCalculationCache.value.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      key: cacheKey
    })
    
    console.log('✅ Price calculated and cached:', {
      category: categoryCode,
      duration: durationMinutes,
      total: result.total_chf,
      cached: true
    })

    return result
  }
  
  // ✅ FALLBACK UND UTILITY FUNKTIONEN
  
  const createFallbackPricingRules = async (): Promise<void> => {
    console.log('🔄 Using fallback pricing rules...')
    
    const fallbackRules: PricingRule[] = [
      { 
        id: 'fallback-B', 
        category_code: 'B', 
        price_per_minute_rappen: 211, 
        admin_fee_rappen: 12000, 
        admin_fee_applies_from: 2, 
        base_duration_minutes: 45, 
        is_active: true, 
        valid_from: null, 
        valid_until: null, 
        rule_name: 'Fallback B' 
      },
      { 
        id: 'fallback-A1', 
        category_code: 'A1', 
        price_per_minute_rappen: 211, 
        admin_fee_rappen: 0, 
        admin_fee_applies_from: 999, 
        base_duration_minutes: 45, 
        is_active: true, 
        valid_from: null, 
        valid_until: null, 
        rule_name: 'Fallback A1' 
      },
      { 
        id: 'fallback-C', 
        category_code: 'C', 
        price_per_minute_rappen: 378, 
        admin_fee_rappen: 25000, 
        admin_fee_applies_from: 2, 
        base_duration_minutes: 45, 
        is_active: true, 
        valid_from: null, 
        valid_until: null, 
        rule_name: 'Fallback C' 
      }
    ]
    
    pricingRules.value = fallbackRules
    lastLoaded.value = new Date()
    console.log('✅ Fallback pricing rules loaded')
  }

  const getPricingRule = (categoryCode: string): PricingRule | null => {
    const rule = pricingRules.value.find(rule => rule.category_code === categoryCode)
    if (!rule) {
      console.warn(`⚠️ No pricing rule found for category: ${categoryCode}`)
      return null
    }
    return rule
  }
  
  // ✅ CACHE MANAGEMENT FUNKTIONEN
  
  const invalidateCache = (type?: 'all' | 'prices' | 'appointments' | 'rules'): void => {
    switch (type) {
      case 'prices':
        priceCalculationCache.value.clear()
        console.log('🗑️ Price calculation cache cleared')
        break
      case 'appointments':
        appointmentCountCache.value.clear()
        console.log('🗑️ Appointment count cache cleared')
        break
      case 'rules':
        lastLoaded.value = null
        console.log('🗑️ Pricing rules cache invalidated')
        break
      case 'all':
      default:
        priceCalculationCache.value.clear()
        appointmentCountCache.value.clear()
        lastLoaded.value = null
        console.log('🗑️ All caches cleared')
        break
    }
  }
  
  const getCacheStats = () => {
    return {
      pricingRulesLoaded: !!lastLoaded.value,
      pricingRulesCacheValid: lastLoaded.value ? isCacheValid(lastLoaded.value.getTime(), PRICING_RULES_CACHE_DURATION) : false,
      priceCalculationsCached: priceCalculationCache.value.size,
      appointmentCountsCached: appointmentCountCache.value.size,
      totalCacheSize: priceCalculationCache.value.size + appointmentCountCache.value.size
    }
  }

  // Computed
  const isLoaded = computed(() => pricingRules.value.length > 0)
  const categoriesCount = computed(() => pricingRules.value.length)
  const availableCategories = computed(() => 
    pricingRules.value.map(rule => rule.category_code).sort()
  )

  return {
    // State
    pricingRules,
    isLoadingPrices,
    pricingError,
    isLoaded,
    categoriesCount,
    availableCategories,
    
    // Methods
    loadPricingRules,
    calculatePrice,
    getPricingRule,
    getAppointmentCount,
    
    // ✅ NEUE CACHE MANAGEMENT FUNKTIONEN
    invalidateCache,
    getCacheStats,
    clearExpiredCache
  }
}