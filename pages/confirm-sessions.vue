<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Loading -->
    <div v-if="pending" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-500">Lade Sessions…</p>
      </div>
    </div>

    <!-- Error / Invalid token -->
    <div v-else-if="loadError" class="flex-1 flex items-center justify-center p-6">
      <div class="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div class="text-5xl mb-4">🔒</div>
        <h1 class="text-xl font-bold text-gray-900 mb-2">Link ungültig oder abgelaufen</h1>
        <p class="text-gray-500">Bitte wende dich an deine Fahrschule für einen neuen Link.</p>
      </div>
    </div>

    <!-- Content -->
    <template v-else-if="info">
      <!-- Header -->
      <div class="shadow-sm" :style="{ background: info.tenant.primaryColor }">
        <div class="max-w-2xl mx-auto px-4 py-5 flex items-center gap-4">
          <img v-if="info.tenant.logoUrl" :src="info.tenant.logoUrl" :alt="info.tenant.name" class="h-9 object-contain" />
          <span v-else class="text-white font-bold text-lg">{{ info.tenant.name }}</span>
        </div>
      </div>

      <div class="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <!-- Course info -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Kurs-Zuteilung</p>
          <h1 class="text-2xl font-black text-gray-900 mb-1">{{ info.course?.name || info.course?.category }}</h1>
          <p class="text-gray-500 text-sm">
            Hallo <strong>{{ info.staff?.first_name }}</strong> — bitte bestätige deine Sessions unten.
          </p>
        </div>

        <!-- All confirm button -->
        <div v-if="hasPendingSessions" class="mb-4">
          <button
            @click="respondAll('confirmed')"
            :disabled="submitting"
            class="w-full py-3 px-6 rounded-xl font-bold text-white text-sm transition disabled:opacity-50"
            :style="{ background: info.tenant.primaryColor }"
          >
            ✅ Alle Sessions bestätigen ({{ pendingSessions.length }})
          </button>
        </div>

        <!-- Sessions list -->
        <div class="space-y-3">
          <div
            v-for="session in info.sessions"
            :key="session.id"
            class="bg-white rounded-xl border shadow-sm overflow-hidden"
            :class="{
              'border-green-200': session.confirmation_status === 'confirmed',
              'border-red-200': session.confirmation_status === 'declined',
              'border-gray-100': !session.confirmation_status || session.confirmation_status === 'pending',
            }"
          >
            <div class="p-4 flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <!-- Status badge -->
                  <span
                    v-if="session.confirmation_status === 'confirmed'"
                    class="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full"
                  >✅ Bestätigt</span>
                  <span
                    v-else-if="session.confirmation_status === 'declined'"
                    class="inline-flex items-center gap-1 bg-red-50 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full"
                  >❌ Abgelehnt</span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full"
                  >⏳ Ausstehend</span>
                </div>
                <p class="font-semibold text-gray-900 text-sm">{{ formatDate(session.start_time) }}</p>
                <p class="text-gray-500 text-xs mt-0.5">
                  {{ formatTime(session.start_time) }} – {{ formatTime(session.end_time) }} Uhr
                </p>
                <p v-if="session.description" class="text-gray-400 text-xs mt-1">{{ session.description }}</p>
                <!-- Decline reason -->
                <p v-if="session.confirmation_status === 'declined' && session.confirmation_decline_reason" class="text-red-500 text-xs mt-1 italic">
                  Grund: {{ session.confirmation_decline_reason }}
                </p>
              </div>

              <!-- Action buttons (only for pending/unset) -->
              <div
                v-if="!session.confirmation_status || session.confirmation_status === 'pending'"
                class="flex flex-col gap-2 flex-shrink-0"
              >
                <button
                  @click="respond([session.id], 'confirmed')"
                  :disabled="submitting"
                  class="text-xs font-bold py-1.5 px-3 rounded-lg text-white transition disabled:opacity-50"
                  :style="{ background: info.tenant.primaryColor }"
                >
                  ✓ Bestätigen
                </button>
                <button
                  @click="startDecline(session.id)"
                  :disabled="submitting"
                  class="text-xs font-bold py-1.5 px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                >
                  ✗ Ablehnen
                </button>
              </div>

              <!-- Re-action for already responded -->
              <div v-else class="flex flex-col gap-2 flex-shrink-0">
                <button
                  v-if="session.confirmation_status === 'declined'"
                  @click="respond([session.id], 'confirmed')"
                  :disabled="submitting"
                  class="text-xs font-bold py-1.5 px-3 rounded-lg text-white transition disabled:opacity-50"
                  :style="{ background: info.tenant.primaryColor }"
                >
                  ↩ Bestätigen
                </button>
                <button
                  v-if="session.confirmation_status === 'confirmed'"
                  @click="startDecline(session.id)"
                  :disabled="submitting"
                  class="text-xs font-bold py-1.5 px-3 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  ↩ Ablehnen
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- All sessions handled -->
        <div v-if="allHandled && !hasPendingSessions" class="mt-6 bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <div class="text-3xl mb-2">🎉</div>
          <p class="font-bold text-green-800">Alle Sessions bearbeitet!</p>
          <p class="text-green-700 text-sm mt-1">Danke – deine Fahrschule wurde informiert.</p>
        </div>
      </div>
    </template>

    <!-- Decline modal -->
    <Teleport to="body">
      <div v-if="declineModalSessionId" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-3">Session ablehnen</h2>
          <p class="text-gray-500 text-sm mb-4">Optional: Gib einen Grund an (wird dem Admin mitgeteilt).</p>
          <textarea
            v-model="declineReason"
            placeholder="Begründung (optional)"
            class="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200"
            rows="3"
          />
          <div class="flex gap-3 mt-4">
            <button
              @click="declineModalSessionId = null; declineReason = ''"
              class="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50"
            >Abbrechen</button>
            <button
              @click="confirmDecline"
              :disabled="submitting"
              class="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 disabled:opacity-50"
            >Ablehnen</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const token = computed(() => route.query.token as string)

