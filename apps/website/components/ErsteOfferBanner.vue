<template>
  <a
    v-if="variant === 'badge'"
    :href="href"
    class="erste-offer group relative inline-flex flex-col sm:flex-row items-center gap-1 sm:gap-3 overflow-hidden rounded-2xl px-5 py-3"
  >
    <span class="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-primary-700">Erste Lektion · 45 Min.</span>
    <span class="flex items-baseline gap-2">
      <span class="text-2xl md:text-3xl font-black text-primary-700 leading-none">CHF 65.–</span>
      <span class="text-sm text-gray-500 line-through decoration-gray-400">CHF 95.–</span>
    </span>
    <span class="hidden sm:inline text-primary-300">·</span>
    <span class="text-xs font-medium text-primary-600/80">danach CHF 95.– / 45 Min.</span>
  </a>

  <section v-else-if="variant === 'band'" class="py-8 bg-gradient-to-b from-sky-50 to-white">
    <div class="max-w-3xl mx-auto px-4">
      <a
        :href="href"
        class="erste-offer group relative flex flex-col sm:flex-row items-center justify-between gap-3 overflow-hidden rounded-2xl px-5 py-4"
      >
        <span class="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-center sm:text-left">
          <span class="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-primary-700">Erste Lektion · 45 Min.</span>
          <span class="flex items-baseline gap-2">
            <span class="text-2xl font-black text-primary-700 leading-none">CHF 65.–</span>
            <span class="text-sm text-gray-500 line-through decoration-gray-400">CHF 95.–</span>
          </span>
          <span class="text-xs font-medium text-primary-600/80">danach CHF 95.– / 45 Min.</span>
        </span>
        <span class="text-sm font-bold text-primary-700 whitespace-nowrap">Erste Lektion buchen →</span>
      </a>
    </div>
  </section>

  <section v-else class="py-10 bg-gradient-to-b from-sky-50 to-white">
    <div class="max-w-xl mx-auto px-4 text-center">
      <p class="text-xs font-bold uppercase tracking-wider text-primary-700 mb-2">Erste Lektion · 45 Min.</p>
      <p class="flex items-baseline justify-center gap-2 mb-1">
        <span class="text-4xl font-black text-primary-700">CHF 65.–</span>
        <span class="text-lg text-gray-500 line-through decoration-gray-400">CHF 95.–</span>
      </p>
      <p class="text-sm text-primary-600/80 mb-5">Danach CHF 95.– / 45 Min. · nur Kategorie B</p>
      <a
        :href="href"
        class="inline-flex items-center justify-center gap-2 bg-primary-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-primary-700 transition shadow-md"
      >
        Erste Lektion buchen
      </a>
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'badge' | 'band' | 'cta'
  href?: string
}>(), {
  variant: 'band',
  href: '/buchen?category=B&code=ERSTE30',
})
</script>

<style scoped>
.erste-offer {
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #7dd3fc 100%);
  box-shadow: 0 8px 22px -8px rgba(2, 132, 199, 0.4), 0 0 0 1px rgba(14, 165, 233, 0.35);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.erste-offer::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, 0.7) 50%, transparent 65%);
  background-size: 220% 100%;
  animation: ersteShine 3.2s ease-in-out infinite;
  pointer-events: none;
}
.erste-offer:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 26px -8px rgba(2, 132, 199, 0.5), 0 0 0 1px rgba(14, 165, 233, 0.5);
}
@keyframes ersteShine {
  0%, 55% { background-position: 120% 0; }
  100% { background-position: -20% 0; }
}
</style>
