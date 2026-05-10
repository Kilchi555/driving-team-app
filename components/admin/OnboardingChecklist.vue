<template>
  <div v-if="show" class="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm">

    <!-- Header -->
    <div class="flex items-start justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
          </svg>
        </div>
        <div>
          <h3 class="text-sm font-bold text-gray-900">Setup abschliessen</h3>
          <p class="text-xs text-gray-500">{{ completedCount }} von {{ totalCount }} Schritten erledigt</p>
        </div>
      </div>
      <button @click="dismiss" class="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-white/60">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Progress bar -->
    <div class="w-full bg-blue-100 rounded-full h-1.5 mb-4 overflow-hidden">
      <div
        class="h-1.5 rounded-full bg-blue-600 transition-all duration-500"
        :style="{ width: progressPercent + '%' }"
      ></div>
    </div>

    <!-- Steps -->
    <div class="space-y-2">
      <component
        :is="step.done || !step.href ? 'div' : 'a'"
        v-for="step in steps"
        :key="step.id"
        :href="(!step.done && step.href) ? step.href : undefined"
        class="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all text-sm group"
        :class="[
          step.done
            ? 'bg-white/40 text-gray-400'
            : step.href
              ? 'bg-white hover:bg-white shadow-sm cursor-pointer hover:shadow-md text-gray-700'
              : 'bg-white/40 text-gray-400'
        ]"
      >
        <!-- Status icon -->
        <div class="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
          :class="step.done ? 'bg-emerald-100' : 'bg-blue-50 border-2 border-blue-200'"
        >
          <svg v-if="step.done" class="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
          </svg>
        </div>

        <span class="flex-1 font-medium" :class="step.done ? 'line-through' : ''">{{ step.label }}</span>

        <!-- Arrow for actionable steps -->
        <svg v-if="!step.done && step.href" class="w-4 h-4 text-blue-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>

        <!-- Upgrade badge -->
        <span v-if="step.id === 'upgrade' && !step.done"
          class="text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 text-white"
        >
          Trial
        </span>
      </component>
    </div>

    <!-- Trial countdown -->
    <div v-if="!isPaid && trialDaysLeft !== null" class="mt-4 rounded-xl px-3 py-2.5 text-xs font-medium"
      :class="trialDaysLeft <= 7 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100/60 text-blue-700'"
    >
      <span v-if="trialDaysLeft > 0">
        Noch <strong>{{ trialDaysLeft }} Tag{{ trialDaysLeft === 1 ? '' : 'e' }}</strong> im Trial —
        <a href="/upgrade" class="underline underline-offset-2 font-semibold">jetzt upgraden</a>
      </span>
      <span v-else class="text-red-700 font-semibold">Trial abgelaufen — <a href="/upgrade" class="underline">Plan wählen</a></span>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const DISMISS_KEY = 'simy_onboarding_dismissed'

interface OnboardingStep {
  id: string
  label: string
  done: boolean
  href: string | null
}

interface OnboardingStatus {
  steps: OnboardingStep[]
  completedCount: number
  totalCount: number
  progressPercent: number
  allCoreStepsDone: boolean
  isPaid: boolean
  trialEndsAt: string | null
  subscriptionPlan: string
}

const status = ref<OnboardingStatus | null>(null)
const dismissed = ref(false)

const steps = computed(() => status.value?.steps ?? [])
const completedCount = computed(() => status.value?.completedCount ?? 0)
const totalCount = computed(() => status.value?.totalCount ?? 0)
const progressPercent = computed(() => status.value?.progressPercent ?? 0)
const isPaid = computed(() => status.value?.isPaid ?? false)

const trialDaysLeft = computed(() => {
  if (!status.value?.trialEndsAt) return null
  const diff = new Date(status.value.trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
})

// Show the checklist unless:
// - manually dismissed
// - all steps including upgrade are done
const show = computed(() => {
  if (dismissed.value) return false
  if (!status.value) return false
  if (status.value.allCoreStepsDone && status.value.isPaid) return false
  return true
})

const dismiss = () => {
  dismissed.value = true
  try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
}

onMounted(async () => {
  // Restore dismissed state for this session
  try {
    if (sessionStorage.getItem(DISMISS_KEY) === '1') {
      dismissed.value = true
      return
    }
  } catch { /* ignore */ }

  try {
    const { getSupabase } = await import('~/utils/supabase')
    const { data: { session } } = await getSupabase().auth.getSession()
    if (!session?.access_token) return

    status.value = await $fetch<OnboardingStatus>('/api/admin/onboarding-status', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
  } catch { /* non-critical */ }
})
</script>
