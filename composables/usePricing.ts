// composables/usePricing.ts - Vereinheitlichte und optimierte Pricing-Lösung
import { ref, computed, watch, type Ref } from 'vue'
import { getSupabase } from '~/utils/supabase'

// ===== INTERFACES =====
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

interface DynamicPricing {
  pricePerMinute: number
  adminFeeChf: number
  appointmentNumber: number
  hasAdminFee: boolean
  totalPriceChf: string
  category: string
  duration: number
  isLoading: boolean
  error: string
}

interface UsePricingOptions {
  // Für reactive Pricing (EventModal etc.)
  selectedStudent?: Ref<any | null>
  currentUser?: Ref<any | null>
  durationMinutes?: Ref<number>
  categoryCode?: Ref<string>
  isSecondOrLaterAppointment?: Ref<boolean>
  showAdminFeeByDefault?: Ref<boolean>
  
  // Für Auto-Update (optional)
  autoUpdate?: boolean
  watchChanges?: boolean
}

// ===== FALLBACK RULES (basierend auf tatsächlichen DB-Daten) =====
export const COMPLETE_FALLBACK_RULES = [
  // ✅ HAUPTKATEGORIEN (aus den Projektunterlagen ermittelt)
  {
    id: 'fallback-B', category_code: 'B', name: 'Autoprüfung Kategorie B',
    description: 'Personenwagen bis 3500kg',
    price_per_minute_rappen: 211, price_per_minute_chf: 2.11, // 95 CHF / 45min = 2.11
    admin_fee_rappen: 12000, admin_fee_chf: 120, admin_fee_applies_from: 2,
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback B'
  },
  {
    id: 'fallback-A', category_code: 'A', name: 'Kategorie A (Motorrad)',
    description: 'Motorrad unbeschränkt',
    price_per_minute_rappen: 211, price_per_minute_chf: 2.11, // 95 CHF / 45min = 2.11
    admin_fee_rappen: 0, admin_fee_chf: 0, admin_fee_applies_from: 999, // Motorräder: keine Admin-Fee
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback A'
  },
  {
    id: 'fallback-A1', category_code: 'A1', name: 'Motorrad A1/A35kW/A',
    description: 'Leichtmotorrad 125ccm',
    price_per_minute_rappen: 211, price_per_minute_chf: 2.11, // 95 CHF / 45min = 2.11
    admin_fee_rappen: 0, admin_fee_chf: 0, admin_fee_applies_from: 999, // Motorräder: keine Admin-Fee
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback A1'
  },
  {
    id: 'fallback-A35kW', category_code: 'A35kW', name: 'Kategorie A 35kW',
    description: 'Motorrad mit Leistungsbeschränkung',
    price_per_minute_rappen: 211, price_per_minute_chf: 2.11, // 95 CHF / 45min = 2.11
    admin_fee_rappen: 0, admin_fee_chf: 0, admin_fee_applies_from: 999, // Motorräder: keine Admin-Fee
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback A35kW'
  },
  {
    id: 'fallback-BE', category_code: 'BE', name: 'Anhänger BE',
    description: 'Personenwagen mit Anhänger',
    price_per_minute_rappen: 267, price_per_minute_chf: 2.67, // 120 CHF / 45min = 2.67
    admin_fee_rappen: 12000, admin_fee_chf: 120, admin_fee_applies_from: 2,
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback BE'
  },
  {
    id: 'fallback-C', category_code: 'C', name: 'LKW C',
    description: 'Lastwagen über 3500kg',
    price_per_minute_rappen: 378, price_per_minute_chf: 3.78, // 170 CHF / 45min = 3.78
    admin_fee_rappen: 20000, admin_fee_chf: 200, admin_fee_applies_from: 2,
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback C'
  },
  {
    id: 'fallback-C1', category_code: 'C1', name: 'LKW C1/D1',
    description: 'Kleinlastwagen 3500-7500kg',
    price_per_minute_rappen: 333, price_per_minute_chf: 3.33, // 150 CHF / 45min = 3.33
    admin_fee_rappen: 20000, admin_fee_chf: 200, admin_fee_applies_from: 2,
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback C1'
  },
  {
    id: 'fallback-CE', category_code: 'CE', name: 'LKW CE',
    description: 'Lastwagen mit Anhänger',
    price_per_minute_rappen: 444, price_per_minute_chf: 4.44, // 200 CHF / 45min = 4.44
    admin_fee_rappen: 25000, admin_fee_chf: 250, admin_fee_applies_from: 2,
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback CE'
  },
  {
    id: 'fallback-D', category_code: 'D', name: 'Bus D',
    description: 'Autobus über 8 Personen',
    price_per_minute_rappen: 444, price_per_minute_chf: 4.44, // 200 CHF / 45min = 4.44
    admin_fee_rappen: 30000, admin_fee_chf: 300, admin_fee_applies_from: 2,
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback D'
  },
  {
    id: 'fallback-D1', category_code: 'D1', name: 'D1 (Kleinbus)',
    description: 'Kleinbus 9-16 Personen',
    price_per_minute_rappen: 333, price_per_minute_chf: 3.33, // 150 CHF / 45min = 3.33
    admin_fee_rappen: 20000, admin_fee_chf: 200, admin_fee_applies_from: 2,
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback D1'
  },
  {
    id: 'fallback-Boot', category_code: 'Motorboot', name: 'Motorboot',
    description: 'Motorbootführerschein',
    price_per_minute_rappen: 211, price_per_minute_chf: 2.11, // 95 CHF / 45min = 2.11
    admin_fee_rappen: 12000, admin_fee_chf: 120, admin_fee_applies_from: 2,
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback Motorboot'
  },
  {
    id: 'fallback-BPT', category_code: 'BPT', name: 'Berufsprüfung Transport',
    description: 'Berufskraftfahrer Theorieprüfung',
    price_per_minute_rappen: 222, price_per_minute_chf: 2.22, // 100 CHF / 45min = 2.22
    admin_fee_rappen: 12000, admin_fee_chf: 120, admin_fee_applies_from: 2,
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback BPT'
  }
]

