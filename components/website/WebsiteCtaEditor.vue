<template>
  <section class="cta-editor">
    <header class="cta-editor-head">
      <h3>{{ websiteOnly ? 'Letzter Aufruf zur Anfrage' : 'Letzter Aufruf zum Buchen' }}</h3>
      <p>
        Der farbige Streifen am Ende der Seite: Überschrift, ein Satz, dann der Button.
        Button-Text gilt für Navigation, Hero und Abschluss.
        {{
          websiteOnly
            ? 'Ohne Simy-Buchung: eigenen Link eintragen oder leer lassen für WhatsApp / Kontakt.'
            : 'Ohne Simy-Termine oder Kurse trägst du hier einen eigenen Link ein.'
        }}
      </p>
    </header>

    <div class="cta-preview" :style="{ background: previewBg }" aria-hidden="true">
      <p class="cta-preview-kicker">So erscheint es auf der Website</p>
      <strong>{{ headline || ctaPlaceholder }}</strong>
      <span>{{ subheadline || (websiteOnly ? 'Schreib uns — wir melden uns.' : 'Online buchen — ohne Telefon-Hin und Her.') }}</span>
      <em>{{ button || (websiteOnly ? 'Anfragen' : 'Jetzt buchen') }}</em>
    </div>

    <div class="cta-field">
      <div class="cta-head">
        <label for="cta.headline">Überschrift</label>
        <AIOptimizationSuggestion
          compact
          :original="headline"
          :context="context || ''"
          content-type="cta_headline"
          optimization-type="conversion"
          :formal-address="formalAddress"
          @apply="apply('cta.headline', $event, 100)"
        />
      </div>
      <input
        id="cta.headline"
        :value="headline"
        type="text"
        maxlength="100"
        :placeholder="ctaPlaceholder"
        @input="set('cta.headline', $event)"
      />
      <p class="cta-count">{{ headline.length }}/100</p>
    </div>

    <div class="cta-field">
      <div class="cta-head">
        <label for="cta.subheadline">Kurzer Satz darunter</label>
        <AIOptimizationSuggestion
          compact
          :original="subheadline"
          :context="context || headline || ''"
          content-type="cta_sub"
          optimization-type="conversion"
          :formal-address="formalAddress"
          @apply="apply('cta.subheadline', $event, 200)"
        />
      </div>
      <textarea
        id="cta.subheadline"
        :value="subheadline"
        rows="2"
        maxlength="200"
        placeholder="Online buchen — ohne Telefon-Hin und Her."
        @input="set('cta.subheadline', $event)"
      />
      <p class="cta-count">{{ subheadline.length }}/200</p>
    </div>

    <div class="cta-field">
      <div class="cta-head">
        <label for="cta.cta_text">Button-Text</label>
        <AIOptimizationSuggestion
          compact
          :original="button"
          :context="context || headline || ''"
          content-type="cta_button"
          optimization-type="conversion"
          :formal-address="formalAddress"
          @apply="apply('cta.cta_text', $event, 32)"
        />
      </div>
      <input
        id="cta.cta_text"
        :value="button"
        type="text"
        maxlength="32"
        :placeholder="websiteOnly ? 'Anfragen' : 'Jetzt buchen'"
        @input="set('cta.cta_text', $event)"
      />
      <p class="cta-count">{{ button.length }}/32</p>
    </div>

    <div class="cta-field">
      <label for="cta.cta_url">Button-Link</label>
      <input
        id="cta.cta_url"
        :value="ctaUrl"
        type="url"
        inputmode="url"
        :placeholder="websiteOnly ? 'https://… oder leer für WhatsApp / Kontakt' : 'https://… oder leer für Simy-Buchung'"
        @input="set('cta.cta_url', $event)"
      />
      <p class="cta-hint">
        {{
          websiteOnly
            ? 'Calendly, eigenes Formular, Shop oder WhatsApp-Link. Leer = WhatsApp (wenn Telefon aktiv) oder Kontaktblock.'
            : 'Calendly, altes Buchungstool, Formular oder externe Kursseite. Leer lassen, wenn Simy die Termine hat.'
        }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AIOptimizationSuggestion from '~/components/website/AIOptimizationSuggestion.vue'

const props = defineProps<{
  form: Record<string, string | null>
  formalAddress?: 'sie' | 'du'
  context?: string
  primaryColor?: string
  websiteOnly?: boolean
}>()

const { t: terms } = useTerminology()
const websiteOnly = computed(() => Boolean(props.websiteOnly))
const headline = computed(() => String(props.form['cta.headline'] || ''))
const subheadline = computed(() => String(props.form['cta.subheadline'] || ''))
const button = computed(() => String(props.form['cta.cta_text'] || ''))
const ctaUrl = computed(() => String(props.form['cta.cta_url'] || ''))
const previewBg = computed(() => props.primaryColor || '#0f766e')
const ctaPlaceholder = computed(() =>
  websiteOnly.value ? 'Jetzt anfragen' : `Jetzt ${terms.value.appointment} sichern`,
)

function set(slotId: string, event: Event) {
  const el = event.target as HTMLInputElement | HTMLTextAreaElement
  props.form[slotId] = el.value
}

function apply(slotId: string, value: string, max: number) {
  props.form[slotId] = String(value || '').slice(0, max)
}
</script>

<style scoped>
.cta-editor {
  margin: 0.15rem 0 0.2rem;
  padding: 0.95rem 1rem 1.05rem;
  border: 1px solid #e4ebf2;
  border-radius: 1rem;
  background: #f7f9fc;
}
.cta-editor-head h3 {
  margin: 0 0 0.25rem;
  font-size: 0.92rem;
  color: #0c1222;
}
.cta-editor-head p {
  margin: 0 0 0.85rem;
  font-size: 0.78rem;
  line-height: 1.4;
  color: #5b6577;
}
.cta-preview {
  color: #fff;
  border-radius: 0.9rem;
  padding: 1rem 1rem 1.1rem;
  margin-bottom: 0.95rem;
  text-align: center;
}
.cta-preview-kicker {
  margin: 0 0 0.55rem;
  font-size: 0.65rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}
.cta-preview strong {
  display: block;
  font-size: 1.05rem;
  line-height: 1.25;
  margin-bottom: 0.35rem;
}
.cta-preview span {
  display: block;
  font-size: 0.78rem;
  opacity: 0.9;
  line-height: 1.35;
  margin-bottom: 0.75rem;
}
.cta-preview em {
  display: inline-block;
  font-style: normal;
  font-size: 0.78rem;
  font-weight: 700;
  background: #fff;
  color: #0c1222;
  border-radius: 999px;
  padding: 0.4rem 0.85rem;
}
.cta-field {
  margin-top: 0.75rem;
}
.cta-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.2rem 0.5rem;
  margin-bottom: 0.25rem;
}
.cta-head :deep(.ai-opt-panel),
.cta-head :deep(.ai-opt-error) {
  flex: 1 1 100%;
  order: 3;
}
.cta-field label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #1a2333;
  margin: 0;
}
.cta-field input,
.cta-field textarea {
  width: 100%;
  border: 1px solid #d7dbe3;
  border-radius: 0.65rem;
  padding: 0.5rem 0.65rem;
  font-size: 0.88rem;
  background: #fff;
  color: #111;
  color-scheme: light;
}
.cta-count {
  margin: 0.15rem 0 0;
  font-size: 0.68rem;
  color: #8a93a3;
  text-align: right;
}
.cta-hint {
  margin: 0.3rem 0 0;
  font-size: 0.72rem;
  line-height: 1.4;
  color: #7a8494;
}
</style>
