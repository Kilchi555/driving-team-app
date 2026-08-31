<template>
  <div class="editor-page">
    <header class="editor-top">
      <div>
        <h1 class="editor-title">{{ isAddonPage ? 'Add-on Seite bearbeiten' : 'Website bearbeiten' }}</h1>
        <p class="editor-sub">
          <span v-if="isAddonPage">Review der generierten Seite — nur freigegebene Slots.</span>
          <span v-else>Texte, Team, Preise, Kontakt und Button-Link — das Layout bleibt geschützt.</span>
        </p>
      </div>
      <div class="editor-actions">
        <NuxtLink to="/admin/website/addons" class="btn-ghost">Add-on Seiten</NuxtLink>
        <a
          v-if="previewUrl"
          :href="previewUrl"
          target="_blank"
          rel="noopener"
          class="btn-ghost"
          @click="onPreviewClick"
        >
          Vorschau
        </a>
        <span class="autosave-hint" aria-live="polite">{{ autosaveHint }}</span>
        <button type="button" class="btn-primary" :disabled="saving" @click="save(true)">
          {{ publishing ? 'Veröffentlichen…' : publishNeedsPay ? 'Live schalten — bezahlen' : 'Veröffentlichen' }}
        </button>
      </div>
    </header>

    <div v-if="loadError" class="editor-empty">
      <p>{{ loadError }}</p>
      <button type="button" class="btn-primary" @click="load()">Erneut laden</button>
    </div>

    <div v-else-if="loading" class="editor-empty">Lädt…</div>

    <div v-else class="editor-grid">
      <aside class="editor-form editor-form--wide">
        <nav class="editor-tabs" aria-label="Bereiche">
          <button
            v-for="group in editorTabs"
            :key="group.group"
            type="button"
            class="editor-tab"
            :class="{
              active: activeTab === group.group,
              'has-missing': missingCount(group.group) > 0,
            }"
            @click="selectTab(group.group)"
          >
            {{ tabLabel(group.group) }}
            <span v-if="missingCount(group.group)" class="tab-badge" :title="missingHint(group.group)">
              {{ missingCount(group.group) }}
            </span>
          </button>
        </nav>
        <p v-if="missingTotal" class="editor-missing-bar">
          <strong>{{ missingTotal }} {{ missingTotal === 1 ? 'Angabe fehlt' : 'Angaben fehlen' }}</strong>
          <button type="button" class="editor-missing-jump" @click="jumpToFirstMissing">
            {{ missingGroupsLabel }} — zum nächsten
          </button>
        </p>
        <div class="tab-step-nav">
          <button
            v-if="hasPrevTab"
            type="button"
            class="btn-ghost tab-step-back"
            @click="goPrevTab"
          >
            Zurück
          </button>
          <span v-else class="tab-step-spacer" aria-hidden="true" />
          <button
            v-if="hasNextTab"
            type="button"
            class="btn-primary tab-step-next"
            @click="goNextTab"
          >
            Weiter
          </button>
          <button
            v-else-if="isLastTab"
            type="button"
            class="btn-primary tab-step-next"
            :disabled="saving || publishing"
            @click="openPreviewAfterSave"
          >
            Vorschau ansehen
          </button>
        </div>
        <div
          v-for="group in grouped"
          v-show="activeTab === group.group"
          :key="group.group"
          class="slot-group"
        >
          <WebsiteSeoAdvisor
            v-if="!isAddonPage && group.group === 'seo'"
            :formal-address="formalAddress"
            :current="seoAdvisorCurrent"
            @apply="applyAdvisorSlot"
            @ready="unlockSeoFields"
            @skip="skipSeoResearch"
          />
          <WebsiteFaqResearch
            v-if="group.group === 'faq'"
            :formal-address="formalAddress"
            :existing="existingFaqQuestions"
            :can-add="canAddFaqSuggestion"
            @add="applyFaqSuggestion"
          />
          <p v-if="group.group === 'seo' && !seoFieldsOpen" class="slot-hint">
            Nach der Recherche und den Textvorschlägen erscheinen die Felder hier — oder über «Selbst schreiben».
          </p>
          <div
            v-for="slot in visibleSlots(group.slots)"
            v-show="group.group !== 'seo' || seoFieldsOpen"
            :key="slot.id"
            class="slot-field"
            :class="{
              'slot-field--color': slot.kind === 'color',
              'slot-field--font': slot.kind === 'font',
              'is-missing': isSlotMissing(slot.id),
            }"
          >
            <div class="slot-head">
              <label :for="slot.id">
                {{ slot.label }}
                <span v-if="isRequiredSlot(slot.id)" class="slot-req">*</span>
              </label>
              <AIOptimizationSuggestion
                v-if="slotAi(slot)"
                compact
                :original="form[slot.id] || ''"
                :context="aiContext(slot)"
                :content-type="slotAi(slot)!.contentType"
                :optimization-type="slotAi(slot)!.optimizationType"
                :formal-address="formalAddress"
                @apply="applyAdvisorSlot(slot.id, $event)"
              />
            </div>
            <p v-if="slot.hint" class="slot-hint">{{ slot.hint }}</p>

            <div v-if="slot.kind === 'image'" class="slot-image">
              <div
                class="slot-image-preview"
                :class="{
                  'is-logo': slot.id.includes('logo'),
                  'is-service': slot.id.startsWith('service.'),
                  'is-hero': isHeroImageSlot(slot.id),
                }"
              >
                <img v-if="form[slot.id]" :src="form[slot.id]!" :alt="slot.label" />
                <span v-else>Kein Bild</span>
              </div>
              <div class="slot-image-actions">
                <label class="btn-upload">
                  {{ uploadingSlot === slot.id ? 'Lädt…' : 'Hochladen' }}
                  <input
                    type="file"
                    accept="image/*,.heic,.heif"
                    class="slot-file-input"
                    :disabled="!!uploadingSlot"
                    @change="onUpload($event, slot.id)"
                  />
                </label>
                <button
                  v-if="form[slot.id] && slot.id.startsWith('service.')"
                  type="button"
                  class="btn-ghost btn-sm"
                  :disabled="!!uploadingSlot"
                  @click="form[slot.id] = ''"
                >
                  Entfernen
                </button>
              </div>
              <p v-if="uploadErrorBySlot[slot.id]" class="slot-missing">{{ uploadErrorBySlot[slot.id] }}</p>
            </div>

            <div v-else-if="slot.kind === 'video'" class="slot-video">
              <div class="slot-video-preview">
                <video
                  v-if="form[slot.id]"
                  :src="form[slot.id]!"
                  muted
                  playsinline
                  preload="metadata"
                  controls
                />
                <span v-else>Kein Video</span>
              </div>
              <div class="slot-video-actions">
                <label class="btn-upload">
                  {{ uploadingSlot === slot.id ? 'Lädt…' : 'Video hochladen' }}
                  <input
                    type="file"
                    accept="video/mp4,video/webm,.mp4,.webm"
                    class="hidden"
                    :disabled="!!uploadingSlot"
                    @change="onUpload($event, slot.id)"
                  />
                </label>
                <button
                  v-if="form[slot.id]"
                  type="button"
                  class="btn-ghost btn-sm"
                  :disabled="!!uploadingSlot"
                  @click="form[slot.id] = ''"
                >
                  Entfernen
                </button>
              </div>
              <input
                :id="slot.id"
                v-model="form[slot.id]"
                type="url"
                class="slot-video-url"
                placeholder="oder Video-URL einfügen (https://…)"
              />
            </div>

            <div v-else-if="slot.kind === 'enum'" class="slot-enum">
              <button
                v-for="opt in slot.enumValues || []"
                :key="opt"
                type="button"
                class="enum-btn"
                :class="{ active: form[slot.id] === opt }"
                @click="onEnumClick(slot, opt)"
              >
                {{ opt === 'sie' ? 'Sie' : opt === 'du' ? 'Du' : opt }}
              </button>
            </div>

            <WebsiteFontPicker
              v-else-if="slot.kind === 'font'"
              :model-value="form[slot.id] || 'syne-manrope'"
              :brand="form['brand.name']"
              :headline="form['hero.headline']"
              :subheadline="form['hero.subheadline']"
              :primary="form['brand.primary']"
              @update:model-value="form[slot.id] = $event"
            />

            <div v-else-if="slot.kind === 'color'" class="slot-color-row">
              <input
                :id="slot.id"
                v-model="form[slot.id]"
                type="color"
                class="slot-color"
                :title="slot.label"
              />
              <input
                v-model="form[slot.id]"
                type="text"
                class="slot-color-hex"
                maxlength="7"
                spellcheck="false"
                :aria-label="`${slot.label} Hex`"
              />
            </div>

            <textarea
              v-else-if="slot.kind === 'textarea'"
              :id="slot.id"
              v-model="form[slot.id]"
              :rows="slot.id.includes('.description') ? 8 : 3"
              :maxlength="slot.maxLength"
            />

            <input
              v-else
              :id="slot.id"
              v-model="form[slot.id]"
              type="text"
              :maxlength="slot.maxLength"
            />

            <p v-if="slotMissingMessage(slot.id)" class="slot-missing">{{ slotMissingMessage(slot.id) }}</p>
            <p v-else-if="slot.maxLength && form[slot.id]" class="slot-count">
              {{ (form[slot.id] || '').length }}/{{ slot.maxLength }}
            </p>
            <WebsiteHeroSuggest
              v-if="slot.id === 'brand.hero_image_url'"
              :industry="terms.businessNoun"
              :business-type="businessType"
              @applied="onHeroSuggested"
            />
            <WebsiteVideoTrimEditor
              v-if="slot.id === 'brand.hero_image_url'"
              :form="form"
              @applied="statusMsg = 'Ausschnitt übernommen — wird gespeichert.'"
            />
          </div>
          <p v-if="group.group === 'hero' && slotMissingMessage('hero.trust_0_value')" class="slot-missing">
            {{ slotMissingMessage('hero.trust_0_value') }}
          </p>
          <WebsiteTrustRowEditor
            v-if="group.group === 'hero' && group.slots.some((s) => s.id.startsWith('hero.trust_'))"
            :form="form"
            :formal-address="formalAddress"
            :context="String(form['hero.headline'] || form['brand.name'] || '')"
          />
          <WebsiteEditorMore
            v-if="!isAddonPage && group.group === 'hero'"
            panel="usps"
            :extras="extras"
            :google-reviews="googleReviews"
            :formal-address="formalAddress"
          />
          <WebsiteEditorMore
            v-if="!isAddonPage && group.group === 'services'"
            panel="offer"
            :extras="extras"
            :catalog-products="catalogProducts"
            :catalog-services="catalogServices"
            :google-reviews="googleReviews"
            :formal-address="formalAddress"
            :website-only="websiteOnly"
          />
          <p v-if="group.group === 'services' && slotMissingMessage('extras.offer')" class="slot-missing">
            {{ slotMissingMessage('extras.offer') }}
          </p>
          <WebsiteEditorMore
            v-if="!isAddonPage && group.group === 'contact'"
            panel="channels"
            :extras="extras"
            :google-reviews="googleReviews"
            :formal-address="formalAddress"
          />
          <p v-if="group.group === 'cta' && ctaMissing.length" class="slot-missing">
            {{ ctaMissing.map((m) => m.msg).join(' · ') }}
          </p>
          <WebsiteCtaEditor
            v-if="group.group === 'cta'"
            :form="form"
            :formal-address="formalAddress"
            :context="String(form['brand.name'] || form['hero.headline'] || '')"
            :primary-color="primaryColor"
            :website-only="websiteOnly"
          />
          <button
            v-if="group.group === 'faq' && faqCount < 10"
            type="button"
            class="btn-ghost btn-sm"
            @click="addFaq"
          >
            Frage hinzufügen
          </button>
        </div>
        <div
          v-if="!isAddonPage && !grouped.some((g) => g.group === 'services')"
          v-show="activeTab === 'services'"
          class="slot-group"
        >
          <p v-if="slotMissingMessage('extras.offer')" class="slot-missing">{{ slotMissingMessage('extras.offer') }}</p>
          <WebsiteEditorMore
            panel="offer"
            :extras="extras"
            :catalog-products="catalogProducts"
            :catalog-services="catalogServices"
            :google-reviews="googleReviews"
            :formal-address="formalAddress"
            :website-only="websiteOnly"
          />
        </div>
        <div v-show="activeTab === 'team' && !isAddonPage" class="slot-group">
          <p v-if="slotMissingMessage('extras.team')" class="slot-missing">{{ slotMissingMessage('extras.team') }}</p>
          <WebsiteEditorMore
            panel="team"
            :extras="extras"
            :google-reviews="googleReviews"
            :formal-address="formalAddress"
          />
        </div>
        <div v-show="activeTab === 'voices' && !isAddonPage" class="slot-group">
          <p v-if="slotMissingMessage('extras.voices')" class="slot-missing">{{ slotMissingMessage('extras.voices') }}</p>
          <WebsiteEditorMore
            panel="voices"
            :extras="extras"
            :google-reviews="googleReviews"
            :formal-address="formalAddress"
            :brand-name="String(form['brand.name'] || '')"
            :address="String(form['contact.address'] || '')"
            :city="String(form['contact.city'] || '')"
          />
        </div>
        <div
          v-show="showFinishCard"
          class="editor-finish"
        >
          <p class="editor-finish-kicker">Nächster Schritt</p>
          <p class="editor-finish-title">Vorschau prüfen, dann live schalten</p>
          <p class="editor-finish-copy">
            Alles wird automatisch gespeichert. Schau die Seite zuerst an — wenn sie stimmt, veröffentlichst du sie.
          </p>
          <div class="editor-finish-actions">
            <button
              type="button"
              class="btn-ghost"
              :disabled="saving || publishing || !previewUrl"
              @click="openPreviewAfterSave"
            >
              Vorschau ansehen
            </button>
            <button
              type="button"
              class="btn-primary"
              :disabled="saving || publishing"
              @click="save(true)"
            >
              {{ publishing ? 'Veröffentlichen…' : publishNeedsPay ? 'Live schalten — bezahlen' : 'Veröffentlichen' }}
            </button>
          </div>
        </div>
        <div class="tab-step-nav tab-step-nav--bottom">
          <button
            v-if="hasPrevTab"
            type="button"
            class="btn-ghost tab-step-back"
            @click="goPrevTab"
          >
            Zurück
          </button>
          <span v-else class="tab-step-spacer" aria-hidden="true" />
          <button
            v-if="hasNextTab"
            type="button"
            class="btn-primary tab-step-next"
            @click="goNextTab"
          >
            Weiter
          </button>
          <button
            v-else-if="isLastTab"
            type="button"
            class="btn-primary tab-step-next"
            :disabled="saving || publishing"
            @click="openPreviewAfterSave"
          >
            Vorschau ansehen
          </button>
        </div>
      </aside>
    </div>

    <p v-if="statusMsg" class="editor-status">{{ statusMsg }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import {
  getAllSlots,
  getSlotValues,
  groupSlots,
  isLandingPayload,
  type LandingPagePayload,
  type SlotDef,
} from '~/utils/website-slot-schema'
import { useTenantBranding } from '~/composables/useTenantBranding'
import WebsiteSeoAdvisor from '~/components/website/WebsiteSeoAdvisor.vue'
import WebsiteTrustRowEditor from '~/components/website/WebsiteTrustRowEditor.vue'
import WebsiteCtaEditor from '~/components/website/WebsiteCtaEditor.vue'
import WebsiteVideoTrimEditor from '~/components/website/WebsiteVideoTrimEditor.vue'
import WebsiteHeroSuggest from '~/components/website/WebsiteHeroSuggest.vue'
import WebsiteFontPicker from '~/components/website/WebsiteFontPicker.vue'
import WebsiteEditorMore, { type EditorExtras } from '~/components/website/WebsiteEditorMore.vue'
import AIOptimizationSuggestion from '~/components/website/AIOptimizationSuggestion.vue'
import WebsiteFaqResearch from '~/components/website/WebsiteFaqResearch.vue'
import { websiteFontEditorHrefs } from '~/utils/website-fonts'
import { websitePublishBlockedReason } from '~/utils/website-billing'
import { extractColorsFromFile, isDefaultBrandPrimary } from '~/utils/logoUtils'
import { compressPhotoForUpload } from '~/utils/imageCompression'
import {
  newWizardId,
  shouldHideStaffOnWebsite,
  isSeedPlaceholderStaffName,
  dedupeTeamMembersByName,
  type WizardTeamMember,
} from '~/utils/website-wizard-content'

definePageMeta({ layout: 'admin', middleware: 'admin' })

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
    ...websiteFontEditorHrefs().map((href) => ({ rel: 'stylesheet', href })),
  ],
})

