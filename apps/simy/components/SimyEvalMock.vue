<template>
  <div class="rounded-[1.35rem] border border-black/[0.07] bg-white overflow-hidden shadow-[0_20px_50px_rgba(15,10,30,0.08)]">
    <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nach der Stunde</p>
        <p class="font-bold text-gray-900 text-sm">Anna Keller · Kat. B</p>
      </div>
      <span class="text-[11px] font-semibold px-2.5 py-1 rounded-full" style="background: rgba(var(--brand-rgb),0.1); color: var(--brand-primary)">PDF</span>
    </div>
    <div class="p-5 space-y-3">
      <div v-for="row in rows" :key="row.label" class="flex items-center justify-between gap-3">
        <p class="text-sm text-gray-700">{{ row.label }}</p>
        <span
          class="text-[11px] font-bold px-2 py-0.5 rounded-full"
          :style="{ background: row.bg, color: row.fg }"
        >{{ row.grade }}</span>
      </div>
      <p class="text-xs text-gray-500 leading-relaxed pt-2 border-t border-gray-50">
        Blicktechnik in Kreiseln noch unsicher. Nächstes Mal: Spiegel–Schulter vor dem Abbiegen.
      </p>
      <div class="h-10 rounded-xl text-white text-sm font-bold flex items-center justify-center" style="background: var(--brand-primary)">
        PDF exportieren
      </div>
      <p class="text-[11px] text-gray-400 text-center">Sichtbar im Schülerportal — dieselbe Bewertung</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const rows = [
  { label: 'Blicktechnik', grade: 'In Übung', bg: '#FEF3C7', fg: '#92400E' },
  { label: 'Spurhalten', grade: 'Selbstständig', bg: '#D1FAE5', fg: '#065F46' },
  { label: 'Kreisverkehr', grade: 'Mit Hilfe', bg: '#DBEAFE', fg: '#1E40AF' },
]
</script>
