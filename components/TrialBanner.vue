<template>
  <div v-if="showBanner" class="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-yellow-800">
            <span v-if="trialStatus.status === 'expired'">
              ⚠️ Ihr Trial ist abgelaufen
            </span>
            <span v-else-if="trialStatus.status === 'warning'">
              ⏰ Ihr Trial endet in {{ trialStatus.daysLeft }} {{ trialStatus.daysLeft === 1 ? 'Tag' : 'Tagen' }}
            </span>
            <span v-else>
              🆓 Trial läuft noch {{ trialStatus.daysLeft }} {{ trialStatus.daysLeft === 1 ? 'Tag' : 'Tage' }}
            </span>
          </p>
        </div>
      </div>
      <div class="flex-shrink-0">
        <NuxtLink 
          to="/upgrade" 
          class="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-green-800 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
        >
          {{ trialStatus.status === 'expired' ? 'Jetzt upgraden' : 'Upgrade ansehen' }}
          <svg class="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { showTrialWarning, getTrialStatus } = useTrialFeatures()

const trialStatus = computed(() => getTrialStatus())
const showBanner = computed(() => showTrialWarning.value || trialStatus.value.status === 'expired')
</script>