const route = useRoute()
const authStore = useAuthStore()
const { primaryColor } = useTenantBranding()
const { t: terms, businessType } = useTerminology()
const publishNeedsPay = computed(() => !!websitePublishBlockedReason(authStore.tenantTrialInfo))

const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const publishing = ref(false)
const statusMsg = ref('')
const uploadingSlot = ref('')
const uploadErrorBySlot = ref<Record<string, string>>({})
const subdomain = ref('')
const previewUrl = ref('')
const currentSlug = ref('index')
const isAddonPage = ref(false)
const form = reactive<Record<string, string | null>>({})
const slotDefs = ref<SlotDef[]>([])
const extrasLoaded = ref(false)
const extras = reactive<EditorExtras>({
  extraServices: [],
  extraProducts: [],
  teamMembers: [],
  testimonials: [],
  contact_channels: { phone: true, email: true, whatsapp: true, form: true },
  whatsapp_phone: '',
  usps: [],
})
const catalogProducts = ref<Array<{ id: string; name: string; description?: string; price_chf?: number | null }>>([])
const catalogServices = ref<Array<{ id: string; name: string; duration_minutes?: number | null; price_chf?: number | null }>>([])
const websiteOnly = ref(false)
const googleReviews = reactive<{ enabled: boolean; places: Array<{ name?: string; place_id?: string }> }>({
  enabled: false,
  places: [],
})
const faqCount = computed(
  () => slotDefs.value.filter((s) => /^faq\.\d+\.q$/.test(s.id)).length,
)

