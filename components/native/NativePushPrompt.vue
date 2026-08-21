<template>
  <div
    v-if="visible"
    class="fixed inset-x-3 z-[80] rounded-2xl bg-white shadow-xl border border-violet-100 p-4"
    :style="{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }"
  >
    <p class="text-sm font-semibold text-gray-900">Mitteilungen sind aus</p>
    <p class="mt-1 text-xs text-gray-600 leading-relaxed">
      Simy darf aktuell keine Push-Nachrichten senden. Ohne diese Erlaubnis
      gibt es keine Erinnerung an Fahrstunden aufs Handy.
    </p>
    <div class="mt-3 flex gap-2">
      <button
        type="button"
        class="flex-1 rounded-xl bg-violet-600 text-white text-sm font-medium py-2.5 active:bg-violet-700"
        :disabled="busy"
        @click="openSettings"
      >
        Einstellungen öffnen
      </button>
      <button
        type="button"
        class="rounded-xl px-3 text-sm text-gray-500"
        @click="dismiss"
      >
        Später
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Only shown after the OS dialog was denied. First ask is the native
 * iOS/Android sheet from plugins/push.client.ts — do not duplicate it.
 */
const DISMISS_KEY = 'simy_push_prompt_dismissed_at'
const route = useRoute()
const authStore = useAuthStore()

const native = ref(false)
const permission = ref<'prompt' | 'granted' | 'denied' | 'unavailable'>('unavailable')
const dismissed = ref(false)
const busy = ref(false)

const onAuthPage = computed(() => {
  const p = route.path
  return p === '/login' || p.startsWith('/register') || p.startsWith('/onboarding')
})
const visible = computed(() =>
  native.value
  && authStore.isLoggedIn
  && !onAuthPage.value
  && !dismissed.value
  && permission.value === 'denied',
)

async function refreshPermission() {
  permission.value = await getNativePushPermission()
}

onMounted(async () => {
  native.value = await isCapacitorNative()
  if (!native.value) return
  try {
    dismissed.value = Boolean(sessionStorage.getItem(DISMISS_KEY))
  } catch { /* ignore */ }
  await refreshPermission()
})

watch(
  () => authStore.isLoggedIn,
  async (loggedIn) => {
    if (!loggedIn || !native.value) return
    await refreshPermission()
    // System dialog runs in the push plugin; re-check after the user answers.
    window.setTimeout(() => { void refreshPermission() }, 2500)
  },
)

async function openSettings() {
  busy.value = true
  try {
    await openNativeNotificationSettings()
  } finally {
    busy.value = false
  }
}

function dismiss() {
  dismissed.value = true
  try { sessionStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* ignore */ }
}
</script>