const { data: info, pending, error: fetchError } = await useFetch('/api/confirm-sessions/info', {
  query: { token },
  server: true,
})

const loadError = computed(() => !!fetchError.value || (!pending.value && !info.value))

const submitting = ref(false)
const declineModalSessionId = ref<string | null>(null)
const declineReason = ref('')

const pendingSessions = computed(() =>
  (info.value?.sessions || []).filter(
    (s: any) => !s.confirmation_status || s.confirmation_status === 'pending',
  )
)
const hasPendingSessions = computed(() => pendingSessions.value.length > 0)
const allHandled = computed(() =>
  (info.value?.sessions || []).length > 0 &&
  (info.value?.sessions || []).every(
    (s: any) => s.confirmation_status === 'confirmed' || s.confirmation_status === 'declined',
  )
)

function startDecline(sessionId: string) {
  declineModalSessionId.value = sessionId
  declineReason.value = ''
}

async function confirmDecline() {
  if (!declineModalSessionId.value) return
  await respond([declineModalSessionId.value], 'declined', declineReason.value)
  declineModalSessionId.value = null
  declineReason.value = ''
}

async function respondAll(action: 'confirmed' | 'declined') {
  await respond('all', action)
}

async function respond(sessionIds: string[] | 'all', action: 'confirmed' | 'declined', reason?: string) {
  submitting.value = true
  try {
    const result = await $fetch('/api/confirm-sessions/respond', {
      method: 'POST',
      body: { token: token.value, sessionIds, action, reason },
    })

    // Update local state optimistically
    const targetIds = sessionIds === 'all'
      ? (info.value?.sessions || []).map((s: any) => s.id)
      : sessionIds

    if (info.value?.sessions) {
      for (const session of info.value.sessions) {
        if (targetIds.includes(session.id)) {
          (session as any).confirmation_status = action
          ;(session as any).confirmation_decline_reason = reason || null
          ;(session as any).confirmation_responded_at = new Date().toISOString()
        }
      }
    }
  } catch (e: any) {
    alert(e?.data?.message || 'Fehler beim Speichern. Bitte versuche es erneut.')
  } finally {
    submitting.value = false
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-CH', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Zurich',
  })
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('de-CH', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich',
  })
}

// Page head
useHead({
  title: info.value ? `Sessions bestätigen – ${info.value.course?.name || 'Kurs'}` : 'Sessions bestätigen',
})
</script>
