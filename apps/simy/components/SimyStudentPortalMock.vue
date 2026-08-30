<template>
  <SimyPhoneFrame :caption="caption">
    <div class="flex flex-col h-full bg-white">
      <div class="px-4 pt-3 pb-8" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
        <p class="text-white/70 text-[11px]">Guten Morgen</p>
        <p class="text-white font-bold text-lg leading-tight">Hallo Anna</p>
      </div>
      <div class="mx-3 -mt-5 bg-white rounded-xl shadow-md p-3.5 mb-4 border border-gray-100">
        <p class="text-[10px] font-bold uppercase tracking-wide mb-1" style="color: var(--brand-primary)">Nächster Termin</p>
        <p class="font-bold text-gray-900 text-sm">Morgen, 09:00 Uhr</p>
        <p class="text-xs text-gray-500">90 Min · Thomas Meier</p>
        <p class="text-[11px] text-gray-400 mt-0.5">Bahnhof Uster, Gleis 1</p>
        <div class="mt-3 flex gap-2">
          <span class="flex-1 py-2 rounded-lg text-white text-[11px] font-bold text-center" style="background: var(--brand-primary)">Bestätigen</span>
          <span class="flex-1 py-2 rounded-lg text-[11px] font-bold bg-gray-100 text-gray-600 text-center">Absagen</span>
        </div>
      </div>
      <div class="px-3 mb-4">
        <div class="flex justify-between text-[11px] mb-1.5">
          <span class="font-semibold text-gray-700">Lernfortschritt</span>
          <span class="font-bold" style="color: var(--brand-primary)">14 / 20 Std.</span>
        </div>
        <div class="w-full bg-gray-100 rounded-full h-2">
          <div class="h-2 rounded-full" style="width: 70%; background: var(--brand-primary)" />
        </div>
      </div>
      <div class="mx-3 mb-3 rounded-xl p-3 flex items-center justify-between bg-amber-50 border border-amber-100">
        <div>
          <p class="text-[11px] font-bold text-amber-900">Offene Zahlung</p>
          <p class="text-[11px] text-amber-700">CHF 95.– · Termin 14</p>
        </div>
        <span class="text-[11px] font-bold px-2.5 py-1 rounded-lg text-white" style="background: var(--brand-primary)">Zahlen</span>
      </div>
      <div class="mx-3 rounded-xl border border-gray-100 p-3 flex items-center gap-2">
        <span class="text-xs">📄</span>
        <div>
          <p class="text-[11px] font-semibold text-gray-800">Lernfahrausweis</p>
          <p class="text-[10px] text-gray-400">Hochgeladen · sichtbar für die Schule</p>
        </div>
      </div>
      <div class="mt-auto border-t border-gray-100 px-2 pt-2 pb-3 grid grid-cols-4 text-center">
        <span class="text-[10px] font-semibold" style="color: var(--brand-primary)">Home</span>
        <span class="text-[10px] text-gray-400">Kalender</span>
        <span class="text-[10px] text-gray-400">Zahlen</span>
        <span class="text-[10px] text-gray-400">Profil</span>
      </div>
    </div>
  </SimyPhoneFrame>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ caption?: string }>(), {
  caption: 'Schüleransicht — nicht das Admin-Dashboard',
})
</script>
