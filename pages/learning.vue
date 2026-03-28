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
          <p class="text-sm text-gray-500 mt-1">Sobald ein Thema in deinen Fahrstunden bewertet wurde, findest du es hier.</p>
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
              <span class="text-sm font-medium text-emerald-600">{{ category.percentage }}%</span>
            </div>
            
            <!-- Category Items -->
            <div v-if="category.items.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-6">
              <div
                v-for="criterion in category.items"
                :key="criterion.id"
                class="group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
                @click="openDetail(criterion)"
                tabindex="0"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0 flex-1">
                    <h3 class="font-semibold text-sm leading-snug break-words">{{ criterion.name }}</h3>
                  </div>
                  <div
                    v-if="criterion.highestRating"
                    class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    :class="{
                      'bg-red-100 text-red-700': criterion.highestRating <= 2,
                      'bg-yellow-100 text-yellow-700': criterion.highestRating === 3,
                      'bg-emerald-100 text-emerald-700': criterion.highestRating >= 4
                    }"
                  >
                    {{ criterion.highestRating }}
                  </div>
                </div>
                <div class="mt-3 flex items-center justify-between">
                  <span v-if="hasText(criterion) || hasImages(criterion)" class="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                    Lerninhalt vorhanden
                  </span>
                  <span v-else class="text-xs text-gray-400">Noch kein Lerninhalt</span>
                  <svg class="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
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
import { useAuthStore } from '~/stores/auth'
import { storeToRefs } from 'pinia'
import { navigateTo, useRouter } from '#app'
import { useTenantBranding } from '~/composables/useTenantBranding'

const isLoading = ref(true)
const error = ref<string | null>(null)
const items = ref<any[]>([])
const allCategoriesWithProgress = ref<any[]>([])
const selectedCriterion = ref<any | null>(null)
const router = useRouter()

// Group items by evaluation category, showing only categories that have evaluated items
const groupedItems = computed(() => {
  return allCategoriesWithProgress.value
    .map(category => {
      const categoryItems = items.value.filter(item => 
        item.evaluation_categories?.id === category.id
      )
      return {
        ...category,
        items: categoryItems
      }
    })
    .filter(category => category.items.length > 0)
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
    const auth = useAuthStore()
    const { user } = storeToRefs(auth)
    if (!user.value?.id) throw new Error('Nicht eingeloggt')
    
    console.log('🔍 Learning page - Loading via API...')

    // ✅ SECURE API CALL - Get all learning progress data
    const response = await $fetch('/api/customer/get-learning-progress', {
      method: 'GET'
    }) as any

    if (!response.success) {
      throw new Error('Failed to load learning progress')
    }

    // ✅ Extract data from API response
    const { 
      studentCategories: studentCategoryCodes, 
      appointments, 
      maxRating, 
      notes, 
      categories: allCategories, 
      criteria: allCriteria 
    } = response.data

    console.log('✅ API Response:', {
      studentCategories: studentCategoryCodes.length,
      appointments: appointments.length,
      maxRating,
      notes: notes.length,
      categories: allCategories.length,
      criteria: allCriteria.length
    })

    if (appointments.length === 0) {
      console.log('⚠️ No appointments found')
      items.value = []
      return
    }

    // Create map: criteria_id -> ratings[]
    const criteriaRatingsMap = new Map()
    notes?.forEach((note: any) => {
      if (!criteriaRatingsMap.has(note.evaluation_criteria_id)) {
        criteriaRatingsMap.set(note.evaluation_criteria_id, [])
      }
      criteriaRatingsMap.get(note.evaluation_criteria_id).push(note.criteria_rating)
    })
    
    console.log('📊 Criteria with ratings:', criteriaRatingsMap.size)

    // 8) Filter criteria for student's driving categories (no content requirement)
    const criteriaForStudent = (allCriteria || []).filter(c => {
      // If no driving_categories set, show for all
      if (!c.driving_categories || c.driving_categories.length === 0) return true
      // Check if at least one student category is in driving_categories
      return c.driving_categories.some(dc => studentCategoryCodes.includes(dc))
    })
    
    console.log('✅ Criteria for student categories:', criteriaForStudent.length, 'of', allCriteria?.length || 0)
    
    // 9) Calculate progress per category (for ALL categories, even with 0%)
    const categoryProgressMap = new Map()
    
    // Initialize all categories with 0 progress
    allCategories?.forEach(cat => {
      categoryProgressMap.set(cat.id, {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryColor: cat.color,
        categoryDisplayOrder: cat.display_order,
        totalCriteria: 0,
        totalPossiblePoints: 0,
        earnedPoints: 0
      })
    })
    
    allCriteria?.forEach(criterion => {
      const categoryId = criterion.evaluation_categories?.id
      if (!categoryId) return
      
      // Check if criterion matches student's driving categories
      const matchesCategory = !criterion.driving_categories || 
                             criterion.driving_categories.length === 0 ||
                             criterion.driving_categories.some(dc => studentCategoryCodes.includes(dc))
      
      if (!matchesCategory) return
      
      const progress = categoryProgressMap.get(categoryId)
      if (!progress) return
      
      progress.totalCriteria++
      progress.totalPossiblePoints += maxRating
      
      // Add earned points if criterion was rated
      if (criteriaRatingsMap.has(criterion.id)) {
        const ratings = criteriaRatingsMap.get(criterion.id)
        // Use the highest rating for this criterion
        const highestRating = Math.max(...ratings)
        progress.earnedPoints += highestRating
      }
    })
    
    console.log('📊 Category progress:', Array.from(categoryProgressMap.entries()).map(([id, p]) => ({
      category: p.categoryName,
      criteria: p.totalCriteria,
      progress: p.totalPossiblePoints > 0 
        ? `${p.earnedPoints}/${p.totalPossiblePoints} = ${((p.earnedPoints / p.totalPossiblePoints) * 100).toFixed(1)}%`
        : '0%'
    })))
    
    // 10) Build items: all criteria for student that have been evaluated
    const sorted = criteriaForStudent
      .filter(c => criteriaRatingsMap.has(c.id)) // Only show if evaluated
      .map(c => {
        const categoryId = c.evaluation_categories?.id
        const ratings = criteriaRatingsMap.get(c.id) || []
        const latestRating = ratings[ratings.length - 1] ?? null
        const highestRating = ratings.length > 0 ? Math.max(...ratings) : null
        return {
          ...c,
          latestRating,
          highestRating,
          categoryProgress: categoryProgressMap.get(categoryId)
        }
      })
      .sort((a, b) => {
        const orderA = a.evaluation_categories?.display_order || 999
        const orderB = b.evaluation_categories?.display_order || 999
        return orderA - orderB
      })
    
    // 11) Store categories with progress (even if empty)
    allCategoriesWithProgress.value = Array.from(categoryProgressMap.values())
      .map(progress => ({
        id: progress.categoryId,
        name: progress.categoryName,
        color: progress.categoryColor,
        display_order: progress.categoryDisplayOrder,
        progress: progress,
        percentage: progress.totalPossiblePoints > 0
          ? Math.round((progress.earnedPoints / progress.totalPossiblePoints) * 100)
          : 0
      }))
      .sort((a, b) => a.display_order - b.display_order)
    
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


