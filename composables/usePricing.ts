// composables/usePricing.ts - Vereinheitlichte und optimierte Pricing-Lösung
import { ref, computed, watch, type Ref } from 'vue'
import { useAuthStore } from '~/stores/auth'

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
  original_duration_minutes?: number // ✅ NEU: Original-Duration für Edit-Mode
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
  adminFeeRappen?: number // ✅ NEU: Für Verwendung in createPaymentEntry
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
    price_per_minute_rappen: 334, price_per_minute_chf: 3.34, // Updated from database
    admin_fee_rappen: 20000, admin_fee_chf: 200, admin_fee_applies_from: 2,
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback C1'
  },
  {
    id: 'fallback-CE', category_code: 'CE', name: 'LKW CE',
    description: 'Lastwagen mit Anhänger',
    price_per_minute_rappen: 445, price_per_minute_chf: 4.45, // Updated from database
    admin_fee_rappen: 25000, admin_fee_chf: 250, admin_fee_applies_from: 2,
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback CE'
  },
  {
    id: 'fallback-D', category_code: 'D', name: 'Bus D',
    description: 'Autobus über 8 Personen',
    price_per_minute_rappen: 445, price_per_minute_chf: 4.45, // Updated from database
    admin_fee_rappen: 30000, admin_fee_chf: 300, admin_fee_applies_from: 2,
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback D'
  },
  {
    id: 'fallback-D1', category_code: 'D1', name: 'D1 (Kleinbus)',
    description: 'Kleinbus 9-16 Personen',
    price_per_minute_rappen: 334, price_per_minute_chf: 3.34, // Updated from database
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
  
  // ✅ KORRIGIERT: Admin-Fee nur beim 2. Termin pro Kategorie (außer bei Motorrädern)
  const motorcycleCategories = ['A', 'A1', 'A35kW']
  const isMotorcycle = motorcycleCategories.includes(categoryCode)
  
  let adminFee = 0
  if (!isMotorcycle && appointmentNumber === 2) {
    adminFee = rule.admin_fee_chf
  }
  
  return {
    basePrice,
    adminFee,
    total: basePrice + adminFee,
    rule
  }
}

// ===== HELPER FUNCTIONS =====
const getEventTypeByCode = async (code: string, tenantId: string) => {
  try {
    const response = await $fetch('/api/pricing/calculate', {
      method: 'POST',
      body: {
        action: 'get-event-type',
        code,
        tenantId
      }
    }) as any

    if (!response?.success) {
      logger.warn(`⚠️ Event type "${code}" not found`)
      return null
    }

    return response?.data
  } catch (error) {
    logger.error('Error getting event type:', error)
    return null
  }
}

