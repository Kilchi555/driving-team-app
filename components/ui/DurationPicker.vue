<template>
  <div class="relative" ref="rootEl">
    <!-- Trigger -->
    <button
      type="button"
      @click="open = !open"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[86px] justify-between"
      :class="open ? 'border-blue-400 bg-blue-50 text-blue-700 ring-2 ring-blue-200' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'"
    >
      <span>{{ modelValue }} Min.</span>
      <svg class="w-3.5 h-3.5 transition-transform" :class="open ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
      </svg>
    </button>

    <!-- Drum-roll popover -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-150 ease-out"
        enter-from-class="opacity-0 scale-95 translate-y-1"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition-all duration-100 ease-in"
        leave-from-class="opacity-100 scale-100 translate-y-0"
        leave-to-class="opacity-0 scale-95 translate-y-1"
      >
        <div v-if="open" :style="popoverStyle"
          class="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
          style="width: 200px"
          @click.stop>

          <!-- Header -->
          <div class="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
            <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Dauer</span>
            <button @click="open = false" class="w-6 h-6 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Manual input -->
          <div class="px-3 pt-3 pb-1">
            <div class="relative">
              <input
                ref="manualInput"
                v-model.number="manualVal"
                type="number" min="1" max="480" step="1"
                class="w-full px-3 py-2 pr-12 rounded-xl border border-gray-200 text-sm text-center font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                @keydown.enter.prevent="applyManual"
                @blur="applyManual"
              />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">Min.</span>
            </div>
            <p class="text-center text-[10px] text-gray-400 mt-1 mb-2">Direkt eingeben oder Rad scrollen</p>
          </div>

          <!-- Drum roll -->
          <div class="relative mx-3 mb-3">
            <!-- Highlight band -->
            <div class="absolute inset-x-0 pointer-events-none z-10 rounded-xl"
              style="top: calc(50% - 20px); height: 40px; background: rgba(37,99,235,0.08); border: 1.5px solid rgba(37,99,235,0.18)"></div>
            <!-- Fade top -->
            <div class="absolute top-0 inset-x-0 h-10 z-10 pointer-events-none rounded-t-xl"
              style="background: linear-gradient(to bottom, white 0%, transparent 100%)"></div>
            <!-- Fade bottom -->
            <div class="absolute bottom-0 inset-x-0 h-10 z-10 pointer-events-none rounded-b-xl"
              style="background: linear-gradient(to top, white 0%, transparent 100%)"></div>

            <div
              ref="drumEl"
              class="overflow-y-scroll rounded-xl bg-gray-50/60"
              style="height: 160px; scroll-snap-type: y mandatory; scrollbar-width: none; -ms-overflow-style: none;"
              @scroll.passive="onDrumScroll"
            >
              <!-- Padding top/bottom so first/last item can be centered -->
              <div style="height: 60px; flex-shrink: 0;"></div>
              <div
                v-for="val in drumValues"
                :key="val"
                class="flex items-center justify-center text-sm font-semibold cursor-pointer transition-colors select-none"
                style="height: 40px; scroll-snap-align: center;"
                :class="val === modelValue ? 'text-blue-700' : 'text-gray-400 hover:text-gray-700'"
                @click="selectVal(val)"
              >
                {{ val }} Min.
              </div>
              <div style="height: 60px; flex-shrink: 0;"></div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Backdrop -->
    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-[9998]" @click="open = false"></div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps<{ modelValue: number }>()
const emit = defineEmits<{ 'update:modelValue': [val: number] }>()

const open = ref(false)
const rootEl = ref<HTMLElement>()
const drumEl = ref<HTMLElement>()
const manualInput = ref<HTMLInputElement>()
const manualVal = ref(props.modelValue)
const popoverStyle = ref<Record<string, string>>({})

// Generate all minute options: 5-min steps from 5 to 300
const drumValues = computed(() => {
  const vals: number[] = []
  for (let i = 5; i <= 300; i += 5) vals.push(i)
  return vals
})

function updatePopoverPosition() {
  if (!rootEl.value) return
  const rect = rootEl.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const above = spaceBelow < 280

  popoverStyle.value = {
    left: `${Math.min(rect.left, window.innerWidth - 210)}px`,
    ...(above
      ? { bottom: `${window.innerHeight - rect.top + 4}px` }
      : { top: `${rect.bottom + 4}px` }),
    transformOrigin: above ? 'bottom left' : 'top left',
  }
}

watch(open, async (val) => {
  if (!val) return
  updatePopoverPosition()
  manualVal.value = props.modelValue
  await nextTick()
  scrollToValue(props.modelValue, false)
})

watch(() => props.modelValue, (v) => { manualVal.value = v })

function scrollToValue(val: number, smooth = true) {
  if (!drumEl.value) return
  const idx = drumValues.value.indexOf(val)
  if (idx === -1) return
  drumEl.value.scrollTo({
    top: idx * 40,
    behavior: smooth ? 'smooth' : 'instant',
  })
}

function onDrumScroll() {
  if (!drumEl.value) return
  const idx = Math.round(drumEl.value.scrollTop / 40)
  const val = drumValues.value[Math.max(0, Math.min(idx, drumValues.value.length - 1))]
  if (val !== props.modelValue) {
    emit('update:modelValue', val)
    manualVal.value = val
  }
}

function selectVal(val: number) {
  emit('update:modelValue', val)
  manualVal.value = val
  scrollToValue(val)
  setTimeout(() => { open.value = false }, 150)
}

function applyManual() {
  let v = Math.round(manualVal.value)
  if (!v || v < 1) v = 1
  if (v > 480) v = 480
  manualVal.value = v
  emit('update:modelValue', v)
  // Snap drum to nearest 5-min if possible
  const snapped = drumValues.value.reduce((prev, cur) =>
    Math.abs(cur - v) < Math.abs(prev - v) ? cur : prev
  )
  scrollToValue(snapped)
}

// Reposition on scroll/resize
function onScrollOrResize() { if (open.value) updatePopoverPosition() }
onMounted(() => {
  window.addEventListener('scroll', onScrollOrResize, true)
  window.addEventListener('resize', onScrollOrResize)
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScrollOrResize, true)
  window.removeEventListener('resize', onScrollOrResize)
})
</script>

<style scoped>
div::-webkit-scrollbar { display: none; }
</style>
