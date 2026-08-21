<template>
  <div class="min-h-[100svh] bg-slate-50 flex items-center justify-center py-12 px-4">
    <div class="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h1 class="text-xl font-bold text-gray-900">Treuhänder-Zugang</h1>
      <p v-if="preview" class="text-sm text-gray-500 mt-1">
        {{ preview.tenant_name }} · {{ preview.access_label }}
      </p>

      <div v-if="loading" class="py-10 text-center text-sm text-gray-400">Einladung wird geprüft…</div>
      <div v-else-if="error" class="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{{ error }}</div>
      <form v-else-if="preview" class="mt-5 space-y-3" @submit.prevent="accept">
        <p class="text-sm text-gray-600">Konto für <strong>{{ preview.email }}</strong></p>
        <input v-model="firstName" required placeholder="Vorname"
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"/>
        <input v-model="lastName" required placeholder="Nachname"
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"/>
        <input v-model="password" type="password" required minlength="12" placeholder="Passwort (mind. 12 Zeichen)"
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"/>
        <button :disabled="saving" class="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
          {{ saving ? 'Erstelle Konto…' : 'Konto erstellen' }}
        </button>
      </form>
      <p v-if="done" class="mt-4 text-sm text-emerald-700">Konto erstellt. Sie können sich jetzt anmelden.</p>
      <NuxtLink v-if="done" to="/login" class="mt-3 inline-block text-sm font-semibold text-emerald-700 underline">Zur Anmeldung</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const token = computed(() => String(route.query.token || ''))
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const done = ref(false)
const firstName = ref('')
const lastName = ref('')
const password = ref('')
const preview = ref<{ email: string; tenant_name: string; access_label: string } | null>(null)

onMounted(async () => {
  try {
    preview.value = await $fetch('/api/accountant/invite', { query: { token: token.value } })
  } catch (err: unknown) {
    error.value = (err as { statusMessage?: string })?.statusMessage || 'Einladung ungültig'
  } finally {
    loading.value = false
  }
})

async function accept() {
  saving.value = true
  error.value = ''
  try {
    await $fetch('/api/accountant/accept', {
      method: 'POST',
      body: { token: token.value, first_name: firstName.value, last_name: lastName.value, password: password.value },
    })
    done.value = true
    preview.value = null
  } catch (err: unknown) {
    error.value = (err as { data?: { statusMessage?: string }; statusMessage?: string })?.data?.statusMessage
      || (err as { statusMessage?: string })?.statusMessage
      || 'Konto konnte nicht erstellt werden'
  } finally {
    saving.value = false
  }
}
</script>
