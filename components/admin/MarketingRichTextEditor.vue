<template>
  <div class="rounded-xl border-2 border-indigo-200 overflow-hidden bg-white shadow-sm">
    <div class="flex items-center justify-between gap-2 px-3 py-2 bg-indigo-50 border-b border-indigo-100">
      <span class="text-xs font-semibold text-indigo-800">Hier Text bearbeiten</span>
      <button
        type="button"
        class="text-xs font-medium px-2 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100"
        @click="toggleMode"
      >{{ mode === 'html' ? '👁 Visuell' : '</> HTML' }}</button>
    </div>

    <div
      v-show="mode === 'visual'"
      class="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200"
    >
      <button type="button" class="px-2 py-1 rounded text-sm font-bold text-gray-700 hover:bg-gray-200" title="Fett" @mousedown.prevent="cmd('bold')">B</button>
      <button type="button" class="px-2 py-1 rounded text-sm italic text-gray-700 hover:bg-gray-200" title="Kursiv" @mousedown.prevent="cmd('italic')">I</button>
      <button type="button" class="px-2 py-1 rounded text-sm underline text-gray-700 hover:bg-gray-200" title="Unterstrichen" @mousedown.prevent="cmd('underline')">U</button>
      <span class="w-px h-5 bg-gray-200 mx-1" />
      <button type="button" class="px-2 py-1 rounded text-xs font-bold text-gray-700 hover:bg-gray-200" title="Überschrift" @mousedown.prevent="cmd('formatBlock', 'h2')">H2</button>
      <button type="button" class="px-2 py-1 rounded text-xs text-gray-700 hover:bg-gray-200" title="Absatz" @mousedown.prevent="cmd('formatBlock', 'p')">Absatz</button>
      <button type="button" class="px-2 py-1 rounded text-xs text-gray-700 hover:bg-gray-200" title="Aufzählung" @mousedown.prevent="cmd('insertUnorderedList')">Liste</button>
      <span class="w-px h-5 bg-gray-200 mx-1" />
      <button type="button" class="px-2 py-1 rounded text-xs text-gray-700 hover:bg-gray-200" title="Link" @mousedown.prevent="insertLink">Link</button>
      <button type="button" class="px-2 py-1 rounded text-xs text-gray-700 hover:bg-gray-200" title="CTA-Button" @mousedown.prevent="insertCta">Button</button>
    </div>

    <div
      v-show="mode === 'visual'"
      ref="editorRef"
      contenteditable="true"
      class="editor-surface min-h-[280px] max-h-[480px] overflow-y-auto px-4 py-3 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-300"
      @input="onInput"
      @blur="onInput"
    />

    <textarea
      v-show="mode === 'html'"
      v-model="htmlDraft"
      rows="14"
      class="w-full min-h-[280px] px-4 py-3 text-sm font-mono text-gray-800 border-0 focus:outline-none resize-y"
      @change="commitHtml"
      @blur="commitHtml"
    />

    <p class="px-3 py-1.5 text-[11px] text-gray-500 bg-gray-50 border-t border-gray-100">
      Tipp: Text markieren → Fett/Kursiv. Platzhalter wie <code v-pre>{{first_name}}</code> nicht löschen.
    </p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  primaryColor?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorRef = ref<HTMLElement | null>(null)
const mode = ref<'visual' | 'html'>('visual')
const htmlDraft = ref(props.modelValue || '')
let syncing = false

function setEditorHtml(html: string) {
  if (!editorRef.value) return
  if (editorRef.value.innerHTML === html) return
  syncing = true
  editorRef.value.innerHTML = html
  syncing = false
}

watch(
  () => props.modelValue,
  (v) => {
    const next = v || ''
    htmlDraft.value = next
    if (mode.value === 'visual') {
      nextTick(() => setEditorHtml(next))
    }
  },
  { immediate: true },
)

onMounted(() => {
  nextTick(() => setEditorHtml(props.modelValue || ''))
})

function onInput() {
  if (syncing || !editorRef.value) return
  const html = editorRef.value.innerHTML
  htmlDraft.value = html
  emit('update:modelValue', html)
}

function commitHtml() {
  emit('update:modelValue', htmlDraft.value)
  nextTick(() => setEditorHtml(htmlDraft.value))
}

function toggleMode() {
  if (mode.value === 'visual') {
    htmlDraft.value = editorRef.value?.innerHTML || props.modelValue || ''
    mode.value = 'html'
  } else {
    commitHtml()
    mode.value = 'visual'
    nextTick(() => setEditorHtml(htmlDraft.value))
  }
}

function cmd(command: string, value?: string) {
  editorRef.value?.focus()
  document.execCommand(command, false, value)
  onInput()
}

function insertLink() {
  const url = window.prompt('Link-URL (oder Platzhalter wie {{cta_url}}):', '{{cta_url}}')
  if (!url) return
  cmd('createLink', url)
}

function insertCta() {
  const label = window.prompt('Button-Text:', 'Jetzt starten') || 'Jetzt starten'
  const color = props.primaryColor || '#1e293b'
  const html = `<p style="margin:24px 0"><a href="{{cta_url}}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">${label}</a></p>`
  editorRef.value?.focus()
  document.execCommand('insertHTML', false, html)
  onInput()
}
</script>

<style scoped>
.editor-surface :deep(h2) {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
  margin: 1rem 0 0.5rem;
}
.editor-surface :deep(p) {
  margin: 0 0 0.75rem;
}
.editor-surface :deep(ul) {
  list-style: disc;
  padding-left: 1.25rem;
  margin: 0 0 0.75rem;
}
.editor-surface :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}
.editor-surface :deep(table) {
  width: 100%;
  margin: 0.5rem 0 1rem;
}
</style>
