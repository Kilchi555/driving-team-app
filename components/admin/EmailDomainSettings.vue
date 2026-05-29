<template>
  <div class="space-y-6">

    <!-- Header -->
    <div>
      <h2 class="text-lg font-semibold text-gray-900">E-Mail Absender-Domain</h2>
      <p class="text-sm text-gray-500 mt-1">
        Versende E-Mails von deiner eigenen Domain statt von <code class="bg-gray-100 px-1 rounded">noreply@simy.ch</code>.
      </p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center gap-2 text-sm text-gray-500">
      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      Wird geladen…
    </div>

    <template v-else>

      <!-- ── NOT CONFIGURED ── -->
      <div v-if="!status?.configured" class="space-y-4">
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <strong>Wie funktioniert das?</strong>
          <ol class="mt-2 space-y-1 list-decimal list-inside">
            <li>Du gibst deine gewünschte Absender-E-Mail ein (z. B. <code>info@driving-team.ch</code>).</li>
            <li>Wir registrieren die Domain bei unserem E-Mail-Dienstleister.</li>
            <li>Du erhältst DNS-Records, die du bei deinem Domain-Anbieter einträgst.</li>
            <li>Nach Verifizierung gehen alle E-Mails von deiner Domain.</li>
          </ol>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">Absender-E-Mail</label>
          <input
            v-model="newFromEmail"
            type="email"
            placeholder="info@deine-fahrschule.ch"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            :disabled="saving"
          />
        </div>

        <button
          @click="setup"
          :disabled="!newFromEmail || saving"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ saving ? 'Wird eingerichtet…' : 'Domain einrichten' }}
        </button>
      </div>

      <!-- ── CONFIGURED – PENDING VERIFICATION ── -->
      <div v-else-if="!status.verified" class="space-y-5">

        <!-- Status badge -->
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-full text-xs font-medium text-yellow-800">
            <span class="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
            Verifizierung ausstehend
          </div>
          <span class="text-sm text-gray-600">{{ status.fromEmail }}</span>
        </div>

        <!-- DNS records table -->
        <div>
          <p class="text-sm font-medium text-gray-700 mb-3">
            Füge folgende DNS-Records bei deinem Domain-Anbieter hinzu:
          </p>
          <div class="overflow-x-auto rounded-xl border border-gray-200">
            <table class="w-full text-xs">
              <thead class="bg-gray-50 text-gray-500 uppercase tracking-wide">
                <tr>
                  <th class="text-left px-3 py-2.5">Typ</th>
                  <th class="text-left px-3 py-2.5">Name</th>
                  <th class="text-left px-3 py-2.5">Wert</th>
                  <th class="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 font-mono">
                <tr v-for="(rec, i) in status.dnsRecords" :key="i" class="hover:bg-gray-50">
                  <td class="px-3 py-2.5 font-sans">
                    <span class="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{{ rec.type }}</span>
                  </td>
                  <td class="px-3 py-2.5 max-w-[200px] truncate text-gray-700">{{ rec.name }}</td>
                  <td class="px-3 py-2.5 max-w-[280px] truncate text-gray-700">{{ rec.value }}</td>
                  <td class="px-3 py-2.5">
                    <button
                      @click="copyToClipboard(rec.value)"
                      class="text-blue-500 hover:text-blue-700 transition-colors"
                      title="Kopieren"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-xs text-gray-400 mt-2">
            DNS-Änderungen können bis zu 48h dauern bis sie aktiv sind.
          </p>
        </div>

        <div class="space-y-2">
          <div class="flex items-center gap-3">
            <button
              @click="checkStatus"
              :disabled="checking"
              class="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <svg v-if="checking" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              {{ checking ? 'Prüfe…' : 'Status prüfen' }}
            </button>
            <button
              @click="remove"
              :disabled="saving"
              class="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Domain entfernen
            </button>
          </div>
          <p v-if="lastChecked" class="text-xs text-gray-400">
            Zuletzt geprüft: {{ lastChecked }} — noch nicht verifiziert
          </p>
        </div>
      </div>

      <!-- ── VERIFIED ── -->
      <div v-else class="space-y-4">

        <!-- Success badge -->
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-xs font-medium text-green-800">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            Domain verifiziert
          </div>
          <span class="text-sm font-medium text-gray-800">{{ status.fromEmail }}</span>
        </div>

        <div class="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
          Alle E-Mails (Erinnerungen, Rechnungen, Onboarding etc.) werden ab sofort von
          <strong>{{ status.fromEmail }}</strong> versendet.
        </div>

        <button
          @click="remove"
          :disabled="saving"
          class="text-sm text-red-500 hover:text-red-700 transition-colors"
        >
          Domain entfernen
        </button>
      </div>

      <!-- Error -->
      <p v-if="errorMsg" class="text-sm text-red-600">{{ errorMsg }}</p>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface DomainStatus {
  configured: boolean
  verified?: boolean
  fromEmail?: string
  status?: string
  dnsRecords?: Array<{ type: string; name: string; value: string }>
}

const loading    = ref(true)
const saving     = ref(false)
const checking   = ref(false)
const errorMsg   = ref('')
const newFromEmail = ref('')
const status     = ref<DomainStatus | null>(null)
const lastChecked = ref('')

onMounted(loadStatus)

async function loadStatus() {
  loading.value = true
  errorMsg.value = ''
  try {
    status.value = await $fetch<DomainStatus>('/api/admin/email-domain/status')
  } catch (e: any) {
    errorMsg.value = e?.data?.statusMessage || 'Fehler beim Laden'
  } finally {
    loading.value = false
  }
}

async function checkStatus() {
  checking.value = true
  errorMsg.value = ''
  try {
    status.value = await $fetch<DomainStatus>('/api/admin/email-domain/status')
    lastChecked.value = new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
  } catch (e: any) {
    errorMsg.value = e?.data?.statusMessage || 'Fehler beim Prüfen'
  } finally {
    checking.value = false
  }
}

async function setup() {
  if (!newFromEmail.value) return
  saving.value = true
  errorMsg.value = ''
  try {
    await $fetch('/api/admin/email-domain/setup', {
      method: 'POST',
      body: { fromEmail: newFromEmail.value },
    })
    await loadStatus()
    newFromEmail.value = ''
  } catch (e: any) {
    errorMsg.value = e?.data?.statusMessage || 'Fehler beim Einrichten'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!confirm('Domain wirklich entfernen? E-Mails werden danach wieder von noreply@simy.ch versendet.')) return
  saving.value = true
  errorMsg.value = ''
  try {
    await $fetch('/api/admin/email-domain/remove', { method: 'DELETE' })
    status.value = { configured: false }
  } catch (e: any) {
    errorMsg.value = e?.data?.statusMessage || 'Fehler beim Entfernen'
  } finally {
    saving.value = false
  }
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text)
}
</script>
