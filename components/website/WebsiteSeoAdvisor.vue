<template>
  <section class="seo-advisor">
    <header class="seo-head">
      <div class="seo-head-text">
        <p class="seo-kicker">Google</p>
        <h3>Texte, die gefunden werden</h3>
      </div>
      <p class="seo-quota" :class="{ 'is-out': remaining < 1 }">
        {{ remaining }}/{{ limit }} heute
      </p>
    </header>

    <ol class="seo-steps" aria-label="Ablauf">
      <li :class="stepClass(1)">
        <span>1</span>
        Recherche
      </li>
      <li :class="stepClass(2)">
        <span>2</span>
        Wörter wählen
      </li>
      <li :class="stepClass(3)">
        <span>3</span>
        Übernehmen
      </li>
    </ol>

    <p v-if="error" class="seo-msg seo-msg--err">{{ error }}</p>
    <p v-else-if="flash" class="seo-msg">{{ flash }}</p>

    <div v-if="loading" class="seo-panel seo-wait" role="status">
      <span class="seo-spinner" aria-hidden="true" />
      <p>Sucht, was Kunden in deiner Region googeln…</p>
    </div>

    <div v-else-if="step === 1" class="seo-panel">
      <p class="seo-lead">
        Wir holen Suchbegriffe aus deiner Gegend. Du tippst 1–3 an — danach kommen Titel und Texte zum Übernehmen.
      </p>
      <button
        type="button"
        class="seo-btn seo-btn--primary"
        :disabled="remaining < 1"
        @click="run(false)"
      >
        {{ remaining < 1 ? 'Heute aufgebraucht' : 'Recherche starten' }}
      </button>
      <button type="button" class="seo-btn seo-btn--text" @click="skip">
        Selbst schreiben
      </button>
    </div>

    <div v-else-if="step === 2" class="seo-panel">
      <p class="seo-lead">
        Tippe <strong>1–3 Suchwörter</strong> an, die zu dir passen. Danach schreiben wir die Google-Texte.
      </p>
      <p class="seo-pick">{{ selected.size }}/3 gewählt</p>

      <button
        v-for="k in visibleKeywords"
        :key="k.phrase"
        type="button"
        class="seo-chip"
        :class="{ 'is-on': selected.has(k.phrase), 'is-skip': k.use === 'skip' }"
        :aria-pressed="selected.has(k.phrase)"
        @click="toggle(k.phrase)"
      >
        <span class="seo-chip-check" aria-hidden="true" />
        <span class="seo-chip-body">
          <strong>{{ k.phrase }}</strong>
          <em>{{ placeLabel(k.use) }}</em>
        </span>
      </button>

      <details v-if="competitors.length" class="seo-more">
        <summary>Andere Betriebe in der Nähe</summary>
        <ul>
          <li v-for="c in competitors" :key="c.name">
            <strong>{{ c.name }}</strong>
            <span v-if="c.rating">{{ c.rating }}★ · {{ c.reviews || 0 }}</span>
          </li>
        </ul>
      </details>

      <button
        type="button"
        class="seo-btn seo-btn--primary"
        :disabled="rewriting || selected.size < 1"
        @click="run(true)"
      >
        {{ rewriting ? 'Schreibt Texte…' : 'Texte schreiben' }}
      </button>
      <button
        v-if="briefing?.copy"
        type="button"
        class="seo-btn seo-btn--text"
        :disabled="rewriting"
        @click="showCopy = true"
      >
        Vorschläge ohne neue Texte anzeigen
      </button>
    </div>

    <div v-else class="seo-panel">
      <p class="seo-lead">
        Übernehmen schreibt den Text ins Formular darunter. Live wird erst mit «Veröffentlichen».
      </p>
      <p v-if="selectedList" class="seo-pick">Fokus: {{ selectedList }}</p>

      <article
        v-for="row in copyRows"
        :key="row.slotId"
        class="seo-copy"
        :class="{ 'is-done': row.done }"
      >
        <div class="seo-copy-top">
          <p>{{ row.where }}</p>
          <button type="button" class="seo-copy-btn" :disabled="!row.text" @click="take(row)">
            {{ row.done ? 'Übernommen' : 'Übernehmen' }}
          </button>
        </div>
        <p class="seo-copy-text">{{ row.text || '—' }}</p>
      </article>

      <button type="button" class="seo-btn seo-btn--text" @click="showCopy = false">
        ← Andere Wörter wählen
      </button>
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
const showCopy = ref(false)

const step = computed(() => {
  if (loading.value) return 1
  if (!briefing.value) return 1
  if (showCopy.value && briefing.value.copy) return 3
  return 2
})

const visibleKeywords = computed(() => {
  const list = Array.isArray(briefing.value?.keywords) ? briefing.value.keywords : []
  return list.filter((k: any) => k?.phrase)
})

const competitors = computed(() => {
  const list = briefing.value?.research?.competitors
  return Array.isArray(list) ? list : []
})

const selectedList = computed(() => [...selected.value].join(' · '))

function stepClass(n: number) {
  if (step.value > n) return 'is-done'
  if (step.value === n) return 'is-now'
  return ''
}

function placeLabel(use: string) {
  if (use === 'title') return 'Titel'
  if (use === 'h1') return 'Überschrift'
  if (use === 'skip') return 'eher nicht'
  return 'Fliesstext'
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
      where: 'Überschrift auf der Website',
      text: c.headline || '',
      done: applied.value.has('hero.headline'),
    },
    {
      slotId: 'hero.subheadline',
      where: 'Text unter der Überschrift',
      text: c.subheadline || '',
      done: applied.value.has('hero.subheadline'),
    },
    {
      slotId: 'seo.title',
      where: 'Blauer Link bei Google',
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
      where: 'Suchwörter',
      text: c.seo_keywords || '',
      done: applied.value.has('seo.keywords'),
    },
    {
      slotId: 'trust',
      where: 'Drei Vorteilskarten',
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
  flash.value = 'Ins Formular übernommen.'
}

