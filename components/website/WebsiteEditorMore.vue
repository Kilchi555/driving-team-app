<template>
  <section class="wem" :id="anchorId">
    <!-- USPs -->
    <div v-if="panel === 'usps'" class="wem-block">
      <h3 class="wem-title">Was macht euch besonders?</h3>
      <p class="wem-hint">Steht nicht in den Kategorien — z.B. Abendtermine, Automatik, Hol- und Bringdienst.</p>
      <div class="wem-chips">
        <span v-for="(usp, idx) in extras.usps" :key="`${usp}-${idx}`" class="wem-chip">
          {{ usp }}
          <button type="button" class="wem-chip-x" @click="extras.usps.splice(idx, 1)">×</button>
        </span>
      </div>
      <div class="wem-row">
        <input
          v-model="uspDraft"
          type="text"
          maxlength="80"
          placeholder="z.B. Abendtermine"
          @keydown.enter.prevent="addUsp"
        />
        <button type="button" class="wem-btn" @click="addUsp">+ Vorteil</button>
      </div>
    </div>

    <!-- Extra prices + products -->
    <div v-else-if="panel === 'offer'" class="wem-block">
      <h3 class="wem-title">Weitere Preise</h3>
      <p class="wem-hint">
        {{
          websiteOnly
            ? 'Kunden fragen per WhatsApp oder Kontaktformular an — kein Simy-Kalender nötig. Eigenen Link kannst du im Tab Abschluss setzen.'
            : 'Preise aus Simy erscheinen automatisch. Hier nur ergänzen, was dort fehlt.'
        }}
      </p>
      <div v-if="catalogServices.length" class="wem-catalog">
        <p class="wem-kicker">Aus Simy</p>
        <div v-for="s in catalogServices" :key="s.id" class="wem-catalog-row">
          <div>
            <p class="wem-catalog-name">{{ s.name }}</p>
            <p v-if="s.duration_minutes" class="wem-hint">{{ s.duration_minutes }} Min</p>
          </div>
          <span v-if="s.price_chf != null" class="wem-price">CHF {{ s.price_chf }}</span>
        </div>
      </div>
      <div v-if="unusedServiceHints.length" class="wem-chips">
        <button
          v-for="hint in unusedServiceHints"
          :key="hint"
          type="button"
          class="wem-chip-btn"
          @click="addExtraService(hint)"
        >
          + {{ hint }}
        </button>
      </div>
      <div v-for="(svc, idx) in visibleExtraServices" :key="svc.id" class="wem-card">
        <div class="wem-row">
          <input v-model="svc.name" type="text" placeholder="Bezeichnung" />
          <button type="button" class="wem-link-danger" @click="removeExtraService(svc.id)">
            Entfernen
          </button>
        </div>
        <div class="wem-grid2">
          <label>
            Minuten
            <input v-model.number="svc.duration_minutes" type="number" min="0" />
          </label>
          <label>
            Preis CHF
            <input v-model.number="svc.price_chf" type="number" min="0" step="1" />
          </label>
        </div>
        <textarea v-model="svc.description" rows="2" placeholder="Kurze Beschreibung (optional)" />
        <div class="wem-photo wem-photo--offer">
          <div class="wem-photo-preview is-offer">
            <img v-if="svc.image_url" :src="svc.image_url" :alt="svc.name || 'Foto'" />
            <span v-else>Kein Foto</span>
          </div>
          <div class="wem-photo-actions">
            <label class="wem-btn">
              {{ uploadingId === svc.id ? 'Lädt…' : 'Foto hochladen' }}
              <input
                type="file"
                accept="image/*,.heic,.heif"
                class="wem-file"
                :disabled="!!uploadingId"
                @change="onServicePhoto($event, svc)"
              />
            </label>
            <button
              v-if="svc.image_url"
              type="button"
              class="wem-link-danger"
              :disabled="!!uploadingId"
              @click="svc.image_url = null"
            >
              Entfernen
            </button>
          </div>
        </div>
      </div>
      <button type="button" class="wem-btn" @click="addExtraService()">+ Preis hinzufügen</button>

      <h3 class="wem-title wem-title--spaced">Produkte</h3>
      <p class="wem-hint">
        {{
          websiteOnly
            ? 'Kunden bestellen per WhatsApp oder Kontaktformular — kein Simy-Shop nötig. Optional eigenen Shop-Link im Tab Abschluss.'
            : 'Produkte aus Simy erscheinen automatisch. Hier nur ergänzen, was dort fehlt.'
        }}
      </p>
      <div v-if="catalogProducts.length" class="wem-catalog">
        <p class="wem-kicker">Aus Simy</p>
        <div v-for="p in catalogProducts" :key="p.id" class="wem-catalog-row">
          <div>
            <p class="wem-catalog-name">{{ p.name }}</p>
            <p v-if="p.description" class="wem-hint">{{ p.description }}</p>
          </div>
          <span v-if="p.price_chf != null" class="wem-price">CHF {{ p.price_chf }}</span>
        </div>
      </div>
      <div v-if="unusedProductHints.length" class="wem-chips">
        <button
          v-for="hint in unusedProductHints"
          :key="hint"
          type="button"
          class="wem-chip-btn"
          @click="addExtraProduct(hint)"
        >
          + {{ hint }}
        </button>
      </div>
      <div v-for="(prod, idx) in visibleExtraProducts" :key="prod.id" class="wem-card">
        <div class="wem-row">
          <input v-model="prod.name" type="text" placeholder="Bezeichnung" />
          <button type="button" class="wem-link-danger" @click="removeExtraProduct(prod.id)">
            Entfernen
          </button>
        </div>
        <label>
          Preis CHF
          <input v-model.number="prod.price_chf" type="number" min="0" step="1" />
        </label>
        <textarea v-model="prod.description" rows="2" placeholder="Kurze Beschreibung (optional)" />
        <div class="wem-photo wem-photo--offer">
          <div class="wem-photo-preview is-offer">
            <img v-if="prod.image_url" :src="prod.image_url" :alt="prod.name || 'Foto'" />
            <span v-else>Kein Foto</span>
          </div>
          <div class="wem-photo-actions">
            <label class="wem-btn">
              {{ uploadingId === prod.id ? 'Lädt…' : 'Foto hochladen' }}
              <input
                type="file"
                accept="image/*,.heic,.heif"
                hidden
                :disabled="uploadingId === prod.id"
                @change="onProductPhoto($event, prod)"
              />
            </label>
            <button
              v-if="prod.image_url"
              type="button"
              class="wem-link-danger"
              @click="prod.image_url = null"
            >
              Foto entfernen
            </button>
          </div>
        </div>
      </div>
      <button type="button" class="wem-btn" @click="addExtraProduct()">+ Produkt hinzufügen</button>
    </div>

    <!-- Team -->
    <div v-else-if="panel === 'team'" class="wem-block">
      <h3 class="wem-title">Team auf der Website</h3>
      <p class="wem-hint">
        Personen aus Simy ein- oder ausblenden. Gleiche Person mit zwei Rollen (z.B. Inhaber/in und
        {{ staffRoleHint }}) erscheint einmal — die Rollenbezeichnung kannst du anpassen.
      </p>
      <p v-if="!extras.teamMembers.length" class="wem-empty">
        Noch niemand hinterlegt — füge mindestens eine Person hinzu.
      </p>
      <div
        v-for="m in extras.teamMembers"
        :key="m.id"
        class="wem-card wem-team-card"
        :class="{ on: m.visible }"
      >
        <div class="wem-row">
          <label class="wem-check">
            <input v-model="m.visible" type="checkbox" />
          </label>
          <span class="wem-toggle-fields">
            <input v-model="m.name" type="text" placeholder="Name" />
            <input v-model="m.role_label" type="text" :placeholder="`Rolle, z.B. ${staffRoleHint}`" />
          </span>
          <button
            v-if="m.source === 'custom'"
            type="button"
            class="wem-link-danger"
            @click="removeTeam(m.id)"
          >
            Entfernen
          </button>
        </div>
        <div class="wem-photo wem-photo--avatar">
          <div class="wem-photo-preview is-avatar">
            <img v-if="m.photo_url" :src="m.photo_url" :alt="m.name || 'Foto'" />
            <span v-else>Kein Foto</span>
          </div>
          <div class="wem-row">
            <label class="wem-btn">
              {{ uploadingId === m.id ? 'Lädt…' : 'Foto hochladen' }}
              <input
                type="file"
                accept="image/*,.heic,.heif"
                class="wem-file"
                :disabled="!!uploadingId"
                @change="onTeamPhoto($event, m)"
              />
            </label>
            <button
              v-if="m.photo_url"
              type="button"
              class="wem-link-danger"
              :disabled="!!uploadingId"
              @click="m.photo_url = null"
            >
              Entfernen
            </button>
          </div>
          <p class="wem-hint">JPG, PNG oder HEIC — quadratisch, wird nach WebP konvertiert.</p>
        </div>
      </div>
      <button type="button" class="wem-btn" @click="addTeam">+ Person hinzufügen</button>
    </div>

    <!-- Voices -->
    <div v-else-if="panel === 'voices'" class="wem-block">
      <h3 class="wem-title">Kundenstimmen</h3>
      <p class="wem-hint">Am besten Google verbinden. Sonst echte Zitate — keine erfundenen Reviews.</p>
      <div class="wem-note">
        <p v-if="googleReviews.enabled">
          Google Reviews aktiv für
          {{ googleReviews.places.map((p) => p.name || p.place_id).filter(Boolean).join(', ') || 'deine Standorte' }}.
          Manuelle Zitate unten sind nur Fallback.
        </p>
        <div v-else class="wem-stack">
          <p><strong>Empfohlen:</strong> Google-Standort finden — ohne Place-ID kopieren.</p>
          <button type="button" class="wem-btn wem-btn--primary" :disabled="googleBusy" @click="suggestGooglePlace">
            {{ googleBusy ? 'Suche…' : 'Google-Standort finden' }}
          </button>
          <p v-if="googleError" class="wem-warn">{{ googleError }}</p>
          <button
            v-for="c in googleCandidates"
            :key="c.place_id"
            type="button"
            class="wem-place"
            :disabled="googleBusy"
            @click="confirmGooglePlace(c)"
          >
            <strong>{{ c.name }}</strong>
            <span>{{ c.address }}</span>
          </button>
        </div>
      </div>
      <div class="wem-row wem-row--end">
        <button type="button" class="wem-btn" @click="addTestimonial">+ Zitat hinzufügen</button>
      </div>
      <p v-if="!extras.testimonials.length" class="wem-empty">
        Noch keine Zitate. Feedback aus WhatsApp, SMS oder mündlich eintragen.
      </p>
      <div v-for="(t, idx) in extras.testimonials" :key="t.id" class="wem-card">
        <div class="wem-row">
          <input v-model="t.author" type="text" placeholder="Name (z.B. Anna M.)" />
          <button type="button" class="wem-link-danger" @click="extras.testimonials.splice(idx, 1)">
            Entfernen
          </button>
        </div>
        <div class="wem-head">
          <span>Zitat</span>
          <AIOptimizationSuggestion
            compact
            :original="t.text"
            :context="`${t.author || 'Kunde'} — nur umformulieren, nichts erfinden`"
            content-type="testimonial"
            optimization-type="readability"
            :formal-address="formalAddress"
            @apply="t.text = $event"
          />
        </div>
        <textarea v-model="t.text" rows="4" placeholder="Echtes Zitat / Feedback…" />
      </div>
    </div>

    <!-- Contact channels -->
    <div v-else-if="panel === 'channels'" class="wem-block">
      <h3 class="wem-title">Kontaktarten auf der Website</h3>
      <p class="wem-hint">Deaktiviert = nicht auf der Landingpage.</p>
      <label
        v-for="opt in channelOptions"
        :key="opt.key"
        class="wem-toggle"
        :class="{ on: extras.contact_channels[opt.key] }"
      >
        <input v-model="extras.contact_channels[opt.key]" type="checkbox" />
        <span>
          <strong>{{ opt.label }}</strong>
          <span class="wem-hint">{{ opt.hint }}</span>
        </span>
      </label>
      <label v-if="extras.contact_channels.whatsapp" class="wem-field">
        <strong>WhatsApp-Nummer</strong>
        <span class="wem-hint">Die Handy-Nummer, die in WhatsApp hinterlegt ist — nicht die Festnetznummer.</span>
        <input v-model="extras.whatsapp_phone" type="tel" placeholder="+41 79 123 45 67" autocomplete="tel" />
      </label>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AIOptimizationSuggestion from '~/components/website/AIOptimizationSuggestion.vue'
