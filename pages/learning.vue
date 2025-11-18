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
            <button @click="goToLessonBooking" class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow">
              🚗 Jetzt Fahrstunde buchen
            </button>
          </div>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div
            v-for="criterion in items"
            :key="criterion.id"
            class="group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
            @click="openDetail(criterion)"
            tabindex="0"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <h3 class="font-semibold truncate">{{ criterion.name }}</h3>
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  <span v-if="hasText(criterion)" class="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">📄 Text</span>
                  <span v-if="hasImages(criterion)" class="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">🖼️ Bilder</span>
                </div>
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

    <!-- Detail Modal -->
    <div v-if="selectedCriterion" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div class="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div class="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold truncate">{{ selectedCriterion.name }}</h3>
          <button @click="closeDetail" class="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>
        <div class="p-5 space-y-6">
          <div v-if="selectedCriterion.educational_content?.title" class="text-base font-medium">
            {{ selectedCriterion.educational_content.title }}
          </div>
          <div v-for="(sec, idx) in (selectedCriterion.educational_content?.sections || [])" :key="idx" class="space-y-2">
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
import { ref, onMounted } from 'vue'
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

const hasText = (c: any) => !!(c.educational_content?.title || c.educational_content?.sections?.some((s: any) => s.text && s.text.length > 0))
const hasImages = (c: any) => !!(c.educational_content?.sections?.some((s: any) => s.images && s.images.length > 0))

const openDetail = (c: any) => {
  selectedCriterion.value = c
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

    // 1) Termine des Schülers laden
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('user_id', currentUserId)

    const aptIds = (appointments || []).map(a => a.id)
    if (aptIds.length === 0) {
      items.value = []
      return
    }

    // 2) Notes/Evaluations zu diesen Terminen laden und dabei Kriterien-IDs sammeln
    const { data: notes } = await supabase
      .from('notes')
      .select('evaluation_criteria_id, criteria_rating')
      .in('appointment_id', aptIds)

    // Kriterium gilt als "bewertet", wenn es mindestens eine Note mit evaluation_criteria_id gibt
    const ratedCriteriaIds = [...new Set((notes || [])
      .filter(n => n.evaluation_criteria_id)
      .map(n => n.evaluation_criteria_id))]

    if (ratedCriteriaIds.length === 0) {
      items.value = []
      return
    }

    // 3) Kriterien mit Lerninhalt laden
    const { data: criteria } = await supabase
      .from('evaluation_criteria')
      .select('id, name, educational_content')
      .in('id', ratedCriteriaIds)

    items.value = (criteria || []).filter(c => hasText(c) || hasImages(c))
  } catch (e: any) {
    error.value = e.message || 'Fehler beim Laden'
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
</style>


