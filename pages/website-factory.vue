<template>
  <main class="factory">
    <section class="card">
      <p class="eyebrow">Simy Website</p>
      <h1>Deine Website ist fast fertig</h1>
      <p class="lead">
        Hast du bereits eine Website oder einen Google-Unternehmenseintrag?
        Wir übernehmen daraus automatisch die wichtigsten Informationen und erstellen daraus deine neue Website.
      </p>

      <form v-if="!previewUrl" @submit.prevent="submit">
        <label>
          Google-Unternehmensprofil / Google Maps URL
          <input v-model="googleUrl" type="url" inputmode="url" autocomplete="url" placeholder="https://maps.google.com/..." :disabled="busy" />
        </label>
        <p class="or">oder</p>
        <label>
          Bestehende Website URL
          <input v-model="websiteUrl" type="url" inputmode="url" autocomplete="url" placeholder="https://..." :disabled="busy" />
        </label>

        <div v-if="knownSummary.length" class="known">
          <p>Wir haben bereits übernommen:</p>
          <ul>
            <li v-for="item in knownSummary" :key="item">{{ item }}</li>
          </ul>
        </div>

        <div v-if="showManual" class="manual">
          <p class="manual-title">{{ missing.length ? 'Dazu brauchen wir nur noch:' : 'Noch keine Website oder keinen Google-Unternehmenseintrag?' }}</p>
          <label v-if="ask('businessName')">
            Unternehmensname
            <input v-model="manual.businessName" required :disabled="busy" />
          </label>
          <label v-if="ask('offer')">
            Was bietest du an?
            <input v-model="manual.offer" required :disabled="busy" />
          </label>
          <label v-if="ask('city')">
            Ort
            <input v-model="manual.city" required :disabled="busy" />
          </label>
          <label v-if="ask('contact')">
            Telefon oder E-Mail
            <input v-model="manual.contact" required :disabled="busy" />
          </label>
          <label v-if="manualOpen && !missing.length">
            Adresse <span>optional</span>
            <input v-model="manual.address" :disabled="busy" />
          </label>
        </div>

        <button class="primary" type="submit" :disabled="busy">
          {{ busy ? 'Wir erstellen deine Website …' : missing.length ? 'Website erstellen' : 'Informationen automatisch übernehmen' }}
        </button>
        <button v-if="!manualOpen && !missing.length" class="text" type="button" @click="manualOpen = true">
          Noch keine Website oder keinen Google-Unternehmenseintrag? Angaben selbst eintragen
        </button>
        <p v-if="error" class="error">{{ error }}</p>
      </form>

      <div v-else class="ready">
        <h2>Deine Website ist bereit.</h2>
        <p>Wir haben die wichtigsten Informationen automatisch übernommen.</p>
        <a class="primary" :href="previewUrl">Website ansehen</a>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

type MissingField = 'businessName' | 'offer' | 'city' | 'contact'

const googleUrl = ref('')
const websiteUrl = ref('')
const manualOpen = ref(false)
const missing = ref<MissingField[]>([])
const known = ref<{ businessName?: string | null; offer?: string | null; city?: string | null; phone?: string | null; email?: string | null; address?: string | null }>({})
const manual = reactive({ businessName: '', offer: '', city: '', contact: '', address: '' })
const busy = ref(false)
const error = ref('')
const previewUrl = ref('')

const showManual = computed(() => manualOpen.value || missing.value.length > 0)
const knownSummary = computed(() => {
  const rows = [
    known.value.businessName ? `Name: ${known.value.businessName}` : '',
    known.value.offer ? `Angebot: ${known.value.offer}` : '',
    known.value.city ? `Ort: ${known.value.city}` : '',
    known.value.phone ? `Telefon: ${known.value.phone}` : '',
    known.value.email ? `E-Mail: ${known.value.email}` : '',
  ]
  return rows.filter(Boolean)
})

function ask(field: MissingField) {
  if (!missing.value.length) return manualOpen.value
  return missing.value.includes(field)
}

async function submit() {
  error.value = ''
  busy.value = true
  try {
    const contact = manual.contact.trim()
    const email = contact.includes('@') ? contact : ''
    const phone = email ? '' : contact
    const response = await $fetch<{ success: boolean; previewUrl?: string; missing?: MissingField[]; known?: typeof known.value }>(
      '/api/public/website-factory/discover',
      {
        method: 'POST',
        body: {
          googleUrl: googleUrl.value,
          websiteUrl: websiteUrl.value,
          manual: {
            businessName: manual.businessName,
            offer: manual.offer,
            city: manual.city,
            phone,
            email,
            address: manual.address,
          },
        },
      },
    )
    if (response.success && response.previewUrl) {
      previewUrl.value = response.previewUrl
      return
    }
    missing.value = response.missing || []
    known.value = response.known || {}
    manual.businessName = manual.businessName || response.known?.businessName || ''
    manual.offer = manual.offer || response.known?.offer || ''
    manual.city = manual.city || response.known?.city || ''
    if (!manual.contact) manual.contact = response.known?.phone || response.known?.email || ''
    manualOpen.value = true
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.statusMessage || 'Die Website konnte nicht erstellt werden.'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.factory {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px 16px;
  background: #fbfaf8;
  color: #1f2937;
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.card {
  width: min(640px, 100%);
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 28px;
  padding: 36px 28px;
  box-shadow: 0 20px 50px rgba(15, 118, 110, 0.08);
}
.eyebrow { color: #0f766e; font-size: 13px; font-weight: 600; margin: 0 0 8px; }
h1 { font-size: clamp(2rem, 4vw, 3rem); line-height: 1.05; margin: 0 0 12px; }
h2 { font-size: 2rem; margin: 0 0 8px; }
.lead, .ready p { color: #6b7280; line-height: 1.5; }
label { display: grid; gap: 6px; font-size: 14px; font-weight: 600; margin-top: 14px; }
label span { font-weight: 400; color: #9ca3af; }
input {
  font: inherit;
  font-weight: 400;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 12px 14px;
}
.or { text-align: center; color: #9ca3af; margin: 14px 0 0; }
.primary, .text {
  display: inline-flex;
  justify-content: center;
  width: 100%;
  margin-top: 18px;
  border-radius: 999px;
  padding: 14px 18px;
  font-weight: 700;
  text-decoration: none;
}
.primary { border: 0; color: white; background: linear-gradient(135deg, #0f766e, #134e4a); cursor: pointer; }
.text { border: 0; background: transparent; color: #0f766e; cursor: pointer; }
.primary:disabled { opacity: 0.7; cursor: wait; }
.known, .manual { margin-top: 16px; padding: 14px; border-radius: 16px; background: #f8faf9; }
.known ul { margin: 8px 0 0; padding-left: 18px; }
.manual-title { margin: 0; color: #374151; }
.error { color: #b91c1c; }
</style>
