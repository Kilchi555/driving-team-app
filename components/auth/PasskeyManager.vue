<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 018 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
          </svg>
          Passkeys (Face ID / Touch ID)
        </h3>
        <p class="text-sm text-gray-600 mt-1">
          Phishing-resistente Anmeldung ohne Passwort. Funktioniert mit Face ID, Touch ID,
          Windows Hello oder Hardware-Sicherheitsschlüsseln.
        </p>
      </div>
    </div>

    <!-- Browser-Support-Warnung -->
    <div
      v-if="!isSupported"
      class="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800"
    >
      Dein Browser unterstützt Passkeys nicht. Verwende einen aktuellen Safari, Chrome,
      Firefox oder Edge — am besten mit einem Gerät, das Face ID, Touch ID oder
      Windows Hello hat.
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 flex items-start gap-3"
    >
      <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clip-rule="evenodd" />
      </svg>
      <span>{{ error }}</span>
    </div>

    <!-- Erfolgsmeldung -->
    <div
      v-if="successMessage"
      class="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800"
    >
      {{ successMessage }}
    </div>

    <!-- Liste registrierter Passkeys -->
    <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <span class="text-sm font-medium text-gray-700">
          Registrierte Geräte
          <span v-if="credentials.length > 0" class="text-gray-500">({{ credentials.length }})</span>
        </span>
        <button
          v-if="isSupported"
          @click="onRegister"
          :disabled="isLoading"
          class="px-3 py-1.5 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50"
          :style="{ background: primaryColor || '#7C3AED' }"
        >
          <span v-if="isLoading">Bitte warten…</span>
          <span v-else>+ Passkey hinzufügen</span>
        </button>
      </div>

      <div v-if="credentials.length === 0" class="px-4 py-8 text-center text-sm text-gray-500">
        Noch kein Passkey registriert. Klicke oben auf
        <span class="font-medium">+ Passkey hinzufügen</span>,
        um Face ID / Touch ID zu verknüpfen.
      </div>

      <ul v-else class="divide-y divide-gray-100">
        <li
          v-for="cred in credentials"
          :key="cred.id"
          class="px-4 py-3 flex items-center justify-between gap-4"
        >
          <div class="flex items-start gap-3 min-w-0">
            <div class="w-9 h-9 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">
                {{ cred.deviceName || 'Unbenanntes Gerät' }}
              </p>
              <p class="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Hinzugefügt {{ formatDate(cred.createdAt) }}</span>
                <span v-if="cred.lastUsedAt">
                  · Zuletzt benutzt {{ formatDate(cred.lastUsedAt) }}
                </span>
                <span
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                  :class="cred.synced
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-emerald-50 text-emerald-700'"
                >
                  {{ cred.synced ? 'Synchronisiert (Cloud)' : 'Gerätegebunden' }}
                </span>
              </p>
            </div>
          </div>
          <button
            @click="onDelete(cred)"
            :disabled="isLoading"
            class="px-2.5 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 flex-shrink-0"
          >
            Entfernen
          </button>
        </li>
      </ul>
    </div>

    <!-- Backup-Codes Sektion -->
    <div class="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h4 class="text-sm font-semibold text-gray-900">Backup-Codes</h4>
          <p class="text-xs text-gray-600 mt-1">
            Falls du keinen Zugriff mehr auf deine Geräte hast. Jeder Code kann nur einmal
            verwendet werden. Drucke sie aus und bewahre sie an einem sicheren Ort auf.
          </p>
        </div>
        <span
          v-if="backupCodeStatus !== null"
          class="text-xs font-medium px-2 py-1 rounded"
          :class="backupCodeStatus < 3
            ? 'bg-red-50 text-red-700'
            : 'bg-gray-100 text-gray-700'"
        >
          {{ backupCodeStatus }} verbleibend
        </span>
      </div>
      <button
        @click="onGenerateBackupCodes"
        :disabled="isLoading"
        class="text-sm font-medium px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        Neue Backup-Codes generieren
      </button>
    </div>

    <!-- Backup-Codes Anzeige (einmalig) -->
    <div
      v-if="newBackupCodes"
      class="bg-amber-50 border-2 border-amber-300 rounded-lg p-5 space-y-3"
    >
      <div class="flex items-start gap-3">
        <svg class="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <h4 class="text-sm font-semibold text-amber-900">
            Sichere diese Codes JETZT — sie werden nie wieder angezeigt
          </h4>
          <p class="text-xs text-amber-800 mt-1">
            Speichere sie offline (drucken, Passwort-Manager). Jeder Code kann nur einmal verwendet werden.
          </p>
        </div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-2 gap-2 font-mono text-sm bg-white border border-amber-200 rounded p-3">
        <div v-for="(code, i) in newBackupCodes" :key="i" class="select-all">
          {{ i + 1 }}. {{ code }}
        </div>
      </div>
      <div class="flex gap-2">
        <button
          @click="copyBackupCodes"
          class="text-xs font-medium px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50"
        >
          {{ copiedBackupCodes ? '✓ Kopiert' : 'Alle kopieren' }}
        </button>
        <button
          @click="printBackupCodes"
          class="text-xs font-medium px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50"
        >
          Drucken
        </button>
        <button
          @click="dismissBackupCodes"
          class="text-xs font-medium px-3 py-1.5 rounded-md text-amber-900 hover:bg-amber-100 ml-auto"
        >
          Habe ich gesichert
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePasskey, type PasskeyCredential } from '~/composables/usePasskey'

