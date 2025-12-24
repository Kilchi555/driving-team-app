<template>
  <div class="min-h-[100svh] bg-gradient-to-b from-white to-gray-50 text-gray-900">
    <!-- Header/Hero -->
    <div class="border-b border-gray-100 bg-white/80 backdrop-blur">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex flex-col gap-3">
          <div>
            <button @click="goBack" class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Zurück
            </button>
          </div>
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shadow-inner">
              <span class="text-emerald-600 text-xl">📘</span>
            </div>
            <div>
              <h1 class="text-2xl font-bold tracking-tight">Lernbereich</h1>
              <p class="text-sm text-gray-500 mt-0.5">Deine Inhalte zum Nachlesen und Vertiefen</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <div v-if="isLoading" class="space-y-4">
        <div class="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div v-for="i in 4" :key="i" class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div class="h-5 w-40 bg-gray-200 rounded animate-pulse mb-3"></div>
            <div class="flex gap-2">
              <div class="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
              <div class="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="error" class="p-4 bg-red-50 text-red-700 border border-red-200 rounded">
        {{ error }}
      </div>

      <div v-else>
        <div v-if="items.length === 0" class="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm text-center">
          <div class="w-16 h-16 mx-auto mb-3 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <span class="text-emerald-600 text-2xl">✨</span>
          </div>
          <h2 class="text-lg font-semibold">Hier erscheinen deine Lerninhalte</h2>
          <p class="text-sm text-gray-500 mt-1">Sobald ein Thema in deinen Fahrstunden bewertet wurde und Lerntext oder Bilder hinterlegt sind, findest du es hier.</p>
          <div class="mt-4">
          </div>
        </div>

        <div v-else class="space-y-6">
          <!-- Group by category -->
          <div v-for="category in groupedItems" :key="category.id" class="space-y-3">
            <!-- Category Header -->
            <div class="flex items-center gap-3">
              <div 
                class="w-1 h-8 rounded-full"
                :style="{ backgroundColor: category.color || '#3B82F6' }"
              ></div>
              <h2 class="text-lg font-semibold text-gray-900">{{ category.name }}</h2>
              <span class="text-sm text-gray-500">({{ category.items.length }})</span>
            </div>
            
            <!-- Category Items -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-6">
              <div
                v-for="criterion in category.items"
                :key="criterion.id"
                class="group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
                @click="openDetail(criterion)"
                tabindex="0"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <h3 class="font-semibold truncate">{{ criterion.name }}</h3>
                  </div>
                  <div class="shrink-0 inline-flex items-center gap-1 text-sm text-emerald-700 group-hover:text-emerald-900">
                    Ansehen
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="selectedCriterion" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div class="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div class="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold truncate">{{ selectedCriterion.name }}</h3>
          <button @click="closeDetail" class="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>
        <div class="p-5 space-y-6">
          <div v-if="getContentData(selectedCriterion)?.title" class="text-base font-medium">
            {{ getContentData(selectedCriterion).title }}
          </div>
          <div v-for="(sec, idx) in (getContentData(selectedCriterion)?.sections || [])" :key="idx" class="space-y-2">
            <div v-if="sec.title" class="text-sm font-semibold text-gray-800">{{ sec.title }}</div>
            <div v-if="sec.text" class="text-sm text-gray-800 whitespace-pre-line">{{ sec.text }}</div>
            <div v-if="sec.images && sec.images.length" class="space-y-3">
              <img 
                v-for="(img, i) in sec.images" 
                :key="i" 
                :src="img" 
                class="w-full rounded-lg border object-contain"
                style="max-height: 60vh;"
              />
            </div>
          </div>
          <div v-if="!hasText(selectedCriterion) && !hasImages(selectedCriterion)" class="text-sm text-gray-500">Kein Lerninhalt vorhanden.</div>
        </div>
        <div class="px-5 py-4 border-t bg-gray-50 flex justify-end">
          <button @click="closeDetail" class="px-4 py-2 rounded-lg border text-sm hover:bg-gray-100">Schließen</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'
import { storeToRefs } from 'pinia'
import { navigateTo, useRouter } from '#app'
import { useTenantBranding } from '~/composables/useTenantBranding'

