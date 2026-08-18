<template>
  <section class="trust-editor">
    <header class="trust-editor-head">
      <h3>Vorteile unter der Überschrift</h3>
      <p>
        Drei kleine Karten direkt unter H1 — Zahl oder Wort fett, darunter ein kurzer Satz.
        Beispiele: <em>Online · Jederzeit buchbar</em>, <em>4.9★ · Google-Bewertung</em>,
        <em>WhatsApp · Direkt schreiben</em>.
      </p>
    </header>

    <div class="trust-preview" aria-hidden="true">
      <p class="trust-preview-kicker">So erscheint es auf der Startseite</p>
      <ul class="trust-preview-row">
        <li v-for="(item, i) in items" :key="i">
          <span class="trust-preview-icon">
            <WebsiteIcon :name="iconFor(item.label, i)" :size="15" />
          </span>
          <strong>{{ item.value || '…' }}</strong>
          <span>{{ item.label || 'kurze Erklärung' }}</span>
        </li>
      </ul>
    </div>

    <div class="trust-fields-head">
      <p class="trust-pair-title">Karten-Texte</p>
      <AIOptimizationSuggestion
        compact
        :original="trustOriginal"
        :context="context || ''"
        content-type="trust_row"
        optimization-type="seo"
        :formal-address="formalAddress"
        @apply="applyTrustText"
      />
    </div>

    <div v-for="(item, i) in items" :key="i" class="trust-pair">
      <p class="trust-pair-title">Karte {{ i + 1 }}</p>
      <div class="trust-pair-grid">
        <div>
          <label :for="`hero.trust_${i}_value`">Zahl oder Wort</label>
          <input
            :id="`hero.trust_${i}_value`"
            :value="form[`hero.trust_${i}_value`] || ''"
            type="text"
            maxlength="24"
            :placeholder="placeholders[i].value"
            @input="set(`hero.trust_${i}_value`, $event)"
          />
          <p class="trust-count">{{ (form[`hero.trust_${i}_value`] || '').length }}/24</p>
        </div>
        <div>
          <label :for="`hero.trust_${i}_label`">Kurze Erklärung</label>
          <input
            :id="`hero.trust_${i}_label`"
            :value="form[`hero.trust_${i}_label`] || ''"
            type="text"
            maxlength="40"
            :placeholder="placeholders[i].label"
            @input="set(`hero.trust_${i}_label`, $event)"
          />
          <p class="trust-count">{{ (form[`hero.trust_${i}_label`] || '').length }}/40</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WebsiteIcon from '~/components/website/WebsiteIcon.vue'
import AIOptimizationSuggestion from '~/components/website/AIOptimizationSuggestion.vue'
import { trustIconForLabel } from '~/utils/website-icons'

const props = defineProps<{
  form: Record<string, string | null>
  formalAddress?: 'sie' | 'du'
  context?: string
}>()

const placeholders = [
  { value: 'Online', label: 'Jederzeit buchbar' },
  { value: '4.9★', label: 'Google-Bewertung' },
  { value: 'WhatsApp', label: 'Direkt schreiben' },
]

const items = computed(() =>
  [0, 1, 2].map((i) => ({
    value: String(props.form[`hero.trust_${i}_value`] || '').trim(),
    label: String(props.form[`hero.trust_${i}_label`] || '').trim(),
  })),
)

function iconFor(label: string, index: number) {
  return trustIconForLabel(label, index)
}

const trustOriginal = computed(() =>
  items.value
    .filter((item) => item.value || item.label)
    .map((item) => `${item.value || '…'} | ${item.label || '…'}`)
    .join('\n'),
)

function applyTrustText(text: string) {
  const lines = String(text || '')
    .split('\n')
    .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 3)
  lines.forEach((line, i) => {
    const parts = line.split(/\s*[|—–]\s*/)
    const value = String(parts[0] || '').replace(/^\d+\.\s*/, '').slice(0, 24)
    const label = String(parts.slice(1).join(' ') || '').slice(0, 40)
    if (value && value !== '…') props.form[`hero.trust_${i}_value`] = value
    if (label && label !== '…') props.form[`hero.trust_${i}_label`] = label
  })
}

function set(slotId: string, event: Event) {
  const el = event.target as HTMLInputElement
  props.form[slotId] = el.value
}
</script>

<style scoped>
.trust-editor {
  margin: 0.35rem 0 0.4rem;
  padding: 0.95rem 1rem 1.05rem;
  border: 1px solid #e4ebf2;
  border-radius: 1rem;
  background: #f7f9fc;
}
.trust-editor-head h3 {
  margin: 0 0 0.25rem;
  font-size: 0.92rem;
  color: #0c1222;
}
.trust-editor-head p {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.4;
  color: #5b6577;
}
.trust-fields-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.2rem 0.5rem;
  margin: 0 0 0.45rem;
}
.trust-fields-head :deep(.ai-opt-panel),
.trust-fields-head :deep(.ai-opt-error) {
  flex: 1 1 100%;
  order: 3;
}
.trust-fields-head .trust-pair-title {
  margin: 0;
}
.trust-preview {
  background: #141c2b;
  color: #fff;
  border-radius: 0.9rem;
  padding: 0.75rem 0.8rem 0.85rem;
  margin-top: 0.9rem;
  margin-bottom: 0.95rem;
}
.trust-preview-kicker {
  margin: 0 0 0.5rem;
  font-size: 0.65rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}
.trust-preview-row {
  list-style: none;
  margin: 0;
  padding: 0.55rem 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem 1.1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.16);
}
.trust-preview-row li {
  min-width: 0;
  padding: 0;
  background: none;
  border: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 0.4rem;
  row-gap: 0.02rem;
}
.trust-preview-icon {
  grid-row: 1 / span 2;
  display: inline-flex;
  align-items: center;
  color: #9ec5ff;
}
.trust-preview-row strong {
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.trust-preview-row span:last-child {
  font-size: 0.68rem;
  opacity: 0.8;
  line-height: 1.25;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.trust-pair + .trust-pair {
  margin-top: 0.7rem;
  padding-top: 0.65rem;
  border-top: 1px solid #e6edf4;
}
.trust-pair-title {
  margin: 0 0 0.4rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #6b7a8d;
}
.trust-pair-grid {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 0.5rem;
}
.trust-pair label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #1a2333;
  margin-bottom: 0.25rem;
}
.trust-pair input {
  width: 100%;
  border: 1px solid #d7dbe3;
  border-radius: 0.65rem;
  padding: 0.5rem 0.65rem;
  font-size: 0.88rem;
  background: #fff;
  color: #111;
  color-scheme: light;
}
.trust-count {
  margin: 0.15rem 0 0;
  font-size: 0.68rem;
  color: #8a93a3;
  text-align: right;
}
@media (max-width: 560px) {
  .trust-preview-row,
  .trust-pair-grid {
    grid-template-columns: 1fr;
  }
}
</style>
