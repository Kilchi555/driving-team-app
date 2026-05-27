<template>
  <div class="h-[100svh] flex flex-col bg-gradient-to-b from-white to-gray-50 text-gray-900">
    <!-- Header -->
    <div class="border-b border-gray-100 bg-white/80 backdrop-blur flex-shrink-0 pt-safe">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center gap-4">
          <button @click="goBack" class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50 shrink-0">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Zurück
          </button>
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" :style="{ background: `${primaryColor}15` }">
              <span class="text-base" :style="{ color: primaryColor }">📘</span>
            </div>
            <div class="min-w-0">
              <h1 class="text-lg font-bold tracking-tight truncate">Lernbereich</h1>
              <p class="text-xs text-gray-500 hidden sm:block">Deine Inhalte zum Nachlesen und Vertiefen</p>
            </div>
          </div>
        </div>

        <!-- Category Tabs — only shown when multiple categories with evaluations -->
        <div v-if="drivingCategoryTabs.length > 1" class="mt-3 flex gap-1 overflow-x-auto pb-px scrollbar-none">
          <button
            v-for="tab in drivingCategoryTabs"
            :key="tab"
            @click="activeTab = tab"
            :class="[
              'shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all',
              activeTab === tab
                ? 'text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            ]"
            :style="activeTab === tab ? { background: primaryColor } : {}"
          >
            {{ tab }}
          </button>
        </div>
      </div>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-4">
        <div class="h-5 w-40 bg-gray-200 rounded animate-pulse"></div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div v-for="i in 4" :key="i" class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div class="h-4 w-36 bg-gray-200 rounded animate-pulse mb-3"></div>
            <div class="h-3 w-24 bg-gray-100 rounded animate-pulse"></div>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl">
        {{ error }}
      </div>

      <!-- Empty -->
      <div v-else-if="items.length === 0" class="p-10 bg-white border border-gray-200 rounded-2xl shadow-sm text-center">
        <div class="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center" :style="{ background: `${primaryColor}15` }">
          <span class="text-2xl" :style="{ color: primaryColor }">✨</span>
        </div>
        <h2 class="text-base font-semibold">Noch keine Bewertungen</h2>
        <p class="text-sm text-gray-500 mt-1">Sobald dein Fahrlehrer ein Thema bewertet hat, erscheint es hier.</p>
      </div>

      <!-- Content -->
      <div v-else class="space-y-8">
        <div v-for="category in groupedItems" :key="category.id" class="space-y-3">
          <!-- Category Header -->
          <div class="flex items-center gap-3">
            <div class="w-1 h-7 rounded-full shrink-0" :style="{ backgroundColor: category.color || '#10b981' }"></div>
            <h2 class="text-base font-bold text-gray-900">{{ category.name }}</h2>
            <div class="flex items-center gap-1.5 ml-auto">
              <div class="h-1.5 rounded-full bg-gray-200 w-20 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  :style="{
                    width: category.percentage + '%',
                    backgroundColor: category.color || '#10b981'
                  }"
                ></div>
              </div>
              <span class="text-xs font-semibold" :style="{ color: category.color || '#10b981' }">{{ category.percentage }}%</span>
            </div>
          </div>

          <!-- Criteria Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-4">
            <button
              v-for="criterion in category.items"
              :key="criterion.id"
              class="group text-left bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all hover:tenant-border"
              @click="openDetail(criterion)"
            >
              <div class="flex items-start gap-3">
                <!-- Rating bubble -->
                <div
                  class="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold mt-0.5"
                  :class="{
                    'bg-gray-100 text-gray-400': criterion.highestRating === null,
                    'bg-red-100 text-red-700': criterion.highestRating !== null && (criterion.highestRating ?? 0) <= 2,
                    'bg-yellow-100 text-yellow-700': criterion.highestRating !== null && criterion.highestRating === 3,
                    'bg-emerald-100 text-emerald-700': criterion.highestRating !== null && (criterion.highestRating ?? 0) >= 4
                  }"
                >
                  {{ criterion.highestRating ?? '–' }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-gray-900 leading-snug">{{ criterion.name }}</p>
                  <p v-if="hasText(criterion) || hasImages(criterion)" class="text-xs mt-1" :style="{ color: primaryColor }">
                    Lerninhalt vorhanden →
                  </p>
                  <p v-else class="text-xs text-gray-400 mt-1">Noch kein Lerninhalt</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
    </div><!-- end scrollable content -->

    <!-- Detail Modal -->
    <div v-if="selectedCriterion" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" @click.self="closeDetail">
      <div class="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div class="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between">
          <h3 class="text-base font-bold truncate pr-4">{{ selectedCriterion.name }}</h3>
          <button @click="closeDetail" class="shrink-0 text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>
        <div class="p-5 space-y-5">
          <div v-if="getContentData(selectedCriterion)?.title" class="text-sm font-semibold text-gray-800">
            {{ getContentData(selectedCriterion).title }}
          </div>
          <div v-for="(sec, idx) in (getContentData(selectedCriterion)?.sections || []).filter((s: any) => !s.categories?.length || studentCodes.some((sc: string) => s.categories.includes(sc)))" :key="idx" class="space-y-2">
            <div v-if="sec.title" class="text-sm font-semibold text-gray-700">{{ sec.title }}</div>
            <div v-if="sec.text" class="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{{ sec.text }}</div>
            <div v-if="sec.images && sec.images.length" class="space-y-3">
              <img
                v-for="(img, i) in sec.images"
                :key="i"
                :src="img"
                class="w-full rounded-xl border object-contain"
                style="max-height: 60vh;"
              />
            </div>
          </div>
          <div v-if="!hasText(selectedCriterion) && !hasImages(selectedCriterion)" class="text-center py-8 text-sm text-gray-400">
            <div class="text-3xl mb-2">📖</div>
            Lerninhalt wird noch vorbereitet.
          </div>
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

const { primaryColor } = useTenantBranding()

const isLoading = ref(true)
const error = ref<string | null>(null)
const items = ref<any[]>([])
const allCategoriesWithProgress = ref<any[]>([])
const selectedCriterion = ref<any | null>(null)
const activeTab = ref<string>('')
const studentCodes = ref<string[]>([])
const router = useRouter()

// Unique driving categories that actually have evaluated criteria
const drivingCategoryTabs = computed(() => {
  const cats = new Set<string>()
  items.value.forEach(item => {
    ;(item.evaluatedInCategories as string[]).forEach(c => cats.add(c))
  })
  // Sort alphabetically
  return Array.from(cats).sort()
})

// Grouped items filtered by active tab
const groupedItems = computed(() => {
  const filtered = activeTab.value
    ? items.value.filter(item =>
        // always_visible criteria show in every tab regardless of evaluated category
        item.always_visible ||
        (item.evaluatedInCategories as string[]).includes(activeTab.value)
      )
    : items.value

  return allCategoriesWithProgress.value
    .map(category => ({
      ...category,
      items: filtered.filter(item => item.evaluation_categories?.id === category.id)
    }))
    .filter(category => category.items.length > 0)
})

// Helpers
const parseEducationalContent = (c: any) => {
  if (!c.educational_content) return null
  if (typeof c.educational_content === 'object') return c.educational_content
  if (typeof c.educational_content === 'string') {
    try { return JSON.parse(c.educational_content) } catch { return null }
  }
  return null
}

const hasText = (c: any) => {
  const content = parseEducationalContent(c)
  if (!content) return false
  const data = content._default || content
  return !!(data.title || data.sections?.some((s: any) => s.text?.length > 0))
}

const hasImages = (c: any) => {
  const content = parseEducationalContent(c)
  if (!content) return false
  const data = content._default || content
  return !!(data.sections?.some((s: any) => s.images?.length > 0))
}

const getContentData = (c: any) => {
  if (!c?.educational_content) return null
  return c.educational_content._default || c.educational_content
}

const openDetail = (c: any) => {
  selectedCriterion.value = { ...c, educational_content: parseEducationalContent(c) }
}

const closeDetail = () => { selectedCriterion.value = null }

const goBack = () => {
  try { router.back() } catch { navigateTo('/dashboard') }
}

onMounted(async () => {
  try {
    const auth = useAuthStore()
    const { user } = storeToRefs(auth)
    if (!user.value?.id) throw new Error('Nicht eingeloggt')

    const response = await $fetch('/api/customer/get-learning-progress', { method: 'GET' }) as any
    if (!response.success) throw new Error('Failed to load learning progress')

    const {
      appointments,
      maxRating,
      notes,
      categories: allCategories,
      criteria: allCriteria,
      studentCategories: studentCategoryCodes
    } = response.data

    studentCodes.value = studentCategoryCodes

    if (appointments.length === 0) {
      items.value = []
      return
    }

    // Map appointment_id → appointment type (driving category)
    const appointmentTypeMap = new Map<string, string>()
    appointments.forEach((a: any) => {
      if (a.type) appointmentTypeMap.set(a.id, a.type)
    })

    // ── Deduplicate criteria by name + eval-category-name ────────────────────
    // The API returns global (tenant_id=null) AND tenant-specific duplicates.
    // We pick the canonical version per name: prefer the one with educational_content,
    // then tenant-specific, then global. We also track all alias IDs so that notes
    // referencing any duplicate still surface the canonical criterion.

    // Step 1: find the best criterion per (name + category-name) group
    const canonicalByKey = new Map<string, any>() // key → best criterion
    const allIds = (allCriteria || []).map((c: any) => c.id as string)
    ;(allCriteria || []).forEach((c: any) => {
      const key = `${c.name}__${c.evaluation_categories?.name || ''}`
      const existing = canonicalByKey.get(key)
      if (!existing) {
        canonicalByKey.set(key, c)
      } else {
        const existingHasContent = !!existing.educational_content
        const newHasContent = !!c.educational_content
        const existingIsTenant = !!existing.evaluation_categories?.tenant_id
        const newIsTenant = !!c.evaluation_categories?.tenant_id
        // Prefer: has content > tenant-specific > anything else
        if ((!existingHasContent && newHasContent) ||
            (existingHasContent === newHasContent && !existingIsTenant && newIsTenant)) {
          canonicalByKey.set(key, c)
        }
      }
    })

    // Step 2: map every duplicate ID → canonical ID
    const idToCanonicalId = new Map<string, string>()
    ;(allCriteria || []).forEach((c: any) => {
      const key = `${c.name}__${c.evaluation_categories?.name || ''}`
      const canonical = canonicalByKey.get(key)
      if (canonical) idToCanonicalId.set(c.id, canonical.id)
    })

    // Step 3: build best-content map (name → educational_content) for enrichment
    const bestContentByName = new Map<string, any>()
    ;(allCriteria || []).forEach((c: any) => {
      if (c.educational_content && !bestContentByName.has(c.name)) {
        bestContentByName.set(c.name, c.educational_content)
      }
    })

    // Deduplicated criteria list (one per name+category)
    const deduplicatedCriteria: any[] = Array.from(canonicalByKey.values())

    // Map criteria_id → { ratings[], evaluatedInCategories: Set<string> }
    // Uses canonical IDs so ratings on any duplicate are attributed to the canonical
    const criteriaDataMap = new Map<string, { ratings: number[], cats: Set<string> }>()
    notes.forEach((note: any) => {
      if (!note.evaluation_criteria_id || note.criteria_rating == null) return
      const canonicalId = idToCanonicalId.get(note.evaluation_criteria_id) || note.evaluation_criteria_id
      if (!criteriaDataMap.has(canonicalId)) {
        criteriaDataMap.set(canonicalId, { ratings: [], cats: new Set() })
      }
      const entry = criteriaDataMap.get(canonicalId)!
      entry.ratings.push(note.criteria_rating)
      const aptType = appointmentTypeMap.get(note.appointment_id)
      if (aptType) entry.cats.add(aptType)
    })

    // Category progress map
    const categoryProgressMap = new Map<string, any>()
    allCategories?.forEach((cat: any) => {
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

    deduplicatedCriteria.forEach((criterion: any) => {
      const categoryId = criterion.evaluation_categories?.id
      if (!categoryId) return
      const matchesCategory = !studentCategoryCodes.length ||
        !criterion.driving_categories?.length ||
        criterion.driving_categories.some((dc: string) => studentCategoryCodes.includes(dc))
      if (!matchesCategory) return
      const progress = categoryProgressMap.get(categoryId)
      if (!progress) return
      progress.totalCriteria++
      progress.totalPossiblePoints += maxRating
      const entry = criteriaDataMap.get(criterion.id)
      if (entry) {
        progress.earnedPoints += Math.max(...entry.ratings)
      }
    })

    // Build evaluated items — include criteria that are evaluated OR always_visible
    const criteriaForStudent = deduplicatedCriteria.filter((c: any) =>
      !studentCategoryCodes.length ||
      !c.driving_categories?.length ||
      c.driving_categories.some((dc: string) => studentCategoryCodes.includes(dc))
    )

    const sorted = criteriaForStudent
      .filter((c: any) => criteriaDataMap.has(c.id) || c.always_visible)
      .map((c: any) => {
        const entry = criteriaDataMap.get(c.id)
        // Enrich educational_content from any duplicate that has it
        const enrichedContent = c.educational_content || bestContentByName.get(c.name) || null
        return {
          ...c,
          educational_content: enrichedContent,
          highestRating: entry ? Math.max(...entry.ratings) : null,
          latestRating: entry ? (entry.ratings[entry.ratings.length - 1] ?? null) : null,
          evaluatedInCategories: entry ? Array.from(entry.cats) : [],
          categoryProgress: categoryProgressMap.get(c.evaluation_categories?.id)
        }
      })
      .sort((a: any, b: any) =>
        (a.evaluation_categories?.display_order || 999) - (b.evaluation_categories?.display_order || 999)
      )

    allCategoriesWithProgress.value = Array.from(categoryProgressMap.values())
      .map(p => ({
        id: p.categoryId,
        name: p.categoryName,
        color: p.categoryColor,
        display_order: p.categoryDisplayOrder,
        percentage: p.totalPossiblePoints > 0
          ? Math.round((p.earnedPoints / p.totalPossiblePoints) * 100)
          : 0
      }))
      .sort((a, b) => a.display_order - b.display_order)

    items.value = sorted

    // Set default tab to first available
    const cats = new Set<string>()
    sorted.forEach((item: any) => item.evaluatedInCategories.forEach((c: string) => cats.add(c)))
    const tabList = Array.from(cats).sort()
    if (tabList.length > 0) activeTab.value = tabList[0]

  } catch (e: any) {
    console.error('❌ Error in learning page:', e)
    error.value = e.message || 'Fehler beim Laden'
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
.hover\:tenant-border:hover {
  border-color: var(--color-primary, #1E40AF);
}
</style>
