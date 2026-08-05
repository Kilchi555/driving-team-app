<template>
  <section v-if="showSection" class="py-24 px-6 bg-gray-50">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-4">
        <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary)">
          Google Bewertungen
        </p>
        <h2 class="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
          {{ title }}
        </h2>
        <p v-if="subtitle" class="text-gray-500 text-lg max-w-2xl mx-auto">{{ subtitle }}</p>
      </div>

      <div class="flex items-center justify-center gap-2 mb-10">
        <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <div class="flex text-amber-400 text-sm" aria-label="5 Sterne">
          <span v-for="n in 5" :key="n">★</span>
        </div>
        <span class="text-sm text-gray-500 font-medium">
          <template v-if="averageRating">{{ averageRating }} · </template>
          echte Google-Bewertungen
        </span>
      </div>

      <div v-if="pending" class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div v-for="i in 3" :key="i" class="h-48 rounded-2xl bg-white border border-gray-100 animate-pulse" />
      </div>

      <div v-else class="relative">
        <div
          class="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 -mx-2 px-2 scroll-smooth"
          style="scrollbar-width: none"
        >
          <a
            v-for="(review, i) in reviews"
            :key="i"
            :href="review.link"
            target="_blank"
            rel="nofollow noopener noreferrer"
            class="snap-start shrink-0 w-[85vw] sm:w-[48vw] md:w-[32vw] max-w-[340px] block rounded-2xl p-6 bg-white border border-gray-100 no-underline transition-all duration-300 hover:-translate-y-1 hover:border-purple-100"
          >
            <div class="flex gap-0.5 text-amber-400 text-base mb-4">
              <span v-for="n in Math.round(review.rating || 5)" :key="n">★</span>
            </div>
            <p class="text-gray-700 text-sm leading-relaxed line-clamp-5 mb-5">
              „{{ review.text }}“
            </p>
            <div class="flex items-center gap-3 pt-4 border-t border-gray-100">
              <div
                class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
              >
                {{ (review.author || 'G').charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-900 truncate">{{ review.author }}</p>
                <p class="text-xs font-medium" style="color: var(--brand-primary)">
                  {{ review.relativeTime || 'Auf Google lesen →' }}
                </p>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
type Review = {
  author: string
  text: string
  rating: number
  link: string
  relativeTime?: string
}

const props = withDefaults(
  defineProps<{
    businessType: string
    title?: string
    subtitle?: string
    limit?: number
  }>(),
  {
    title: 'Das sagen Kunden auf Google',
    subtitle: '',
    limit: 8,
  }
)

const { data, pending } = await useAsyncData(
  () => `simy-reviews-${props.businessType}-${props.limit}`,
  async () => {
    try {
      return await $fetch<{
        reviews: Review[]
        averageRating: number | null
      }>('/api/reviews', {
        query: { business_type: props.businessType, limit: props.limit },
      })
    } catch {
      return { reviews: [] as Review[], averageRating: null }
    }
  },
  {
    watch: [() => props.businessType, () => props.limit],
    default: () => ({ reviews: [], averageRating: null }),
  }
)

const reviews = computed(() => data.value?.reviews || [])
const averageRating = computed(() => data.value?.averageRating ?? null)
/** Hide entirely when empty — no skeleton flash for verticals without Simy reviews yet. */
const showSection = computed(() => !pending.value && reviews.value.length > 0)
</script>

<style scoped>
.line-clamp-5 {
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
