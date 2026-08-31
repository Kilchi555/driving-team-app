<template>
  <div class="border border-gray-200 rounded-xl p-4 sm:p-5 space-y-4 bg-white">
    <div>
      <h3 class="text-sm font-semibold text-gray-900">Eigene Domain</h3>
      <p class="text-sm text-gray-600 mt-1 leading-snug">
        Hast du schon eine Domain, verbinden wir sie direkt mit Vercel. Sonst prüfen wir, ob der Name frei ist — kaufen tust du bei Infomaniak, verbinden danach hier.
      </p>
    </div>

    <div v-if="!state?.domain" class="grid sm:grid-cols-2 gap-2">
      <button
        type="button"
        class="rounded-xl border px-4 py-3 text-left text-sm transition-colors"
        :class="mode === 'have' ? 'border-gray-900 bg-gray-50 font-semibold' : 'border-gray-200 hover:bg-gray-50'"
        @click="mode = 'have'"
      >
        <span class="block">Ich habe schon eine Domain</span>
        <span class="block text-xs font-normal text-gray-500 mt-0.5">z.B. bei Infomaniak, Hostpoint, cyon</span>
      </button>
      <button
        type="button"
        class="rounded-xl border px-4 py-3 text-left text-sm transition-colors"
        :class="mode === 'need' ? 'border-gray-900 bg-gray-50 font-semibold' : 'border-gray-200 hover:bg-gray-50'"
        @click="mode = 'need'"
      >
        <span class="block">Ich brauche noch eine Domain</span>
        <span class="block text-xs font-normal text-gray-500 mt-0.5">Verfügbarkeit prüfen, dann Infomaniak</span>
      </button>
    </div>

    <div v-if="!state?.domain && mode === 'need'" class="space-y-3">
      <ol class="text-xs text-gray-500 space-y-1 list-decimal pl-4">
        <li>Name prüfen (.ch, .com, .li)</li>
        <li>Freie Domain bei Infomaniak kaufen (neuer Tab)</li>
        <li>Hierher zurück und mit Vercel verbinden</li>
      </ol>
      <div class="flex flex-col sm:flex-row gap-2">
        <input
          v-model="searchInput"
          type="text"
          class="flex-1 border border-gray-300 rounded-lg px-3 py-3 text-sm"
          placeholder="meine-firma oder meine-firma.ch"
          :disabled="busy"
          @keydown.enter.prevent="checkAvailability"
        />
        <button
          type="button"
          class="px-4 py-3 text-white text-sm font-medium rounded-lg disabled:opacity-50 min-h-[44px]"
          :style="{ background: primaryColor }"
          :disabled="busy || !searchInput.trim()"
          @click="checkAvailability"
        >
          {{ busy ? 'Prüfe…' : 'Verfügbarkeit prüfen' }}
        </button>
      </div>

      <div v-if="availability?.results?.length" class="space-y-2">
        <div
          v-for="row in availability.results"
          :key="row.domain"
          class="rounded-lg border border-gray-100 p-3 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-sm text-gray-900">{{ row.domain }}</p>
            <p
              class="text-xs mt-0.5"
              :class="row.status === 'available' ? 'text-green-700' : row.status === 'taken' ? 'text-amber-700' : 'text-gray-500'"
            >
              {{ availabilityLabel(row.status) }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <a
              v-if="row.status === 'available'"
              :href="row.shop_url"
              target="_blank"
              rel="noopener"
              class="px-3 py-2 rounded-lg text-white text-xs font-semibold min-h-[40px] inline-flex items-center"
              :style="{ background: primaryColor }"
              @click="rememberPending(row.domain)"
            >
              Bei Infomaniak kaufen
            </a>
            <button
              type="button"
              class="px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold min-h-[40px]"
              @click="useDomain(row.domain)"
            >
              {{ row.status === 'taken' ? 'Gehört mir — verbinden' : 'Danach verbinden' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!state?.domain && mode === 'have'" class="space-y-3">
      <p v-if="pendingAfterShop" class="text-xs rounded-lg bg-green-50 border border-green-200 text-green-800 px-3 py-2 leading-snug">
        Nach dem Kauf bei Infomaniak: Domain unten eintragen, verbinden, dann den DNS-Eintrag im Infomaniak-Manager setzen.
      </p>
      <div class="flex flex-col sm:flex-row gap-2">
        <input
          v-model="connectInput"
          type="text"
          class="flex-1 border border-gray-300 rounded-lg px-3 py-3 text-sm"
          placeholder="www.meine-firma.ch"
          :disabled="busy"
          @keydown.enter.prevent="saveDomain"
        />
        <button
          type="button"
          class="px-4 py-3 text-white text-sm font-medium rounded-lg disabled:opacity-50 min-h-[44px]"
          :style="{ background: primaryColor }"
          :disabled="busy || !connectInput.trim()"
          @click="saveDomain"
        >
          {{ busy ? '…' : 'Mit Vercel verbinden' }}
        </button>
      </div>
      <p class="text-xs text-gray-500 leading-snug">
        Empfehlung: <span class="font-medium">www.</span> davor — das ist ein CNAME und bei Infomaniak am einfachsten.
      </p>
    </div>

    <div v-if="state?.domain" class="space-y-3 text-sm">
      <p>
        Verbunden:
        <span class="font-semibold">{{ state.domain }}</span>
        ·
        <span class="font-semibold">{{ statusLabel }}</span>
        <span v-if="state.verified" class="text-green-600"> · live</span>
      </p>

      <div v-if="state.dns && !state.verified" class="bg-gray-50 rounded-lg p-3 space-y-2">
        <p class="font-semibold text-gray-800">DNS setzen (Infomaniak oder dein Registrar)</p>
        <ol class="list-decimal pl-5 text-xs text-gray-600 space-y-1 leading-relaxed">
          <li>
            <a
              :href="state.infomaniak_dns_guide || 'https://www.infomaniak.com/de/support/faq/2100/eine-dns-zone-verwalten'"
              target="_blank"
              rel="noopener"
              class="underline"
            >DNS-Zone öffnen</a>
            — Manager → Domain → DNS-Zone.
          </li>
          <li>Diesen Eintrag anlegen oder anpassen:</li>
        </ol>
        <div class="font-mono text-[11px] sm:text-xs bg-white rounded-lg border border-gray-200 p-3 space-y-1">
          <p>Typ: {{ state.dns.type }}</p>
          <p>Host: {{ state.dns.host }}</p>
          <p class="break-all">Wert: {{ state.dns.value }}</p>
        </div>
        <button type="button" class="text-xs font-semibold underline" @click="copyDns">
          {{ copiedKey === 'dns' ? 'Kopiert' : 'DNS-Werte kopieren' }}
        </button>
        <p class="text-xs text-gray-500 leading-snug">{{ state.dns.note }}</p>
        <template v-if="state.dns.alt">
          <p class="text-xs font-semibold text-gray-700">Zusätzlich empfohlen:</p>
          <p class="font-mono text-[11px] break-all">{{ state.dns.alt.type }} · {{ state.dns.alt.host }} · {{ state.dns.alt.value }}</p>
        </template>
        <p class="text-xs text-gray-500">DNS braucht oft 5–30 Minuten. Danach «DNS prüfen». Die Google-Schritte erscheinen, sobald die Domain live ist.</p>
      </div>

      <div v-if="challenges.length" class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-1 break-all">
        <p class="font-semibold text-amber-900">Zusätzliche Vercel-Verifikation:</p>
        <div v-for="(v, i) in challenges" :key="i">{{ v.type }} · {{ v.domain }} · {{ v.value }}</div>
      </div>

      <div class="flex flex-col sm:flex-row flex-wrap gap-2">
        <button
          type="button"
          class="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm min-h-[44px]"
          :disabled="busy"
          @click="verifyDomain"
        >
          DNS prüfen
        </button>
        <button
          type="button"
          class="px-4 py-2.5 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 text-sm min-h-[44px]"
          :disabled="busy"
          @click="removeDomain"
        >
          Entfernen
        </button>
        <a
          v-if="state.live_url"
          :href="state.live_url"
          target="_blank"
          rel="noopener"
          class="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm inline-flex items-center justify-center min-h-[44px]"
        >
          Öffnen
        </a>
      </div>

      <div v-if="state.verified && !state.is_published" class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 leading-relaxed">
        Domain ist live — Google darf die Seite aber erst indexieren, wenn du im
        <NuxtLink to="/admin/website/editor" class="underline font-semibold">Editor veröffentlichst</NuxtLink>.
      </div>

      <div v-else-if="state.verified && state.is_published" class="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
        <div>
          <p class="font-semibold text-gray-900">Bei Google anmelden</p>
          <p class="text-xs text-gray-600 mt-1 leading-relaxed">
            Das können wir nicht automatisch. Einmal in der Search Console machen — sonst erscheint die Domain nicht in der Suche.
            Google-Konto (Gmail reicht). Nach der Indexierungs-Anfrage oft 1–14 Tage.
          </p>
        </div>

        <ol class="list-decimal pl-5 text-xs text-gray-700 space-y-3 leading-relaxed">
          <li>
            <a
              href="https://search.google.com/search-console/welcome"
              target="_blank"
              rel="noopener"
              class="underline font-semibold"
            >Search Console öffnen</a>
            → <strong>Property hinzufügen</strong> → <strong>Domain</strong> (nicht URL-Präfix).
            Eintragen:
            <span class="font-mono break-all">{{ apexDomain }}</span>
            <button type="button" class="underline font-semibold ml-1" @click="copyText(apexDomain, 'apex')">
              {{ copiedKey === 'apex' ? 'Kopiert' : 'Kopieren' }}
            </button>
          </li>
          <li>
            Google zeigt einen <strong>TXT-Eintrag</strong>. Denselben DNS-Manager wie oben öffnen,
            Typ <strong>TXT</strong>, Host <strong>@</strong>, Wert 1:1 einfügen, speichern.
            In der Search Console auf <strong>Bestätigen</strong>. Oft 5–30 Minuten.
          </li>
          <li>
            Links <strong>Sitemaps</strong> → diese URL einreichen:
            <span class="font-mono break-all block mt-1">{{ state.sitemap_url }}</span>
            <button type="button" class="underline font-semibold" @click="copyText(state.sitemap_url, 'sitemap')">
              {{ copiedKey === 'sitemap' ? 'Kopiert' : 'Sitemap-URL kopieren' }}
            </button>
            ·
            <a
              v-if="gscSitemapsUrl"
              :href="gscSitemapsUrl"
              target="_blank"
              rel="noopener"
              class="underline font-semibold"
            >Sitemaps öffnen</a>
          </li>
          <li>
            Oben die Suchleiste <strong>URL-Prüfung</strong> → Startseite einfügen →
            <strong>Indexierung beantragen</strong>. Nur diese eine URL, nicht jede Unterseite.
            <span class="font-mono break-all block mt-1">{{ homepageUrl }}</span>
            <button type="button" class="underline font-semibold" @click="copyText(homepageUrl, 'home')">
              {{ copiedKey === 'home' ? 'Kopiert' : 'Startseite kopieren' }}
            </button>
            ·
            <a
              v-if="gscInspectUrl"
              :href="gscInspectUrl"
              target="_blank"
              rel="noopener"
              class="underline font-semibold"
            >URL-Prüfung öffnen</a>
          </li>
        </ol>

        <p class="text-xs text-gray-500 leading-snug">
          Nicht täglich neu beantragen. Unterseiten holt Google über die Sitemap.
          <a
            v-if="state.robots_url"
            :href="state.robots_url"
            target="_blank"
            rel="noopener"
            class="underline"
          >robots.txt prüfen</a>
        </p>
      </div>
    </div>

    <p v-if="message" class="text-xs text-gray-600">{{ message }}</p>
    <p v-if="state && !state.vercel_api_configured" class="text-xs text-amber-700">
      Vercel-API nicht vollständig konfiguriert. DNS setzen reicht oft trotzdem — sonst Domain manuell im Vercel-Projekt ergänzen.
    </p>
  </div>
</template>

<script setup lang="ts">
const PENDING_KEY = 'simy-pending-domain'

const props = withDefaults(defineProps<{
  primaryColor?: string
}>(), {
  primaryColor: '#6000BD',
})

const emit = defineEmits<{
  status: [value: any]
}>()

const mode = ref<'have' | 'need'>('have')
const searchInput = ref('')
const connectInput = ref('')
const busy = ref(false)
const message = ref('')
const copiedKey = ref('')
const pendingAfterShop = ref(false)
const state = ref<any>(null)
const availability = ref<any>(null)

const statusLabel = computed(() => {
  const s = state.value?.status
  if (state.value?.verified || s === 'active') return 'Aktiv'
  if (s === 'dns_pending') return 'Warte auf DNS'
  if (s === 'error') return 'Fehler'
  if (s === 'pending') return 'Ausstehend'
  return 'Nicht verbunden'
})

const challenges = computed(() => {
  const v = state.value?.verification?.vercel
  const list = v?.verification || v?.payload?.verification || []
  return Array.isArray(list) ? list : []
})

const apexDomain = computed(() =>
  String(state.value?.domain || '')
    .replace(/^www\./i, '')
    .toLowerCase(),
)

const homepageUrl = computed(() => {
  const live = String(state.value?.live_url || '').replace(/\/$/, '')
  return live ? `${live}/` : ''
})

const gscResourceId = computed(() => (apexDomain.value ? `sc-domain:${apexDomain.value}` : ''))

const gscSitemapsUrl = computed(() =>
  gscResourceId.value
    ? `https://search.google.com/search-console/sitemaps?resource_id=${encodeURIComponent(gscResourceId.value)}`
    : '',
)

const gscInspectUrl = computed(() => {
  if (!gscResourceId.value || !homepageUrl.value) return ''
  const q = new URLSearchParams({
    resource_id: gscResourceId.value,
    id: homepageUrl.value,
  })
  return `https://search.google.com/search-console/inspect?${q.toString()}`
})

function availabilityLabel(status: string) {
  if (status === 'available') return 'Frei — bei Infomaniak registrieren'
  if (status === 'taken') return 'Bereits vergeben'
  return 'Status unklar — Shop prüfen oder verbinden, falls sie dir gehört'
}

function withWww(domain: string) {
  const host = String(domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0] || ''
  if (!host) return ''
  return host.startsWith('www.') ? host : `www.${host}`
}

function rememberPending(domain: string) {
  const host = withWww(domain)
  connectInput.value = host
  pendingAfterShop.value = true
  mode.value = 'have'
  if (import.meta.client) localStorage.setItem(PENDING_KEY, host)
}

function useDomain(domain: string) {
  connectInput.value = withWww(domain)
  pendingAfterShop.value = true
  mode.value = 'have'
}

async function load() {
  try {
    state.value = await $fetch('/api/website/custom-domain')
    if (state.value?.domain) {
      connectInput.value = state.value.domain
      pendingAfterShop.value = false
      if (import.meta.client) localStorage.removeItem(PENDING_KEY)
    }
    emit('status', state.value)
  } catch {
    state.value = null
    emit('status', null)
  }
}

async function checkAvailability() {
  busy.value = true
  message.value = ''
  try {
    availability.value = await $fetch('/api/website/domain-availability', {
      query: { q: searchInput.value },
    })
  } catch (error: any) {
    message.value = error?.data?.statusMessage || error?.message || 'Prüfung fehlgeschlagen'
    availability.value = null
  } finally {
    busy.value = false
  }
}

async function saveDomain() {
  busy.value = true
  message.value = ''
  try {
    const res = await $fetch<any>('/api/website/custom-domain', {
      method: 'POST',
      body: { domain: connectInput.value },
    })
    message.value = res.message || 'Gespeichert — jetzt DNS setzen'
    if (import.meta.client) localStorage.removeItem(PENDING_KEY)
    pendingAfterShop.value = false
    await load()
  } catch (error: any) {
    message.value = error?.data?.statusMessage || error?.message || 'Fehler'
  } finally {
    busy.value = false
  }
}

async function verifyDomain() {
  busy.value = true
  message.value = ''
  try {
    const res = await $fetch<any>('/api/website/custom-domain/verify', { method: 'POST' })
    message.value = res.message || 'Geprüft'
    await load()
  } catch (error: any) {
    message.value = error?.data?.statusMessage || error?.message || 'Prüfung fehlgeschlagen'
  } finally {
    busy.value = false
  }
}

async function removeDomain() {
  if (!confirm('Custom Domain wirklich entfernen?')) return
  busy.value = true
  message.value = ''
  try {
    await $fetch('/api/website/custom-domain', { method: 'DELETE' })
    connectInput.value = ''
    message.value = 'Entfernt'
    await load()
  } catch (error: any) {
    message.value = error?.data?.statusMessage || error?.message || 'Fehler'
  } finally {
    busy.value = false
  }
}

async function copyText(value: string, key: string) {
  const text = String(value || '').trim()
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    setTimeout(() => {
      if (copiedKey.value === key) copiedKey.value = ''
    }, 1600)
  } catch { /* ignore */ }
}

async function copyDns() {
  const dns = state.value?.dns
  if (!dns) return
  await copyText(`${dns.type} ${dns.host} ${dns.value}`, 'dns')
}

onMounted(() => {
  if (import.meta.client) {
    const pending = localStorage.getItem(PENDING_KEY)
    if (pending) {
      connectInput.value = pending
      mode.value = 'have'
      pendingAfterShop.value = true
    }
  }
  void load()
})
</script>
