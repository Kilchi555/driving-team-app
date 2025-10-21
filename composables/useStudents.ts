// composables/useStudents.ts
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import type { User } from '~/types'

export const useStudents = () => {
  const students = ref<User[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')
  const showInactive = ref(false)
  const showAllStudents = ref(false) // false = nur eigene, true = alle

  // Computed: Gefilterte Schülerliste
  const filteredStudents = computed(() => {
    let filtered = students.value

    // Suche nach Name/Email
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter(student =>
        `${student.first_name} ${student.last_name}`.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query)
      )
    }

    // Aktiv/Inaktiv Filter
    if (!showInactive.value) {
      filtered = filtered.filter(student => student.is_active)
    }

    return filtered
  })

  // Statistiken
  const totalStudents = computed(() => students.value.length)
  const activeStudents = computed(() => students.value.filter(s => s.is_active).length)
  const inactiveStudents = computed(() => students.value.filter(s => !s.is_active).length)

  // Schüler laden
  const fetchStudents = async (currentUserId: string, userRole: string) => {
    isLoading.value = true
    error.value = null

    try {
      const supabase = getSupabase()
      
      // Get current user's tenant_id
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', authUser?.id)
        .single()
      const tenantId = userProfile?.tenant_id
      
      if (!tenantId) {
        throw new Error('User has no tenant assigned')
      }

      console.log('🔍 useStudents - Current tenant_id:', tenantId)
      
      let query = supabase
        .from('users')
        .select('*')
        .eq('role', 'client')
        .eq('tenant_id', tenantId) // Filter by current tenant

      // Staff sieht nur eigene Schüler, außer showAllStudents ist true
      if (userRole === 'staff' && !showAllStudents.value) {
        query = query.eq('assigned_staff_id', currentUserId)
      }

      // Sortierung nach Nachname, Vorname
      query = query.order('last_name').order('first_name')

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      students.value = data || []
      console.log('✅ Students loaded for tenant:', students.value.length)

    } catch (err: any) {
      error.value = err.message
      console.error('Fehler beim Laden der Schüler:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Einzelnen Schüler laden
  const fetchStudent = async (studentId: string) => {
    try {
      const supabase = getSupabase()
      
      // Get current user's tenant_id
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', authUser?.id)
        .single()
      const tenantId = userProfile?.tenant_id
      
      if (!tenantId) {
        throw new Error('User has no tenant assigned')
      }
      
      const { data, error: fetchError } = await supabase
        .from('users')
        .select(`
          *,
          assigned_staff:users!users_assigned_staff_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', studentId)
        .eq('role', 'client')
        .eq('tenant_id', tenantId) // Filter by current tenant
        .single()

      if (fetchError) throw fetchError

      return data

    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // Schüler-Termine laden
  const fetchStudentAppointments = async (studentId: string) => {
    try {
      const supabase = getSupabase()
      
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          staff:users!appointments_staff_id_fkey (
            first_name,
            last_name
          ),
          notes (
            staff_rating,
            staff_note,
            last_updated_at
          )
        `)
        .eq('user_id', studentId)
        .is('deleted_at', null) // ✅ Soft Delete Filter
        .order('start_time', { ascending: false })

      if (fetchError) throw fetchError

      return data || []

    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // Schüler aktivieren/deaktivieren
  const toggleStudentStatus = async (studentId: string, isActive: boolean) => {
    try {
      const supabase = getSupabase()
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_active: isActive })
        .eq('id', studentId)

      if (updateError) throw updateError

      // Lokale Liste aktualisieren
      const student = students.value.find(s => s.id === studentId)
      if (student) {
        student.is_active = isActive
      }

    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // ✅ NEUER WORKFLOW: Schüler hinzufügen mit SMS-Token (OHNE Auth-User)
  const addStudent = async (studentData: Partial<User>) => {
    try {
      const supabase = getSupabase()
      
      // Get current user's tenant_id
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', authUser?.id)
        .single()
      
      const tenantId = userProfile?.tenant_id
      
      if (!tenantId) {
        throw new Error('User has no tenant assigned')
      }
      
      // ✅ NEU: Prüfe auf Duplikate (phone und email) im gleichen Tenant
      const duplicateChecks = []
      
      if (studentData.phone) {
        const { data: existingPhone } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, auth_user_id, is_active')
          .eq('tenant_id', tenantId)
          .eq('phone', studentData.phone)
          .limit(1)
        
        if (existingPhone && existingPhone.length > 0) {
          const existing = existingPhone[0]
          const errorObj: any = new Error('DUPLICATE_PHONE')
          errorObj.duplicateType = 'phone'
          errorObj.existingUser = existing
          throw errorObj
        }
      }
      
      if (studentData.email) {
        const { data: existingEmail } = await supabase
          .from('users')
          .select('id, first_name, last_name, phone, auth_user_id, is_active')
          .eq('tenant_id', tenantId)
          .eq('email', studentData.email)
          .limit(1)
        
        if (existingEmail && existingEmail.length > 0) {
          const existing = existingEmail[0]
          const errorObj: any = new Error('DUPLICATE_EMAIL')
          errorObj.duplicateType = 'email'
          errorObj.existingUser = existing
          throw errorObj
        }
      }
      
      // Generiere UUID und Token
      const userId = crypto.randomUUID()
      const onboardingToken = crypto.randomUUID()
      const tokenExpires = new Date()
      tokenExpires.setDate(tokenExpires.getDate() + 7) // 7 Tage gültig
      
      // 1. Erstelle nur users Eintrag (OHNE auth_user_id)
      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          ...studentData,
          id: userId,
          auth_user_id: null, // Erst nach Onboarding gesetzt
          tenant_id: tenantId, // ✅ FIX: tenant_id hinzufügen
          role: 'client',
          is_active: false, // Inaktiv bis Onboarding abgeschlossen
          onboarding_status: 'pending',
          onboarding_token: onboardingToken,
          onboarding_token_expires: tokenExpires.toISOString()
        }])

      if (insertError) throw insertError
      
      // Daten für Response konstruieren (ohne erneute DB-Abfrage)
      const data = {
        ...studentData,
        id: userId,
        auth_user_id: null,
        role: 'client',
        is_active: false,
        onboarding_status: 'pending',
        onboarding_token: onboardingToken,
        onboarding_token_expires: tokenExpires.toISOString()
      }

      // 2. Sende SMS mit Onboarding-Link
      try {
        const { $fetch } = useNuxtApp()
        await $fetch('/api/students/send-onboarding-sms', {
          method: 'POST',
          body: {
            phone: data.phone,
            firstName: data.first_name,
            token: onboardingToken
          }
        })
        
        console.log('✅ Onboarding SMS sent to:', data.phone)
        
      } catch (smsError: any) {
        console.warn('⚠️ SMS sending failed:', smsError.message)
        // Student wurde erstellt, SMS-Versand hat gefehlt - kann manuell wiederholt werden
      }

      // Zur lokalen Liste hinzufügen
      students.value.unshift(data)

      return data

    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // Schüler bearbeiten
  const updateStudent = async (studentId: string, updates: Partial<User>) => {
    try {
      const supabase = getSupabase()
      
      const { data, error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', studentId)
        .select()
        .single()

      if (updateError) throw updateError

      // Lokale Liste aktualisieren
      const index = students.value.findIndex(s => s.id === studentId)
      if (index !== -1) {
        students.value[index] = { ...students.value[index], ...data }
      }

      return data

    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  return {
    // State
    students,
    isLoading,
    error,
    searchQuery,
    showInactive,
    showAllStudents,

    // Computed
    filteredStudents,
    totalStudents,
    activeStudents,
    inactiveStudents,

    // Methods
    fetchStudents,
    fetchStudent,
    fetchStudentAppointments,
    toggleStudentStatus,
    addStudent,
    updateStudent
  }
}