import {
  newWizardId,
  type WizardExtraProduct,
  type WizardExtraService,
  type WizardTeamMember,
} from '~/utils/website-wizard-content'
import {
  websiteExtraProductHints,
  websiteExtraServiceHints,
} from '~/composables/useTerminology'
import { compressPhotoForUpload } from '~/utils/imageCompression'

export type EditorExtras = {
  extraServices: WizardExtraService[]
  extraProducts: WizardExtraProduct[]
  teamMembers: WizardTeamMember[]
  testimonials: Array<{ id: string; author: string; text: string; rating: number }>
  contact_channels: { phone: boolean; email: boolean; whatsapp: boolean; form: boolean }
  whatsapp_phone: string
  usps: string[]
}

export type CatalogProduct = {
  id: string
  name: string
  description?: string
  price_chf?: number | null
}

export type CatalogService = {
  id: string
  name: string
  duration_minutes?: number | null
  price_chf?: number | null
}

const props = defineProps<{
  panel: 'usps' | 'offer' | 'team' | 'voices' | 'channels'
  extras: EditorExtras
  catalogProducts?: CatalogProduct[]
  catalogServices?: CatalogService[]
  googleReviews: { enabled: boolean; places: Array<{ name?: string; place_id?: string }> }
  formalAddress: 'sie' | 'du'
  brandName?: string
  address?: string
  city?: string
  websiteOnly?: boolean
}>()