const isLoading = ref(true)
const error = ref<string | null>(null)
const items = ref<any[]>([])
const selectedCriterion = ref<any | null>(null)
const router = useRouter()

// Group items by evaluation category
const groupedItems = computed(() => {
  const groups = new Map()
  
  items.value.forEach(item => {
    const category = item.evaluation_categories
    if (!category) return
    
    if (!groups.has(category.id)) {
      groups.set(category.id, {
        id: category.id,
        name: category.name,
        color: category.color,
        display_order: category.display_order,
        items: []
      })
    }
    
    groups.get(category.id).items.push(item)
  })
  
  // Convert to array and sort by display_order
  return Array.from(groups.values()).sort((a, b) => a.display_order - b.display_order)
})

// Helper: Parse educational_content if it's a string
const parseEducationalContent = (c: any) => {
  if (!c.educational_content) return null
  
  // If it's already an object, return it
  if (typeof c.educational_content === 'object') {
    return c.educational_content
  }
  
  // If it's a string, try to parse it
  if (typeof c.educational_content === 'string') {
    try {
      return JSON.parse(c.educational_content)
    } catch (e) {
      console.warn('Failed to parse educational_content for', c.name, e)
      return null
    }
  }
  
  return null
}

const hasText = (c: any) => {
  const content = parseEducationalContent(c)
  if (!content) return false
  
  // Check _default or direct structure
  const data = content._default || content
  return !!(data.title || data.sections?.some((s: any) => s.text && s.text.length > 0))
}

const hasImages = (c: any) => {
  const content = parseEducationalContent(c)
  if (!content) return false
  
  // Check _default or direct structure
  const data = content._default || content
  return !!(data.sections?.some((s: any) => s.images && s.images.length > 0))
}

// Helper: Get the content data (handles _default structure)
const getContentData = (c: any) => {
  if (!c?.educational_content) return null
  
  // If there's a _default key, use that, otherwise use the content directly
  return c.educational_content._default || c.educational_content
}

const openDetail = (c: any) => {
  // Parse educational_content if it's a string
  const parsedContent = parseEducationalContent(c)
  selectedCriterion.value = {
    ...c,
    educational_content: parsedContent
  }
}

const closeDetail = () => {
  selectedCriterion.value = null
}

const goBack = () => {
  try {
    router.back()
  } catch {
    navigateTo('/dashboard')
  }
}

const goToLessonBooking = async () => {
  try {
    const { currentTenantBranding } = useTenantBranding()
    const slug = currentTenantBranding.value?.slug
    const referrer = '/learning' // Return to landing page
    if (slug) {
      await navigateTo({
        path: `/booking/availability/${slug}`,
        query: { referrer }
      })
    } else {
      await navigateTo('/booking/availability')
    }
  } catch {
    await navigateTo('/booking/availability')
  }
}

