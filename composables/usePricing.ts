// composables/usePricing.ts - Vereinheitlichte und optimierte Pricing-Lösung
import { ref, computed, watch, type Ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { roundToNearest5Rappen } from '~/utils/rounding'
import { useFallbackLogger } from '~/composables/useFallbackLogger'
import { COMPLETE_FALLBACK_RULES, getFallbackRule } from '~/utils/fallbackPricingRules'
// Note: fallback pricing data lives in utils/fallbackPricingRules.ts (the single source
// of truth) so server endpoints can share the exact same numbers without importing a Vue
// composable. Import from there directly rather than re-exporting here, to avoid Nuxt
// auto-import ambiguity between composables/ and utils/.

// ===== INTERFACES =====
interface PricingRule {
  id: string
  category_code: string
  /** Set instead of category_code for event-price rules (e.g. mental_coach 'session'/'package') */
  event_type_code?: string | null
  price_per_minute_rappen: number
  admin_fee_rappen: number
  admin_fee_applies_from: number
  base_duration_minutes: number
  is_active: boolean
  rule_name: string
  valid_from: string | null
  valid_until: string | null
  // ✅ Theorie-Preisregel (rule_type='theory'), pro Kategorie vom Tenant aktivierbar
  theory_price_per_minute_rappen?: number
  theory_base_duration_minutes?: number
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
  /** True if this price came from a hardcoded fallback table instead of the tenant's live pricing_rules. */
  isFallback?: boolean
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

// ===== UTILITY FUNCTIONS (EXPORTIERT) =====
export const calculateOfflinePrice = (categoryCode: string, durationMinutes: number, appointmentNumber: number = 1) => {
  const rule = getFallbackRule(categoryCode)
  if (!rule) return { basePrice: 0, adminFee: 0, total: 0, rule: null }

  useFallbackLogger().logFallbackUsed(
    'pricing',
    `Preis für Kategorie "${categoryCode}" konnte nicht online berechnet werden – Offline-Fallback-Preis verwendet.`,
    { categoryCode, durationMinutes, appointmentNumber }
  )

  const basePrice = Math.round(rule.price_per_minute_chf * durationMinutes * 100) / 100
  
  // ✅ Admin-Fee-Regel kommt zentral aus admin_fee_applies_from der (Fallback-)Preisregel,
  // statt aus einer separat gepflegten Motorrad-Kategorie-Liste (Motorräder haben
  // admin_fee_applies_from: 999, wodurch die Fee praktisch nie greift).
  let adminFee = 0
  if (appointmentNumber >= rule.admin_fee_applies_from) {
    adminFee = rule.admin_fee_chf
  }
  
  return {
    basePrice,
    adminFee,
    total: basePrice + adminFee,
    rule,
    isFallback: true
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

// ===== MODULE-LEVEL SHARED STATE =====
// All usePricing() instances share this state to avoid duplicate API calls and enable cross-instance caching
const _sharedPricingRules = ref<PricingRule[]>([])
const _sharedIsLoading = ref(false)
const _sharedError = ref<string>('')
const _sharedLastLoaded = ref<Date | null>(null)
const _sharedPriceCache = ref<Map<string, { data: CalculatedPrice; timestamp: number }>>(new Map())
let _sharedLoadingPromise: Promise<void> | null = null
/** True while pricingRules were loaded from COMPLETE_FALLBACK_RULES instead of the tenant's real pricing_rules. */
const _sharedIsFallbackActive = ref(false)

// ===== HAUPT-COMPOSABLE =====
export const usePricing = (options: UsePricingOptions = {}) => {
  // ✅ NO DIRECT SUPABASE QUERIES - All database operations via APIs

  // ===== CORE STATE (shared at module level) =====
  const pricingRules = _sharedPricingRules
  const isLoadingPrices = _sharedIsLoading
  const pricingError = _sharedError
  const lastLoaded = _sharedLastLoaded
  const isFallbackActive = _sharedIsFallbackActive
  // In-flight deduplication: shared across all instances

  const { logFallbackUsed } = useFallbackLogger()

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
  const PRICING_RULES_CACHE_DURATION = 5 * 60 * 1000  // 5 minutes
  const PRICE_CALCULATION_CACHE_DURATION = 5 * 60 * 1000  // 5 minutes

  const priceCalculationCache = _sharedPriceCache

  // ===== CACHE HELPERS =====
  /** Inkl. Terminfolge: sonst liefert Cache nach Lektion 2 weiter „mit Admin-Fee“, obwohl Lektion 3 schon bezahlt ist. */
  const generatePriceKey = (categoryCode: string, durationMinutes: number, userId?: string, appointmentSeq?: number): string => {
    if (!userId) {
      return `${categoryCode}-${durationMinutes}-guest`
    }
    const seq = appointmentSeq ?? 1
    return `${categoryCode}-${durationMinutes}-${userId}-appt${seq}`
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
  }

  // Cache-Cleanup alle 60 Sekunden
  setInterval(clearExpiredCache, 60 * 1000)

  // ===== CORE FUNCTIONS =====
  const createFallbackPricingRules = async (reason: string, tenantId?: string): Promise<void> => {
    logger.debug('🔄 Using complete fallback pricing rules...', reason)
    
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
    isFallbackActive.value = true
    logger.debug('✅ Fallback pricing rules loaded:', fallbackRules.length, 'categories')

    logFallbackUsed(
      'pricing',
      `Preisregeln konnten nicht aus der Datenbank geladen werden (${reason}) – hart codierte Fallback-Preise werden verwendet.`,
      { reason, tenantId: tenantId || null }
    )
  }

  const loadPricingRules = async (forceReload = false, explicitTenantId?: string): Promise<void> => {
    if (!forceReload && lastLoaded.value && 
        isCacheValid(lastLoaded.value.getTime(), PRICING_RULES_CACHE_DURATION)) {
      logger.debug('📦 Using cached pricing rules')
      return
    }

    // Deduplicate concurrent requests – return the same promise if already loading
    if (_sharedLoadingPromise) {
      return _sharedLoadingPromise
    }

    isLoadingPrices.value = true
    pricingError.value = ''

    _sharedLoadingPromise = (async () => {
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
        await createFallbackPricingRules('no_tenant_id')
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
        await createFallbackPricingRules('empty_response', tenantId)
        return
      }

      logger.debug('📊 Pricing rules loaded from API:', pricingRulesData.length, 'categories')

      pricingRules.value = pricingRulesData as PricingRule[]
      lastLoaded.value = new Date()
      isFallbackActive.value = false

      // Cache invalidierung
      priceCalculationCache.value.clear()

      logger.debug('✅ Pricing rules loaded:', pricingRulesData.length, 'categories')

    } catch (err: any) {
      logger.debug('ℹ️ Error loading pricing rules:', err)
      pricingError.value = err.message || 'Fehler beim Laden der Preisregeln'
      await createFallbackPricingRules('api_error: ' + (err?.message || 'unknown'), explicitTenantId)
    } finally {
      isLoadingPrices.value = false
      _sharedLoadingPromise = null
    }
    })()

    return _sharedLoadingPromise
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

  // ✅ Admin-Fee genau 1x pro Kategorie verrechnen
  const shouldApplyAdminFee = async (userId: string, categoryCode: string, adminFeeAppliesFrom: number = 2): Promise<boolean> => {
    const appointmentCount = await getAppointmentCount(userId, categoryCode)
    const adminFeeAlreadyPaid = await hasAdminFeeBeenPaid(userId, categoryCode)
    
    // ✅ Schwelle kommt aus der Preisregel (admin_fee_applies_from), statt aus einer
    // separat gepflegten Motorrad-Kategorie-Liste (Motorräder: admin_fee_applies_from: 999)
    const shouldApply = appointmentCount >= adminFeeAppliesFrom && !adminFeeAlreadyPaid
    
    logger.debug(`🎯 Admin fee decision for ${categoryCode}:`, {
      appointmentCount,
      adminFeeAppliesFrom,
      adminFeeAlreadyPaid,
      shouldApply,
      reason: adminFeeAlreadyPaid ? 'Bereits bezahlt' : (appointmentCount < adminFeeAppliesFrom ? 'Schwelle noch nicht erreicht' : 'Noch nie bezahlt → verrechnen')
    })
    
    return shouldApply
  }

  const getAppointmentCount = async (userId: string, categoryCode: string): Promise<number> => {
    try {
      const response = await $fetch('/api/staff/get-appointment-count', {
        query: {
          userId,
          categoryCode
        }
      }) as any

      if (response?.success && response?.data) {
        const appointmentNumber = response.data.count
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

    // Boot ↔ Motorboot: Termine nutzen oft "Boot", pricing_rules oft nur "Motorboot" (oder umgekehrt)
    if (!rule && (categoryCode === 'Boot' || categoryCode === 'Motorboot')) {
      const altCode = categoryCode === 'Boot' ? 'Motorboot' : 'Boot'
      rule = pricingRules.value.find(r => r.category_code === altCode)
        || pricingRules.value.find(r => r.category_code.toLowerCase() === altCode.toLowerCase())
      if (rule) {
        logger.debug(`✅ Found pricing rule via Boot/Motorboot alias: "${categoryCode}" → "${rule.category_code}"`)
      }
    }
    
    if (!rule) {
      logger.warn(`⚠️ No pricing rule found for category: ${categoryCode}`)
      return null
    }
    
    return rule
  }

  const roundToNearestFranken = roundToNearest5Rappen

  // ===== MAIN CALCULATION FUNCTION =====
  const calculatePrice = async (
    categoryCode: string,
    durationMinutes: number,
    userId?: string,
    appointmentType?: string, // ✅ NEU: appointment_type Parameter hinzugefügt
    isEditMode?: boolean, // ✅ NEU: Edit-Mode flag
    appointmentId?: string, // ✅ NEU: Appointment ID für Edit-Mode
    tenantId?: string, // ✅ NEU: Tenant ID für Event-Type lookup
    // For business types without category-scoped pricing (e.g. mental_coach
    // 'session'/'package'): used as a fallback lookup key when no pricing_rules
    // row matches categoryCode directly.
    eventTypeCode?: string
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
  const validDrivingCategories = ['A', 'A1', 'A35kW', 'B', 'BE', 'C', 'C1', 'CE', 'D', 'D1', 'DE', 'Motorboot', 'Boot', 'BPT']
  
  // ✅ Theorielektionen: Preis kommt aus der pro Kategorie vom Tenant hinterlegten
  // Preisregel (rule_type='theory' in pricing_rules, konfiguriert in der Kategorien-Verwaltung)
  if (appointmentType === 'theory') {
    const durationVal = Array.isArray(durationMinutes) ? durationMinutes[0] : durationMinutes

    // Tenant ermitteln, um die Preisregeln laden zu können
    let theoryTenantId = tenantId
    if (!theoryTenantId) {
      try {
        const authStore = useAuthStore()
        theoryTenantId = authStore.userProfile?.tenant_id
      } catch (err) {
        console.warn('⚠️ Could not fetch tenant_id for theory pricing:', err)
      }
    }

    if (pricingRules.value.length === 0) {
      await loadPricingRules(false, theoryTenantId)
    }

    const theoryRule = getPricingRule(categoryCode)
    const theoryPricePerMinuteRappen = theoryRule?.theory_price_per_minute_rappen || 0

    let scaledPriceRappen: number
    if (theoryPricePerMinuteRappen > 0) {
      // ✅ Preis aus der vom Tenant konfigurierten Theorie-Preisregel dieser Kategorie
      scaledPriceRappen = roundToNearestFranken(Math.round(theoryPricePerMinuteRappen * durationVal))
      logger.debug(`📚 Theorielektion (Kategorie ${categoryCode}): ${durationVal}min → CHF ${(scaledPriceRappen / 100).toFixed(2)} (aus Preisregel)`)
    } else {
      // Fallback, falls für diese Kategorie (noch) keine Theorie-Preisregel existiert
      const THEORY_BASE_RAPPEN = 8500 // 85 CHF for 45 minutes
      const THEORY_BASE_DURATION_MIN = 45
      scaledPriceRappen = roundToNearestFranken(Math.round((THEORY_BASE_RAPPEN / THEORY_BASE_DURATION_MIN) * durationVal))
      logger.warn(`⚠️ Keine Theorie-Preisregel für Kategorie "${categoryCode}" gefunden - Verwende Standardpreis (85 CHF/45min)`)
      logFallbackUsed(
        'pricing',
        `Keine Theorie-Preisregel für Kategorie "${categoryCode}" konfiguriert – Standardpreis (85 CHF/45min) verwendet.`,
        { categoryCode, tenantId: theoryTenantId || null }
      )
    }

    const result: CalculatedPrice = {
      base_price_rappen: scaledPriceRappen,
      admin_fee_rappen: 0,
      total_rappen: scaledPriceRappen,
      base_price_chf: (scaledPriceRappen / 100).toFixed(2),
      admin_fee_chf: '0.00',
      total_chf: (scaledPriceRappen / 100).toFixed(2),
      category_code: categoryCode,
      duration_minutes: durationMinutes,
      appointment_number: 1
    }
    
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

    // Termin-Nummer *vor* Cache-Lookup (Schlüssel muss sich ändern, wenn 2. → 3. Lektion)
    let appointmentNumber = 1
    if (userId) {
      appointmentNumber = await getAppointmentCount(userId, categoryCode)
    }

    const cacheKey = generatePriceKey(categoryCode, durationValue, userId, appointmentNumber)

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

    // Prefer category-scoped rule (driving_school-style). Fall back to an
    // event-type-scoped rule (e.g. mental_coach 'session'/'package', which have
    // no category_code) when no category rule exists.
    const rule = getPricingRule(categoryCode) || (eventTypeCode ? getPricingRule(eventTypeCode) : null)
    if (!rule) {
      logger.warn(`⚠️ Keine Preisregel für Kategorie "${categoryCode}" gefunden - Verwende 0 CHF`)
      logFallbackUsed(
        'pricing',
        `Keine Preisregel für Kategorie "${categoryCode}" gefunden – Preis wurde auf 0 CHF gesetzt.`,
        { categoryCode, tenantId: actualTenantId || null },
        'error'
      )
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

    // ✅ Grundpreis berechnen
    let basePriceRappen = Math.round(Number(rule.price_per_minute_rappen) * durationValue)
    basePriceRappen = roundToNearestFranken(basePriceRappen)

    // ✅ Admin-Fee basierend auf tatsächlichen Zahlungen + admin_fee_applies_from der
    // Preisregel (Motorräder haben admin_fee_applies_from: 999 und sind damit faktisch
    // ausgenommen, ohne eine separate Kategorie-Liste pflegen zu müssen).
    const adminFeeAppliesFrom = rule.admin_fee_applies_from ?? 2
    
    let adminFeeRappen = 0
    
    // ✅ KORRIGIERT: Im Edit-Mode wird Admin-Fee bereits aus der Datenbank geladen
    if (!isEditMode && rule) {
      // Create-Mode: Admingebühr basierend auf Regeln berechnen
      if (userId) {
        // Prüfe ob Admin-Fee bereits bezahlt wurde
        const shouldApply = await shouldApplyAdminFee(userId, categoryCode, adminFeeAppliesFrom)
        
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
        adminFeeAppliesFrom,
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
    tenantId?: string,
    eventTypeCode?: string
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
        tenantId,
        eventTypeCode
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
        error: error.message || 'Fehler bei Preisberechnung (Offline-Fallback aktiv)',
        isFallback: true
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
  const invalidateCache = (type?: 'pricing' | 'calculations' | 'all') => {
    switch (type) {
      case 'pricing':
        lastLoaded.value = null
        break
      case 'calculations':
        priceCalculationCache.value.clear()
        break
      case 'all':
      default:
        lastLoaded.value = null
        priceCalculationCache.value.clear()
        break
    }
  }

  // ===== COMPUTED VALUES =====
  const isLoaded = computed(() => pricingRules.value.length > 0)
  const categoriesCount = computed(() => pricingRules.value.length)
  const availableCategories = computed(() => 
    pricingRules.value.map(rule => rule.category_code).sort()
  )
  // ✅ True, sobald mind. eine Kategorie eine aktive Theorie-Preisregel hat
  // (= Tenant hat Theorielektionen für diese Kategorie aktiviert)
  const hasTheoryPricing = computed(() =>
    pricingRules.value.some(rule => (rule.theory_price_per_minute_rappen || 0) > 0)
  )
  const theoryEnabledCategories = computed(() =>
    pricingRules.value
      .filter(rule => (rule.theory_price_per_minute_rappen || 0) > 0)
      .map(rule => rule.category_code)
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
    hasTheoryPricing,
    theoryEnabledCategories,
    // True while pricingRules were populated from COMPLETE_FALLBACK_RULES instead of the tenant's real data.
    isFallbackActive,

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