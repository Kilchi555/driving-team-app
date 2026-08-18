<template>
  <section class="faq-research">
    <header class="faq-research-head">
      <div>
        <p class="faq-research-kicker">Hilfe für FAQs</p>
        <h3>Nichts im Kopf?</h3>
        <p class="faq-research-hint">
          Wir holen 10 typische Kundenfragen für deine Branche und deinen Ort.
          Klick auf «Hinzufügen», dann kannst du Frage und Antwort noch anpassen.
        </p>
      </div>
      <button
        type="button"
        class="faq-research-run"
        :disabled="loading"
        @click="run"
      >
        {{ loading ? 'Sucht…' : suggestions.length ? 'Neue Vorschläge' : 'FAQ recherchieren' }}
      </button>
    </header>

    <p v-if="error" class="faq-research-error">{{ error }}</p>
    <p v-if="flash" class="faq-research-flash">{{ flash }}</p>

    <div v-if="suggestions.length" class="faq-research-list">
      <article
        v-for="(item, idx) in suggestions"
        :key="`${item.q}-${idx}`"
        class="faq-research-item"
        :class="{ 'is-added': added.has(idx) }"
      >
        <div class="faq-research-copy">
          <strong>{{ item.q }}</strong>
          <p>{{ item.a }}</p>
        </div>
        <button
          type="button"
          class="faq-research-add"
          :disabled="added.has(idx) || !canAdd"
          @click="add(item, idx)"
        >
          {{ added.has(idx) ? 'Hinzugefügt' : canAdd ? 'Hinzufügen' : '10 Fragen voll' }}
        </button>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  formalAddress: 'sie' | 'du'
  existing: string[]
  canAdd: boolean
}>()

const emit = defineEmits<{
  add: [item: { q: string; a: string }]
}>()

const loading = ref(false)
const error = ref('')
const flash = ref('')
const suggestions = ref<Array<{ q: string; a: string }>>([])
const added = ref(new Set<number>())

async function run() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  flash.value = ''
  try {
    const res = await $fetch<{ suggestions?: Array<{ q: string; a: string }> }>('/api/website/faq-research', {
      method: 'POST',
      body: {
        formal_address: props.formalAddress,
        existing: props.existing,
      },
    })
    suggestions.value = (res.suggestions || []).slice(0, 10)
    added.value = new Set()
    flash.value = suggestions.value.length
      ? 'Vorschläge bereit — hinzufügen und danach im Formular anpassen.'
      : 'Keine Vorschläge erhalten.'
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Recherche fehlgeschlagen'
  } finally {
    loading.value = false
  }
}

function add(item: { q: string; a: string }, idx: number) {
  if (!props.canAdd || added.value.has(idx)) return
  emit('add', item)
  const next = new Set(added.value)
  next.add(idx)
  added.value = next
}
</script>

<style scoped>
.faq-research {
  background: #eef4ff;
  border: 1px solid #b8c9e6;
  border-radius: 1rem;
  padding: 1rem 1.1rem 1.15rem;
  margin: 0 0 1.1rem;
}
.faq-research-head {
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  align-items: flex-start;
}
.faq-research-kicker {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #6b7a8d;
}
.faq-research h3 {
  margin: 0.15rem 0 0.2rem;
  font-size: 1rem;
  color: #0c1222;
}
.faq-research-hint {
  margin: 0;
  font-size: 0.78rem;
  color: #5b6577;
  line-height: 1.4;
}
.faq-research-run,
.faq-research-add {
  border: 0;
  border-radius: 0.7rem;
  padding: 0.5rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  color: #fff;
  background: #0c1222;
  flex-shrink: 0;
}
.faq-research-run:disabled,
.faq-research-add:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.faq-research-error {
  margin: 0.7rem 0 0;
  font-size: 0.8rem;
  color: #9a3412;
}
.faq-research-flash {
  margin: 0.7rem 0 0;
  font-size: 0.8rem;
  color: #1d4ed8;
}
.faq-research-list {
  margin-top: 0.9rem;
  display: grid;
  gap: 0.5rem;
}
.faq-research-item {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  justify-content: space-between;
  background: #fff;
  border: 1px solid #d7deea;
  border-radius: 0.85rem;
  padding: 0.7rem 0.8rem;
}
.faq-research-copy {
  min-width: 0;
}
.faq-research-copy strong {
  display: block;
  font-size: 0.88rem;
  color: #0c1222;
  line-height: 1.3;
}
.faq-research-copy p {
  margin: 0.3rem 0 0;
  font-size: 0.78rem;
  line-height: 1.4;
  color: #5b6577;
}
.faq-research-add {
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  white-space: nowrap;
}
.faq-research-item.is-added {
  background: #f3f6fb;
  border-color: #0c1222;
}
.faq-research-item.is-added .faq-research-add {
  background: #16a34a;
}
</style>
