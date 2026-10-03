<!-- Shared admin invitation dialog. Tenant and primary flag stay server-owned. -->
<template>
    <button
      type="button"
      data-admin-invite-open
      :class="buttonClass"
      @click="addNewAdmin"
    >
      {{ label }}
    </button>

    <div v-if="showAddAdminModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black bg-opacity-50" @click="showAddAdminModal = false" />

      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4" data-admin-invite-dialog>
        <div class="p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-1">Administrator einladen</h3>
          <p class="text-sm text-gray-600 mb-4">Die Person erhält eine Einladung und legt selbst ein Login an. Es wird kein Konto ohne Zugang erzeugt.</p>

          <form @submit.prevent="createAdmin">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                <input
                  v-model="newAdmin.first_name"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                <input
                  v-model="newAdmin.last_name"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                <input
                  v-model="newAdmin.email"
                  type="email"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button
                type="button"
                class="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                @click="showAddAdminModal = false"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                :disabled="isCreatingAdmin"
                class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
              >
                {{ isCreatingAdmin ? 'Sende...' : 'Einladung senden' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUIStore } from '~/stores/ui'

withDefaults(defineProps<{
  label?: string
  buttonClass?: string
}>(), {
  label: '+ Administrator einladen',
  buttonClass: 'bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors',
})

const emit = defineEmits<{
  invited: []
}>()

const uiStore = useUIStore()
const showAddAdminModal = ref(false)
const isCreatingAdmin = ref(false)
const newAdmin = ref({
  first_name: '',
  last_name: '',
  email: '',
})

const addNewAdmin = () => {
  newAdmin.value = {
    first_name: '',
    last_name: '',
    email: '',
  }
  showAddAdminModal.value = true
}

type InviteError = {
  data?: { statusMessage?: string, message?: string }
  statusMessage?: string
  message?: string
}

const apiErrorMessage = (err: InviteError, fallback: string) =>
  err.data?.statusMessage || err.data?.message || err.statusMessage || err.message || fallback

const createAdmin = async () => {
  isCreatingAdmin.value = true

  try {
    const createResponse = await $fetch('/api/staff/invite', {
      method: 'POST',
      body: {
        first_name: newAdmin.value.first_name,
        last_name: newAdmin.value.last_name,
        email: newAdmin.value.email,
        role: 'admin',
      },
    }) as { success?: boolean, message?: string }

    if (!createResponse?.success) throw new Error(createResponse?.message)

    uiStore.addNotification({
      type: 'success',
      title: 'Einladung gesendet',
      message: `${newAdmin.value.first_name} ${newAdmin.value.last_name} erhält eine Administrator-Einladung.`,
    })

    showAddAdminModal.value = false
    emit('invited')
  } catch (err: unknown) {
    console.error('❌ Error creating admin:', err)
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler',
      message: apiErrorMessage(
        err && typeof err === 'object' ? err as InviteError : {},
        'Einladung konnte nicht gesendet werden.',
      ),
    })
  } finally {
    isCreatingAdmin.value = false
  }
}
</script>
