<template>
  <section class="vtrim">
    <header class="vtrim-head">
      <h3>Hintergrund-Video</h3>
      <p>
        Auf der Website läuft <strong>nur dieser kurze Ausschnitt</strong> — stumm, in Endlosschleife.
        Das ganze Video kommt nicht online. Zieh den Balken auf die Stelle, die du willst.
      </p>
    </header>

    <div v-if="!previewSrc" class="vtrim-empty">
      <label class="vtrim-pick">
        Video wählen
        <input
          type="file"
          accept="video/mp4,video/webm,.mp4,.webm,.mov"
          class="hidden"
          :disabled="busy"
          @change="onPickFile"
        />
      </label>
      <p>MP4 oder WebM. Du wählst danach genau {{ clipSeconds }} Sekunden.</p>
    </div>

    <template v-else>
      <div class="vtrim-stage">
        <p class="vtrim-kicker">Genau so erscheint es auf der Website</p>
        <video
          ref="previewEl"
          class="vtrim-video"
          :src="previewSrc"
          muted
          playsinline
          loop
          @loadedmetadata="onMeta"
        />
        <p class="vtrim-range-label">
          Ausschnitt {{ formatClipTime(start) }} – {{ formatClipTime(start + windowLen) }}
          <span>({{ windowLen.toFixed(1) }}s, stumm, wiederholt sich)</span>
        </p>
      </div>

      <div v-if="duration > 0.4" class="vtrim-timeline">
        <input
          v-model.number="start"
          type="range"
          min="0"
          :max="maxStart"
          :step="0.1"
          :disabled="busy"
          @input="nudgePreview"
        />
        <div class="vtrim-axis">
          <span>0:00</span>
          <span>{{ formatClipTime(duration) }}</span>
        </div>
      </div>

      <label class="vtrim-check">
        <input v-model="usePoster" type="checkbox" :disabled="busy" />
        Standbild aus diesem Moment — das lädt zuerst, das Video danach
      </label>

      <p v-if="status" class="vtrim-status">{{ status }}</p>
      <p v-if="error" class="vtrim-error">{{ error }}</p>

      <div class="vtrim-actions">
        <button type="button" class="vtrim-go" :disabled="busy" @click="commit">
          {{ busy ? 'Optimiert…' : 'Diesen Ausschnitt verwenden' }}
        </button>
        <label class="vtrim-other">
          Anderes Video
          <input type="file" accept="video/mp4,video/webm,.mp4,.webm,.mov" class="hidden" :disabled="busy" @change="onPickFile" />
        </label>
        <button v-if="form['brand.hero_video_url']" type="button" class="vtrim-remove" :disabled="busy" @click="clear">
          Entfernen
        </button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { captureVideoPoster, encodeHeroClip, formatClipTime, HERO_CLIP_SECONDS } from '~/utils/website-video-clip'

const props = defineProps<{
  form: Record<string, string | null>
}>()

const emit = defineEmits<{
  applied: []
}>()

const clipSeconds = HERO_CLIP_SECONDS
const previewEl = ref<HTMLVideoElement | null>(null)
const localUrl = ref('')
const localFile = ref<File | null>(null)
const duration = ref(0)
const start = ref(0)
const usePoster = ref(true)
const busy = ref(false)
const status = ref('')
const error = ref('')
let loopTimer: number | null = null

const previewSrc = computed(() => localUrl.value || String(props.form['brand.hero_video_url'] || ''))
const windowLen = computed(() => Math.min(clipSeconds, duration.value || clipSeconds))
const maxStart = computed(() => Math.max(0, (duration.value || 0) - windowLen.value))

function revokeLocal() {
  if (localUrl.value.startsWith('blob:')) URL.revokeObjectURL(localUrl.value)
  localUrl.value = ''
  localFile.value = null
}

function onPickFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  revokeLocal()
  localFile.value = file
  localUrl.value = URL.createObjectURL(file)
  start.value = 0
  duration.value = 0
  error.value = ''
  status.value = ''
  usePoster.value = !props.form['brand.hero_image_url']
  input.value = ''
}

function onMeta() {
  const el = previewEl.value
  if (!el) return
  duration.value = Number.isFinite(el.duration) ? el.duration : 0
  start.value = Math.min(start.value, maxStart.value)
  el.currentTime = start.value
  void el.play().catch(() => {})
  startLoop()
}

function startLoop() {
  stopLoop()
  const tick = () => {
    const el = previewEl.value
    if (!el) return
    const end = start.value + windowLen.value
    if (el.currentTime >= end - 0.04 || el.currentTime < start.value - 0.08) {
      el.currentTime = start.value
    }
    loopTimer = window.setTimeout(tick, 80)
  }
  tick()
}

function stopLoop() {
  if (loopTimer) {
    clearTimeout(loopTimer)
    loopTimer = null
  }
}