function addFaq() {
  const i = faqCount.value
  if (i >= 10) return
  slotDefs.value = [
    ...slotDefs.value,
    { id: `faq.${i}.q`, group: 'faq', label: `Frage ${i + 1}`, kind: 'text', maxLength: 160 },
    {
      id: `faq.${i}.a`,
      group: 'faq',
      label: `Antwort ${i + 1}`,
      kind: 'textarea',
      maxLength: 500,
      formalAware: true,
    },
  ]
  form[`faq.${i}.q`] = ''
  form[`faq.${i}.a`] = ''
}

const existingFaqQuestions = computed(() => {
  const out: string[] = []
  for (let i = 0; i < faqCount.value; i++) {
    const q = String(form[`faq.${i}.q`] || '').trim()
    if (q) out.push(q)
  }
  return out
})

const canAddFaqSuggestion = computed(() => {
  if (faqCount.value < 10) return true
  for (let i = 0; i < faqCount.value; i++) {
    if (!String(form[`faq.${i}.q`] || '').trim() && !String(form[`faq.${i}.a`] || '').trim()) return true
  }
  return false
})

function applyFaqSuggestion(item: { q: string; a: string }) {
  const q = String(item.q || '').trim().slice(0, 160)
  const a = String(item.a || '').trim().slice(0, 500)
  if (!q) return
  for (let i = 0; i < faqCount.value; i++) {
    if (!String(form[`faq.${i}.q`] || '').trim() && !String(form[`faq.${i}.a`] || '').trim()) {
      form[`faq.${i}.q`] = q
      form[`faq.${i}.a`] = a
      return
    }
  }
  if (faqCount.value >= 10) return
  addFaq()
  const i = faqCount.value - 1
  form[`faq.${i}.q`] = q
  form[`faq.${i}.a`] = a
}

