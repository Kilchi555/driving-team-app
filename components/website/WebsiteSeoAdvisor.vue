<template>
  <section class="seo-advisor">
    <div class="seo-advisor-head">
      <div>
        <p class="seo-advisor-kicker">Hilfe für Google</p>
        <h3>Was suchen Kunden — und was schreibst du hin?</h3>
        <p class="seo-advisor-hint">
          Zuerst eine Recherche ({{ remaining }}/{{ limit }} heute).
          Dann wählst du die Suchwörter, die zu dir passen.
          Danach erscheinen die Google-Felder zum Übernehmen und Feinschliff.
        </p>
      </div>
      <div class="seo-advisor-actions">
        <button
          type="button"
          class="seo-advisor-run"
          :disabled="loading || remaining < 1"
          @click="run(false)"
        >
          {{ loading && !rewriting ? 'Sucht…' : remaining < 1 ? 'Heute aufgebraucht' : 'Recherche starten' }}
        </button>
        <button
          v-if="!briefing"
          type="button"
          class="seo-advisor-skip"
          :disabled="loading"
          @click="skip"
        >
          Ohne Recherche weiter
        </button>
      </div>
    </div>

    <p v-if="error" class="seo-advisor-error">{{ error }}</p>
    <p v-if="flash" class="seo-advisor-flash">{{ flash }}</p>

    <div v-if="briefing" class="seo-advisor-body">
      <p v-if="briefing.summary" class="seo-advisor-summary">{{ briefing.summary }}</p>

      <div v-if="briefing.research?.competitors?.length" class="seo-advisor-comp">
        <p class="seo-advisor-label">Andere Betriebe in der Nähe (Google)</p>
        <ul>
          <li v-for="c in briefing.research.competitors" :key="c.name">
            <strong>{{ c.name }}</strong>
            <span v-if="c.rating" class="seo-comp-meta">{{ c.rating }}★ · {{ c.reviews || 0 }}</span>
          </li>
        </ul>
      </div>

      <div v-if="briefing.keywords?.length" class="seo-advisor-keys">
        <p class="seo-advisor-label">1. Suchwörter antippen, die zu dir passen</p>
        <p class="seo-advisor-help">
          Das sind Wörter, die Leute bei Google eingeben. Tippe 1–3 an — so weiss die AI, in welche Richtung die Texte gehen sollen.
        </p>
        <article
          v-for="k in briefing.keywords"
          :key="k.phrase"
          class="seo-key"
          :class="{ 'is-on': selected.has(k.phrase), 'is-skip': k.use === 'skip' }"
          role="button"
          tabindex="0"
          :aria-pressed="selected.has(k.phrase)"
          @click="toggle(k.phrase)"
          @keydown.enter.prevent="toggle(k.phrase)"
        >
          <span class="seo-key-check" aria-hidden="true" />
          <div class="seo-key-main">
            <div class="seo-key-top">
              <strong>{{ k.phrase }}</strong>
              <span class="seo-key-use">{{ placeLabel(k.use) }}</span>
            </div>
            <p v-if="k.pro" class="seo-key-pro">{{ k.pro }}</p>
            <p v-if="k.con" class="seo-key-con">{{ k.con }}</p>
          </div>
        </article>
        <button
          type="button"
          class="seo-rewrite"
          :disabled="rewriting || selected.size < 1"
          @click="run(true)"
        >
          {{ rewriting ? 'Schreibt neu…' : 'Texte mit meiner Auswahl schreiben' }}
        </button>
        <p class="seo-advisor-help">Zählt nicht als neue Recherche — nur die Texte werden angepasst.</p>
      </div>

      <div v-if="briefing.copy" class="seo-advisor-copy">
        <p class="seo-advisor-label">2. Text lesen und ins Feld übernehmen</p>
        <p class="seo-advisor-help">
          «Übernehmen» schreibt den Vorschlag ins Formular darunter. Nichts geht live, bis du speicherst.
        </p>
        <article v-for="row in copyRows" :key="row.slotId" class="seo-copy" :class="{ 'is-done': row.done }">
          <div class="seo-copy-top">
            <p class="seo-copy-where">{{ row.where }}</p>
            <button type="button" class="seo-copy-btn" :disabled="!row.text" @click="take(row)">
              {{ row.done ? 'Übernommen' : 'Übernehmen' }}
            </button>
          </div>
          <p class="seo-copy-text">{{ row.text || '—' }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  formalAddress: 'sie' | 'du'
  current: Record<string, string>
}>()

const emit = defineEmits<{
  apply: [slotId: string, value: string]
  ready: []
  skip: []
}>()

