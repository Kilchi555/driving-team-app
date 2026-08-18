<template>
  <div class="whm">
    <picture v-if="src">
      <source v-if="avifSrcset" type="image/avif" :srcset="avifSrcset" :sizes="sizes" />
      <source v-if="webpSrcset" type="image/webp" :srcset="webpSrcset" :sizes="sizes" />
      <img
        class="lp-hero-img"
        :src="fallbackSrc"
        :alt="alt"
        width="1600"
        height="900"
        fetchpriority="high"
        decoding="async"
      />
    </picture>
    <video
      v-if="armed"
      ref="videoEl"
      class="lp-hero-video"
      :class="{ 'is-on': playing }"
      muted
      :loop="clipLen < 0.4"
      playsinline
      preload="none"
      :poster="fallbackSrc || undefined"
      disablepictureinpicture
    />
  </div>
</template>

<script setup lang="ts">
import { HERO_SIZES, heroFallbackSrc, heroSrcset, isProxyableImageUrl } from '~/utils/website-responsive-image'

const props = defineProps<{
  src?: string | null
  videoUrl?: string | null
  alt?: string
  clipStart?: number | string | null
  clipDuration?: number | string | null
}>()

const clipFrom = computed(() => Math.max(0, Number(props.clipStart || 0) || 0))
const clipLen = computed(() => Math.max(0, Number(props.clipDuration || 0) || 0))

const sizes = HERO_SIZES
const fallbackSrc = computed(() => (props.src ? heroFallbackSrc(props.src) : ''))
const webpSrcset = computed(() => (props.src && isProxyableImageUrl(props.src) ? heroSrcset(props.src, 'webp') : ''))
const avifSrcset = computed(() => (props.src && isProxyableImageUrl(props.src) ? heroSrcset(props.src, 'avif') : ''))

const videoEl = ref<HTMLVideoElement | null>(null)
const armed = ref(false)
const playing = ref(false)
let io: IntersectionObserver | null = null
let idleId = 0

function connectionAllowsVideo() {
  if (import.meta.server) return false
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string }
  }
  if (nav.connection?.saveData) return false
  const type = nav.connection?.effectiveType || ''
  if (type === 'slow-2g' || type === '2g') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  // Atmosphere loops stay off on small screens — poster is the LCP.
  if (window.matchMedia('(max-width: 767px)').matches) return false
  return true
}

function attachWhenIdle(el: HTMLVideoElement, src: string) {
  const start = () => {
    if (el.getAttribute('src') === src) return
    el.src = src
    const from = clipFrom.value
    const len = clipLen.value
    const restart = () => {
      if (len < 0.4) return
      if (el.currentTime >= from + len - 0.05 || el.currentTime < from - 0.08) {
        el.currentTime = from
      }
    }
    el.addEventListener('timeupdate', restart)
    el.addEventListener(
      'loadedmetadata',
      () => {
        if (from > 0.05) el.currentTime = from
      },
      { once: true },
    )
    el.addEventListener(
      'playing',
      () => {
        playing.value = true
      },
      { once: true },
    )
    void el.play().catch(() => {
      playing.value = false
    })
  }
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
    .requestIdleCallback
  if (ric) {
    idleId = ric(start, { timeout: 1800 })
  } else {
    idleId = window.setTimeout(start, 400) as unknown as number
  }
}

function armVideo() {
  if (!props.videoUrl || armed.value || !connectionAllowsVideo()) return
  armed.value = true
  nextTick(() => {
    const el = videoEl.value
    if (!el || !props.videoUrl) return
    io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        io?.disconnect()
        io = null
        attachWhenIdle(el, props.videoUrl!)
      },
      { rootMargin: '80px', threshold: 0.15 },
    )
    io.observe(el)
  })
}

onMounted(armVideo)
onUnmounted(() => {
  io?.disconnect()
  if (idleId && 'cancelIdleCallback' in window) {
    ;(window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(idleId)
  } else if (idleId) {
    clearTimeout(idleId)
  }
})
</script>

<style scoped>
.whm {
  position: absolute;
  inset: 0;
}
.lp-hero-video {
  opacity: 0;
  transition: opacity 0.55s ease;
}
.lp-hero-video.is-on {
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .lp-hero-video {
    display: none;
  }
}
</style>
