<template>
  <div class="relative">
    <div class="simy-glow absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-90" />
    <div class="relative rounded-[1.35rem] overflow-hidden border border-white/70 shadow-[0_24px_80px_rgba(15,10,30,0.14)] bg-white/80 backdrop-blur-md">
      <div class="flex items-center gap-2 px-4 py-3 border-b border-black/[0.04]">
        <div class="w-2 h-2 rounded-full bg-black/15" />
        <div class="w-2 h-2 rounded-full bg-black/10" />
        <div class="w-2 h-2 rounded-full bg-black/10" />
        <button
          type="button"
          class="ml-2 flex-1 h-7 rounded-lg bg-black/[0.03] text-[11px] font-mono text-gray-500 flex items-center justify-center gap-2 hover:bg-black/[0.05] transition-colors"
          @click="copyHost"
        >
          {{ previewHost }}
          <span class="text-[10px] font-sans font-semibold" style="color: var(--brand-primary)">{{ copied ? 'Kopiert' : 'Kopieren' }}</span>
        </button>
      </div>
      <div v-if="tabs.length" class="flex gap-1 px-3 pt-3">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          :class="active === tab.id ? 'text-white' : 'text-gray-500 hover:bg-gray-50'"
          :style="active === tab.id ? { background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' } : {}"
          @click="active = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="p-4" :class="frameClass">
        <div class="rounded-xl overflow-hidden border border-black/[0.05] bg-[#0c1222] text-white">
          <div class="relative h-28 md:h-36">
            <div class="absolute inset-0" style="background: linear-gradient(145deg, rgba(var(--brand-rgb),0.55), #141c2b 58%)" />
            <div class="absolute inset-x-4 bottom-3 space-y-1.5">
              <p class="text-[10px] uppercase tracking-[0.14em] text-white/50">Fahrschule Zürich</p>
              <p class="text-sm md:text-base font-semibold tracking-tight">Fahrstunden — klar, lokal, online.</p>
              <div class="flex gap-1.5 pt-1">
                <span class="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px]">Online · buchbar</span>
                <span class="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px]">4.9★</span>
              </div>
            </div>
          </div>
          <div class="bg-white text-gray-800 p-3 space-y-2">
            <div class="grid gap-1.5" :class="active === 'phone' ? 'grid-cols-1' : 'grid-cols-3'">
              <div class="rounded-lg border border-gray-100 px-2 py-1.5">
                <p class="text-[9px] text-gray-400">Probe</p>
                <p class="text-[11px] font-semibold">CHF 89</p>
              </div>
              <div v-if="active !== 'phone'" class="rounded-lg border border-gray-100 px-2 py-1.5">
                <p class="text-[9px] text-gray-400">Fahrstunde</p>
                <p class="text-[11px] font-semibold">CHF 95</p>
              </div>
              <div v-if="active === 'desktop'" class="rounded-lg border border-gray-100 px-2 py-1.5">
                <p class="text-[9px] text-gray-400">VKU</p>
                <p class="text-[11px] font-semibold">CHF 180</p>
              </div>
            </div>
            <div class="h-7 w-24 rounded-full text-[10px] font-semibold text-white flex items-center justify-center" style="background: var(--brand-primary)">
              Jetzt buchen
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="hidden md:flex flex-col gap-2 absolute -left-7 top-20">
      <span
        v-for="(chip, i) in chips"
        :key="chip"
        class="simy-glass simy-float rounded-full px-3 py-1.5 text-[11px] font-medium text-gray-700 whitespace-nowrap"
        :class="i === 1 ? 'simy-float-delay' : ''"
      >
        {{ chip }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  previewHost?: string
}>(), {
  previewHost: 'simy.ch/s/dein-betrieb',
})

const tabs = [
  { id: 'desktop', label: 'Desktop' },
  { id: 'tablet', label: 'Tablet' },
  { id: 'phone', label: 'Mobil' },
]
const active = ref('desktop')
const copied = ref(false)
const chips = ['SEO · JSON-LD', 'CHF 490 einmalig', '30 Tage Vorschau']

const frameClass = computed(() => {
  if (active.value === 'phone') return 'max-w-[220px] mx-auto'
  if (active.value === 'tablet') return 'max-w-[340px] mx-auto'
  return ''
})

async function copyHost() {
  try {
    await navigator.clipboard.writeText(`https://${props.previewHost}`)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1600)
  } catch {
    /* ignore */
  }
}
</script>
