<template>
  <div class="min-h-[100svh] flex items-start justify-center p-4 sm:p-8 bg-slate-50">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 sm:p-8">
      <div v-if="phase === 'loading'" class="text-center space-y-3 py-10">
        <div class="mx-auto w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        <p class="text-sm text-slate-600">E-Mail wird bestätigt…</p>
      </div>

      <div v-else-if="phase === 'error'" class="space-y-4 text-center py-6">
        <h1 class="text-xl font-bold text-slate-900">Bestätigung fehlgeschlagen</h1>
        <p class="text-sm text-slate-600">{{ errorMessage }}</p>
        <a href="/tenant-register" class="inline-flex text-sm font-semibold text-blue-700 underline">Zur Registrierung</a>
      </div>

      <div v-else-if="phase === 'admin'" class="space-y-5">
        <div>
          <h1 class="text-xl font-bold text-slate-900">Admin-Konto erstellen</h1>
          <p class="text-sm text-slate-600 mt-1">
            E-Mail bestätigt für <strong>{{ tenantName }}</strong>. Bitte setze jetzt dein Admin-Passwort.
          </p>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">E-Mail</label>
            <input :value="adminEmail" type="email" disabled class="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Vorname</label>
              <input v-model="firstName" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Nachname</label>
              <input v-model="lastName" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Passwort (min. 12 Zeichen)</label>
            <input v-model="password" type="password" required minlength="12" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" />
          </div>
        </div>
        <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
        <button
          type="button"
          class="w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm disabled:opacity-50"
          :disabled="busy || password.length < 12"
          @click="createAdmin"
        >
          {{ busy ? 'Wird erstellt…' : 'Admin erstellen & fortfahren' }}
        </button>
      </div>

      <div v-else class="space-y-4 text-center py-6">
        <h1 class="text-xl font-bold text-slate-900">Bereit</h1>
        <p class="text-sm text-slate-600">Dein Admin-Konto wurde erstellt. Du kannst dich jetzt anmelden.</p>
        <a
          :href="loginHref"
          class="inline-flex w-full justify-center py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm"
        >
          Zum Login
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

const phase = ref<'loading' | 'error' | 'admin' | 'done'>('loading')
const errorMessage = ref('')
const formError = ref('')
const busy = ref(false)

const tenantId = ref('')
const tenantSlug = ref('')
const tenantName = ref('')
const adminEmail = ref('')
const registrationToken = ref('')
const firstName = ref('')
const lastName = ref('')
const password = ref('')

const loginHref = computed(() =>
  tenantSlug.value ? `/login?tenant=${encodeURIComponent(tenantSlug.value)}` : '/login'
)

onMounted(async () => {
  const token = typeof route.query.token === 'string' ? route.query.token : ''
  if (!token) {
    phase.value = 'error'
    errorMessage.value = 'Bestätigungslink unvollständig.'
    return
  }

  try {
    const res = await $fetch('/api/tenants/verify-registration-email', {
      method: 'POST',
      body: { token },
    }) as any

    if (!res?.success || !res.registration_token || !res.tenant?.id) {
      throw new Error('Bestätigung fehlgeschlagen')
    }

    tenantId.value = res.tenant.id
    tenantSlug.value = res.tenant.slug || ''
    tenantName.value = res.tenant.name || ''
    adminEmail.value = res.tenant.contact_email || ''
    registrationToken.value = res.registration_token
    // Prefer local part for a friendly default first name if empty
    const local = String(adminEmail.value).split('@')[0] || 'Admin'
    firstName.value = local.charAt(0).toUpperCase() + local.slice(1)
    lastName.value = tenantName.value.split(/\s+/)[0] || 'Konto'
    phase.value = 'admin'
  } catch (e: any) {
    phase.value = 'error'
    errorMessage.value =
      e?.data?.statusMessage || e?.message || 'Bestätigung fehlgeschlagen.'
  }
})

async function createAdmin() {
  formError.value = ''
  if (password.value.length < 12) {
    formError.value = 'Passwort muss mindestens 12 Zeichen haben.'
    return
  }
  busy.value = true
  try {
    const adminRes = await $fetch('/api/tenants/create-admin', {
      method: 'POST',
      body: {
        email: adminEmail.value,
        password: password.value,
        first_name: firstName.value.trim(),
        last_name: lastName.value.trim(),
        tenant_id: tenantId.value,
        registration_token: registrationToken.value,
      },
    }) as any

    if (!adminRes?.success) {
      throw new Error(adminRes?.message || 'Admin konnte nicht erstellt werden')
    }

    try {
      await $fetch('/api/tenants/send-welcome-email', {
        method: 'POST',
        body: {
          tenantId: tenantId.value,
          registration_token: registrationToken.value,
        },
      })
    } catch {
      /* non-critical */
    }

    phase.value = 'done'
  } catch (e: any) {
    formError.value = e?.data?.statusMessage || e?.message || 'Fehler beim Erstellen'
  } finally {
    busy.value = false
  }
}
</script>
