<template>
  <div class="p-4 sm:p-6 space-y-5 max-w-[1200px] mx-auto">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Buchungsanfragen</h1>
        <p class="text-sm text-gray-500 mt-0.5">
          {{ proposals.length }} offene Anfragen
        </p>
      </div>
      <button @click="loadProposals" :disabled="isLoading"
        class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors disabled:opacity-50 shadow-sm">
        <svg class="h-4 w-4" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-16 gap-2 text-gray-400">
      <svg class="animate-spin h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
      Lade Anfragen…
    </div>

    <!-- Empty -->
    <div v-else-if="proposals.length === 0" class="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
      <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
      <p class="text-sm font-medium">Keine offenen Buchungsanfragen</p>
    </div>

    <!-- Proposals list -->
    <div v-else class="space-y-3">
      <div
        v-for="proposal in proposals"
        :key="proposal.id"
        class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4"
      >
        <!-- Header row -->
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-base font-semibold text-gray-900">
              {{ proposal.first_name }} {{ proposal.last_name }}
            </p>
            <p class="text-sm text-gray-500 mt-0.5">
              Eingegangen: {{ formatDate(proposal.created_at) }}
            </p>
          </div>
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
            Pendent
          </span>
        </div>

        <!-- Info grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <div v-if="proposal.email" class="flex items-center gap-2 text-gray-600">
            <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            <a :href="`mailto:${proposal.email}`" class="hover:underline truncate">{{ proposal.email }}</a>
          </div>
          <div v-if="proposal.phone" class="flex items-center gap-2 text-gray-600">
            <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
            </svg>
            <a :href="`tel:${proposal.phone}`" class="hover:underline">{{ proposal.phone }}</a>
          </div>
          <div v-if="proposal.location?.name" class="flex items-center gap-2 text-gray-600">
            <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            {{ proposal.location.name }}
          </div>
          <div v-if="proposal.category_code" class="flex items-center gap-2 text-gray-600">
            <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
            </svg>
            Kat. {{ proposal.category_code }}
            <span v-if="proposal.duration_minutes" class="text-gray-400">· {{ proposal.duration_minutes }} Min.</span>
          </div>
          <div v-if="proposal.staff" class="flex items-center gap-2 text-gray-600">
            <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            {{ proposal.staff.first_name }} {{ proposal.staff.last_name }}
          </div>
          <div v-if="proposal.street" class="flex items-center gap-2 text-gray-600">
            <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            {{ proposal.street }} {{ proposal.house_number }}, {{ proposal.postal_code }} {{ proposal.city }}
          </div>
        </div>

        <!-- Preferred time slots -->
        <div v-if="proposal.preferred_time_slots?.length" class="space-y-1">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gewünschte Zeiten</p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="slot in proposal.preferred_time_slots"
              :key="slot"
              class="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700"
            >
              {{ slot }}
            </span>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="proposal.notes" class="bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-600 italic">
          "{{ proposal.notes }}"
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap gap-2 pt-1">
          <a
            :href="`mailto:${proposal.email}`"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            E-Mail
          </a>
          <button
            @click="updateStatus(proposal.id, 'contacted')"
            :disabled="processingId === proposal.id"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            Kontaktiert
          </button>
          <button
            @click="updateStatus(proposal.id, 'accepted')"
            :disabled="processingId === proposal.id"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <svg v-if="processingId === proposal.id" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            Angenommen
          </button>
          <button
            @click="updateStatus(proposal.id, 'rejected')"
            :disabled="processingId === proposal.id"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Ablehnen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTenantBranding } from '~/composables/useTenantBranding'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const { primaryColor } = useTenantBranding()

const proposals = ref<any[]>([])
const isLoading = ref(false)
const processingId = ref<string | null>(null)

const loadProposals = async () => {
  isLoading.value = true
  try {
    const res = await $fetch<any>('/api/admin/get-booking-proposals')
    proposals.value = res?.data ?? []
  } catch (e) {
    console.error('Failed to load booking proposals:', e)
  } finally {
    isLoading.value = false
  }
}

const updateStatus = async (id: string, status: 'contacted' | 'accepted' | 'rejected') => {
  processingId.value = id
  try {
    await $fetch('/api/admin/update-booking-proposal-status', {
      method: 'POST',
      body: { proposalId: id, status }
    })
    if (status !== 'contacted') {
      proposals.value = proposals.value.filter(p => p.id !== id)
    }
  } catch (e) {
    console.error('Failed to update booking proposal:', e)
  } finally {
    processingId.value = null
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

onMounted(loadProposals)
</script>