// ===== UTILITY FUNCTIONS (EXPORTIERT) =====
export const getFallbackRule = (categoryCode: string) => {
  const category = categoryCode.split(',')[0].trim().toUpperCase()
  return COMPLETE_FALLBACK_RULES.find(rule => rule.category_code === category) || null
}

export const calculateOfflinePrice = (categoryCode: string, durationMinutes: number, appointmentNumber: number = 1) => {
  const rule = getFallbackRule(categoryCode)
  if (!rule) return { basePrice: 0, adminFee: 0, total: 0, rule: null }
  
  const basePrice = Math.round(rule.price_per_minute_chf * durationMinutes * 100) / 100
  const adminFee = appointmentNumber >= rule.admin_fee_applies_from ? rule.admin_fee_chf : 0
  
  return {
    basePrice,
    adminFee,
    total: basePrice + adminFee,
    rule
  }
}

// ===== HAUPT-COMPOSABLE =====
export const usePricing = (options: UsePricingOptions = {}) => {
  const supabase = getSupabase()

  // ===== CORE STATE =====
  const pricingRules = ref<PricingRule[]>([])
  const isLoadingPrices = ref(false)
  const pricingError = ref<string>('')
  const lastLoaded = ref<Date | null>(null)

  // ===== DYNAMIC PRICING STATE =====
  const dynamicPricing = ref<DynamicPricing>({
    pricePerMinute: 0,
    adminFeeChf: 0,
    appointmentNumber: 1,
    hasAdminFee: false,
    totalPriceChf: '0.00',
    category: '',
    duration: 45,
    isLoading: false,
    error: ''
  })

  // ===== CACHE SYSTEM =====
  const PRICING_RULES_CACHE_DURATION = 10 * 60 * 1000  // 10 Minuten
  const PRICE_CALCULATION_CACHE_DURATION = 2 * 60 * 1000  // 2 Minuten
  const APPOINTMENT_COUNT_CACHE_DURATION = 30 * 1000     // 30 Sekunden

  const priceCalculationCache = ref<Map<string, { data: CalculatedPrice; timestamp: number }>>(new Map())
  const appointmentCountCache = ref<Map<string, { count: number; timestamp: number }>>(new Map())

  // ===== CACHE HELPERS =====
  const generatePriceKey = (categoryCode: string, durationMinutes: number, userId?: string): string => {
    return `${categoryCode}-${durationMinutes}${userId ? `-${userId}` : '-guest'}`
  }

  const isCacheValid = (timestamp: number, duration: number): boolean => {
    return (Date.now() - timestamp) < duration
  }

  const clearExpiredCache = () => {
    const now = Date.now()
    
    for (const [key, cached] of priceCalculationCache.value.entries()) {
      if (!isCacheValid(cached.timestamp, PRICE_CALCULATION_CACHE_DURATION)) {
        priceCalculationCache.value.delete(key)
      }
    }
    
    for (const [userId, cached] of appointmentCountCache.value.entries()) {
      if (!isCacheValid(cached.timestamp, APPOINTMENT_COUNT_CACHE_DURATION)) {
        appointmentCountCache.value.delete(userId)
      }
    }
  }

  // Cache-Cleanup alle 60 Sekunden
  setInterval(clearExpiredCache, 60 * 1000)

  // ===== CORE FUNCTIONS =====
  const createFallbackPricingRules = async (): Promise<void> => {
    console.log('🔄 Using complete fallback pricing rules...')
    
    const fallbackRules = COMPLETE_FALLBACK_RULES.map(rule => ({
      id: rule.id,
      category_code: rule.category_code,
      price_per_minute_rappen: rule.price_per_minute_rappen,
      admin_fee_rappen: rule.admin_fee_rappen,
      admin_fee_applies_from: rule.admin_fee_applies_from,
      base_duration_minutes: rule.base_duration_minutes,
      is_active: rule.is_active,
      valid_from: rule.valid_from,
      valid_until: rule.valid_until,
      rule_name: rule.rule_name
    }))
    
    pricingRules.value = fallbackRules
    lastLoaded.value = new Date()
    console.log('✅ Fallback pricing rules loaded:', fallbackRules.length, 'categories')
  }

  const loadPricingRules = async (forceReload = false): Promise<void> => {
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

      // Cache invalidierung
      priceCalculationCache.value.clear()
      appointmentCountCache.value.clear()

      console.log('✅ Pricing rules loaded:', combinedRules.length, 'categories')

    } catch (err: any) {
      console.error('❌ Error loading pricing rules:', err)
      pricingError.value = err.message || 'Fehler beim Laden der Preisregeln'
      await createFallbackPricingRules()
    } finally {
      isLoadingPrices.value = false
    }
  }

  const getAppointmentCount = async (userId: string): Promise<number> => {
    // Prüfe Cache
    const cached = appointmentCountCache.value.get(userId)
    if (cached && isCacheValid(cached.timestamp, APPOINTMENT_COUNT_CACHE_DURATION)) {
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
      
      // Cache speichern
      appointmentCountCache.value.set(userId, {
        count: appointmentNumber,
        timestamp: Date.now()
      })
      
      return appointmentNumber

    } catch (error) {
      console.error('❌ Error in getAppointmentCount:', error)
      return 1
    }
  }

  const getPricingRule = (categoryCode: string): PricingRule | null => {
    const rule = pricingRules.value.find(rule => rule.category_code === categoryCode)
    if (!rule) {
      console.warn(`⚠️ No pricing rule found for category: ${categoryCode}`)
      return null
    }
    return rule
  }