function nudgePreview() {
  const el = previewEl.value
  if (!el) return
  el.currentTime = start.value
}

function clear() {
  stopLoop()
  revokeLocal()
  props.form['brand.hero_video_url'] = ''
  props.form['brand.hero_video_start'] = '0'
  props.form['brand.hero_video_duration'] = ''
  status.value = 'Video entfernt — bitte speichern.'
}

async function upload(slot: 'hero' | 'hero_video', file: File) {
  const body = new FormData()
  body.append('slot', slot)
  body.append('file', file)
  return await $fetch<any>('/api/website/media/upload', { method: 'POST', body })
}

async function commit() {
  if (busy.value || !previewSrc.value) return
  busy.value = true
  error.value = ''
  try {
    const src = previewSrc.value
    const from = start.value
    const len = windowLen.value

    status.value = 'Standbild aus deinem Ausschnitt…'
    if (usePoster.value) {
      const poster = await captureVideoPoster(src, from)
      const posterFile = new File([poster], `hero-poster-${Date.now()}.webp`, { type: 'image/webp' })
      const posted = await upload('hero', posterFile)
      props.form['brand.hero_image_url'] = posted.url || posted.webp_url
    }

    status.value = 'Mache den Ausschnitt leicht fürs Web…'
    try {
      const clip = await encodeHeroClip(src, from, len, (label) => {
        status.value = label
      })
      const uploaded = await upload('hero_video', clip)
      props.form['brand.hero_video_url'] = uploaded.url
      props.form['brand.hero_video_start'] = '0'
      props.form['brand.hero_video_duration'] = String(len)
    } catch {
      if (localFile.value) {
        status.value = 'Lade Original — Ausschnitt merken wir uns…'
        const uploaded = await upload('hero_video', localFile.value)
        props.form['brand.hero_video_url'] = uploaded.url
      }
      props.form['brand.hero_video_start'] = String(from)
      props.form['brand.hero_video_duration'] = String(len)
    }

    revokeLocal()
    status.value = 'Ausschnitt bereit — bitte speichern. Genau dieser Teil läuft auf der Website.'
    emit('applied')
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Video konnte nicht übernommen werden'
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  const savedStart = Number(props.form['brand.hero_video_start'] || 0)
  if (savedStart > 0) start.value = savedStart
  if (previewSrc.value) usePoster.value = !props.form['brand.hero_image_url']
})

onUnmounted(() => {
  stopLoop()
  revokeLocal()
})
</script>

<style scoped>
.vtrim {
  margin: 0.2rem 0 0.9rem;
  padding: 0.95rem 1rem 1.05rem;
  border: 1px solid #e4ebf2;
  border-radius: 1rem;
  background: #f7f9fc;
}
.vtrim-head h3 {
  margin: 0 0 0.25rem;
  font-size: 0.92rem;
  color: #0c1222;
}
.vtrim-head p {
  margin: 0 0 0.85rem;
  font-size: 0.78rem;
  line-height: 1.4;
  color: #5b6577;
}
.vtrim-empty {
  display: grid;
  gap: 0.4rem;
}
.vtrim-empty p,
.vtrim-range-label span {
  color: #6b7a8d;
  font-size: 0.75rem;
}
.vtrim-pick,
.vtrim-go,
.vtrim-other,
.vtrim-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.7rem;
  padding: 0.5rem 0.85rem;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid #d7dbe3;
  background: #fff;
}
.vtrim-pick,
.vtrim-go {
  background: #0c1222;
  color: #fff;
  border-color: #0c1222;
}
.vtrim-go:disabled,
.vtrim-pick:has(input:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}
.vtrim-stage {
  background: #141c2b;
  color: #fff;
  border-radius: 0.9rem;
  padding: 0.7rem 0.75rem 0.8rem;
}
.vtrim-kicker {
  margin: 0 0 0.45rem;
  font-size: 0.65rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}
.vtrim-video {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 0.55rem;
  background: #0c1222;
}
.vtrim-range-label {
  margin: 0.5rem 0 0;
  font-size: 0.8rem;
  font-weight: 650;
}
.vtrim-timeline {
  margin-top: 0.75rem;
}
.vtrim-timeline input {
  width: 100%;
}
.vtrim-axis {
  display: flex;
  justify-content: space-between;
  font-size: 0.68rem;
  color: #6b7a8d;
}
.vtrim-check {
  display: flex;
  gap: 0.45rem;
  align-items: flex-start;
  margin-top: 0.75rem;
  font-size: 0.78rem;
  color: #334155;
}
.vtrim-status,
.vtrim-error {
  margin: 0.55rem 0 0;
  font-size: 0.78rem;
}
.vtrim-error {
  color: #9a3412;
}
.vtrim-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.75rem;
}
.hidden {
  display: none;
}
</style>
