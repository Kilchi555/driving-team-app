<template>
  <div
    v-if="visible"
    class="fixed inset-x-3 z-[80] rounded-2xl bg-white shadow-xl border border-violet-100 p-4"
    :style="{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }"
  >
    <p class="text-sm font-semibold text-gray-900">Termine aufs Handy?</p>
    <p class="mt-1 text-xs text-gray-600 leading-relaxed">
      {{ denied
        ? 'Mitteilungen sind in den Systemeinstellungen aus. Ohne diese Erlaubnis kann Simy dich nicht an Fahrstunden erinnern.'
        : 'Simy kann dich an Fahrstunden und offene Zahlungen erinnern. Dafür braucht die App die Mitteilungen-Erlaubnis von iPhone oder Android.' }}
    </p>
    <div class="mt-3 flex gap-2">
      <button
        type="button"
        class="flex-1 rounded-xl bg-violet-600 text-white text-sm font-medium py-2.5 active:bg-violet-700"
        :disabled="busy"
        @click="allow"
      >
        {{ denied ? 'Einstellungen öffnen' : 'Erlauben' }}
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
const DISMISS_KEY = 'simy_push_prompt_dismissed_at'
const route = useRoute()
const authStore = useAuthStore()

const native = ref(false)
const permission = ref<'prompt' | 'granted' | 'denied' | 'unavailable'>('unavailable')
const dismissed = ref(false)
const busy = ref(false)

const denied = computed(() => permission.value === 'denied')
const onAuthPage = computed(() => {
  const p = route.path
  return p === '/login' || p.startsWith('/register') || p.startsWith('/onboarding')
})
const visible = computed(() =>
  native.value
  && authStore.isLoggedIn
  && !onAuthPage.value
  && !dismissed.value
  && (permission.value === 'prompt' || permission.value === 'denied'),
)

onMounted(async () => {
  native.value = await isCapacitorNative()
  if (!native.value) return
  try {
    dismissed.value = Boolean(sessionStorage.getItem(DISMISS_KEY))
  } catch { /* ignore */ }
  permission.value = await getNativePushPermission()
})

watch(
  () => authStore.isLoggedIn,
  async (loggedIn) => {
    if (!loggedIn || !native.value) return
    permission.value = await getNativePushPermission()
  },
)

async function allow() {
  busy.value = true
  try {
    if (denied.value) {
      await openNativeNotificationSettings()
      return
    }
    permission.value = await ensureNativePushRegistration({ request: true })
  } finally {
    busy.value = false
  }
}

function dismiss() {
  dismissed.value = true
  try { sessionStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* ignore */ }
}
</script>
