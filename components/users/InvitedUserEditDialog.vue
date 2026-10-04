<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black bg-opacity-50" @click="close" />

    <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4" data-invited-user-edit>
      <form class="p-6" @submit.prevent="save">
        <h3 class="text-lg font-semibold text-gray-900 mb-1">Einladung bearbeiten</h3>
        <p class="text-sm text-gray-600 mb-4">
          {{ roleLabel }} · Eingeladen. Die Rolle bleibt unverändert.
        </p>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
            <input
              v-model="form.first_name"
              type="text"
              required
              maxlength="100"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
            <input
              v-model="form.last_name"
              type="text"
              required
              maxlength="100"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
            <input
              v-model="form.email"
              type="email"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
            <p v-if="emailChanged" class="text-xs text-amber-700 mt-1">
              Die Einladung gilt danach nur noch für die neue Adresse. Der bisherige Link wird ungültig. Die E-Mail wird erst beim erneuten Senden verschickt.
            </p>
          </div>
        </div>

        <div v-if="manualLink" class="mt-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded space-y-2">
          <p class="text-sm font-medium">Einladung erneuert – Versand nicht möglich</p>
          <input
            :value="manualLink"
            readonly
            class="w-full px-3 py-2 border border-yellow-300 rounded bg-white text-gray-800 text-sm"
            @focus="($event.target as HTMLInputElement)?.select()"
          >
        </div>

        <p v-if="errorMessage" class="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {{ errorMessage }}
        </p>

        <div class="flex flex-col gap-2 mt-6">
          <button
            type="submit"
            :disabled="busy"
            class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
          >
            {{ saving ? 'Speichern...' : 'Speichern' }}
          </button>
          <button
            type="button"
            :disabled="busy"
            class="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:bg-gray-400"
            @click="resend"
          >
            {{ resending ? 'Senden...' : 'Einladung erneut senden' }}
          </button>
          <button
            type="button"
            class="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            :disabled="busy"
            @click="close"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUIStore } from '~/stores/ui'
import {
  displayInviteEmail,
  resendInvitedUser,
  type InvitedUserTarget,
} from '~/composables/useInvitedUserActions'

const props = defineProps<{
  kind: 'staff_invitation' | 'client'
  user: InvitedUserTarget
}>()

const emit = defineEmits<{
  close: []
  changed: []
}>()

const uiStore = useUIStore()
const saving = ref(false)
const resending = ref(false)
const errorMessage = ref('')
const manualLink = ref('')
const busy = computed(() => saving.value || resending.value)

const form = ref({
  first_name: props.user.first_name || '',
  last_name: props.user.last_name || '',
  email: displayInviteEmail(props.user.email),
})

const savedEmail = ref(displayInviteEmail(props.user.email))
const savedFirst = ref(props.user.first_name || '')
const savedLast = ref(props.user.last_name || '')

const emailChanged = computed(() =>
  form.value.email.trim().toLowerCase() !== savedEmail.value.trim().toLowerCase(),
)

const roleLabel = computed(() => {
  if (props.kind === 'client' || props.user.role === 'client') return 'Kunde'
  if (props.user.role === 'admin') return 'Administrator'
  return 'Mitarbeiter'
})

type InviteError = {
  data?: { statusMessage?: string, message?: string }
  statusMessage?: string
  message?: string
}

const apiErrorMessage = (err: unknown, fallback: string) => {
  const error = err && typeof err === 'object' ? err as InviteError : {}
  return error.data?.statusMessage || error.data?.message || error.statusMessage || error.message || fallback
}

const close = () => {
  if (busy.value) return
  emit('close')
}

const persist = async () => {
  const body = {
    first_name: form.value.first_name,
    last_name: form.value.last_name,
    email: form.value.email,
  }
  if (props.kind === 'staff_invitation') {
    await $fetch('/api/staff/update-invite', {
      method: 'POST',
      body: { invitationId: props.user.id, ...body },
    })
  } else {
    await $fetch('/api/admin/invited-clients/update', {
      method: 'POST',
      body: { userId: props.user.id, ...body },
    })
  }
  savedEmail.value = form.value.email.trim().toLowerCase()
  savedFirst.value = form.value.first_name
  savedLast.value = form.value.last_name
}

const formDirty = () => {
  return form.value.first_name !== savedFirst.value
    || form.value.last_name !== savedLast.value
    || emailChanged.value
}

const save = async () => {
  if (busy.value) return
  saving.value = true
  errorMessage.value = ''
  manualLink.value = ''
  try {
    const changedEmail = emailChanged.value
    await persist()
    uiStore.addNotification({
      type: 'success',
      title: 'Gespeichert',
      message: changedEmail
        ? 'Die Einladung wurde aktualisiert. Der bisherige Link ist ungültig.'
        : 'Name wurde gespeichert. Die Einladung bleibt offen.',
    })
    emit('changed')
  } catch (err: unknown) {
    errorMessage.value = apiErrorMessage(err, 'Einladung konnte nicht gespeichert werden.')
  } finally {
    saving.value = false
  }
}

const resend = async () => {
  if (busy.value) return
  resending.value = true
  errorMessage.value = ''
  manualLink.value = ''
  try {
    if (formDirty()) {
      await persist()
    }
    const data = await resendInvitedUser({
      ...props.user,
      email: savedEmail.value,
      is_invitation: props.kind === 'staff_invitation',
      role: props.kind === 'client' ? 'client' : props.user.role,
      onboarding_status: props.kind === 'client' ? 'pending' : props.user.onboarding_status,
    })
    if (data?.sentVia === 'email_failed') {
      manualLink.value = data.inviteLink || ''
      errorMessage.value = data.message || 'E-Mail konnte nicht gesendet werden.'
      emit('changed')
      return
    }
    uiStore.addNotification({
      type: 'success',
      title: 'Einladung gesendet',
      message: `Einladung an ${data.email || savedEmail.value} erneut gesendet.`,
    })
    emit('changed')
    emit('close')
  } catch (err: unknown) {
    errorMessage.value = apiErrorMessage(err, 'Einladung konnte nicht erneut gesendet werden.')
  } finally {
    resending.value = false
  }
}
</script>