const extras = props.extras
const websiteOnly = computed(() => Boolean(props.websiteOnly))
const catalogProducts = computed(() => props.catalogProducts || [])
const catalogServices = computed(() => props.catalogServices || [])
const { t: terms, businessType } = useTerminology()
const extraServiceHints = computed(() => websiteExtraServiceHints(businessType.value))
const extraProductHints = computed(() => websiteExtraProductHints(businessType.value))
const staffRoleHint = computed(() => terms.value.staff)

function nameKey(v: string) {
  return String(v || '').trim().toLowerCase()
}
const takenServiceNames = computed(() => {
  const set = new Set(catalogServices.value.map((s) => nameKey(s.name)))
  for (const s of extras.extraServices) set.add(nameKey(s.name))
  return set
})
const takenProductNames = computed(() => {
  const set = new Set(catalogProducts.value.map((p) => nameKey(p.name)))
  for (const p of extras.extraProducts) set.add(nameKey(p.name))
  return set
})
const unusedServiceHints = computed(() =>
  extraServiceHints.value.filter((h) => !takenServiceNames.value.has(nameKey(h))),
)
const unusedProductHints = computed(() =>
  extraProductHints.value.filter((h) => !takenProductNames.value.has(nameKey(h))),
)
const dbServiceNames = computed(() => new Set(catalogServices.value.map((s) => nameKey(s.name))))
const dbProductNames = computed(() => new Set(catalogProducts.value.map((p) => nameKey(p.name))))
const visibleExtraServices = computed(() =>
  extras.extraServices.filter((s) => !dbServiceNames.value.has(nameKey(s.name))),
)
const visibleExtraProducts = computed(() =>
  extras.extraProducts.filter((p) => !dbProductNames.value.has(nameKey(p.name))),
)
const channelOptions = [
  { key: 'phone' as const, label: 'Telefon', hint: 'Anruf-Link auf der Website' },
  { key: 'email' as const, label: 'E-Mail', hint: 'mailto-Link anzeigen' },
  { key: 'whatsapp' as const, label: 'WhatsApp', hint: 'Direkt-Chat im Header & Kontakt' },
  { key: 'form' as const, label: 'Kontaktformular', hint: '«Nachricht schreiben»-Formular' },
]

