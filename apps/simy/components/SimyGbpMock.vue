<template>
  <figure class="mx-auto w-full max-w-[320px] md:max-w-[380px]">
    <div class="rounded-[1.75rem] overflow-hidden bg-white shadow-xl ring-1 ring-black/5">
      <div class="relative h-36 md:h-40">
        <img
          :src="mock.cover"
          :alt="mock.name"
          class="absolute inset-0 w-full h-full object-cover"
          width="960"
          height="540"
          loading="lazy"
          decoding="async"
        />
        <div class="absolute -bottom-5 left-4 w-12 h-12 rounded-full bg-white shadow-md ring-1 ring-black/5 flex items-center justify-center">
          <span class="text-lg font-black leading-none" style="color: #1a365d">S</span>
        </div>
      </div>
      <div class="px-4 pt-8 pb-4">
        <p class="font-bold text-gray-900 text-[15px] leading-tight">{{ mock.name }}</p>
        <p class="text-[11px] text-gray-500 mt-0.5">{{ mock.category }} · {{ mock.area }}</p>
        <p class="text-[11px] text-gray-700 mt-1.5 flex items-center gap-1">
          <span class="tracking-tight" style="color: #fbbc04">★★★★★</span>
          <span class="font-medium">4.9</span>
          <span class="text-gray-400">(128)</span>
        </p>
        <p class="text-[11px] mt-1">
          <span class="font-semibold text-green-700">Geöffnet</span>
          <span class="text-gray-400"> · Schliesst 18:00</span>
        </p>
        <p class="text-[11px] text-gray-500 mt-2 flex items-start gap-1.5">
          <svg class="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          Seefeldstrasse 84, 8008 Zürich
        </p>
        <p class="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
          044 555 12 34
        </p>
        <div class="grid grid-cols-3 gap-1.5 mt-3">
          <span class="rounded-full border border-gray-200 py-1.5 text-[10px] font-semibold text-gray-700 text-center">Website</span>
          <span class="rounded-full py-1.5 text-[10px] font-semibold text-white text-center" style="background: #1a73e8">Route</span>
          <span class="rounded-full border border-gray-200 py-1.5 text-[10px] font-semibold text-gray-700 text-center">Anrufen</span>
        </div>
        <div class="mt-3 rounded-xl border border-gray-100 overflow-hidden flex">
          <img
            :src="mock.postImage"
            :alt="mock.postTitle"
            class="w-16 h-16 object-cover flex-shrink-0"
            width="160"
            height="160"
            loading="lazy"
            decoding="async"
          />
          <div class="px-2.5 py-1.5 min-w-0">
            <p class="text-[11px] font-semibold text-gray-900 leading-snug truncate">{{ mock.postTitle }}</p>
            <p class="text-[10px] text-gray-400">{{ mock.postWhen }}</p>
            <p class="text-[10px] text-gray-500 leading-snug line-clamp-2">{{ mock.postBody }}</p>
          </div>
        </div>
        <div class="mt-3 flex gap-2">
          <span class="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0" style="background: var(--brand-primary)">{{ mock.reviewInitial }}</span>
          <div class="min-w-0">
            <p class="text-[11px] font-semibold text-gray-900">{{ mock.reviewName }}</p>
            <p class="text-[10px] tracking-tight" style="color: #fbbc04">★★★★★</p>
            <p class="text-[11px] text-gray-500 leading-snug">{{ mock.reviewText }}</p>
          </div>
        </div>
        <p class="mt-3 text-[11px] font-medium" style="color: #1a73e8">Alle Rezensionen ansehen ›</p>
      </div>
    </div>
    <figcaption class="mt-3 text-center text-xs text-gray-400">Beispiel-Profil — Posts und Reviews laufen über Simy</figcaption>
  </figure>
</template>

<script setup lang="ts">
import { gbpIndustry, gbpMock } from '~/data/gbp'

const props = defineProps<{
  businessType?: string
  slug?: string
}>()

const mock = computed(() => gbpMock(gbpIndustry(props.businessType, props.slug)))
</script>
