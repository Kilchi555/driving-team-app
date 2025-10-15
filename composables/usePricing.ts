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
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('event_types')
      .select('code, name, default_price_rappen, default_fee_rappen, require_payment')
      .eq('code', code)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single()
    
    if (error) {
      console.error('Error loading event type:', error)
      return null
    }
    
    return data
  } catch (err) {
    console.error('Error in getEventTypeByCode:', err)
    return null
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
      console.log('🔄 Loading pricing rules from Supabase...')
      
      // Get current user's tenant_id
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        throw new Error('User not authenticated')
      }
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', currentUser.id)
        .single()
      
      if (userError) throw userError
      if (!userData?.tenant_id) {
        console.warn('⚠️ User has no tenant_id, using fallback pricing')
        await createFallbackPricingRules()
        return
      }
      
      // Get tenant business_type
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('business_type')
        .eq('id', userData.tenant_id)
        .single()

      if (tenantError) throw tenantError
      
      // Only load pricing rules if business_type is driving_school
      if (tenantData?.business_type !== 'driving_school') {
        console.log('🚫 Pricing rules not available for business_type:', tenantData?.business_type)
        await createFallbackPricingRules()
        return
      }
      
      console.log('🔍 Loading pricing rules for tenant:', userData.tenant_id)
      
      const { data, error } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('tenant_id', userData.tenant_id)
        .eq('is_active', true)
        .order('category_code')

      if (error) {
        console.error('❌ Database error:', error)
        throw new Error(`Database error: ${error.message}`)
      }

      console.log('📊 Raw pricing rules from DB:', data?.length || 0, 'rules for tenant', userData.tenant_id)
      console.log('📊 Pricing rules details:', data?.map(r => ({
        id: r.id,
        category: r.category_code,
        rule_type: r.rule_type,
        price: r.price_per_minute_rappen,
        tenant_id: r.tenant_id
      })))

      if (!data || data.length === 0) {
        console.warn('⚠️ No pricing rules found for tenant, using fallback')
        await createFallbackPricingRules()
        return
      }

      // ✅ KORRIGIERT: Kombiniere base_price und admin_fee Regeln basierend auf rule_type
      const rulesByCategory = data.reduce((acc, rule) => {
        console.log(`🔍 Verarbeite Regel für ${rule.category_code}:`, {
          rule_type: rule.rule_type,
          rule_name: rule.rule_name,
          price_per_minute: rule.price_per_minute_rappen,
          admin_fee: rule.admin_fee_rappen,
          admin_fee_applies_from: rule.admin_fee_applies_from
        })
        
        if (!acc[rule.category_code]) {
          acc[rule.category_code] = {
            category_code: rule.category_code,
            rule_name: rule.rule_name || `${rule.category_code} - Regel`,
            price_per_minute_rappen: 0,
            admin_fee_rappen: 0,
            admin_fee_applies_from: 2,
            base_duration_minutes: 45,
            is_active: true,
            valid_from: rule.valid_from,
            valid_until: rule.valid_until
          }
          console.log(`🆕 Neue Kategorie erstellt: ${rule.category_code}`)
        }
        
        // ✅ KORRIGIERT: Kombiniere die Werte basierend auf dem rule_type
        if (rule.rule_type === 'base' || rule.rule_type === 'pricing' || rule.rule_type === 'base_price' || !rule.rule_type) {
          // Base/Pricing Regeln für Grundpreis
          console.log(`📊 Base/Pricing Regel für ${rule.category_code}:`, {
            price_per_minute: rule.price_per_minute_rappen,
            base_duration: rule.base_duration_minutes
          })
          if (rule.price_per_minute_rappen) {
            acc[rule.category_code].price_per_minute_rappen = rule.price_per_minute_rappen
          }
          if (rule.base_duration_minutes) {
            acc[rule.category_code].base_duration_minutes = rule.base_duration_minutes
          }
          if (rule.rule_name && !acc[rule.category_code].rule_name.includes('Admin-Fee')) {
            acc[rule.category_code].rule_name = rule.rule_name
          }
        }
        
        if (rule.rule_type === 'admin_fee') {
          // ✅ Admin-Fee spezifische Regeln
          console.log(`💰 Admin-Fee Regel für ${rule.category_code}:`, {
            admin_fee_rappen: rule.admin_fee_rappen,
            admin_fee_applies_from: rule.admin_fee_applies_from
          })
          if (rule.admin_fee_rappen !== undefined) {
            acc[rule.category_code].admin_fee_rappen = rule.admin_fee_rappen
            console.log(`💰 Admin-Fee Regel geladen für ${rule.category_code}: ${rule.admin_fee_rappen} Rappen`)
          }
          if (rule.admin_fee_applies_from !== undefined) {
            acc[rule.category_code].admin_fee_applies_from = rule.admin_fee_applies_from
            console.log(`🎯 Admin-Fee ab Termin ${rule.admin_fee_applies_from} für ${rule.category_code}`)
          }
          if (rule.rule_name) {
            acc[rule.category_code].rule_name = rule.rule_name
          }
        }
        
        console.log(`📊 Aktueller Stand für ${rule.category_code}:`, {
          price_per_minute: acc[rule.category_code].price_per_minute_rappen,
          admin_fee: acc[rule.category_code].admin_fee_rappen,
          admin_fee_applies_from: acc[rule.category_code].admin_fee_applies_from
        })
        
        return acc
      }, {} as Record<string, any>)

      const pricingRulesData = Object.values(rulesByCategory) as PricingRule[]

      console.log('📊 Processed pricing rules (combined by rule_type):', pricingRulesData.map((r: PricingRule) => ({
        category: r.category_code,
        pricePerMinute: r.price_per_minute_rappen / 100,
        adminFee: r.admin_fee_rappen / 100,
        adminFeeAppliesFrom: r.admin_fee_applies_from,
        ruleName: r.rule_name
      })))

      // ✅ SPEZIELLER DEBUG für Kategorie B
      const categoryBRule = pricingRulesData.find(r => r.category_code === 'B')
      if (categoryBRule) {
        console.log('🎯 KATEGORIE B REGEL GELADEN:', {
          category: categoryBRule.category_code,
          pricePerMinute: categoryBRule.price_per_minute_rappen / 100,
          adminFee: categoryBRule.admin_fee_rappen / 100,
          adminFeeAppliesFrom: categoryBRule.admin_fee_applies_from,
          ruleName: categoryBRule.rule_name
        })
      } else {
        console.warn('⚠️ Keine Regel für Kategorie B gefunden!')
      }

      pricingRules.value = pricingRulesData
      lastLoaded.value = new Date()

      // Cache invalidierung
      priceCalculationCache.value.clear()
      appointmentCountCache.value.clear()

      console.log('✅ Pricing rules loaded:', pricingRulesData.length, 'categories (combined by rule_type)')

    } catch (err: any) {
      console.error('❌ Error loading pricing rules:', err)
      pricingError.value = err.message || 'Fehler beim Laden der Preisregeln'
      await createFallbackPricingRules()
    } finally {
      isLoadingPrices.value = false
    }
  }

  // ✅ NEUE LOGIK: Admin-Fee basierend auf tatsächlichen Zahlungen
  const hasAdminFeeBeenPaid = async (userId: string, categoryCode: string): Promise<boolean> => {
    try {
      console.log(`🔍 Checking if admin fee already paid for user ${userId} in category ${categoryCode}`)
      
      // ✅ KORRIGIERT: Verwende metadata um die Kategorie zu ermitteln (einfacher als JOIN)
      const { data, error } = await supabase
        .from('payments')
        .select('id, admin_fee_rappen, metadata')
        .eq('user_id', userId)
        .gt('admin_fee_rappen', 0) // Admin-Fee wurde bereits bezahlt
        .limit(100) // Lade alle relevanten Payments für diesen User
      
      if (error) {
        console.error('❌ Error checking admin fee payments:', error)
        return false
      }
      
      // ✅ Filtere nach Kategorie in den metadata
      const paymentsWithAdminFee = data?.filter(payment => {
        try {
          const metadata = payment.metadata ? JSON.parse(payment.metadata) : {}
          return metadata.category === categoryCode
        } catch (e) {
          console.warn('⚠️ Could not parse payment metadata:', payment.metadata)
          return false
        }
      }) || []
      
      const hasPaid = paymentsWithAdminFee.length > 0
      console.log(`📊 Admin fee payment check: ${hasPaid ? 'Already paid' : 'Not yet paid'}`, {
        totalPayments: data?.length || 0,
        paymentsWithAdminFee: paymentsWithAdminFee.length,
        category: categoryCode
      })
      
      return hasPaid
      
    } catch (error) {
      console.error('❌ Error in hasAdminFeeBeenPaid:', error)
      return false
    }
  }

  // ✅ NEUE LOGIK: Admin-Fee nur verrechnen wenn noch nie bezahlt
  const shouldApplyAdminFee = async (userId: string, categoryCode: string): Promise<boolean> => {
    // Admin-Fee nur beim 2. Termin UND wenn noch nie bezahlt
    const appointmentCount = await getAppointmentCount(userId, categoryCode)
    const adminFeeAlreadyPaid = await hasAdminFeeBeenPaid(userId, categoryCode)
    
    const shouldApply = appointmentCount === 2 && !adminFeeAlreadyPaid
    
    console.log(`🎯 Admin fee decision for ${categoryCode}:`, {
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
      // ✅ KORRIGIERT: Nur aktive Termine zählen (keine stornierten/abgebrochenen)
      // Das ist wichtig, damit die AdminFee korrekt beim 2. aktiven Termin berechnet wird
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('type', categoryCode)
        .is('deleted_at', null) // ✅ Soft Delete Filter
        .not('status', 'eq', 'cancelled') // ✅ Stornierte Termine nicht zählen
        .not('status', 'eq', 'aborted')   // ✅ Abgebrochene Termine nicht zählen

      if (error) {
        console.error('❌ Error counting appointments for category:', error)
        return 1
      }

      const appointmentNumber = (count || 0) + 1
      
      // Cache speichern
      appointmentCountCache.value.set(cacheKey, {
        count: appointmentNumber,
        timestamp: Date.now()
      })
      
      console.log(`📊 Appointment count for ${categoryCode}: ${appointmentNumber} (${count || 0} active + 1 new)`)
      
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
    userId?: string,
    appointmentType?: string, // ✅ NEU: appointment_type Parameter hinzugefügt
    isEditMode?: boolean, // ✅ NEU: Edit-Mode flag
    appointmentId?: string, // ✅ NEU: Appointment ID für Edit-Mode
    tenantId?: string // ✅ NEU: Tenant ID für Event-Type lookup
  ): Promise<CalculatedPrice> => {
    
    // ✅ NEU: Bei vergangenen Terminen (Edit-Mode) direkt aus der Datenbank laden
    if (isEditMode && appointmentId) {
      console.log(`📝 Edit-Mode: Loading existing pricing from database for appointment: ${appointmentId}`)
      try {
        const supabase = getSupabase()
        const { data: payment, error } = await supabase
          .from('payments')
          .select('lesson_price_rappen, admin_fee_rappen, total_amount_rappen, credit_used_rappen, credit_transaction_id')
          .eq('appointment_id', appointmentId)
          .single()
        
        if (error && error.code !== 'PGRST116') {
          console.warn('⚠️ Error loading existing pricing from payments:', error)
        } else if (payment) {
          console.log('✅ Existing pricing loaded from database:', {
            lesson_price: (payment.lesson_price_rappen / 100).toFixed(2),
            admin_fee: (payment.admin_fee_rappen / 100).toFixed(2),
            total: (payment.total_amount_rappen / 100).toFixed(2),
            credit_used: (payment.credit_used_rappen / 100).toFixed(2),
            credit_transaction_id: payment.credit_transaction_id
          })
          
          return {
            base_price_rappen: payment.lesson_price_rappen || 0,
            admin_fee_rappen: payment.admin_fee_rappen || 0,
            total_rappen: payment.total_amount_rappen || 0,
            credit_used_rappen: payment.credit_used_rappen || 0,
            credit_transaction_id: payment.credit_transaction_id,
            base_price_chf: ((payment.lesson_price_rappen || 0) / 100).toFixed(2),
            admin_fee_chf: ((payment.admin_fee_rappen || 0) / 100).toFixed(2),
            total_chf: ((payment.total_amount_rappen || 0) / 100).toFixed(2),
            credit_used_chf: ((payment.credit_used_rappen || 0) / 100).toFixed(2),
            category_code: categoryCode, // Verwende den übergebenen categoryCode
            duration_minutes: durationMinutes, // Verwende die übergebene durationMinutes
            appointment_number: 1 // Nicht relevant für Edit-Mode
          }
        }
      } catch (err: any) {
        console.error('❌ Error loading existing pricing from database:', err)
        // Fallback zur normalen Berechnung
      }
    }
      
  // ✅ NEUE VALIDIERUNG: Theorielektionen und Fahrkategorien behandeln
  const validDrivingCategories = ['A', 'A1', 'A35kW', 'B', 'BE', 'C', 'C1', 'CE', 'D', 'D1', 'DE', 'Motorboot', 'BPT']
  
  // ✅ Theorielektionen: Immer 85.- CHF, unabhängig von der Kategorie
  if (appointmentType === 'theory') {
    console.log(`📚 Theorielektion erkannt (appointment_type: ${appointmentType}): Verwende Standardpreis 85.- CHF`)
    
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
    
    console.log('✅ Theorielektion Preis berechnet:', {
      category: categoryCode, // Zeigt die gewählte Fahrkategorie
      appointmentType: appointmentType,
      duration: durationMinutes,
      total: result.total_chf,
      note: 'Standardpreis für Theorielektionen, unabhängig von der Kategorie'
    })
    
    return result
  }
  
  // ✅ Nicht-Fahrkategorien: Event-Type-basierte Preisberechnung
  if (!validDrivingCategories.includes(categoryCode)) {
    console.log(`🔄 Using event-type-based pricing for: ${categoryCode}`)
    
    // Tenant-ID ermitteln falls nicht übergeben
    let actualTenantId = tenantId
    if (!actualTenantId && userId) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', userId)
        .single()
      actualTenantId = userProfile?.tenant_id
    }
    
    // Lade Event-Type für Preisberechnung
    const eventType = await getEventTypeByCode(categoryCode, actualTenantId)
    if (!eventType || !eventType.require_payment) {
      console.log(`🚫 Event type ${categoryCode} does not require payment`)
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
    
    // Berechne Preis: Grundpreis für Grunddauer × Skalierung + Gebühr pro Termin
    const priceForBaseDurationRappen = eventType.default_price_rappen || 0
    const feePerAppointmentRappen = eventType.default_fee_rappen || 0
    const baseDurationMinutes = eventType.default_duration_minutes || 45
    
    // Grundpreis = Preis für Grunddauer × (tatsächliche Dauer / Grunddauer)
    const basePriceRappen = Math.round(priceForBaseDurationRappen * (durationMinutes / baseDurationMinutes))
    const totalRappen = basePriceRappen + feePerAppointmentRappen
    
    return {
      base_price_rappen: basePriceRappen,
      admin_fee_rappen: feePerAppointmentRappen,
      total_rappen: totalRappen,
      base_price_chf: (basePriceRappen / 100).toFixed(2),
      admin_fee_chf: (feePerAppointmentRappen / 100).toFixed(2),
      total_chf: (totalRappen / 100).toFixed(2),
      category_code: categoryCode,
      duration_minutes: durationMinutes,
      appointment_number: 1
    }
  }
  
  // ✅ NEU: Stelle sicher, dass durationMinutes eine Zahl ist
  const durationValue = Array.isArray(durationMinutes) ? durationMinutes[0] : durationMinutes
  const cacheKey = generatePriceKey(categoryCode, durationValue, userId)
    
    // Prüfe Cache
    const cachedPrice = priceCalculationCache.value.get(cacheKey)
    if (cachedPrice && isCacheValid(cachedPrice.timestamp, PRICE_CALCULATION_CACHE_DURATION)) {
      console.log('📦 Using cached price calculation:', cachedPrice.data.total_chf)
      return cachedPrice.data
    }

    // ✅ KORRIGIERT: Pricing Rules nur im Create-Mode laden
    let rule = null
    if (!isEditMode) {
      // Lade Pricing Rules falls noch nicht geladen
      if (pricingRules.value.length === 0) {
        await loadPricingRules()
      }

      rule = getPricingRule(categoryCode)
      if (!rule) {
        throw new Error(`Keine Preisregel für Kategorie ${categoryCode} gefunden`)
      }
    }

    // ✅ KORRIGIERT: Appointment count nur im Create-Mode ermitteln
    let appointmentNumber = 1
    if (!isEditMode && userId) {
      appointmentNumber = await getAppointmentCount(userId, categoryCode)
    }

    // ✅ KORRIGIERT: Grundpreis nur im Create-Mode berechnen
    let basePriceRappen = 0
    if (!isEditMode && rule) {
      basePriceRappen = Math.round(rule.price_per_minute_rappen * durationValue)
      basePriceRappen = roundToNearestFranken(basePriceRappen)
    }

    // ✅ NEUE LOGIK: Admin-Fee basierend auf tatsächlichen Zahlungen
    const motorcycleCategories = ['A', 'A1', 'A35kW']
    const isMotorcycle = motorcycleCategories.includes(categoryCode)
    
    let adminFeeRappen = 0
    
    // ✅ KORRIGIERT: Im Edit-Mode wird Admin-Fee bereits aus der Datenbank geladen
    // (siehe oben: calculatePrice lädt bereits alle Preise aus payments Tabelle)
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

    // Cache speichern
    priceCalculationCache.value.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    })
    
    console.log('✅ Price calculated and cached:', {
      category: categoryCode,
      duration: Array.isArray(durationMinutes) ? durationMinutes[0] : durationMinutes,
      originalDuration: durationMinutes,
      appointmentNumber: appointmentNumber,
      isMotorcycle: motorcycleCategories.includes(categoryCode),
      adminFee: adminFeeRappen > 0 ? `${(adminFeeRappen / 100).toFixed(2)} CHF` : 'Keine',
      total: result.total_chf,
      note: appointmentNumber === 2 && !motorcycleCategories.includes(categoryCode) ? 'Admin-Fee verrechnet (2. Termin dieser Kategorie)' : 'Keine Admin-Fee'
    })

    return result
  }

  // ===== DYNAMIC PRICING FUNCTIONS =====
  const updateDynamicPricing = async (categoryCode: string, durationMinutes: number, userId?: string) => {
    dynamicPricing.value.isLoading = true
    dynamicPricing.value.error = ''

    try {
      // ✅ NEU: Stelle sicher, dass durationMinutes eine Zahl ist
      const durationValue = Array.isArray(durationMinutes) ? durationMinutes[0] : durationMinutes
      
      const result = await calculatePrice(categoryCode, durationValue, userId)
      
      dynamicPricing.value = {
        pricePerMinute: result.base_price_rappen / durationValue / 100,
        adminFeeChf: parseFloat(result.admin_fee_chf),
        appointmentNumber: result.appointment_number,
        hasAdminFee: result.admin_fee_rappen > 0,
        totalPriceChf: result.total_chf,
        category: categoryCode,
        duration: durationValue,
        isLoading: false,
        error: ''
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