const loading = ref(false)
const rewriting = ref(false)
const error = ref('')
const flash = ref('')
const remaining = ref(3)
const limit = ref(3)
const resetsOn = ref('')
const briefing = ref<any>(null)
const selected = ref(new Set<string>())
const applied = ref(new Set<string>())

function placeLabel(use: string) {
  if (use === 'title') return 'Gut für Google-Titel'
  if (use === 'h1') return 'Gut für die grosse Überschrift'
  if (use === 'skip') return 'Eher weglassen'
  return 'Gut im Fliesstext'
}

function toggle(phrase: string) {
  const next = new Set(selected.value)
  if (next.has(phrase)) next.delete(phrase)
  else {
    if (next.size >= 3) next.delete([...next][0])
    next.add(phrase)
  }
  selected.value = next
}

const copyRows = computed(() => {
  const c = briefing.value?.copy || {}
  return [
    {
      slotId: 'hero.headline',
      where: 'Grosse Überschrift ganz oben auf der Seite',
      text: c.headline || '',
      done: applied.value.has('hero.headline'),
    },
    {
      slotId: 'hero.subheadline',
      where: 'Kurztext unter der Überschrift',
      text: c.subheadline || '',
      done: applied.value.has('hero.subheadline'),
    },
    {
      slotId: 'seo.title',
      where: 'Titel in Google (blauer Link)',
      text: c.seo_title || '',
      done: applied.value.has('seo.title'),
    },
    {
      slotId: 'seo.description',
      where: 'Text unter dem Google-Link',
      text: c.seo_description || '',
      done: applied.value.has('seo.description'),
    },
    {
      slotId: 'seo.keywords',
      where: 'Suchwörter für Google',
      text: c.seo_keywords || '',
      done: applied.value.has('seo.keywords'),
    },
    {
      slotId: 'trust',
      where: 'Drei Vorteilskarten unter der Überschrift',
      text: Array.isArray(c.trust)
        ? c.trust.map((t: any) => `${t.value} — ${t.label}`).join(' · ')
        : '',
      done: applied.value.has('trust'),
    },
  ]
})

function skip() {
  emit('skip')
}

function markReady() {
  emit('ready')
}

function take(row: { slotId: string; text: string }) {
  if (row.slotId === 'trust') {
    const trust = briefing.value?.copy?.trust || []
    trust.forEach((t: any, i: number) => {
      if (t.value) emit('apply', `hero.trust_${i}_value`, String(t.value))
      if (t.label) emit('apply', `hero.trust_${i}_label`, String(t.label))
    })
  } else if (row.text) {
    emit('apply', row.slotId, row.text)
  }
  const next = new Set(applied.value)
  next.add(row.slotId)
  applied.value = next
  flash.value = 'Im Formular eingetragen — bitte noch speichern.'
}

async function loadQuota() {
  try {
    const res = await $fetch<any>('/api/website/seo-advisor')
    remaining.value = Number(res.remaining ?? 3)
    limit.value = Number(res.limit ?? 3)
    resetsOn.value = String(res.resets_on || '')
    if (res.last && !briefing.value) briefing.value = res.last
    if (briefing.value) markReady()
  } catch {
    /* ignore */
  }
}

async function run(rewrite: boolean) {
  if (rewrite) {
    if (rewriting.value || selected.value.size < 1) return
    rewriting.value = true
  } else {
    if (loading.value || remaining.value < 1) return
    loading.value = true
  }
  error.value = ''
  flash.value = ''
  try {
    const res = await $fetch<any>('/api/website/seo-advisor', {
      method: 'POST',
      body: {
        formal_address: props.formalAddress,
        current: props.current,
        rewrite_only: rewrite,
        focus_keywords: [...selected.value],
      },
    })
    remaining.value = Number(res.remaining ?? remaining.value)
    limit.value = Number(res.limit ?? 3)
    resetsOn.value = String(res.resets_on || '')
    briefing.value = res.briefing
    applied.value = new Set()
    markReady()
    flash.value = rewrite
      ? 'Neue Texte mit deiner Auswahl — unten lesen und übernehmen.'
      : 'Recherche fertig. Suchwörter antippen, dann Texte übernehmen.'
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Analyse fehlgeschlagen'
    if (typeof err?.data?.data?.remaining === 'number') remaining.value = err.data.data.remaining
  } finally {
    loading.value = false
    rewriting.value = false
  }
}

onMounted(loadQuota)
</script>