// ===== HAUPT-COMPOSABLE =====
export const usePricing = (options: UsePricingOptions = {}) => {
  // ✅ NO DIRECT SUPABASE QUERIES - All database operations via APIs

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
    logger.debug('🔄 Using complete fallback pricing rules...')
    
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
    logger.debug('✅ Fallback pricing rules loaded:', fallbackRules.length, 'categories')
  }

  const loadPricingRules = async (forceReload = false, explicitTenantId?: string): Promise<void> => {
    if (!forceReload && lastLoaded.value && 
        isCacheValid(lastLoaded.value.getTime(), PRICING_RULES_CACHE_DURATION)) {
      logger.debug('📦 Using cached pricing rules')
      return
    }

    isLoadingPrices.value = true
    pricingError.value = ''

    try {
      logger.debug('🔄 Loading pricing rules from API...')
      
      // Get tenant_id: First from explicit parameter, then from auth store
      let tenantId = explicitTenantId
      
      if (!tenantId) {
        const authStore = useAuthStore()
        tenantId = authStore.userProfile?.tenant_id
      }
      
      if (!tenantId) {
        logger.debug('ℹ️ User has no tenant_id, using fallback pricing')
        await createFallbackPricingRules()
        return
      }
      
      const response = await $fetch('/api/pricing/calculate', {
        method: 'POST',
        body: {
          action: 'get-pricing-rules',
          tenantId
        }
      }) as any

      if (!response?.success) {
        logger.debug('ℹ️ Failed to load pricing rules from API')
        throw new Error(response?.error || 'Failed to load pricing rules')
      }

      const pricingRulesData = response.data || []

      if (!pricingRulesData || pricingRulesData.length === 0) {
        logger.debug('ℹ️ No pricing rules found for tenant, using fallback')
        await createFallbackPricingRules()
        return
      }

      logger.debug('📊 Pricing rules loaded from API:', pricingRulesData.length, 'categories')

      pricingRules.value = pricingRulesData as PricingRule[]
      lastLoaded.value = new Date()

      // Cache invalidierung
      priceCalculationCache.value.clear()
      appointmentCountCache.value.clear()

      logger.debug('✅ Pricing rules loaded:', pricingRulesData.length, 'categories')

    } catch (err: any) {
      logger.debug('ℹ️ Error loading pricing rules:', err)
      pricingError.value = err.message || 'Fehler beim Laden der Preisregeln'
      await createFallbackPricingRules()
    } finally {
      isLoadingPrices.value = false
    }
  }

  // ✅ NEUE LOGIK: Admin-Fee basierend auf tatsächlichen Zahlungen
  const hasAdminFeeBeenPaid = async (userId: string, categoryCode: string): Promise<boolean> => {
    try {
      logger.debug(`🔍 Checking if admin fee already paid for user ${userId} in category ${categoryCode}`)
      
      // ✅ KORRIGIERT: Verwende Backend-API (RLS-konform)
      const response = await $fetch('/api/staff/check-admin-fee-paid', {
        query: {
          userId,
          categoryCode
        }
      }) as any
      
      if (response?.success && response?.data !== undefined) {
        const hasPaid = response.data.hasPaid
        logger.debug(`📊 Admin fee payment check result: ${hasPaid ? 'Already paid' : 'Not yet paid'}`)
        return hasPaid
      }
      
      return false
    } catch (error) {
      logger.warn('❌ Error in hasAdminFeeBeenPaid:', error)
      return false
    }
  }

  // ✅ NEUE LOGIK: Admin-Fee nur verrechnen wenn noch nie bezahlt
  const shouldApplyAdminFee = async (userId: string, categoryCode: string): Promise<boolean> => {
    // Admin-Fee nur beim 2. Termin UND wenn noch nie bezahlt
    const appointmentCount = await getAppointmentCount(userId, categoryCode)
    const adminFeeAlreadyPaid = await hasAdminFeeBeenPaid(userId, categoryCode)
    
    const shouldApply = appointmentCount === 2 && !adminFeeAlreadyPaid
    
    logger.debug(`🎯 Admin fee decision for ${categoryCode}:`, {
      appointmentCount,
      adminFeeAlreadyPaid,
      shouldApply,
      reason: shouldApply ? '2. Termin + noch nie bezahlt' : 'Nicht anwendbar'
    })
    
    return shouldApply
  }

  const getAppointmentCount = async (userId: string, categoryCode: string): Promise<number> => {
    // Prüfe Cache
    const cacheKey = `${userId}-${categoryCode}`
    const cached = appointmentCountCache.value.get(cacheKey)
    if (cached && isCacheValid(cached.timestamp, APPOINTMENT_COUNT_CACHE_DURATION)) {
      return cached.count
    }

    try {
      // ✅ KORRIGIERT: Verwende Backend-API für Termin-Zählung (RLS-konform)
      const response = await $fetch('/api/staff/get-appointment-count', {
        query: {
          userId,
          categoryCode
        }
      }) as any

      if (response?.success && response?.data) {
        const appointmentNumber = response.data.count
        
        // Cache speichern
        appointmentCountCache.value.set(cacheKey, {
          count: appointmentNumber,
          timestamp: Date.now()
        })
        
        logger.debug(`📊 Appointment count for ${categoryCode}: ${appointmentNumber} (${response.data.active_count} active + 1 new)`)
        
        return appointmentNumber
      }

      return 1
    } catch (error) {
      logger.warn('❌ Error in getAppointmentCount:', error)
      return 1
    }
  }

  const getPricingRule = (categoryCode: string): PricingRule | null => {
    // Zuerst exakte Übereinstimmung versuchen
    let rule = pricingRules.value.find(rule => rule.category_code === categoryCode)
    
    // Falls nicht gefunden, case-insensitive Suche versuchen
    if (!rule) {
      rule = pricingRules.value.find(rule => 
        rule.category_code.toLowerCase() === categoryCode.toLowerCase()
      )
      
      if (rule) {
        logger.debug(`✅ Found pricing rule with case-insensitive match: "${categoryCode}" → "${rule.category_code}"`)
      }
    }
    
    if (!rule) {
      logger.warn(`⚠️ No pricing rule found for category: ${categoryCode}`)
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
    userId?: string,
    appointmentType?: string, // ✅ NEU: appointment_type Parameter hinzugefügt
    isEditMode?: boolean, // ✅ NEU: Edit-Mode flag
    appointmentId?: string, // ✅ NEU: Appointment ID für Edit-Mode
    tenantId?: string // ✅ NEU: Tenant ID für Event-Type lookup
  ): Promise<CalculatedPrice> => {
    
    // ✅ DEBUG: Log parameters to trace caching issue
    logger.debug('🔍 calculatePrice called with:', {
      categoryCode,
      durationMinutes,
      userId: userId || 'none',
      appointmentType: appointmentType || 'none',
      isEditMode: isEditMode || false,
      appointmentId: appointmentId || 'none'
    })
    
    // ✅ NEU: Bei Edit-Mode den bestehenden Preis aus dem Payment laden
    if (isEditMode && appointmentId) {
      logger.debug(`📝 Edit-Mode: Loading existing price from payment for appointment ${appointmentId}`)
      
      // ✅ Lade bestehenden Preis via Backend-API (RLS-konform)
      let existingPayment = null
      let appointment = null
      
      try {
        const response = await $fetch('/api/staff/get-appointment-pricing', {
          query: {
            appointmentId: appointmentId
          }
        }) as any
        
        if (response?.success && response?.data) {
          existingPayment = response.data.payment
          appointment = response.data.appointment
        }
      } catch (error) {
        logger.warn('⚠️ Error fetching appointment pricing data:', error)
        // Continue without the data - will recalculate price
      }
      
      if (existingPayment && existingPayment.lesson_price_rappen > 0 && appointment) {
        const originalDuration = appointment.duration_minutes
        
        // ✅ WICHTIG: Nur cached price verwenden, wenn Duration NICHT geändert wurde!
        if (originalDuration === durationMinutes) {
          const lessonPrice = existingPayment.lesson_price_rappen || 0
          const adminFee = existingPayment.admin_fee_rappen || 0
          const total = existingPayment.total_amount_rappen || (lessonPrice + adminFee)
          
          logger.debug('✅ Edit-Mode: Using existing payment price (duration unchanged):', {
            lessonPrice: lessonPrice / 100,
            adminFee: adminFee / 100,
            total: total / 100,
            originalDuration,
            currentDuration: durationMinutes
          })
          
          // Appointment count ermitteln für die Anzeige
          let appointmentNumber = 1
          if (userId) {
            appointmentNumber = await getAppointmentCount(userId, categoryCode)
          }
          
          return {
            base_price_rappen: lessonPrice,
            admin_fee_rappen: adminFee,
            total_rappen: total,
            base_price_chf: (lessonPrice / 100).toFixed(2),
            admin_fee_chf: (adminFee / 100).toFixed(2),
            total_chf: (total / 100).toFixed(2),
            category_code: categoryCode,
            duration_minutes: durationMinutes,
            appointment_number: appointmentNumber,
            original_duration_minutes: originalDuration
          }
        } else {
          logger.debug('⚠️ Edit-Mode: Duration changed, recalculating price with rounding rules:', {
            originalDuration,
            newDuration: durationMinutes
          })
          // Fall through to normal calculation with rounding rules
        }
      } else {
        logger.debug('⚠️ Edit-Mode: No existing payment found, will calculate new price')
      }
    }
      
  // ✅ NEUE VALIDIERUNG: Theorielektionen und Fahrkategorien behandeln
  const validDrivingCategories = ['A', 'A1', 'A35kW', 'B', 'BE', 'C', 'C1', 'CE', 'D', 'D1', 'DE', 'Motorboot', 'BPT']
  
  // ✅ Theorielektionen: Immer 85.- CHF, unabhängig von der Kategorie
  if (appointmentType === 'theory') {
    logger.debug(`📚 Theorielektion erkannt (appointment_type: ${appointmentType}): Verwende Standardpreis 85.- CHF`)
    
    const theoryPriceRappen = 8500 // 85.00 CHF in Rappen
    const totalRappen = theoryPriceRappen // Keine Admin-Fee für Theorielektionen
    
    const result: CalculatedPrice = {
      base_price_rappen: theoryPriceRappen,
      admin_fee_rappen: 0,
      total_rappen: totalRappen,
      base_price_chf: (theoryPriceRappen / 100).toFixed(2),
      admin_fee_chf: '0.00',
      total_chf: (totalRappen / 100).toFixed(2),
      category_code: categoryCode, // Bleibt die gewählte Fahrkategorie (z.B. 'B', 'A', etc.)
      duration_minutes: durationMinutes,
      appointment_number: 1
    }
    
    logger.debug('✅ Theorielektion Preis berechnet:', {
      category: categoryCode, // Zeigt die gewählte Fahrkategorie
      appointmentType: appointmentType,
      duration: durationMinutes,
      total: result.total_chf,
      note: 'Standardpreis für Theorielektionen, unabhängig von der Kategorie'
    })
    
    return result
  }
  
  // ✅ Prüfe dynamisch, ob categoryCode eine gültige Fahrkategorie ist (aus DB)
  let actualTenantId = tenantId
  if (!actualTenantId) {
    try {
      // Hole tenant_id aus der Auth Store
      const authStore = useAuthStore()
      const userTenantId = authStore.userProfile?.tenant_id
      if (userTenantId) {
        actualTenantId = userTenantId
      }
    } catch (err) {
      console.warn('⚠️ Could not fetch tenant_id:', err)
    }
  }
  
  // Prüfe ob categoryCode in categories Tabelle existiert
  let isDrivingCategory = validDrivingCategories.includes(categoryCode)
  if (!isDrivingCategory && actualTenantId) {
    try {
      const response = await $fetch('/api/categories/check-exists', {
        method: 'POST',
        body: {
          code: categoryCode,
          tenant_id: actualTenantId,
          active_only: true
        }
      }) as any
      
      if (response?.success && response?.data?.exists) {
        isDrivingCategory = true
        logger.debug(`✅ Category "${categoryCode}" found in categories table, treating as driving category`)
      }
    } catch (err) {
      console.warn('⚠️ Could not check if category exists via API:', err)
    }
  }
  
  // ✅ Nicht-Theorie-Lektionen: Verwende pricing_rules für alle Kategorien
  // (ob Fahrkategorien oder andere Kategorien wie "Boot", "Simulator", etc.)
  logger.debug(`🔄 Using pricing_rules for: ${categoryCode}`)
  
  // ✅ NEU: Stelle sicher, dass durationMinutes eine Zahl ist
  const durationValue = Array.isArray(durationMinutes) ? durationMinutes[0] : durationMinutes
  const cacheKey = generatePriceKey(categoryCode, durationValue, userId)
    
    // ✅ WICHTIG: Cache NICHT verwenden im Edit-Mode (wenn appointmentId vorhanden)
    // weil sich originalDuration ändern kann und dann falscher Preis berechnet wird
    const cachedPrice = priceCalculationCache.value.get(cacheKey)
    if (cachedPrice && isCacheValid(cachedPrice.timestamp, PRICE_CALCULATION_CACHE_DURATION) && !appointmentId) {
      logger.debug('📦 Using cached price calculation:', cachedPrice.data.total_chf)
      return cachedPrice.data
    }
    
    if (appointmentId) {
      logger.debug('🔄 Skipping cache in Edit-Mode to ensure fresh calculation')
    }

    // ✅ Lade Pricing Rules (für beide Modi)
    if (pricingRules.value.length === 0) {
      // Wenn tenantId nicht übergeben, aus Auth Store holen
      let actualTenantIdForPricing = tenantId
      if (!actualTenantIdForPricing) {
        try {
          const authStore = useAuthStore()
          actualTenantIdForPricing = authStore.userProfile?.tenant_id
          logger.debug('🔍 Getting tenant_id from auth store:', actualTenantIdForPricing)
        } catch (err) {
          logger.warn('⚠️ Could not get tenant_id from auth store:', err)
        }
      }
      
      await loadPricingRules(false, actualTenantIdForPricing)
    }

    const rule = getPricingRule(categoryCode)
    if (!rule) {
      logger.warn(`⚠️ Keine Preisregel für Kategorie "${categoryCode}" gefunden - Verwende 0 CHF`)
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

    // ✅ Appointment count ermitteln (für Admin-Fee Berechnung)
    let appointmentNumber = 1
    if (userId) {
      appointmentNumber = await getAppointmentCount(userId, categoryCode)
    }

    // ✅ Grundpreis berechnen
    let basePriceRappen = Math.round(rule.price_per_minute_rappen * durationValue)
    basePriceRappen = roundToNearestFranken(basePriceRappen)

    // ✅ NEUE LOGIK: Admin-Fee basierend auf tatsächlichen Zahlungen
    const motorcycleCategories = ['A', 'A1', 'A35kW']
    const isMotorcycle = motorcycleCategories.includes(categoryCode)
    
    let adminFeeRappen = 0
    
    // ✅ KORRIGIERT: Im Edit-Mode wird Admin-Fee bereits aus der Datenbank geladen
    if (!isEditMode && rule) {
      // Create-Mode: Admingebühr basierend auf Regeln berechnen
      if (!isMotorcycle && userId) {
        // Prüfe ob Admin-Fee bereits bezahlt wurde
        const shouldApply = await shouldApplyAdminFee(userId, categoryCode)
        
        if (shouldApply) {
          adminFeeRappen = rule.admin_fee_rappen
        }
      }
    }
    
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

    // ✅ Cache NUR speichern wenn KEIN appointmentId (nicht im Edit-Mode)
    if (!appointmentId) {
      priceCalculationCache.value.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      })
      
      logger.debug('✅ Price calculated and cached:', {
        category: categoryCode,
        duration: Array.isArray(durationMinutes) ? durationMinutes[0] : durationMinutes,
        originalDuration: durationMinutes,
        appointmentNumber: appointmentNumber,
        isMotorcycle: motorcycleCategories.includes(categoryCode),
        adminFee: adminFeeRappen > 0 ? `${(adminFeeRappen / 100).toFixed(2)} CHF` : 'Keine',
        total: result.total_chf
      })
    } else {
      logger.debug('✅ Price calculated (NOT cached in Edit-Mode):', {
        category: categoryCode,
        duration: Array.isArray(durationMinutes) ? durationMinutes[0] : durationMinutes,
        appointmentId,
        total: result.total_chf
      })
    }

    return result
  }

  // ===== DYNAMIC PRICING FUNCTIONS =====
  const updateDynamicPricing = async (
    categoryCode: string, 
    durationMinutes: number, 
    userId?: string,
    appointmentType?: string,
    isEditMode?: boolean,
    appointmentId?: string,
    tenantId?: string
  ) => {
    dynamicPricing.value.isLoading = true
    dynamicPricing.value.error = ''

    try {
      // ✅ NEU: Stelle sicher, dass durationMinutes eine Zahl ist
      const durationValue = Array.isArray(durationMinutes) ? durationMinutes[0] : durationMinutes
      
      const result = await calculatePrice(
        categoryCode, 
        durationValue, 
        userId,
        appointmentType,
        isEditMode,
        appointmentId,
        tenantId
      )
      
      dynamicPricing.value = {
        pricePerMinute: result.base_price_rappen / durationValue / 100,
        adminFeeChf: parseFloat(result.admin_fee_chf),
        appointmentNumber: result.appointment_number,
        hasAdminFee: result.admin_fee_rappen > 0,
        totalPriceChf: result.total_chf,
        category: categoryCode,
        duration: durationValue,
        isLoading: false,
        error: '',
        adminFeeRappen: result.admin_fee_rappen // ✅ NEU: Für Verwendung in createPaymentEntry
      }

    } catch (error: any) {
      console.error('❌ Error updating dynamic pricing:', error)
      
      // ✅ NEU: Stelle sicher, dass durationMinutes eine Zahl ist
      const durationValue = Array.isArray(durationMinutes) ? durationMinutes[0] : durationMinutes
      
      // Fallback zur Offline-Berechnung
      const offlineResult = calculateOfflinePrice(categoryCode, durationValue, 1)
      
      dynamicPricing.value = {
        pricePerMinute: offlineResult.basePrice / durationValue,
        adminFeeChf: offlineResult.adminFee,
        appointmentNumber: 1,
        hasAdminFee: offlineResult.adminFee > 0,
        totalPriceChf: offlineResult.total.toFixed(2),
        category: categoryCode,
        duration: durationValue,
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
    
    // ✅ NEUE Admin-Fee-Funktionen
    hasAdminFeeBeenPaid,
    shouldApplyAdminFee,

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