const uspDraft = ref('')
const uploadingId = ref('')
const googleBusy = ref(false)
const googleError = ref('')
const googleCandidates = ref<
  Array<{ place_id: string; name: string; address?: string; maps_url?: string; rating?: number }>
>([])

const anchorId = computed(() => `extras.${props.panel}`)

function addUsp() {
  const v = uspDraft.value.trim().slice(0, 80)
  if (!v) return
  if (!extras.usps.some((u) => u.toLowerCase() === v.toLowerCase())) extras.usps.push(v)
  uspDraft.value = ''
}

function addExtraService(name = '') {
  if (name && takenServiceNames.value.has(nameKey(name))) return
  extras.extraServices.push({
    id: newWizardId('extra'),
    name,
    duration_minutes: name && extraServiceHints.value[0] === name ? 60 : null,
    price_chf: null,
    description: '',
    image_url: null,
  })
}

function removeExtraService(id: string) {
  const idx = extras.extraServices.findIndex((s) => s.id === id)
  if (idx >= 0) extras.extraServices.splice(idx, 1)
}

async function uploadOfferPhoto(file: File, slot: 'service' | 'team') {
  const ready = await compressPhotoForUpload(file, {
    maxEdge: slot === 'team' ? 900 : 1600,
    maxBytes: 1.8 * 1024 * 1024,
  })
  const body = new FormData()
  body.append('slot', slot)
  body.append('file', ready)
  const res = await $fetch<{ url?: string; webp_url?: string }>('/api/website/media/upload', {
    method: 'POST',
    body,
  })
  return res.url || res.webp_url || null
}