interface Props {
  primaryColor?: string
}
defineProps<Props>()

const {
  credentials,
  isLoading,
  error,
  isSupported,
  registerPasskey,
  loadCredentials,
  deletePasskey,
  generateBackupCodes,
  getBackupCodeStatus
} = usePasskey()

const successMessage = ref<string | null>(null)
const newBackupCodes = ref<string[] | null>(null)
const copiedBackupCodes = ref(false)
const backupCodeStatus = ref<number | null>(null)

const setSuccess = (msg: string) => {
  successMessage.value = msg
  setTimeout(() => { successMessage.value = null }, 4000)
}

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('de-CH', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

const onRegister = async () => {
  const result = await registerPasskey()
  if (result.success) {
    setSuccess('Passkey erfolgreich hinzugefügt.')
  }
}

const onDelete = async (cred: PasskeyCredential) => {
  if (!confirm(`Passkey "${cred.deviceName}" wirklich entfernen?`)) return
  const ok = await deletePasskey(cred.id)
  if (ok) setSuccess('Passkey entfernt.')
}

const onGenerateBackupCodes = async () => {
  if (!confirm('Neue Backup-Codes generieren? Alte (unbenutzte) Codes werden ungültig.')) return
  const codes = await generateBackupCodes()
  if (codes) {
    newBackupCodes.value = codes
    backupCodeStatus.value = codes.length
  }
}

const copyBackupCodes = async () => {
  if (!newBackupCodes.value) return
  try {
    await navigator.clipboard.writeText(newBackupCodes.value.join('\n'))
    copiedBackupCodes.value = true
    setTimeout(() => { copiedBackupCodes.value = false }, 3000)
  } catch {
    /* clipboard not available */
  }
}

const printBackupCodes = () => {
  if (!newBackupCodes.value) return
  const w = window.open('', '_blank', 'width=600,height=600')
  if (!w) return
  w.document.write(`
    <html><head><title>Simy Passkey Backup-Codes</title></head>
    <body style="font-family: monospace; padding: 32px;">
      <h2>Simy — Passkey Backup-Codes</h2>
      <p style="font-family: sans-serif; font-size: 13px; color: #555;">
        Generiert am ${new Date().toLocaleString('de-CH')}.<br>
        Bewahre diese Codes sicher auf. Jeder Code kann nur einmal verwendet werden.
      </p>
      <ol style="font-size: 18px; line-height: 2;">
        ${newBackupCodes.value.map(c => `<li>${c}</li>`).join('')}
      </ol>
    </body></html>
  `)
  w.document.close()
  w.focus()
  w.print()
}

const dismissBackupCodes = () => {
  newBackupCodes.value = null
}

onMounted(async () => {
  await loadCredentials()
  backupCodeStatus.value = await getBackupCodeStatus()
})
</script>