const roundToNearestFranken = (rappen: number): number => {
  const remainder = rappen % 100
  if (remainder === 0) return rappen
  if (remainder < 50) return rappen - remainder      // Abrunden bei < 50 Rappen
  else return rappen + (100 - remainder)             // Aufrunden bei >= 50 Rappen
}

  // ===== MAIN CALCULATION FUNCTION =====
  const calculatePrice = async (
    categoryCode: string,
    durationMinutes: number,
    userId?: string
  ): Promise<CalculatedPrice> => {
      
  // ✅ NEUE VALIDIERUNG: Nur für Fahrkategorien berechnen
  const validDrivingCategories = ['A', 'A1', 'A35kW', 'B', 'BE', 'C', 'C1', 'CE', 'D', 'D1', 'DE', 'Motorboot', 'BPT']
  
  if (!validDrivingCategories.includes(categoryCode)) {
    console.log(`🚫 Skipping price calculation for non-driving category: ${categoryCode}`)
    // Fallback für andere Terminarten
    return {
      base_price_rappen: 0,
      admin_fee_rappen: 0,
      total_rappen: 0,
      base_price_chf: '0.00',
      admin_fee_chf: '0.00',
      total_chf: '0.00',
      category_code: categoryCode,
      duration_minutes: durationMinutes,
      appointment_number: 1
    }
  }
  
    const cacheKey = generatePriceKey(categoryCode, durationMinutes, userId)
    
    // Prüfe Cache
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

    // Appointment count ermitteln
    const appointmentNumber = userId ? await getAppointmentCount(userId) : 1

    // Grundpreis berechnen mit Rundung
    let basePriceRappen = Math.round(rule.price_per_minute_rappen * durationMinutes)
    basePriceRappen = roundToNearestFranken(basePriceRappen)

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

    // Cache speichern
    priceCalculationCache.value.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    })
    
    console.log('✅ Price calculated and cached:', {
      category: categoryCode,
      duration: durationMinutes,
      total: result.total_chf
    })

    return result
  }

  // ===== DYNAMIC PRICING FUNCTIONS =====
  const updateDynamicPricing = async (categoryCode: string, durationMinutes: number, userId?: string) => {
    dynamicPricing.value.isLoading = true
    dynamicPricing.value.error = ''

    try {
      const result = await calculatePrice(categoryCode, durationMinutes, userId)
      
      dynamicPricing.value = {
        pricePerMinute: result.base_price_rappen / durationMinutes / 100,
        adminFeeChf: parseFloat(result.admin_fee_chf),
        appointmentNumber: result.appointment_number,
        hasAdminFee: result.admin_fee_rappen > 0,
        totalPriceChf: result.total_chf,
        category: categoryCode,
        duration: durationMinutes,
        isLoading: false,
        error: ''
      }

    } catch (error: any) {
      console.error('❌ Error updating dynamic pricing:', error)
      
      // Fallback zur Offline-Berechnung
      const offlineResult = calculateOfflinePrice(categoryCode, durationMinutes, 1)
      
      dynamicPricing.value = {
        pricePerMinute: offlineResult.basePrice / durationMinutes,
        adminFeeChf: offlineResult.adminFee,
        appointmentNumber: 1,
        hasAdminFee: offlineResult.adminFee > 0,
        totalPriceChf: offlineResult.total.toFixed(2),
        category: categoryCode,
        duration: durationMinutes,
        isLoading: false,
        error: error.message || 'Fehler bei Preisberechnung (Offline-Fallback aktiv)'
      }
    }
  }

  // ===== REACTIVE WATCHERS (falls options gesetzt) =====
  if (options?.watchChanges && options?.categoryCode && options?.durationMinutes) {
    watch(
      [
        () => options.categoryCode?.value, 
        () => options.durationMinutes?.value, 
        () => options.selectedStudent?.value
      ], 
      async ([newCategory, newDuration, newStudent]) => {
        if (newCategory && newDuration) {
          // newStudent ist der dereferenzierte Wert vom selectedStudent Ref
          const userId = newStudent?.id
          await updateDynamicPricing(newCategory, newDuration, userId)
        }
      }, 
      { immediate: options?.autoUpdate }
    )
  }

  // ===== CACHE MANAGEMENT =====
  const invalidateCache = (type?: 'pricing' | 'calculations' | 'appointments' | 'all') => {
    switch (type) {
      case 'pricing':
        lastLoaded.value = null
        break
      case 'calculations':
        priceCalculationCache.value.clear()
        break
      case 'appointments':
        appointmentCountCache.value.clear()
        break
      case 'all':
      default:
        lastLoaded.value = null
        priceCalculationCache.value.clear()
        appointmentCountCache.value.clear()
        break
    }
  }

  // ===== COMPUTED VALUES =====
  const isLoaded = computed(() => pricingRules.value.length > 0)
  const categoriesCount = computed(() => pricingRules.value.length)
  const availableCategories = computed(() => 
    pricingRules.value.map(rule => rule.category_code).sort()
  )

  // ===== RETURN API =====
  return {
    // Core State
    pricingRules,
    isLoadingPrices,
    pricingError,
    isLoaded,
    categoriesCount,
    availableCategories,

    // Dynamic Pricing State
    dynamicPricing: computed(() => dynamicPricing.value),

    // Core Functions
    loadPricingRules,
    calculatePrice,
    getAppointmentCount,
    getPricingRule,

    // Dynamic Pricing Functions
    updateDynamicPricing,
    
    // Utility Functions
    createFallbackPricingRules,
    invalidateCache,
    clearExpiredCache,

    // Computed Values für Rückwärtskompatibilität
    calculatedPricePerMinute: computed(() => dynamicPricing.value.pricePerMinute),
    calculatedAdminFee: computed(() => dynamicPricing.value.adminFeeChf),
    calculatedAppointmentNumber: computed(() => dynamicPricing.value.appointmentNumber),
    hasAdminFee: computed(() => dynamicPricing.value.hasAdminFee),
    totalPriceChf: computed(() => dynamicPricing.value.totalPriceChf)
  }
}