<style scoped>
.seo-advisor {
  background: #eef4ff;
  border: 1px solid #b8c9e6;
  border-radius: 1rem;
  padding: 1rem 1.1rem 1.15rem;
  margin: 0 0 1.1rem;
}
.seo-advisor-head {
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  align-items: flex-start;
}
.seo-advisor-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.4rem;
  flex-shrink: 0;
}
.seo-advisor-skip {
  border: 0;
  background: transparent;
  color: #5b6577;
  font-size: 0.75rem;
  font-weight: 650;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
  padding: 0.15rem 0.2rem;
  text-align: right;
}
.seo-advisor-skip:hover {
  color: #0c1222;
}
.seo-advisor-skip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.seo-advisor-kicker {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #6b7a8d;
}
.seo-advisor h3 {
  margin: 0.15rem 0 0.2rem;
  font-size: 1rem;
  color: #0c1222;
}
.seo-advisor-hint,
.seo-advisor-help {
  margin: 0 0 0.45rem;
  font-size: 0.78rem;
  color: #5b6577;
  line-height: 1.4;
}
.seo-advisor-run,
.seo-rewrite,
.seo-copy-btn {
  border: 0;
  border-radius: 0.7rem;
  padding: 0.5rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}
.seo-advisor-run {
  flex-shrink: 0;
  color: #fff;
  background: #0c1222;
}
.seo-advisor-run:disabled,
.seo-rewrite:disabled,
.seo-copy-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.seo-advisor-error {
  margin: 0.7rem 0 0;
  font-size: 0.8rem;
  color: #9a3412;
}
.seo-advisor-flash {
  margin: 0.7rem 0 0;
  font-size: 0.8rem;
  color: #1d4ed8;
}
.seo-advisor-body {
  margin-top: 0.9rem;
  display: grid;
  gap: 0.95rem;
}
.seo-advisor-summary {
  margin: 0;
  font-size: 0.85rem;
  color: #1a2333;
  line-height: 1.45;
}
.seo-advisor-label {
  margin: 0 0 0.35rem;
  font-size: 0.78rem;
  font-weight: 750;
  color: #0c1222;
}
.seo-advisor-comp ul,
.seo-advisor-keys {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.4rem;
}
.seo-advisor-comp li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.65rem;
  background: #fff;
  border: 1px solid #d7deea;
  border-radius: 0.75rem;
  padding: 0.55rem 0.7rem;
  font-size: 0.8rem;
  color: #0c1222;
}
.seo-comp-meta {
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 700;
  color: #5b6577;
  background: #eef2f7;
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
}
.seo-key {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.65rem;
  align-items: start;
  background: #fff;
  border: 1px solid #d7deea;
  border-radius: 0.85rem;
  padding: 0.7rem 0.8rem;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}
.seo-key-check {
  width: 1.2rem;
  height: 1.2rem;
  margin-top: 0.12rem;
  border-radius: 999px;
  border: 1.5px solid #c5cdd8;
  background: #fff;
  flex-shrink: 0;
}
.seo-key-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem 0.5rem;
}
.seo-key-main strong {
  font-size: 0.9rem;
  color: #0c1222;
  line-height: 1.25;
}
.seo-key-use {
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  background: #eef2f7;
  color: #5b6577;
}
.seo-key-pro,
.seo-key-con {
  margin: 0.28rem 0 0;
  padding-left: 0.85rem;
  position: relative;
  font-size: 0.74rem;
  line-height: 1.35;
  color: #5b6577;
}
.seo-key-pro::before,
.seo-key-con::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.42rem;
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
}
.seo-key-pro::before {
  background: #16a34a;
}
.seo-key-con::before {
  background: #d97706;
}
.seo-key.is-on {
  border-color: #0c1222;
  background: #f3f6fb;
  box-shadow: 0 0 0 1px #0c1222;
}
.seo-key.is-on .seo-key-check {
  border-color: #0c1222;
  background: #0c1222;
  box-shadow: inset 0 0 0 2px #fff;
}
.seo-key.is-skip .seo-key-use {
  background: #f3f4f6;
  color: #9aa3b2;
}
.seo-rewrite {
  justify-self: start;
  margin-top: 0.35rem;
  background: #0c1222;
  color: #fff;
}
.seo-advisor-copy {
  display: grid;
  gap: 0.45rem;
}
.seo-copy {
  display: grid;
  gap: 0.4rem;
  background: #fff;
  border: 1px solid #d7deea;
  border-radius: 0.85rem;
  padding: 0.7rem 0.8rem;
}
.seo-copy-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
}
.seo-copy-where {
  margin: 0;
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #5b6577;
  background: #eef2f7;
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
}
.seo-copy-text {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.4;
  color: #0c1222;
}
.seo-copy-btn {
  flex-shrink: 0;
  background: #0c1222;
  color: #fff;
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
}
.seo-copy.is-done {
  background: #f3f6fb;
  border-color: #0c1222;
}
.seo-copy.is-done .seo-copy-btn {
  background: #16a34a;
}
</style>
