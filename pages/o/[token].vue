<template>
  <div class="min-h-screen bg-slate-50">
    <div class="max-w-xl mx-auto px-4 py-10 sm:py-16">
      <div v-if="pending" class="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
        Offerte wird geladen…
      </div>

      <div v-else-if="error" class="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <h1 class="text-lg font-semibold text-slate-900">Link ungültig</h1>
        <p class="mt-2 text-sm text-slate-500">{{ error }}</p>
      </div>

      <div v-else-if="quote" class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div class="px-6 py-5" :style="{ background: quote.primary_color }">
          <p class="text-xs font-semibold uppercase tracking-wider text-white/70">Offerte</p>
          <h1 class="text-2xl font-bold text-white mt-1">{{ quote.quote_number }}</h1>
          <p class="text-sm text-white/80 mt-1">{{ quote.tenant_name }}</p>
        </div>

        <div class="px-6 py-5 space-y-4">
          <p class="text-sm text-slate-600">
            Für <span class="font-semibold text-slate-900">{{ quote.customer_name }}</span>
            <span v-if="quote.valid_until"> · gültig bis {{ formatDate(quote.valid_until) }}</span>
          </p>

          <div v-if="quote.notes" class="text-sm text-slate-600 whitespace-pre-line">{{ quote.notes }}</div>

          <table class="w-full text-sm">
            <tbody>
              <tr v-for="(item, i) in quote.items" :key="i" class="border-t border-slate-100">
                <td class="py-3 pr-3">
                  <p class="font-medium text-slate-900">{{ item.product_name }}</p>
                  <p v-if="item.product_description" class="text-xs text-slate-400 mt-0.5 whitespace-pre-line">{{ item.product_description }}</p>
                </td>
                <td class="py-3 text-right font-semibold text-slate-900 whitespace-nowrap">{{ formatChf(item.total_price_rappen) }}</td>
              </tr>
            </tbody>
          </table>

          <div class="border-t border-slate-200 pt-3 text-right">
            <p v-if="quote.vat_amount_rappen > 0" class="text-xs text-slate-500">MwSt. {{ formatChf(quote.vat_amount_rappen) }}</p>
            <p class="text-lg font-bold text-slate-900">{{ formatChf(quote.total_amount_rappen) }}</p>
          </div>

          <div v-if="quote.lifecycle === 'accepted'" class="rounded-xl bg-emerald-50 text-emerald-800 text-sm p-4">
            Angenommen. Rechnung {{ quote.invoice_number }} wurde erstellt.
          </div>
          <div v-else-if="quote.lifecycle === 'declined' || quote.lifecycle === 'cancelled'" class="rounded-xl bg-slate-100 text-slate-600 text-sm p-4">
            Diese Offerte wurde abgelehnt.
          </div>
          <div v-else-if="quote.lifecycle === 'expired'" class="rounded-xl bg-amber-50 text-amber-800 text-sm p-4">
            Diese Offerte ist abgelaufen.
          </div>
          <div v-else-if="quote.lifecycle === 'draft'" class="rounded-xl bg-slate-100 text-slate-600 text-sm p-4">
            Diese Offerte wurde noch nicht versendet.
          </div>
          <div v-else class="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              :disabled="busy"
              class="flex-1 h-11 rounded-xl text-white font-semibold disabled:opacity-50"
              :style="{ background: quote.primary_color }"
              @click="accept"
            >
              {{ busy ? 'Wird angenommen…' : 'Offerte annehmen' }}
            </button>
            <button
              type="button"
              :disabled="busy"
              class="h-11 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium disabled:opacity-50"
              @click="decline"
            >
              Ablehnen
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const token = computed(() => String(route.params.token || ''))
const pending = ref(true)
const busy = ref(false)
const error = ref('')
const quote = ref<any>(null)

function formatChf(rappen: number) {
  return `CHF ${((rappen || 0) / 100).toFixed(2)}`
}
function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return iso
  }
}

async function load() {
  pending.value = true
  error.value = ''
  try {
    const res = await $fetch<any>(`/api/public/quotes/${token.value}`)
    quote.value = res.data
  } catch (e: any) {
    error.value = e?.statusMessage || e?.message || 'Offerte nicht gefunden'
  } finally {
    pending.value = false
  }
}

async function accept() {
  busy.value = true
  try {
    const res = await $fetch<any>(`/api/public/quotes/${token.value}/accept`, { method: 'POST' })
    await load()
    if (res.invoice_number && quote.value) {
      quote.value.invoice_number = res.invoice_number
      quote.value.lifecycle = 'accepted'
    }
  } catch (e: any) {
    error.value = e?.statusMessage || e?.message || 'Annahme fehlgeschlagen'
  } finally {
    busy.value = false
  }
}

async function decline() {
  if (!confirm('Offerte wirklich ablehnen?')) return
  busy.value = true
  try {
    await $fetch(`/api/public/quotes/${token.value}/decline`, { method: 'POST' })
    await load()
  } catch (e: any) {
    error.value = e?.statusMessage || e?.message || 'Ablehnen fehlgeschlagen'
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>
