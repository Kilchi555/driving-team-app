<template>
  <div class="max-w-5xl mx-auto">

    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-xl font-bold text-gray-100">Credentials & Rotation</h1>
      <p class="text-sm text-gray-500 mt-1">Verwalte und rotiere alle Zugangsschlüssel. Neue Werte werden direkt in Vercel Env Vars und GitHub Secrets geschrieben.</p>
    </div>

    <!-- Setup warning if VERCEL_API_TOKEN missing -->
    <div v-if="!setupOk" class="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
      <svg class="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
      <div>
        <div class="text-sm font-semibold text-amber-300">VERCEL_API_TOKEN fehlt</div>
        <div class="text-xs text-amber-400/80 mt-0.5">
          Erstelle einen Token unter
          <a href="https://vercel.com/account/tokens" target="_blank" class="underline hover:text-amber-300">vercel.com/account/tokens</a>
          und hinterlege ihn als <code class="bg-amber-500/20 px-1 rounded">VERCEL_API_TOKEN</code> in den Vercel Env Vars.
          Ohne diesen Token können Credentials nur in GitHub Secrets, nicht in Vercel aktualisiert werden.
        </div>
      </div>
    </div>

    <!-- Stats bar -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="rounded-xl bg-white/3 border border-white/7 p-4 text-center">
        <div class="text-2xl font-bold text-gray-100">{{ totalCredentials }}</div>
        <div class="text-xs text-gray-500 mt-1">Credentials total</div>
      </div>
      <div class="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
        <div class="text-2xl font-bold text-emerald-400">{{ rotatedCount }}</div>
        <div class="text-xs text-gray-500 mt-1">Im Intervall aktuell</div>
      </div>
      <div class="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-center">
        <div class="text-2xl font-bold text-amber-400">{{ overdueCount }}</div>
        <div class="text-xs text-gray-500 mt-1">Überfällig / Nie rotiert</div>
      </div>
    </div>

    <!-- E-Mail Reminder Settings -->
    <div class="mb-6 rounded-xl border border-white/7 bg-white/3 overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div class="flex items-center gap-2.5">
          <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
          <h2 class="text-sm font-semibold text-gray-200">E-Mail Erinnerungen</h2>
          <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium">Jeden Montag 08:00</span>
        </div>
        <button @click="sendingTest ? null : sendTestEmail()"
          :disabled="sendingTest"
          class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all font-medium"
          :class="sendingTest ? 'border-white/10 text-gray-600 cursor-not-allowed' : 'border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/15 hover:border-indigo-400/50'">
          <svg v-if="sendingTest" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
          {{ sendingTest ? 'Wird gesendet…' : 'Test-E-Mail senden' }}
        </button>
      </div>
      <div class="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-medium text-gray-400 mb-1.5">Benachrichtigungs-E-Mail</label>
          <div class="flex items-center gap-2 bg-black/20 border border-white/8 rounded-lg px-3 py-2">
            <svg class="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
            <span class="text-sm text-gray-300 font-medium">info@simy.ch</span>
            <span class="ml-auto text-xs text-gray-600">Fest konfiguriert</span>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-400 mb-1.5">
            Erinnerung X Tage vor Fälligkeit
          </label>
          <div class="flex items-center gap-3">
            <input v-model.number="reminderDays" type="number" min="7" max="60"
              class="w-24 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/50"/>
            <span class="text-xs text-gray-500">Tage</span>
          </div>
        </div>
        <div class="sm:col-span-2 flex justify-end">
          <button @click="saveConfig"
            :disabled="savingConfig"
            class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            :class="savingConfig ? 'bg-white/5 text-gray-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white'">
            <svg v-if="savingConfig" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {{ savingConfig ? 'Speichert…' : 'Einstellungen speichern' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Credential groups -->
    <div class="space-y-4">
      <div v-for="group in credentialGroups" :key="group.service" class="rounded-xl border border-white/7 bg-white/3 overflow-hidden">
        <!-- Group header -->
        <div class="flex items-center gap-3 px-5 py-4 border-b border-white/5">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" :style="{ background: group.color + '22' }">
            <span class="text-base">{{ group.icon }}</span>
          </div>
          <div>
            <div class="text-sm font-semibold text-gray-200">{{ group.service }}</div>
            <div class="text-xs text-gray-500">{{ group.description }}</div>
          </div>
          <a v-if="group.dashboardUrl" :href="group.dashboardUrl" target="_blank"
            class="ml-auto text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 flex-shrink-0">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
            Dashboard
          </a>
        </div>

        <!-- Credentials list -->
        <div class="divide-y divide-white/5">
          <div v-for="cred in group.credentials" :key="cred.key"
            class="flex items-center gap-4 px-5 py-3.5 hover:bg-white/2 transition-colors">

            <!-- Status dot -->
            <div class="w-2 h-2 rounded-full flex-shrink-0"
              :class="getStatusColor(cred.key)"></div>

            <!-- Name + meta -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <code class="text-xs font-mono font-semibold text-gray-300">{{ cred.key }}</code>
                <span v-for="t in cred.targets" :key="t"
                  class="text-xs px-1.5 py-0.5 rounded font-medium"
                  :class="t === 'vercel' ? 'bg-black/40 text-gray-400 border border-white/10' : 'bg-indigo-500/20 text-indigo-400'">
                  {{ t === 'vercel' ? '▲ Vercel' : '⚙ GitHub' }}
                </span>
                <span v-if="cred.critical" class="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">Kritisch</span>
              </div>
              <div class="text-xs text-gray-600 mt-0.5">{{ cred.description }}</div>
            </div>

            <!-- Interval + due date -->
            <div class="text-right flex-shrink-0 hidden md:block min-w-[110px]">
              <template v-if="getInterval(cred.key) === 0">
                <div class="text-xs text-gray-600">Kein Intervall</div>
                <div class="text-xs text-gray-700">Manuell</div>
              </template>
              <template v-else>
                <div class="text-xs" :class="getStatusClass(cred.key)">{{ getStatusLabel(cred.key) }}</div>
                <div class="text-xs text-gray-700">alle {{ getInterval(cred.key) }}d</div>
              </template>
            </div>

            <!-- Rotate button -->
            <button @click="openRotateModal(cred, group)"
              class="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/15 hover:border-indigo-400/50 transition-all font-medium">
              Rotieren
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Rotation Log -->
    <div class="mt-6 rounded-xl border border-white/7 bg-white/3 overflow-hidden">
      <div class="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-gray-200">Rotations-Protokoll</h2>
        <span class="text-xs text-gray-500">{{ Object.keys(rotationLog).length }} Einträge</span>
      </div>
      <div v-if="!Object.keys(rotationLog).length" class="px-5 py-6 text-sm text-gray-600 text-center">
        Noch keine Rotationen protokolliert.
      </div>
      <div v-else class="divide-y divide-white/5 max-h-64 overflow-y-auto">
        <div v-for="[key, date] in sortedLog" :key="key"
          class="flex items-center justify-between px-5 py-2.5">
          <code class="text-xs font-mono text-gray-400">{{ key }}</code>
          <div class="text-xs text-gray-500">{{ formatDate(date) }}</div>
        </div>
      </div>
    </div>

  </div>

  <!-- Rotate Modal -->
  <Teleport to="body">
    <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModal"></div>
      <div class="relative bg-[#13151f] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg">

        <!-- Modal header -->
        <div class="flex items-center justify-between p-5 border-b border-white/8">
          <div>
            <h3 class="font-semibold text-gray-100">{{ selectedCred?.key }} rotieren</h3>
            <p class="text-xs text-gray-500 mt-0.5">{{ selectedGroup?.service }}</p>
          </div>
          <button @click="closeModal" class="text-gray-500 hover:text-gray-300 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="p-5 space-y-4">
          <!-- Instructions -->
          <div class="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-3.5">
            <div class="text-xs font-semibold text-indigo-300 mb-1">Neuen Key generieren</div>
            <div class="text-xs text-indigo-400/80">{{ selectedCred?.rotateInstructions }}</div>
            <a v-if="selectedGroup?.dashboardUrl" :href="selectedGroup.dashboardUrl" target="_blank"
              class="inline-flex items-center gap-1 mt-2 text-xs text-indigo-400 hover:text-indigo-300 underline">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
              {{ selectedGroup?.service }} Dashboard öffnen →
            </a>
          </div>

          <!-- Target badges -->
          <div>
            <div class="text-xs text-gray-500 mb-2">Wird aktualisiert in:</div>
            <div class="flex gap-2">
              <span v-for="t in selectedCred?.targets" :key="t"
                class="text-xs px-2.5 py-1 rounded-lg font-medium border"
                :class="t === 'vercel' ? 'bg-black/40 text-gray-300 border-white/15' : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'">
                {{ t === 'vercel' ? '▲ Vercel Env Vars' : '⚙ GitHub Secrets' }}
              </span>
            </div>
          </div>

          <!-- New value input -->
          <div>
            <label class="block text-xs font-medium text-gray-400 mb-1.5">Neuer Wert</label>
            <textarea v-model="newValue" rows="3"
              class="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 resize-none"
              placeholder="Neuen Schlüssel hier einfügen..."></textarea>
          </div>

          <!-- Warning for critical -->
          <div v-if="selectedCred?.critical" class="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <svg class="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <div class="text-xs text-red-400">
              <span class="font-semibold">Kritischer Key.</span> Nach dem Rotieren wird ein Vercel-Redeploy empfohlen um sicherzustellen dass die App mit dem neuen Key funktioniert.
            </div>
          </div>

          <!-- Error -->
          <div v-if="rotateError" class="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            {{ rotateError }}
          </div>
        </div>

        <!-- Modal footer -->
        <div class="flex items-center justify-between p-5 border-t border-white/8">
          <button @click="closeModal" class="text-sm text-gray-500 hover:text-gray-300 transition-colors">Abbrechen</button>
          <button @click="executeRotation"
            :disabled="!newValue.trim() || rotating"
            class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            :class="newValue.trim() && !rotating
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-white/5 text-gray-600 cursor-not-allowed'">
            <svg v-if="rotating" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            {{ rotating ? 'Wird aktualisiert…' : 'Jetzt rotieren' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '~/stores/ui'
definePageMeta({ layout: 'tenant-admin' })

const { showSuccess, showError } = useUIStore()

interface Credential {
  key: string
  description: string
  targets: Array<'vercel' | 'github'>
  critical?: boolean
  rotateInstructions: string
}
interface CredentialGroup {
  service: string
  icon: string
  color: string
  description: string
  dashboardUrl?: string
  credentials: Credential[]
}

const credentialGroups: CredentialGroup[] = [
  {
    service: 'Supabase',
    icon: '⚡',
    color: '#3ecf8e',
    description: 'Datenbank, Auth, Storage',
    dashboardUrl: 'https://supabase.com/dashboard/project/unyjaetebnaexaflpyoc/settings/api',
    credentials: [
      { key: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Voller DB-Zugriff für Server-seitige Operationen', targets: ['vercel'], critical: true, rotateInstructions: '⚠️ Dieser Key ist ein JWT, signiert mit dem JWT Secret. Er lässt sich nicht eigenständig rotieren – dazu muss der SUPABASE_JWT_SECRET rotiert werden (siehe unten). Nach JWT-Rotation: Settings → API → Service Role Key → neuen Wert kopieren.' },
      { key: 'SUPABASE_ANON_KEY', description: 'Öffentlicher Key für Client-seitige Anfragen', targets: ['vercel'], critical: false, rotateInstructions: '⚠️ Auch dieser Key ist ein JWT und ändert sich nur bei JWT Secret Rotation. Nach JWT-Rotation: Settings → API → Anon Key → neuen Wert kopieren.' },
      { key: 'SUPABASE_JWT_SECRET', description: 'Signiert SERVICE_ROLE_KEY + ANON_KEY + alle User-JWTs — Rotation loggt alle User aus!', targets: ['vercel'], critical: true, rotateInstructions: 'Settings → API → JWT Settings → "Generate a new secret". WARNUNG: Invalidiert alle aktiven Sessions! Danach müssen SERVICE_ROLE_KEY und ANON_KEY ebenfalls aktualisiert werden.' },
      { key: 'SUPABASE_DB_URL', description: 'Session Pooler URL für pg_dump / pg_restore (GitHub Actions)', targets: ['github'], critical: true, rotateInstructions: 'Settings → Database → Connection Pooling → Session Mode → Connection String kopieren. Passwort-Rotation unter "Reset database password".' },
    ],
  },
  {
    service: 'Supabase Storage S3',
    icon: '🗂️',
    color: '#3ecf8e',
    description: 'S3-kompatibler Zugriff für Storage-Backup',
    dashboardUrl: 'https://supabase.com/dashboard/project/unyjaetebnaexaflpyoc/storage/settings',
    credentials: [
      { key: 'SUPABASE_S3_ACCESS_KEY_ID', description: 'S3 Access Key für Storage-Backup nach R2', targets: ['github'], critical: false, rotateInstructions: 'Storage → Settings → S3 Access Keys → alten Key löschen → "New access key" → ID kopieren.' },
      { key: 'SUPABASE_S3_SECRET_ACCESS_KEY', description: 'S3 Secret Key (nur einmal sichtbar nach Erstellung)', targets: ['github'], critical: false, rotateInstructions: 'Storage → Settings → S3 Access Keys → alten Key löschen → "New access key" → Secret kopieren. Nur einmal sichtbar!' },
    ],
  },
  {
    service: 'Cloudflare R2',
    icon: '☁️',
    color: '#f38020',
    description: 'Backup-Storage für Datenbank-Dumps',
    dashboardUrl: 'https://dash.cloudflare.com/profile/api-tokens',
    credentials: [
      { key: 'R2_ACCESS_KEY_ID', description: 'R2 API Token ID für Backup-Uploads', targets: ['vercel', 'github'], critical: true, rotateInstructions: 'Cloudflare → Manage Account → R2 → Manage R2 API Tokens → Token löschen → "Create API Token" → Object Read & Write auf driving-team-backups.' },
      { key: 'R2_SECRET_ACCESS_KEY', description: 'R2 API Secret für Backup-Uploads', targets: ['vercel', 'github'], critical: true, rotateInstructions: 'Gleichzeitig mit R2_ACCESS_KEY_ID rotieren. Token-Secret nach Erstellung sofort kopieren.' },
    ],
  },
  {
    service: 'Resend',
    icon: '📧',
    color: '#000000',
    description: 'Transaktionale E-Mails',
    dashboardUrl: 'https://resend.com/api-keys',
    credentials: [
      { key: 'RESEND_API_KEY', description: 'API Key für alle E-Mail-Versandoperationen', targets: ['vercel', 'github'], critical: false, rotateInstructions: 'resend.com → API Keys → "Create API Key" → alten Key danach löschen.' },
    ],
  },
  {
    service: 'Stripe',
    icon: '💳',
    color: '#635bff',
    description: 'SaaS-Abonnements & Billing',
    dashboardUrl: 'https://dashboard.stripe.com/apikeys',
    credentials: [
      { key: 'STRIPE_SECRET_KEY', description: 'Secret Key für Stripe API-Aufrufe', targets: ['vercel'], critical: true, rotateInstructions: 'Stripe Dashboard → Developers → API Keys → "Roll API Key". Live-Key erst in Production-Hours rotieren.' },
      { key: 'STRIPE_WEBHOOK_SECRET', description: 'Signatur-Verifikation für Webhook-Events', targets: ['vercel'], critical: false, rotateInstructions: 'Stripe → Developers → Webhooks → Webhook auswählen → "Reveal signing secret". Bei Webhook-Erneuerung automatisch neu.' },
    ],
  },
  {
    service: 'Wallee',
    icon: '🏦',
    color: '#00a0e3',
    description: 'Zahlungsabwicklung für Fahrstunden',
    dashboardUrl: 'https://app-wallee.com/account/admin',
    credentials: [
      { key: 'WALLEE_SECRET_KEY', description: 'Application User Secret für Wallee API', targets: ['vercel'], critical: true, rotateInstructions: 'Wallee Dashboard → Account → Application Users → User auswählen → Authentication Key regenerieren.' },
    ],
  },
  {
    service: 'GitHub',
    icon: '🐙',
    color: '#6e40c9',
    description: 'CI/CD, Whitelabel App-Erstellung',
    dashboardUrl: 'https://github.com/settings/tokens',
    credentials: [
      { key: 'GH_API_TOKEN', description: 'PAT für GitHub Actions API (Backup-Status Dashboard)', targets: ['vercel'], critical: false, rotateInstructions: 'GitHub → Settings → Developer Settings → Personal Access Tokens → Token löschen → "Generate new token (classic)" mit repo + workflow Scopes.' },
      { key: 'SIMY_GITHUB_PAT', description: 'PAT für Whitelabel App-Erstellung', targets: ['vercel'], critical: false, rotateInstructions: 'Gleich wie GH_API_TOKEN. Benötigt Schreibzugriff auf Repos für Whitelabel-Funktion.' },
    ],
  },
  {
    service: 'Google',
    icon: '🔍',
    color: '#4285f4',
    description: 'Maps, Ads, Analytics, Search Console',
    dashboardUrl: 'https://console.cloud.google.com/apis/credentials',
    credentials: [
      { key: 'GOOGLE_SA_PRIVATE_KEY', description: 'Service Account Private Key für GA4 & GSC Sync', targets: ['vercel'], critical: false, rotateInstructions: 'Google Cloud Console → IAM → Service Accounts → Account auswählen → Keys → "Add Key" → JSON. Alten Key danach löschen.' },
      { key: 'GOOGLE_ADS_REFRESH_TOKEN', description: 'OAuth Refresh Token für Google Ads API', targets: ['vercel'], critical: false, rotateInstructions: 'OAuth Token via scripts/refresh-oauth-tokens.mjs neu generieren oder Google OAuth Playground verwenden.' },
    ],
  },
  {
    service: 'Twilio',
    icon: '📱',
    color: '#f22f46',
    description: 'SMS-Versand',
    dashboardUrl: 'https://console.twilio.com/us1/account/keys-credentials/api-keys',
    credentials: [
      { key: 'TWILIO_AUTH_TOKEN', description: 'Auth Token für Twilio SMS API', targets: ['vercel'], critical: false, rotateInstructions: 'Twilio Console → Account → API Keys & Tokens → Auth Token → "Rotate". Alten Token wird sofort invalidiert.' },
    ],
  },
  {
    service: 'Sicherheit',
    icon: '🔐',
    color: '#ef4444',
    description: 'Interne Secrets & Verschlüsselungskeys',
    credentials: [
      { key: 'CRON_SECRET', description: 'Authentifiziert alle Vercel Cron Jobs', targets: ['vercel'], critical: true, rotateInstructions: 'Neuen zufälligen String generieren: openssl rand -hex 32. Dann alle Cron-Webhook-URLs in Vercel anpassen.' },
      { key: 'ENCRYPTION_KEY', description: 'Verschlüsselt Tenant-Secrets in der DB', targets: ['vercel'], critical: true, rotateInstructions: 'WARNUNG: Bei Rotation müssen alle gespeicherten Tenant-Secrets (SARI-Credentials etc.) neu verschlüsselt werden. Nur mit DB-Migration möglich.' },
      { key: 'IBAN_ENCRYPTION_KEY', description: 'Verschlüsselt IBAN-Daten', targets: ['vercel'], critical: true, rotateInstructions: 'WARNUNG: Bei Rotation müssen alle gespeicherten IBANs neu verschlüsselt werden. Nur mit DB-Migration möglich.' },
    ],
  },
]

// ── State ────────────────────────────────────────────────────────────────────
const rotationLog = ref<Record<string, string>>({})
const defaultIntervals = ref<Record<string, number>>({})
const loading = ref(true)
const modalOpen = ref(false)
const selectedCred = ref<Credential | null>(null)
const selectedGroup = ref<CredentialGroup | null>(null)
const newValue = ref('')
const rotating = ref(false)
const rotateError = ref('')
const setupOk = ref(true)

// Notification settings
const notifEmail = ref('info@simy.ch')
const reminderDays = ref(14)
const configIntervals = ref<Record<string, number>>({})
const savingConfig = ref(false)
const sendingTest = ref(false)

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInterval(key: string): number {
  return configIntervals.value[key] ?? defaultIntervals.value[key] ?? 90
}

function getDaysOverdue(key: string): number {
  const interval = getInterval(key)
  if (interval === 0) return -Infinity
  const lastRotated = rotationLog.value[key]
  if (!lastRotated) return Infinity
  const ageDays = (Date.now() - new Date(lastRotated).getTime()) / (1000 * 60 * 60 * 24)
  return ageDays - interval
}

function getStatusClass(key: string): string {
  const overdue = getDaysOverdue(key)
  if (overdue === Infinity) return 'text-gray-600'
  if (overdue > 0) return 'text-amber-400 font-semibold'
  if (overdue > -reminderDays.value) return 'text-yellow-500'
  return 'text-gray-500'
}

function getStatusLabel(key: string): string {
  const overdue = getDaysOverdue(key)
  const last = rotationLog.value[key]
  if (overdue === Infinity) return 'Nie rotiert'
  if (overdue > 0) return `${Math.round(overdue)}d überfällig`
  if (overdue > -reminderDays.value) return `in ${Math.round(-overdue)}d fällig`
  const days = Math.floor((Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24))
  return days === 0 ? 'Heute' : days === 1 ? 'Gestern' : `vor ${days}d`
}

function getStatusColor(key: string): string {
  const overdue = getDaysOverdue(key)
  if (overdue === Infinity) return 'bg-gray-600'
  if (overdue > 0) return 'bg-amber-400'
  if (overdue > -reminderDays.value) return 'bg-yellow-400'
  return 'bg-emerald-500'
}

// ── Computed ─────────────────────────────────────────────────────────────────
const totalCredentials = computed(() => credentialGroups.reduce((acc, g) => acc + g.credentials.length, 0))

const rotatedCount = computed(() =>
  credentialGroups.flatMap(g => g.credentials).filter(c => {
    const interval = getInterval(c.key)
    if (interval === 0) return true // "never" = always ok
    return getDaysOverdue(c.key) <= 0
  }).length,
)

const overdueCount = computed(() => totalCredentials.value - rotatedCount.value)

const sortedLog = computed(() =>
  Object.entries(rotationLog.value).sort(([, a], [, b]) => new Date(b).getTime() - new Date(a).getTime()),
)

// ── Formatting ────────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Actions ───────────────────────────────────────────────────────────────────
function openRotateModal(cred: Credential, group: CredentialGroup) {
  selectedCred.value = cred
  selectedGroup.value = group
  newValue.value = ''
  rotateError.value = ''
  modalOpen.value = true
}

function closeModal() {
  if (rotating.value) return
  modalOpen.value = false
  selectedCred.value = null
  newValue.value = ''
  rotateError.value = ''
}

async function executeRotation() {
  if (!selectedCred.value || !newValue.value.trim() || rotating.value) return
  rotating.value = true
  rotateError.value = ''
  try {
    const result = await $fetch('/api/super-admin/rotate-credential', {
      method: 'POST',
      body: {
        credentialKey: selectedCred.value.key,
        value: newValue.value.trim(),
        targets: selectedCred.value.targets,
      },
    }) as any
    rotationLog.value[selectedCred.value.key] = result.rotatedAt
    showSuccess(`${selectedCred.value.key} erfolgreich rotiert`)
    modalOpen.value = false
  } catch (err: any) {
    rotateError.value = err?.data?.message || err?.message || 'Unbekannter Fehler'
    showError('Rotation fehlgeschlagen')
  } finally {
    rotating.value = false
  }
}

async function saveConfig() {
  if (savingConfig.value) return
  savingConfig.value = true
  try {
    await $fetch('/api/super-admin/credential-config', {
      method: 'POST',
      body: {
        notificationEmail: notifEmail.value,
        reminderDaysAhead: reminderDays.value,
        intervals: configIntervals.value,
      },
    })
    showSuccess('Einstellungen gespeichert')
  } catch (err: any) {
    showError(err?.data?.message || 'Fehler beim Speichern')
  } finally {
    savingConfig.value = false
  }
}

async function sendTestEmail() {
  if (sendingTest.value) return
  sendingTest.value = true
  try {
    await $fetch('/api/super-admin/test-credential-email', { method: 'POST' })
    showSuccess(`Test-E-Mail an ${notifEmail.value} gesendet`)
  } catch (err: any) {
    showError(err?.data?.message || 'Test-E-Mail konnte nicht gesendet werden')
  } finally {
    sendingTest.value = false
  }
}

onMounted(async () => {
  try {
    const data = await $fetch('/api/super-admin/credential-status') as any
    rotationLog.value = data.rotationLog ?? {}
    defaultIntervals.value = data.defaultIntervals ?? {}
    if (data.config) {
      notifEmail.value = data.config.notificationEmail || 'info@simy.ch'
      reminderDays.value = data.config.reminderDaysAhead || 14
      configIntervals.value = data.config.intervals || {}
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.bg-white\/2 { background: rgba(255,255,255,0.02); }
.bg-white\/3 { background: rgba(255,255,255,0.03); }
.border-white\/5 { border-color: rgba(255,255,255,0.05); }
.border-white\/7 { border-color: rgba(255,255,255,0.07); }
.border-white\/8 { border-color: rgba(255,255,255,0.08); }
.border-white\/10 { border-color: rgba(255,255,255,0.10); }
.border-white\/15 { border-color: rgba(255,255,255,0.15); }
</style>