onMounted(async () => {
  try {
    const supabase = getSupabase()
    const auth = useAuthStore()
    const { user, userProfile } = storeToRefs(auth)
    if (!user.value?.id) throw new Error('Nicht eingeloggt')
    // appointments.user_id referenziert die interne users.id, daher userProfile.id verwenden
    const currentUserId = userProfile.value?.id
    if (!currentUserId) throw new Error('Kein Benutzerprofil gefunden')
    
    console.log('🔍 Learning page - Current user ID:', currentUserId)

    // 1) Fahrkategorien des Schülers sammeln (aus users.category und appointments.type)
    const { data: userData } = await supabase
      .from('users')
      .select('category')
      .eq('id', currentUserId)
      .single()
    
    let studentCategoryCodes: string[] = []
    
    // Hauptkategorie aus users.category (kann Array oder String sein)
    if (userData?.category) {
      if (Array.isArray(userData.category)) {
        studentCategoryCodes.push(...userData.category)
      } else {
        studentCategoryCodes.push(userData.category)
      }
    }

    // 2) Termine des Schülers laden (inkl. type = Kategorie)
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, type')
      .eq('user_id', currentUserId)
    
    console.log('📅 Appointments loaded:', appointments?.length || 0)
    
    // Kategorien aus Appointments sammeln
    const appointmentCategories = [...new Set(
      (appointments || [])
        .map(a => a.type)
        .filter(Boolean)
    )]
    
    // Kombiniere beide Listen und dedupliziere
    studentCategoryCodes = [...new Set([...studentCategoryCodes, ...appointmentCategories])]
    console.log('🚗 Student categories (from users + appointments):', studentCategoryCodes)

    const aptIds = (appointments || []).map(a => a.id)
    if (aptIds.length === 0) {
      console.log('⚠️ No appointments found')
      items.value = []
      return
    }

    // 3) Notes/Evaluations zu diesen Terminen laden und dabei Kriterien-IDs sammeln
    const { data: notes } = await supabase
      .from('notes')
      .select('evaluation_criteria_id, criteria_rating')
      .in('appointment_id', aptIds)
    
    console.log('📝 Notes loaded:', notes?.length || 0)
    console.log('📝 Sample notes:', notes?.slice(0, 3))

    // Kriterium gilt als "bewertet", wenn es mindestens eine Note mit evaluation_criteria_id gibt
    const ratedCriteriaIds = [...new Set((notes || [])
      .filter(n => n.evaluation_criteria_id)
      .map(n => n.evaluation_criteria_id))]
    
    console.log('✅ Rated criteria IDs:', ratedCriteriaIds.length, ratedCriteriaIds)

    if (ratedCriteriaIds.length === 0) {
      console.log('⚠️ No rated criteria found')
      items.value = []
      return
    }

    // 4) Kriterien mit Lerninhalt laden (inkl. driving_categories und category_id)
    const { data: criteria, error: criteriaError } = await supabase
      .from('evaluation_criteria')
      .select(`
        id, 
        name, 
        educational_content, 
        driving_categories,
        category_id,
        display_order,
        evaluation_categories!inner(id, name, display_order, color)
      `)
      .in('id', ratedCriteriaIds)
      .order('display_order')
    
    if (criteriaError) {
      console.error('❌ Error loading criteria:', criteriaError)
    }
    
    console.log('📚 Criteria loaded:', criteria?.length || 0)
    console.log('📚 All criteria with content:', criteria?.map(c => ({
      id: c.id,
      name: c.name,
      category: c.evaluation_categories?.name,
      has_educational_content: !!c.educational_content,
      driving_categories: c.driving_categories,
      content_keys: c.educational_content ? Object.keys(c.educational_content) : [],
      content_preview: c.educational_content ? JSON.stringify(c.educational_content).substring(0, 200) : 'null'
    })))

    // 5) Filter: Nur Kriterien mit Inhalt UND für Kategorien des Schülers
    const filtered = (criteria || []).filter(c => {
      // Hat Text oder Bilder?
      const hasContent = hasText(c) || hasImages(c)
      if (!hasContent) {
        console.log('❌ No content:', c.name)
        return false
      }
      
      // Wenn keine driving_categories gesetzt sind, für alle anzeigen
      if (!c.driving_categories || c.driving_categories.length === 0) {
        console.log('✅ No category restriction:', c.name)
        return true
      }
      
      // Prüfe ob mindestens eine Kategorie des Schülers in den driving_categories ist
      const matchesCategory = c.driving_categories.some(dc => studentCategoryCodes.includes(dc))
      console.log(matchesCategory ? '✅' : '❌', 'Category match:', c.name, 'has:', c.driving_categories, 'student:', studentCategoryCodes)
      return matchesCategory
    })
    
    console.log('✅ Filtered criteria (with text or images AND matching student categories):', filtered.length, 'of', criteria?.length || 0)
    
    // 6) Sortiere nach evaluation_categories.display_order
    const sorted = filtered.sort((a, b) => {
      const orderA = a.evaluation_categories?.display_order || 999
      const orderB = b.evaluation_categories?.display_order || 999
      return orderA - orderB
    })
    
    items.value = sorted
  } catch (e: any) {
    console.error('❌ Error in learning page:', e)
    error.value = e.message || 'Fehler beim Laden'
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
</style>


