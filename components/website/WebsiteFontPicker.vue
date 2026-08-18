<template>
  <div class="font-picker">
    <div class="font-preview" :style="{ '--fp-primary': primary }">
      <p class="font-kicker" :style="bodyStyle(active)">{{ brand }}</p>
      <p class="font-h" :style="displayStyle(active)">{{ headline }}</p>
      <p class="font-p" :style="bodyStyle(active)">{{ subheadline }}</p>
      <span class="font-btn" :style="bodyStyle(active)">Jetzt buchen</span>
      <p class="font-now">
        {{ active.label }}
        <span>{{ active.display }} + {{ active.body }}</span>
      </p>
    </div>

    <div class="font-nav">
      <button type="button" class="font-step" :disabled="index <= 0" @click="step(-1)">←</button>
      <p class="font-count">{{ index + 1 }} / {{ pairs.length }}</p>
      <button type="button" class="font-step" :disabled="index >= pairs.length - 1" @click="step(1)">→</button>
    </div>

    <div class="font-chips" role="listbox" :aria-activedescendant="`font-${selected}`">
      <button
        v-for="pair in pairs"
        :id="`font-${pair.id}`"
        :key="pair.id"
        type="button"
        role="option"
        class="font-chip"
        :class="{ active: selected === pair.id }"
        :aria-selected="selected === pair.id"
        :style="displayStyle(pair)"
        @click="$emit('update:modelValue', pair.id)"
      >
        {{ pair.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { WEBSITE_FONT_PAIRS, resolveWebsiteFontPair, type WebsiteFontPair } from '~/utils/website-fonts'

const props = defineProps<{
  modelValue?: string | null
  brand?: string | null
  headline?: string | null
  subheadline?: string | null
  primary?: string | null
}>()
const emit = defineEmits<{ 'update:modelValue': [id: string] }>()

const pairs = WEBSITE_FONT_PAIRS
const selected = computed(() => props.modelValue || 'syne-manrope')
const active = computed(() => resolveWebsiteFontPair(selected.value))
const index = computed(() => Math.max(0, pairs.findIndex((p) => p.id === selected.value)))
const { t: terms } = useTerminology()
const brand = computed(() => String(props.brand || '').trim() || `Deine ${terms.value.businessNoun}`)
const headline = computed(
  () =>
    String(props.headline || '').trim() ||
    `${terms.value.appointmentsPlural} in deiner Stadt — klar und nah.`,
)
const subheadline = computed(
  () =>
    String(props.subheadline || '').trim() ||
    'Termine online buchen, Preise transparent, Team vor Ort. So sieht der Text auf deiner Seite aus.',
)
const primary = computed(() => props.primary || '#0F766E')

function displayStyle(pair: WebsiteFontPair) {
  return { fontFamily: `"${pair.display}", Georgia, serif` }
}
function bodyStyle(pair: WebsiteFontPair) {
  return { fontFamily: `"${pair.body}", ui-sans-serif, sans-serif` }
}
function step(dir: number) {
  const next = pairs[index.value + dir]
  if (next) emit('update:modelValue', next.id)
}
</script>

<style scoped>
.font-picker {
  display: grid;
  gap: 0.75rem;
}
.font-preview {
  padding: 1.15rem 1.15rem 1rem;
  border-radius: 0.9rem;
  background: #f6f4ef;
  border: 1px solid #ece7dc;
}
.font-kicker {
  margin: 0 0 0.35rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: #5b6577;
}
.font-h {
  margin: 0 0 0.45rem;
  font-size: 1.7rem;
  font-weight: 750;
  line-height: 1.15;
  color: #0c1222;
}
.font-p {
  margin: 0 0 0.75rem;
  font-size: 0.98rem;
  line-height: 1.5;
  color: #3d4654;
}
.font-btn {
  display: inline-flex;
  color: #fff;
  background: var(--fp-primary, #0f766e);
  font-size: 0.85rem;
  font-weight: 700;
  padding: 0.5rem 0.95rem;
  border-radius: 999px;
}
.font-now {
  margin: 0.85rem 0 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #0c1222;
}
.font-now span {
  font-weight: 500;
  color: #8a93a3;
}
.font-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}
.font-step {
  width: 2.1rem;
  height: 2.1rem;
  border: 1px solid #d7dbe3;
  background: #fff;
  border-radius: 999px;
  font-size: 1rem;
  cursor: pointer;
}
.font-step:disabled {
  opacity: 0.35;
  cursor: default;
}
.font-count {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 650;
  color: #5b6577;
  min-width: 3.5rem;
  text-align: center;
}
.font-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.font-chip {
  border: 1px solid #e6e9ef;
  background: #fff;
  border-radius: 999px;
  padding: 0.4rem 0.7rem;
  font-size: 0.8rem;
  font-weight: 650;
  color: #1a2333;
  cursor: pointer;
}
.font-chip:hover {
  border-color: #c9d0db;
}
.font-chip.active {
  border-color: var(--ed-primary, #0f766e);
  background: color-mix(in srgb, var(--ed-primary, #0f766e) 10%, #fff);
  box-shadow: 0 0 0 1px var(--ed-primary, #0f766e);
}
</style>
