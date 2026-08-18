<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[600] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl max-h-[85vh] flex flex-col pb-safe">
        <div class="flex justify-center pt-3 pb-1 sm:hidden">
          <div class="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div class="flex items-center justify-between px-5 pt-2 pb-3 border-b border-gray-100">
          <div>
            <h2 class="text-base font-semibold text-gray-900">Konto wechseln</h2>
            <p class="text-xs text-gray-400 mt-0.5">Ohne erneute Anmeldung</p>
          </div>
          <button
            type="button"
            class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200"
            @click="emit('close')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="px-3 py-3 overflow-y-auto flex-1">
          <div v-if="loading" class="py-10 text-center text-sm text-gray-400">Lade Konten…</div>
          <div v-else-if="error" class="py-6 text-center text-sm text-red-600">{{ error }}</div>
          <div v-else-if="!hasAny" class="py-8 text-center text-sm text-gray-500">Keine weiteren Konten verfügbar.</div>
          <div v-else class="space-y-1">
            <button
              v-if="admin"
              type="button"
              class="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
              :disabled="switching"
              @click="select(admin.id)"
            >
              <div class="w-9 h-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {{ initials(admin) }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-sm font-semibold text-gray-900 truncate">{{ displayName(admin) }}</div>
                <div class="text-[11px] text-violet-600 font-medium">Admin</div>
              </div>
            </button>

            <button
              v-if="ownStaff"
              type="button"
              class="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
              :disabled="switching"
              @click="select(ownStaff.id)"
            >
              <div class="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {{ initials(ownStaff) }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-sm font-semibold text-gray-900 truncate">{{ displayName(ownStaff) }}</div>
                <div class="text-[11px] text-gray-500">Eigenes {{ staffLabel }}-Konto</div>
              </div>
            </button>

            <p v-if="staff.length" class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-3 pt-3 pb-1">
              {{ staffLabelPlural }}
            </p>
            <button
              v-for="s in staff"
              :key="s.id"
              type="button"
              class="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
              :disabled="switching"
              @click="select(s.id)"
            >
              <div class="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {{ initials(s) }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-sm font-medium text-gray-800 truncate">{{ displayName(s) }}</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useTerminology } from '~/composables/useTerminology'

type Target = {
  id: string
  first_name: string | null
  last_name: string | null
  role: 'admin' | 'staff'
  kind: 'admin' | 'own_staff' | 'staff'
}

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const authStore = useAuthStore()
const { t } = useTerminology()
const staffLabel = computed(() => t.value.staff)
const staffLabelPlural = computed(() => t.value.staffPlural)

const loading = ref(false)
const switching = ref(false)
const error = ref<string | null>(null)
const currentUserId = ref<string | null>(null)
const admin = ref<Target | null>(null)
const ownStaff = ref<Target | null>(null)
const staff = ref<Target[]>([])

const hasAny = computed(() => !!(admin.value || ownStaff.value || staff.value.length))

const displayName = (u: Target) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Ohne Namen'
const initials = (u: Target) =>
  `${(u.first_name || '?').charAt(0)}${(u.last_name || '').charAt(0)}`.toUpperCase()

const loadTargets = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await $fetch<{
      currentUserId: string
      admin: Target | null
      ownStaff: Target | null
      staff: Target[]
    }>('/api/auth/switch-targets')
    currentUserId.value = res.currentUserId
    const me = res.currentUserId
    admin.value = res.admin?.id === me ? null : res.admin
    ownStaff.value = res.ownStaff?.id === me ? null : res.ownStaff
    staff.value = (res.staff || []).filter(s => s.id !== me)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Konten konnten nicht geladen werden'
  } finally {
    loading.value = false
  }
}

watch(() => props.open, (isOpen) => {
  if (isOpen) loadTargets()
})

const select = async (id: string) => {
  if (switching.value || id === currentUserId.value) {
    emit('close')
    return
  }
  switching.value = true
  error.value = null
  try {
    const result = await authStore.switchAccount(id)
    const path = result?.redirectPath || '/dashboard'
    if (process.client) {
      window.location.assign(path)
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || authStore.errorMessage || 'Wechsel fehlgeschlagen'
    switching.value = false
  }
}
</script>