const grouped = computed(() => groupSlots(slotDefs.value))
const TAB_LABELS: Record<string, string> = {
  brand: 'Marke',
  hero: 'Hero',
  services: 'Angebot',
  team: 'Team',
  voices: 'Stimmen',
  faq: 'FAQ',
  cta: 'Abschluss',
  contact: 'Kontakt',
  seo: 'SEO',
}
function tabLabel(group: string) {
  return TAB_LABELS[group] || group
}
function groupHasContent(group: { group: string; slots: SlotDef[] }) {
  if (group.group === 'cta' || group.group === 'hero' || group.group === 'faq') return true
  if (!isAddonPage.value && group.group === 'services') return true
  return visibleSlots(group.slots).length > 0
}
const editorTabs = computed(() => {
  const base = grouped.value.filter(groupHasContent)
  if (isAddonPage.value) return base
  const out: Array<{ group: string; slots: SlotDef[] }> = []
  let insertedExtras = false
  for (const g of base) {
    out.push(g)
    if (g.group === 'services') {
      out.push({ group: 'team', slots: [] }, { group: 'voices', slots: [] })
      insertedExtras = true
    }
  }
  if (!base.some((g) => g.group === 'services')) {
    const afterHero = out.findIndex((g) => g.group === 'hero')
    const at = afterHero >= 0 ? afterHero + 1 : out.length
    out.splice(at, 0, { group: 'services', slots: [] }, { group: 'team', slots: [] }, { group: 'voices', slots: [] })
    insertedExtras = true
  }
  if (!insertedExtras) {
    out.push({ group: 'team', slots: [] }, { group: 'voices', slots: [] })
  }
  return out
})
const activeTab = ref('')
function selectTab(id: string) {
  activeTab.value = id
  const query = { ...route.query }
  if (id) query.tab = id
  else delete query.tab
  void navigateTo({ query }, { replace: true })
}
const tabIndex = computed(() => editorTabs.value.findIndex((t) => t.group === activeTab.value))
const hasPrevTab = computed(() => tabIndex.value > 0)
const hasNextTab = computed(() => tabIndex.value >= 0 && tabIndex.value < editorTabs.value.length - 1)
const isLastTab = computed(() => tabIndex.value >= 0 && !hasNextTab.value)
const showFinishCard = computed(
  () => isLastTab.value && (activeTab.value !== 'seo' || seoFieldsOpen.value),
)
function scrollEditorTop() {
  void nextTick(() => {
    document.querySelector('.editor-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}
function goPrevTab() {
  const prev = editorTabs.value[tabIndex.value - 1]
  if (!prev) return
  selectTab(prev.group)
  scrollEditorTop()
}
function goNextTab() {
  const next = editorTabs.value[tabIndex.value + 1]
  if (!next) return
  selectTab(next.group)
  scrollEditorTop()
}
watch(
  editorTabs,
  (tabs) => {
    if (tabs.some((t) => t.group === activeTab.value)) return
    const fromQuery = String(route.query.tab || '')
    activeTab.value = tabs.some((t) => t.group === fromQuery)
      ? fromQuery
      : tabs[0]?.group || 'brand'
  },
  { immediate: true },
)
function visibleSlots(slots: SlotDef[]) {
  return slots.filter(
    (s) =>
      !s.id.startsWith('hero.trust_') &&
      !s.id.startsWith('cta.') &&
      s.id !== 'brand.hero_video_url' &&
      s.id !== 'brand.hero_video_start' &&
      s.id !== 'brand.hero_video_duration',
  )
}

const REQUIRED_MIN: Record<string, { min: number; msg: string }> = {
  'brand.name': { min: 2, msg: 'Name fehlt' },
  'hero.headline': { min: 8, msg: 'Überschrift fehlt oder ist zu kurz' },
  'hero.subheadline': { min: 40, msg: 'Bio fehlt oder ist zu kurz (mind. 2 Sätze)' },
  'cta.headline': { min: 6, msg: 'Abschluss-Überschrift fehlt' },
  'cta.cta_text': { min: 3, msg: 'Button-Text fehlt' },
  'contact.address': { min: 4, msg: 'Adresse fehlt' },
  'contact.city': { min: 2, msg: 'Ort fehlt' },
  'seo.title': { min: 8, msg: 'SEO-Titel fehlt oder ist zu kurz' },
  'seo.description': { min: 40, msg: 'SEO-Beschreibung fehlt oder ist zu kurz' },
}

function slotVal(id: string) {
  return String(form[id] || '').trim()
}

type MissingItem = { group: string; slotId: string; msg: string }

const missingItems = computed<MissingItem[]>(() => {
  const out: MissingItem[] = []
  const known = new Set(slotDefs.value.map((s) => s.id))

  for (const [id, rule] of Object.entries(REQUIRED_MIN)) {
    if (!known.has(id)) continue
    if (slotVal(id).length < rule.min) {
      const group = slotDefs.value.find((s) => s.id === id)?.group || id.split('.')[0]
      out.push({ group, slotId: id, msg: rule.msg })
    }
  }

  if (known.has('contact.phone') || known.has('contact.email')) {
    if (!slotVal('contact.phone') && !slotVal('contact.email')) {
      out.push({ group: 'contact', slotId: 'contact.phone', msg: 'Telefon oder E-Mail fehlt' })
    }
  }

  if (known.has('hero.trust_0_value')) {
    const hasTrust = [0, 1, 2].some(
      (i) => slotVal(`hero.trust_${i}_value`) && slotVal(`hero.trust_${i}_label`),
    )
    if (!hasTrust) {
      out.push({ group: 'hero', slotId: 'hero.trust_0_value', msg: 'Mindestens ein Vorteil fehlt' })
    }
  }

  const emptyServices = slotDefs.value.filter(
    (s) => s.id.startsWith('service.') && s.id.endsWith('.description') && !slotVal(s.id),
  )
  if (emptyServices.length) {
    out.push({
      group: 'services',
      slotId: emptyServices[0].id,
      msg:
        emptyServices.length === 1
          ? 'Eine Angebots-Beschreibung fehlt'
          : `${emptyServices.length} Angebots-Beschreibungen fehlen`,
    })
  }

  for (const slot of slotDefs.value) {
    if (!/^faq\.\d+\.a$/.test(slot.id)) continue
    const qId = slot.id.replace(/\.a$/, '.q')
    const q = slotVal(qId)
    const a = slotVal(slot.id)
    if (q && !a) out.push({ group: 'faq', slotId: slot.id, msg: 'Antwort fehlt' })
    if (!q && a) out.push({ group: 'faq', slotId: qId, msg: 'Frage fehlt' })
  }

  if (!isAddonPage.value && extrasLoaded.value) {
    const dbOffers = slotDefs.value.some((s) => s.id.startsWith('service.') && s.id.endsWith('.description'))
    const extraOffers = extras.extraServices.some(
      (s) => String(s.name || '').trim() && s.price_chf != null && Number(s.price_chf) > 0,
    )
    if (!dbOffers && !extraOffers) {
      out.push({ group: 'services', slotId: 'extras.offer', msg: 'Mindestens ein Angebot mit Preis fehlt' })
    }
    const visibleTeam = extras.teamMembers.filter((m) => m.visible && String(m.name || '').trim())
    if (visibleTeam.length < 1) {
      out.push({ group: 'team', slotId: 'extras.team', msg: 'Mindestens eine Person im Team fehlt' })
    }
    const hasVoice =
      googleReviews.enabled ||
      extras.testimonials.some((t) => String(t.text || '').trim().length >= 20)
    if (!hasVoice) {
      out.push({
        group: 'voices',
        slotId: 'extras.voices',
        msg: 'Google-Standort oder mindestens eine echte Kundenstimme fehlt',
      })
    }
  }

  return out
})

const missingByGroup = computed(() => {
  const map: Record<string, MissingItem[]> = {}
  for (const item of missingItems.value) {
    if (!map[item.group]) map[item.group] = []
    map[item.group].push(item)
  }
  return map
})

const missingTotal = computed(() => missingItems.value.length)
const ctaMissing = computed(() => missingByGroup.value.cta || [])
const missingGroupsLabel = computed(() => {
  const names = editorTabs.value
    .filter((g) => (missingByGroup.value[g.group] || []).length)
    .map((g) => tabLabel(g.group))
  return names.join(', ')
})

function missingCount(group: string) {
  return (missingByGroup.value[group] || []).length
}
function missingHint(group: string) {
  return (missingByGroup.value[group] || []).map((m) => m.msg).join(' · ')
}
function isRequiredSlot(id: string) {
  return !!REQUIRED_MIN[id] || id === 'contact.phone' || id === 'contact.email'
}
function isSlotMissing(id: string) {
  return missingItems.value.some((m) => m.slotId === id)
}
function slotMissingMessage(id: string) {
  return missingItems.value.find((m) => m.slotId === id)?.msg || ''
}
function jumpToFirstMissing() {
  const first = missingItems.value[0]
  if (!first) return
  selectTab(first.group)
  nextTick(() => {
    const el = document.getElementById(first.slotId)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (el instanceof HTMLElement) el.focus()
  })
}
const seoAdvisorCurrent = computed(() => ({
  headline: form['hero.headline'] || '',
  subheadline: form['hero.subheadline'] || '',
  seo_title: form['seo.title'] || '',
  seo_description: form['seo.description'] || '',
  seo_keywords: form['seo.keywords'] || '',
}))
const seoFieldsOpen = ref(false)
function seoSkipKey() {
  return subdomain.value ? `simy-website-seo-skip:${subdomain.value}` : ''
}
function unlockSeoFields() {
  seoFieldsOpen.value = true
}
function skipSeoResearch() {
  seoFieldsOpen.value = true
  const key = seoSkipKey()
  if (key && import.meta.client) localStorage.setItem(key, '1')
}
function restoreSeoUnlock() {
  const key = seoSkipKey()
  if (key && import.meta.client && localStorage.getItem(key) === '1') {
    seoFieldsOpen.value = true
  }
}

const formalAddress = computed(() => (form['brand.formal_address'] === 'du' ? 'du' : 'sie') as 'sie' | 'du')

function slotAi(slot: SlotDef): { contentType: string; optimizationType: 'seo' | 'conversion' } | null {
  if (slot.id === 'brand.name') return { contentType: 'brand_name', optimizationType: 'seo' }
  if (slot.id === 'hero.headline') return { contentType: 'headline', optimizationType: 'seo' }
  if (slot.id === 'hero.subheadline') return { contentType: 'bio', optimizationType: 'seo' }
  if (slot.id === 'seo.title') return { contentType: 'seo_title', optimizationType: 'seo' }
  if (slot.id === 'seo.description') return { contentType: 'seo_description', optimizationType: 'seo' }
  if (slot.id === 'seo.keywords') return { contentType: 'keywords', optimizationType: 'seo' }
  if (slot.id === 'cta.headline') return { contentType: 'cta_headline', optimizationType: 'conversion' }
  if (slot.id === 'cta.subheadline') return { contentType: 'cta_sub', optimizationType: 'conversion' }
  if (slot.id === 'cta.cta_text') return { contentType: 'cta_button', optimizationType: 'conversion' }
  if (slot.id.startsWith('service.') && slot.id.endsWith('.description')) {
    return { contentType: 'service_description', optimizationType: 'seo' }
  }
  if (/^faq\.\d+\.q$/.test(slot.id)) return { contentType: 'faq_question', optimizationType: 'seo' }
  if (/^faq\.\d+\.a$/.test(slot.id)) return { contentType: 'faq_answer', optimizationType: 'seo' }
  return null
}

function aiContext(slot: SlotDef) {
  const brand = String(form['brand.name'] || '').trim()
  const city = String(form['contact.city'] || '').trim()
  const base = [brand, city].filter(Boolean).join(', ')
  if (slot.id === 'brand.name') {
    return [brand, city].filter(Boolean).join(', ') || city || brand
  }
  if (slot.id.startsWith('service.') && slot.label) {
    return slot.label.replace(/^Beschreibung:\s*/i, '').trim()
  }
  if (slot.id.startsWith('faq.')) {
    const q = slot.id.replace(/\.a$/, '.q')
    return `${form[q] || slot.label}${base ? ` — ${base}` : ''}`
  }
  return base || String(form['hero.headline'] || '')
}

function applyAdvisorSlot(slotId: string, value: string) {
  const slot = slotDefs.value.find((s) => s.id === slotId)
  const max = slot?.maxLength
  form[slotId] = max ? String(value || '').slice(0, max) : value
  statusMsg.value = 'Vorschlag übernommen — wird gespeichert.'
}
const pageQuerySlug = computed(() => {
  const raw = route.query.page
  const s = Array.isArray(raw) ? raw[0] : raw
  return s ? String(s).trim() : ''
})

function hydrateForm(landing: LandingPagePayload) {
  slotDefs.value = getAllSlots(landing)
  const values = getSlotValues(landing)
  for (const key of Object.keys(form)) delete form[key]
  for (const [k, v] of Object.entries(values)) {
    form[k] = v
  }
}

function resetExtras() {
  extras.extraServices = []
  extras.extraProducts = []
  extras.teamMembers = []
  extras.testimonials = []
  extras.contact_channels = { phone: true, email: true, whatsapp: true, form: true }
  extras.whatsapp_phone = ''
  extras.usps = []
  catalogProducts.value = []
  catalogServices.value = []
  googleReviews.enabled = false
  googleReviews.places = []
  extrasLoaded.value = false
}

function hydrateTeam(data: any) {
  const overlay = Array.isArray(data?.landing_team) ? data.landing_team : []
  const overlayById = new Map(overlay.map((m: any) => [String(m.id), m]))
  const overlayByName = new Map(
    overlay
      .filter((m: any) => String(m.name || '').trim())
      .map((m: any) => [String(m.name || '').trim().toLowerCase().replace(/\s+/g, ' '), m]),
  )
  const fromStaff: WizardTeamMember[] = (data?.staff || []).map((s: any) => {
    const staffName = String(s.name || '').trim()
    const prev =
      (overlayById.get(String(s.id)) as any) ||
      overlayByName.get(staffName.toLowerCase().replace(/\s+/g, ' '))
    const defaultRole = s.role === 'admin' ? 'Inhaber/in' : terms.value.staff
    return {
      id: String(s.id),
      source: 'staff' as const,
      name: String(prev?.name || staffName),
      role_label: String(prev?.role_label || defaultRole),
      photo_url: typeof prev?.photo_url === 'string' ? prev.photo_url : null,
      visible:
        prev && !isSeedPlaceholderStaffName(String(prev.name || staffName))
          ? prev.visible !== false
          : !shouldHideStaffOnWebsite(staffName, data.tenant),
    }
  })
  const customTeam = overlay
    .filter((m: any) => m.source === 'custom' || !fromStaff.some((s) => s.id === String(m.id)))
    .filter((m: any) => !fromStaff.some((s) => s.id === String(m.id)))
    .map((m: any) => ({
      id: String(m.id || newWizardId('team')),
      source: 'custom' as const,
      name: String(m.name || ''),
      role_label: String(m.role_label || ''),
      photo_url: typeof m.photo_url === 'string' ? m.photo_url : null,
      visible: m.visible !== false,
    }))
  extras.teamMembers = dedupeTeamMembersByName([...fromStaff, ...customTeam])
}

async function loadExtras() {
  try {
    const res = await $fetch<any>('/api/website/init-data')
    const data = res?.data || {}
    const draft = (data.wizard_draft || {}) as Record<string, any>
    extras.extraServices = Array.isArray(data.extra_services) && data.extra_services.length
      ? data.extra_services
      : Array.isArray(draft.extraServices)
        ? draft.extraServices
        : []
    extras.extraProducts = Array.isArray(data.extra_products) && data.extra_products.length
      ? data.extra_products
      : Array.isArray(draft.extraProducts)
        ? draft.extraProducts
        : []
    extras.usps = Array.isArray(data.usps) && data.usps.length
      ? data.usps.map(String).filter(Boolean)
      : Array.isArray(draft.usps)
        ? draft.usps.map(String).filter(Boolean)
        : []
    const landingQuotes = Array.isArray(data.landing_testimonials) ? data.landing_testimonials : []
    const draftQuotes = Array.isArray(draft.testimonials) ? draft.testimonials : []
    extras.testimonials = (landingQuotes.length ? landingQuotes : draftQuotes).map((t: any, i: number) => ({
      id: String(t.id || `landing-${i}`),
      author: String(t.author || 'Kunde'),
      text: String(t.text || ''),
      rating: Number(t.rating) || 5,
    }))
    const channels = data.contact_channels || draft.contact_channels
    if (channels && typeof channels === 'object') {
      extras.contact_channels = {
        phone: channels.phone !== false,
        email: channels.email !== false,
        whatsapp: channels.whatsapp !== false,
        form: channels.form !== false,
      }
    }
    extras.whatsapp_phone = String(data.tenant?.whatsapp_phone || draft.whatsapp_phone || '').trim()
    websiteOnly.value = Boolean(data.tenant?.website_only)
    catalogProducts.value = Array.isArray(data.products) ? data.products : []
    catalogServices.value = Array.isArray(data.services)
      ? data.services.map((s: any) => ({
          id: String(s.id),
          name: String(s.name || s.category || 'Angebot'),
          duration_minutes: s.duration_minutes ?? null,
          price_chf:
            s.price_chf != null
              ? Number(s.price_chf)
              : s.price != null
                ? Math.round(Number(s.price) / 100)
                : null,
        }))
      : []
    googleReviews.enabled = !!data.google_reviews?.enabled
    googleReviews.places = Array.isArray(data.google_reviews?.places) ? data.google_reviews.places : []
    hydrateTeam({
      ...data,
      landing_team:
        Array.isArray(data.landing_team) && data.landing_team.length
          ? data.landing_team
          : draft.teamMembers || [],
    })
    extrasLoaded.value = true
  } catch {
    extrasLoaded.value = true
  }
}

async function load() {
  loading.value = true
  loadError.value = ''
  extrasLoaded.value = false
  seoFieldsOpen.value = false
  autosaveReady.value = false
  dirty.value = false
  clearAutosaveTimer()
  try {
    await $fetch('/api/website/init', { method: 'POST' }).catch(() => null)
    const slug = pageQuerySlug.value || 'index'
    let res = await $fetch<any>(`/api/website/pages/${encodeURIComponent(slug)}`).catch(() => null)
    if (!isLandingPayload(res?.page?.blocks) && !pageQuerySlug.value) {
      await $fetch('/api/website/ensure-home', { method: 'POST' })
      res = await $fetch<any>('/api/website/pages/index')
    }
    const landing = res?.page?.blocks
    if (!isLandingPayload(landing)) {
      loadError.value = pageQuerySlug.value
        ? 'Add-on Seite nicht gefunden.'
        : 'Website konnte nicht angelegt werden. Bitte neu laden.'
      return
    }
    subdomain.value = res?.website?.subdomain || ''
    restoreSeoUnlock()
    currentSlug.value = res?.page?.slug || slug
    isAddonPage.value = !res?.page?.is_home && res?.page?.page_type !== 'home'
    if (isAddonPage.value) seoFieldsOpen.value = true
    previewUrl.value =
      subdomain.value && isAddonPage.value
        ? `/s/${encodeURIComponent(subdomain.value)}/${encodeURIComponent(currentSlug.value)}?preview=1`
        : subdomain.value
          ? `/s/${encodeURIComponent(subdomain.value)}?preview=1`
          : ''
    hydrateForm(landing)
    if (!isAddonPage.value) await loadExtras()
    else resetExtras()
  } catch (err: any) {
    loadError.value =
      err?.data?.statusMessage ||
      err?.message ||
      'Website konnte nicht geladen werden. Bitte neu laden.'
  } finally {
    loading.value = false
    await nextTick()
    dirty.value = false
    rememberSnapshot()
    autosaveReady.value = !loadError.value
  }
}

async function save(publish: boolean) {
  if (publish && publishNeedsPay.value) {
    await navigateTo('/admin/billing')
    return
  }
  if (publish && missingItems.value.length) {
    statusMsg.value = `${missingItems.value.length === 1 ? 'Eine Angabe fehlt' : `${missingItems.value.length} Angaben fehlen`}: ${missingItems.value.map((m) => m.msg).join(' · ')}`
    jumpToFirstMissing()
    return
  }
  saving.value = true
  publishing.value = publish
  ignoreDirty = true
  dirty.value = false
  statusMsg.value = ''
  try {
    const slots: Record<string, string> = {}
    for (const slot of slotDefs.value) {
      slots[slot.id] = form[slot.id] ?? ''
    }
    for (const svc of extras.extraServices) {
      const fromSlot = form[`service.${svc.id}.image_url`]
      if (fromSlot) svc.image_url = fromSlot
      const fromDesc = form[`service.${svc.id}.description`]
      if (fromDesc && !svc.description) svc.description = fromDesc
    }
    const res = await $fetch<any>('/api/website/slots-save', {
      method: 'POST',
      body: {
        slots,
        publish,
        slug: currentSlug.value || undefined,
        extras:
          !isAddonPage.value && extrasLoaded.value
            ? {
                extraServices: extras.extraServices.filter(
                  (s) =>
                    !catalogServices.value.some(
                      (db) => String(db.name || '').trim().toLowerCase() === String(s.name || '').trim().toLowerCase(),
                    ),
                ),
                extraProducts: extras.extraProducts.filter(
                  (p) =>
                    !catalogProducts.value.some(
                      (db) => String(db.name || '').trim().toLowerCase() === String(p.name || '').trim().toLowerCase(),
                    ),
                ),
                teamMembers: extras.teamMembers,
                testimonials: extras.testimonials,
                contact_channels: extras.contact_channels,
                whatsapp_phone: extras.whatsapp_phone,
                usps: extras.usps,
              }
            : undefined,
      },
    })
    if (publish && res?.landing && isLandingPayload(res.landing)) {
      const ready = autosaveReady.value
      autosaveReady.value = false
      hydrateForm(res.landing)
      await nextTick()
      autosaveReady.value = ready
    }
    lastSavedAt.value = Date.now()
    flashSaved()
    rememberSnapshot()
    statusMsg.value = publish ? 'Veröffentlicht.' : ''
  } catch (err: any) {
    dirty.value = true
    if (publish && (err?.statusCode === 402 || err?.data?.code === 'website_payment_required')) {
      statusMsg.value = err?.data?.statusMessage || 'Zuerst bezahlen, dann live.'
      await navigateTo('/admin/billing')
      return
    }
    statusMsg.value = friendlyEditorSaveError(err)
  } finally {
    saving.value = false
    publishing.value = false
    ignoreDirty = false
    if (!publish && dirty.value) scheduleAutosave()
  }
}

function onHeroSuggested(payload: { url: string; source: 'stock' | 'ai' }) {
  form['brand.hero_image_url'] = payload.url
  dirty.value = true
  statusMsg.value = payload.source === 'ai' ? 'AI-Bild übernommen — wird gespeichert.' : 'Stock-Foto übernommen — wird gespeichert.'
  scheduleAutosave()
}

function isHeroImageSlot(slotId: string) {
  return slotId === 'brand.hero_image_url' || slotId.includes('hero_image')
}

function mediaUploadSlotFor(slotId: string): 'logo' | 'hero' | 'hero_video' | 'service' {
  if (slotId === 'brand.hero_video_url') return 'hero_video'
  if (isHeroImageSlot(slotId)) return 'hero'
  if (slotId.startsWith('service.') && slotId.endsWith('.image_url')) return 'service'
  return 'logo'
}

async function onUpload(event: Event, slotId: string) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const slot = mediaUploadSlotFor(slotId)
  uploadingSlot.value = slotId
  uploadErrorBySlot.value = { ...uploadErrorBySlot.value, [slotId]: '' }
  statusMsg.value = ''
  try {
    const body = new FormData()
    body.append('slot', slot)
    const ready =
      slot === 'hero_video'
        ? file
        : await compressPhotoForUpload(file, {
            maxEdge: slot === 'hero' ? 1920 : slot === 'service' ? 1600 : 1200,
            maxBytes: 1.8 * 1024 * 1024,
          })
    body.append('file', ready)
    const res = await $fetch<any>('/api/website/media/upload', {
      method: 'POST',
      body,
    })
    const hadLogo = !!String(form['brand.logo_url'] || '').trim()
    form[slotId] = res.url || res.webp_url
    // Keep brand hero/logo synced if related
    if (slot === 'logo' && slotId !== 'brand.logo_url') form['brand.logo_url'] = form[slotId]
    let extractedColors = false
    if (slot === 'logo' && (!hadLogo || isDefaultBrandPrimary(form['brand.primary']))) {
      try {
        const colors = await extractColorsFromFile(file)
        if (colors) {
          form['brand.primary'] = colors[0]
          form['brand.secondary'] = colors[1]
          form['brand.accent'] = colors[2]
          extractedColors = true
        }
      } catch {
        /* keep uploaded logo even if palette fails */
      }
    }
    if (slot === 'hero' && slotId !== 'brand.hero_image_url') form['brand.hero_image_url'] = form[slotId]
    if (slot === 'hero_video' && slotId !== 'brand.hero_video_url') {
      form['brand.hero_video_url'] = form[slotId]
    }
    statusMsg.value = extractedColors
      ? 'Farben aus dem Logo übernommen — wird gespeichert. Unter Marke kannst du sie noch anpassen.'
      : slot === 'hero_video'
        ? 'Video hochgeladen — wird gespeichert. (Kein Transcode: ≤720p empfohlen.)'
        : slot === 'service'
          ? 'Foto konvertiert (WebP, 3:2) — wird gespeichert.'
          : 'Bild hochgeladen — wird gespeichert.'
  } catch (err: any) {
    const msg = err?.data?.statusMessage || err?.message || 'Upload fehlgeschlagen'
    uploadErrorBySlot.value = { ...uploadErrorBySlot.value, [slotId]: msg }
    statusMsg.value = msg
  } finally {
    uploadingSlot.value = ''
    if (input) input.value = ''
  }
}

function onEnumClick(slot: SlotDef, opt: string) {
  form[slot.id] = opt
}

function friendlyEditorSaveError(err: any) {
  const raw = String(err?.data?.statusMessage || err?.statusMessage || err?.message || '').trim()
  if (/Slot nicht erlaubt|locked/i.test(raw)) {
    return 'Ein extra FAQ-Feld konnte noch nicht gespeichert werden. Bitte Editor kurz neu laden.'
  }
  return raw || 'Speichern fehlgeschlagen'
}

const autosaveReady = ref(false)
const dirty = ref(false)
const lastSavedAt = ref(0)
const showSavedHint = ref(false)
let autosaveTimer: ReturnType<typeof setTimeout> | null = null
let savedHintTimer: ReturnType<typeof setTimeout> | null = null
let lastSnapshot = ''
let ignoreDirty = false

const autosaveHint = computed(() => {
  if (publishing.value) return ''
  if (saving.value) return 'Speichert…'
  if (showSavedHint.value) return 'Gespeichert'
  return ''
})

function editorSnapshot() {
  try {
    return JSON.stringify({ form: { ...form }, extras, googleReviews })
  } catch {
    return ''
  }
}

function rememberSnapshot() {
  lastSnapshot = editorSnapshot()
}

function flashSaved() {
  showSavedHint.value = true
  if (savedHintTimer) clearTimeout(savedHintTimer)
  savedHintTimer = setTimeout(() => {
    showSavedHint.value = false
    savedHintTimer = null
  }, 2200)
}

function clearAutosaveTimer() {
  if (!autosaveTimer) return
  clearTimeout(autosaveTimer)
  autosaveTimer = null
}

function markDirty() {
  if (ignoreDirty || !autosaveReady.value || loading.value) return
  const snap = editorSnapshot()
  if (snap && snap === lastSnapshot) return
  dirty.value = true
  scheduleAutosave()
}

function scheduleAutosave() {
  if (!autosaveReady.value || loading.value || publishing.value) return
  clearAutosaveTimer()
  autosaveTimer = setTimeout(() => {
    autosaveTimer = null
    if (!autosaveReady.value || publishing.value || !dirty.value) return
    void save(false)
  }, 2000)
}

async function openPreviewAfterSave() {
  clearAutosaveTimer()
  if (dirty.value || saving.value) await save(false)
  if (previewUrl.value) window.open(previewUrl.value, '_blank', 'noopener')
}

async function onPreviewClick(event: MouseEvent) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  if (!dirty.value && !saving.value) return
  event.preventDefault()
  await openPreviewAfterSave()
}

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

watch(form, markDirty, { deep: true })
watch(extras, markDirty, { deep: true })
watch(pageQuerySlug, () => {
  load()
})

onMounted(() => {
  window.addEventListener('beforeunload', onBeforeUnload)
  void load()
})
onUnmounted(() => {
  clearAutosaveTimer()
  if (savedHintTimer) clearTimeout(savedHintTimer)
  window.removeEventListener('beforeunload', onBeforeUnload)
})
</script>

<style scoped>
.editor-page {
  --ed-primary: v-bind(primaryColor);
  min-height: 100%;
  padding: 1.25rem 1.5rem 2.5rem;
  background: linear-gradient(160deg, #f6f4f0 0%, #eef2f6 100%);
  color-scheme: light;
}
.editor-page :deep(input[type='text']),
.editor-page :deep(input[type='url']),
.editor-page :deep(input[type='number']),
.editor-page :deep(input[type='tel']),
.editor-page :deep(input[type='email']),
.editor-page :deep(input[type='search']),
.editor-page :deep(textarea) {
  background: #fff;
  color: #111;
  -webkit-text-fill-color: #111;
  caret-color: #111;
  color-scheme: light;
}
.editor-page :deep(input::placeholder),
.editor-page :deep(textarea::placeholder) {
  color: #8a93a3;
  -webkit-text-fill-color: #8a93a3;
  opacity: 1;
}
.editor-top {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}
.editor-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #0c1222;
  margin: 0;
}
.editor-sub {
  margin: 0.25rem 0 0;
  color: #5b6577;
  font-size: 0.9rem;
}
.editor-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
.autosave-hint {
  min-width: 7.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #7a8494;
}
.btn-primary,
.btn-ghost,
.btn-upload {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  padding: 0.55rem 0.95rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  border: 1px solid transparent;
}
.btn-primary {
  background: var(--ed-primary, #0f766e);
  color: #fff;
}
.btn-primary:disabled,
.btn-ghost:disabled,
.btn-upload:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.btn-ghost,
.btn-upload {
  background: #fff;
  border-color: #d7dbe3;
  color: #1a2333;
}
.btn-upload {
  position: relative;
  overflow: hidden;
}
.slot-file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  font-size: 0;
}
.btn-sm {
  padding: 0.35rem 0.65rem;
  font-size: 0.8rem;
}
.editor-empty {
  background: #fff;
  border-radius: 1rem;
  padding: 2.5rem;
  text-align: center;
  display: grid;
  gap: 1rem;
  place-items: center;
  color: #5b6577;
}
.editor-grid {
  display: block;
  max-width: 44rem;
}
.editor-form {
  background: #fff;
  border-radius: 1rem;
  border: 1px solid #e6e9ef;
  padding: 1rem 1.1rem 1.5rem;
}
.editor-form--wide {
  max-height: none;
}
.tab-step-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0 0 1rem;
}
.tab-step-nav--bottom {
  margin: 1.15rem 0 0;
  padding-top: 1rem;
  border-top: 1px solid #eef1f5;
}
.tab-step-spacer {
  display: block;
  width: 0;
  height: 0;
}
.tab-step-back {
  margin-right: auto;
}
.tab-step-next {
  margin-left: auto;
}
.editor-finish {
  margin: 1.25rem 0 0;
  padding: 1rem 1.05rem 1.1rem;
  border-radius: 1rem;
  border: 1px solid #d7e3f4;
  background: #f4f8ff;
  display: grid;
  gap: 0.35rem;
}
.editor-finish-kicker {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #3b6ea8;
}
.editor-finish-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 750;
  color: #1a2333;
}
.editor-finish-copy {
  margin: 0 0 0.55rem;
  font-size: 0.88rem;
  line-height: 1.45;
  color: #4b5563;
}
.editor-finish-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.editor-finish-actions .btn-primary,
.editor-finish-actions .btn-ghost {
  flex: 1 1 9rem;
}
.editor-tabs {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.3rem;
  overflow-x: auto;
  margin: 0 0 1.15rem;
  padding: 0 0 0.75rem;
  border-bottom: 1px solid #eef1f5;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}
.editor-tab {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  border: 0;
  background: transparent;
  border-radius: 999px;
  padding: 0.45rem 0.85rem;
  font-size: 0.82rem;
  font-weight: 650;
  color: #5b6577;
  cursor: pointer;
}
.editor-tab:hover:not(.active) {
  background: #f3f5f8;
  color: #1a2333;
}
.editor-tab.active {
  background: var(--ed-primary, #0f766e);
  color: #fff;
}
.editor-tab.has-missing:not(.active) {
  color: #9a3412;
}
.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.15rem;
  height: 1.15rem;
  margin-left: 0.35rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: #c2410c;
  color: #fff;
  font-size: 0.68rem;
  font-weight: 800;
  line-height: 1;
}
.editor-tab.active .tab-badge {
  background: #fff;
  color: #c2410c;
}
.editor-missing-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem 0.75rem;
  margin: -0.35rem 0 1rem;
  padding: 0.65rem 0.8rem;
  border-radius: 0.75rem;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  color: #9a3412;
  font-size: 0.82rem;
}
.editor-missing-bar strong {
  font-weight: 750;
}
.editor-missing-jump {
  border: 0;
  background: transparent;
  color: #9a3412;
  font-weight: 650;
  font-size: 0.82rem;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.slot-req {
  color: #c2410c;
  font-weight: 800;
}
.slot-field.is-missing input[type='text'],
.slot-field.is-missing textarea {
  border-color: #fdba74;
  background: #fffaf5;
}
.slot-missing {
  margin: 0.35rem 0 0.15rem;
  font-size: 0.75rem;
  color: #c2410c;
  font-weight: 600;
}
.slot-group {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  column-gap: 0.65rem;
}
.slot-group > :not(.slot-field--color) {
  grid-column: 1 / -1;
}
.slot-field--font {
  margin-top: 0.25rem;
}
.slot-field {
  margin-bottom: 0.9rem;
}
.slot-field--color {
  margin-bottom: 1rem;
}
.slot-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.2rem 0.5rem;
  margin-bottom: 0.3rem;
}
.slot-head :deep(.ai-opt-panel),
.slot-head :deep(.ai-opt-error) {
  flex: 1 1 100%;
  order: 3;
}
.slot-field label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: #1a2333;
  margin: 0;
}
.slot-hint {
  font-size: 0.72rem;
  color: #7a8494;
  margin: -0.15rem 0 0.35rem;
}
.slot-field input[type='text'],
.slot-field input[type='url'],
.slot-field textarea {
  width: 100%;
  border: 1px solid #d7dbe3;
  border-radius: 0.65rem;
  padding: 0.55rem 0.7rem;
  font-size: 0.9rem;
  background: #fff;
  color: #111;
}
.slot-field input:focus,
.slot-field textarea:focus {
  outline: 2px solid color-mix(in srgb, var(--ed-primary, #0f766e) 35%, transparent);
  border-color: var(--ed-primary, #0f766e);
}
.slot-color-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.35rem;
}
.slot-color {
  width: 100%;
  height: 2.6rem;
  border: 1px solid #d7dbe3;
  border-radius: 0.5rem;
  padding: 0;
  background: transparent;
  cursor: pointer;
}
.slot-color-hex {
  width: 100%;
  border: 1px solid #d7dbe3;
  border-radius: 0.5rem;
  padding: 0.4rem 0.5rem;
  font-size: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  background: #fff;
  color: #111;
  text-transform: uppercase;
}
.slot-count {
  font-size: 0.7rem;
  color: #8a93a3;
  margin: 0.2rem 0 0;
  text-align: right;
}
.slot-enum {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
}
.enum-btn {
  border: 1px solid #d7dbe3;
  background: #fff;
  border-radius: 0.65rem;
  padding: 0.55rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}
.enum-btn.active {
  background: var(--ed-primary, #0f766e);
  border-color: transparent;
  color: #fff;
}
.slot-image {
  display: grid;
  gap: 0.5rem;
  width: 100%;
}
.slot-image-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
}
.slot-image-preview {
  position: relative;
  width: 100%;
  min-height: 7rem;
  border-radius: 0.75rem;
  background: #f3f5f8;
  border: 1px dashed #c9d0db;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: #9aa3b2;
  font-size: 0.8rem;
}
.slot-image-preview:not(.is-logo) {
  aspect-ratio: 16 / 9;
  height: auto;
}
.slot-image-preview.is-hero {
  /* Same framing as the live hero on a phone: tall cover, crop from the center. */
  aspect-ratio: 3 / 4;
  max-height: min(52vh, 28rem);
  margin-inline: auto;
}
@media (min-width: 768px) {
  .slot-image-preview.is-hero {
    aspect-ratio: 16 / 9;
    max-height: none;
  }
}
.slot-image-preview.is-service {
  width: 7.5rem;
  min-height: 0;
  aspect-ratio: 3 / 2;
}
.slot-image-preview img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}
.slot-image-preview.is-logo {
  height: 8.5rem;
  min-height: 8.5rem;
  background:
    linear-gradient(45deg, #eef1f5 25%, transparent 25%),
    linear-gradient(-45deg, #eef1f5 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #eef1f5 75%),
    linear-gradient(-45deg, transparent 75%, #eef1f5 75%);
  background-size: 14px 14px;
  background-position: 0 0, 0 7px, 7px -7px, -7px 0;
  background-color: #fff;
}
.slot-image-preview.is-logo img {
  position: relative;
  inset: auto;
  width: auto;
  height: auto;
  max-width: calc(100% - 1.5rem);
  max-height: 7.2rem;
  object-fit: contain;
}
.slot-video {
  display: grid;
  gap: 0.5rem;
}
.slot-video-preview {
  height: 9rem;
  border-radius: 0.75rem;
  background: #0c1222;
  border: 1px dashed #c9d0db;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: #9aa3b2;
  font-size: 0.8rem;
}
.slot-video-preview video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.slot-video-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.slot-video-url {
  width: 100%;
  border: 1px solid #d7dbe3;
  border-radius: 0.65rem;
  padding: 0.55rem 0.7rem;
  font-size: 0.875rem;
  background: #fff;
  color: #111;
}
.hidden {
  display: none;
}
.editor-status {
  margin-top: 0.85rem;
  font-size: 0.85rem;
  color: #1a2333;
}
</style>
