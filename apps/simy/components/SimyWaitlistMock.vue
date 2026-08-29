<template>
  <div class="rounded-[1.35rem] border border-black/[0.07] bg-white overflow-hidden shadow-[0_20px_50px_rgba(15,10,30,0.08)]">
    <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
      <p class="text-[10px] font-bold uppercase tracking-widest" style="color: var(--brand-primary)">VKU Zürich</p>
      <span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-900 text-white">Ausgebucht</span>
    </div>
    <div class="p-5">
      <p class="font-bold text-gray-900">Samstag, 12. Sep · 10:00–16:00</p>
      <p class="text-sm text-gray-500 mb-4">12 / 12 Plätze</p>
      <div class="h-2 rounded-full bg-gray-100 mb-5">
        <div class="h-2 rounded-full w-full" style="background: var(--brand-primary)" />
      </div>
      <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Warteliste</p>
      <div class="space-y-2 mb-4">
        <div v-for="(p, i) in people" :key="p" class="flex items-center justify-between text-sm">
          <span class="text-gray-700">{{ i + 1 }}. {{ p }}</span>
          <span class="text-[11px] text-gray-400">wartet</span>
        </div>
      </div>
      <div class="h-10 rounded-xl border-2 text-sm font-bold flex items-center justify-center" style="border-color: var(--brand-primary); color: var(--brand-primary)">
        Auf Warteliste setzen
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const people = ['Lea M.', 'Jonas R.', 'Sofia T.']
</script>
