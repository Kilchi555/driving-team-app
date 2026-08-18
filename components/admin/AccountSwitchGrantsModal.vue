<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[500] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl max-h-[85vh] flex flex-col pb-safe">
        <div class="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
          <div>
            <h2 class="text-base font-semibold text-gray-900">Konto-Wechsel</h2>
            <p class="text-xs text-gray-400 mt-0.5">{{ actorLabel }}</p>
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

        <div class="px-5 py-4 overflow-y-auto flex-1 space-y-4">
          <div v-if="loading" class="py-8 text-center text-sm text-gray-400">Lade…</div>
          <template v-else>
            <label class="flex items-start gap-3 p-3 rounded-xl bg-violet-50 border border-violet-100 cursor-pointer">
              <input v-model="canSwitchAll" type="checkbox" class="mt-1 rounded border-gray-300 text-violet-600 focus:ring-violet-500">
              <div>
                <div class="text-sm font-semibold text-violet-900">Alle {{ staffLabelPlural }} (auch neue)</div>
                <p class="text-xs text-violet-700 mt-0.5">Darf in jedes {{ staffLabel }}-Konto wechseln.</p>
              </div>
            </label>

            <div v-if="!canSwitchAll" class="space-y-2">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Einzelne {{ staffLabelPlural }}</p>
              <label
                v-for="s in staff"
                :key="s.id"
                class="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="selectedIds"
                  type="checkbox"
                  :value="s.id"
                  class="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                >
                <span class="text-sm text-gray-800">{{ s.first_name }} {{ s.last_name }}</span>
              </label>
              <p v-if="!staff.length" class="text-sm text-gray-400">Keine {{ staffLabelPlural }} mit Login.</p>
            </div>
          </template>
          <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        </div>

        <div class="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" class="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg" @click="emit('close')">
            Abbrechen
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50"
            :disabled="saving || loading"
            @click="save"
          >
            {{ saving ? 'Speichern…' : 'Speichern' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTerminology } from '~/composables/useTerminology'

const props = defineProps<{
  open: boolean
  actorId: string | null
  actorName?: string
}>()
const emit = defineEmits<{ close: []; saved: [] }>()

const { t } = useTerminology()
const staffLabel = computed(() => t.value.staff)
const staffLabelPlural = computed(() => t.value.staffPlural)
const actorLabel = computed(() => props.actorName || 'Benutzer')

const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const canSwitchAll = ref(false)
const selectedIds = ref<string[]>([])
const staff = ref<Array<{ id: string; first_name: string; last_name: string }>>([])

const load = async () => {
  if (!props.actorId) return
  loading.value = true
  error.value = null
  try {
    const res = await $fetch<{
      actor: { can_switch_all_staff: boolean }
      target_ids: string[]
      staff: Array<{ id: string; first_name: string; last_name: string }>
    }>('/api/admin/account-switch-grants', {
      query: { actor_user_id: props.actorId },
    })
    canSwitchAll.value = !!res.actor.can_switch_all_staff
    selectedIds.value = res.target_ids || []
    staff.value = res.staff || []
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Freigaben konnten nicht geladen werden'
  } finally {
    loading.value = false
  }
}

watch(() => [props.open, props.actorId], ([isOpen]) => {
  if (isOpen && props.actorId) load()
})

const save = async () => {
  if (!props.actorId) return
  saving.value = true
  error.value = null
  try {
    await $fetch('/api/admin/account-switch-grants', {
      method: 'PUT',
      body: {
        actor_user_id: props.actorId,
        can_switch_all_staff: canSwitchAll.value,
        target_ids: canSwitchAll.value ? [] : selectedIds.value,
      },
    })
    emit('saved')
    emit('close')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Speichern fehlgeschlagen'
  } finally {
    saving.value = false
  }
}
</script>