async function loadQuota() {
  try {
    const res = await $fetch<any>('/api/website/seo-advisor')
    remaining.value = Number(res.remaining ?? 3)
    limit.value = Number(res.limit ?? 3)
    resetsOn.value = String(res.resets_on || '')
    if (res.last && !briefing.value) {
      briefing.value = res.last
      showCopy.value = false
    }
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
    if (rewrite) {
      showCopy.value = true
      flash.value = 'Texte sind fertig — übernehmen, was passt.'
    } else {
      showCopy.value = false
      flash.value = 'Tippe 1–3 Suchwörter an.'
    }
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
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 1.1rem;
  padding: 1rem 1rem 1.1rem;
  margin: 0 0 1.1rem;
}
.seo-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}
.seo-kicker {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 750;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
}
.seo-head h3 {
  margin: 0.15rem 0 0;
  font-size: 1.12rem;
  font-weight: 750;
  color: #0f172a;
  line-height: 1.25;
}
.seo-quota {
  margin: 0;
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 700;
  color: #334155;
  background: #f1f5f9;
  border-radius: 999px;
  padding: 0.28rem 0.6rem;
}
.seo-quota.is-out {
  color: #9a3412;
  background: #fff7ed;
}
.seo-steps {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.35rem;
  margin: 0.9rem 0 0.85rem;
  padding: 0;
}
.seo-steps li {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.68rem;
  font-weight: 650;
  color: #94a3b8;
  text-align: center;
}
.seo-steps li span {
  width: 1.45rem;
  height: 1.45rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 0.72rem;
  font-weight: 800;
  background: #f1f5f9;
  color: #94a3b8;
}
.seo-steps li.is-now {
  color: #0f172a;
}
.seo-steps li.is-now span {
  background: #0f172a;
  color: #fff;
}
.seo-steps li.is-done {
  color: #166534;
}
.seo-steps li.is-done span {
  background: #dcfce7;
  color: #166534;
}
.seo-msg {
  margin: 0 0 0.7rem;
  font-size: 0.8rem;
  color: #1d4ed8;
}
.seo-msg--err {
  color: #9a3412;
}
.seo-panel {
  display: grid;
  gap: 0.55rem;
}
.seo-lead {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.45;
  color: #475569;
}
.seo-pick {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #0f172a;
}
.seo-btn {
  border: 0;
  cursor: pointer;
  font-weight: 750;
}
.seo-btn--primary {
  width: 100%;
  min-height: 2.75rem;
  border-radius: 0.85rem;
  background: #0f172a;
  color: #fff;
  font-size: 0.92rem;
}
.seo-btn--primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.seo-btn--text {
  background: transparent;
  color: #64748b;
  font-size: 0.8rem;
  padding: 0.35rem 0.2rem;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.seo-wait {
  justify-items: center;
  text-align: center;
  padding: 1.1rem 0.5rem 0.6rem;
  color: #475569;
  font-size: 0.88rem;
}
.seo-wait p {
  margin: 0;
}
.seo-spinner {
  width: 1.35rem;
  height: 1.35rem;
  border: 2px solid #e2e8f0;
  border-top-color: #0f172a;
  border-radius: 999px;
  animation: seo-spin 0.7s linear infinite;
}
@keyframes seo-spin {
  to {
    transform: rotate(360deg);
  }
}
.seo-chip {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.65rem;
  align-items: center;
  text-align: left;
  width: 100%;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 0.9rem;
  padding: 0.7rem 0.8rem;
  cursor: pointer;
}
.seo-chip-check {
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 999px;
  border: 1.5px solid #cbd5e1;
  background: #fff;
}
.seo-chip-body {
  display: grid;
  gap: 0.1rem;
  min-width: 0;
}
.seo-chip-body strong {
  font-size: 0.9rem;
  color: #0f172a;
}
.seo-chip-body em {
  font-style: normal;
  font-size: 0.7rem;
  font-weight: 650;
  color: #64748b;
}
.seo-chip.is-on {
  border-color: #0f172a;
  background: #fff;
  box-shadow: 0 0 0 1px #0f172a;
}
.seo-chip.is-on .seo-chip-check {
  border-color: #0f172a;
  background: #0f172a;
  box-shadow: inset 0 0 0 2px #fff;
}
.seo-chip.is-skip {
  opacity: 0.55;
}
.seo-more {
  background: #f8fafc;
  border-radius: 0.8rem;
  padding: 0.45rem 0.7rem;
  font-size: 0.8rem;
  color: #475569;
}
.seo-more summary {
  cursor: pointer;
  font-weight: 650;
  color: #334155;
}
.seo-more ul {
  list-style: none;
  margin: 0.45rem 0 0.2rem;
  padding: 0;
  display: grid;
  gap: 0.3rem;
}
.seo-more li {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}
.seo-copy {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.9rem;
  padding: 0.7rem 0.8rem;
  display: grid;
  gap: 0.4rem;
}
.seo-copy-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.seo-copy-top p {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 750;
  color: #64748b;
}
.seo-copy-text {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.4;
  color: #0f172a;
}
.seo-copy-btn {
  flex-shrink: 0;
  border: 0;
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  background: #0f172a;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 750;
  cursor: pointer;
}
.seo-copy-btn:disabled {
  opacity: 0.4;
}
.seo-copy.is-done {
  border-color: #86efac;
  background: #f0fdf4;
}
.seo-copy.is-done .seo-copy-btn {
  background: #16a34a;
}
</style>