async function onServicePhoto(event: Event, svc: WizardExtraService) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadingId.value = svc.id
  try {
    svc.image_url = await uploadOfferPhoto(file, 'service')
  } finally {
    uploadingId.value = ''
    if (input) input.value = ''
  }
}

async function onProductPhoto(event: Event, prod: WizardExtraProduct) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadingId.value = prod.id
  try {
    prod.image_url = await uploadOfferPhoto(file, 'service')
  } finally {
    uploadingId.value = ''
    if (input) input.value = ''
  }
}

function addExtraProduct(name = '') {
  if (name && takenProductNames.value.has(nameKey(name))) return
  extras.extraProducts.push({
    id: newWizardId('product'),
    name,
    price_chf: null,
    description: '',
    image_url: null,
  })
}

function removeExtraProduct(id: string) {
  const idx = extras.extraProducts.findIndex((p) => p.id === id)
  if (idx >= 0) extras.extraProducts.splice(idx, 1)
}

async function onTeamPhoto(event: Event, member: WizardTeamMember) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadingId.value = member.id
  try {
    member.photo_url = await uploadOfferPhoto(file, 'team')
  } finally {
    uploadingId.value = ''
    if (input) input.value = ''
  }
}

function addTeam() {
  extras.teamMembers.push({
    id: newWizardId('team'),
    source: 'custom',
    name: '',
    role_label: '',
    visible: true,
    photo_url: null,
  })
}

function removeTeam(id: string) {
  const idx = extras.teamMembers.findIndex((m) => m.id === id)
  if (idx >= 0) extras.teamMembers.splice(idx, 1)
}

function addTestimonial() {
  extras.testimonials.push({
    id: newWizardId('quote'),
    author: '',
    text: '',
    rating: 5,
  })
}

async function suggestGooglePlace() {
  googleBusy.value = true
  googleError.value = ''
  googleCandidates.value = []
  try {
    const res = await $fetch<{
      candidates?: typeof googleCandidates.value
      auto?: (typeof googleCandidates.value)[number] | null
    }>('/api/website/google-place/suggest', {
      method: 'POST',
      body: {
        name: props.brandName,
        address: props.address,
        city: props.city,
      },
    })
    googleCandidates.value = res.candidates || []
    if (!googleCandidates.value.length) {
      googleError.value = 'Kein Treffer. Prüfe Name/Adresse oder füge unten manuelle Zitate hinzu.'
      return
    }
    if (res.auto && googleCandidates.value.length === 1) {
      await confirmGooglePlace(res.auto)
    }
  } catch (err: any) {
    googleError.value = err?.data?.statusMessage || err?.message || 'Google-Suche fehlgeschlagen.'
  } finally {
    googleBusy.value = false
  }
}

async function confirmGooglePlace(c: (typeof googleCandidates.value)[number]) {
  googleBusy.value = true
  googleError.value = ''
  try {
    const res = await $fetch<{ place: { name: string; place_id: string } }>(
      '/api/website/google-place/confirm',
      {
        method: 'POST',
        body: { place_id: c.place_id, name: c.name, maps_url: c.maps_url },
      },
    )
    props.googleReviews.enabled = true
    props.googleReviews.places = [res.place]
    googleCandidates.value = []
  } catch (err: any) {
    googleError.value = err?.data?.statusMessage || err?.message || 'Verbinden fehlgeschlagen.'
  } finally {
    googleBusy.value = false
  }
}
</script>

