<!-- pages/register/staff-agb.vue – Nutzungsbedingungen für Staff -->
<template>
  <div class="min-h-screen bg-gray-50">
    <div class="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
      <div class="max-w-4xl mx-auto px-6 py-12 sm:py-16">
        <div class="flex items-center gap-3 mb-4">
          <button @click="$router.back()" class="inline-flex items-center gap-1.5 text-violet-200 hover:text-white text-sm transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            Zurück zur Registrierung
          </button>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold mb-2">Nutzungsbedingungen für {{ t.staffPlural }}</h1>
        <p class="text-violet-200 text-sm">Simy – Plattform für {{ t.businessNoun }} | Stand: Mai 2026 · Version 1.0</p>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-6 py-10 sm:py-14">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10">
        <StaffLegalAgbContent :business-type="businessType" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getTerminologyDefaults } from '~/composables/useTerminology'
import StaffLegalAgbContent from '~/components/register/StaffLegalAgbContent.vue'

const route = useRoute()
const businessType = computed(() => String(route.query.business_type || 'driving_school'))
const t = computed(() => getTerminologyDefaults(businessType.value))

useHead(() => ({ title: `Nutzungsbedingungen für ${t.value.staffPlural} – Simy` }))
</script>