<style scoped>
.wem {
  grid-column: 1 / -1;
  margin-top: 0.35rem;
}
.wem-block {
  display: grid;
  gap: 0.65rem;
}
.wem-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 750;
  color: #1a2333;
}
.wem-title--spaced {
  margin-top: 1.15rem;
}
.wem-hint {
  margin: 0;
  font-size: 0.75rem;
  color: #7a8494;
  line-height: 1.4;
}
.wem-kicker {
  margin: 0 0 0.35rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #8b93a1;
}
.wem-empty,
.wem-note {
  border: 1px dashed #d7dbe3;
  border-radius: 0.75rem;
  padding: 0.75rem 0.85rem;
  font-size: 0.82rem;
  color: #5b6577;
  background: #fafbfc;
}
.wem-note {
  border-style: solid;
  background: color-mix(in srgb, var(--ed-primary, #0f766e) 6%, #fff);
  border-color: color-mix(in srgb, var(--ed-primary, #0f766e) 18%, #e6e9ef);
}
.wem-stack {
  display: grid;
  gap: 0.55rem;
}
.wem-warn {
  margin: 0;
  font-size: 0.75rem;
  color: #9a3412;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 0.55rem;
  padding: 0.45rem 0.6rem;
}
.wem-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.wem-chip,
.wem-chip-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid #d7dbe3;
  background: #f7f8fa;
  border-radius: 999px;
  padding: 0.3rem 0.7rem;
  font-size: 0.78rem;
}
.wem-chip-btn {
  cursor: pointer;
}
.wem-chip-x {
  border: 0;
  background: transparent;
  color: #8b93a1;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
}
.wem-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.wem-row--end {
  justify-content: flex-end;
}
.wem-grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
.wem-card,
.wem-toggle,
.wem-place,
.wem-catalog-row {
  border: 1px solid #e6e9ef;
  border-radius: 0.75rem;
  padding: 0.75rem;
  background: #fff;
}
.wem-card {
  display: grid;
  gap: 0.5rem;
}
.wem-team-card.on {
  border-color: #111827;
  background: #f8fafc;
}
.wem-check {
  display: flex;
  align-items: center;
  padding-top: 0.55rem;
}
.wem-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.2rem 0.5rem;
}
.wem-head > span {
  font-size: 0.75rem;
  font-weight: 600;
  color: #1a2333;
}
.wem-head :deep(.ai-opt-panel),
.wem-head :deep(.ai-opt-error) {
  flex: 1 1 100%;
  order: 3;
}
.wem-toggle {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  cursor: pointer;
}
.wem-toggle.on {
  border-color: #111827;
  background: #f8fafc;
}
.wem-field {
  display: grid;
  gap: 0.3rem;
  margin-top: 0.75rem;
}
.wem-toggle-fields {
  display: grid;
  gap: 0.4rem;
  flex: 1;
  min-width: 0;
}
.wem-catalog {
  display: grid;
  gap: 0.4rem;
}
.wem-catalog-row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}
.wem-catalog-name {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 650;
}
.wem-price {
  font-size: 0.85rem;
  font-weight: 700;
  white-space: nowrap;
}
.wem-place {
  display: grid;
  gap: 0.15rem;
  text-align: left;
  cursor: pointer;
  width: 100%;
}
.wem-place span {
  font-size: 0.75rem;
  color: #7a8494;
}
.wem input[type='text'],
.wem input[type='number'],
.wem input[type='tel'],
.wem textarea {
  width: 100%;
  border: 1px solid #d7dbe3;
  border-radius: 0.65rem;
  padding: 0.5rem 0.7rem;
  font-size: 0.88rem;
  background: #fff;
  color: #111;
  color-scheme: light;
}
.wem input:focus,
.wem textarea:focus {
  outline: 2px solid color-mix(in srgb, var(--ed-primary, #0f766e) 35%, transparent);
  border-color: var(--ed-primary, #0f766e);
}
.wem label {
  display: grid;
  gap: 0.25rem;
  font-size: 0.72rem;
  color: #7a8494;
}
.wem-btn,
.wem-btn--primary {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid #d7dbe3;
  background: #fff;
  border-radius: 0.65rem;
  padding: 0.45rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 650;
  cursor: pointer;
  color: #1a2333;
}
.wem-btn--primary {
  background: var(--ed-primary, #0f766e);
  border-color: transparent;
  color: #fff;
}
.wem-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.wem-link-danger {
  border: 0;
  background: transparent;
  color: #b91c1c;
  font-size: 0.75rem;
  cursor: pointer;
  white-space: nowrap;
  padding: 0.35rem 0;
}
.wem-photo {
  display: grid;
  gap: 0.4rem;
}
.wem-photo--offer {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}
.wem-photo-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.55rem;
}
.wem-photo-preview {
  aspect-ratio: 3 / 2;
  border-radius: 0.65rem;
  background: #f3f5f8;
  border: 1px dashed #c9d0db;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: #9aa3b2;
  font-size: 0.78rem;
}
.wem-photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.wem-photo--avatar {
  max-width: 11rem;
}
.wem-photo-preview.is-avatar {
  aspect-ratio: 1;
  border-radius: 999px;
}
.wem-photo-preview.is-offer {
  width: 5.5rem;
  flex-shrink: 0;
  aspect-ratio: 3 / 2;
  font-size: 0.68rem;
}
.wem-file {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  font-size: 0;
}
</style>
