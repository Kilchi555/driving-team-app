<template>
  <div class="space-y-2">

    <!-- Section accordion -->
    <div
      v-for="section in sections"
      :key="section.key"
      class="border rounded-2xl overflow-hidden"
      :class="section.teacher ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200 bg-white'"
    >
      <!-- Section header -->
      <button
        type="button"
        @click="toggle(section.key)"
        class="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span
          class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
          :class="section.teacher ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'"
        >{{ section.num }}</span>
        <span class="flex-1 text-sm font-semibold" :class="section.teacher ? 'text-indigo-800' : 'text-gray-800'">{{ section.label }}</span>
        <span
          v-if="sectionHasContent(section.key)"
          class="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"
          title="Inhalt vorhanden"
        />
        <svg
          class="w-4 h-4 flex-shrink-0 transition-transform"
          :class="[open[section.key] ? 'rotate-180' : '', section.teacher ? 'text-indigo-400' : 'text-gray-400']"
          fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      <!-- Section body -->
      <div v-if="open[section.key]" class="px-4 pb-4 space-y-4 border-t" :class="section.teacher ? 'border-indigo-100' : 'border-gray-100'">

        <!-- 1. Thema -->
        <template v-if="section.key === 'thema'">
          <GuideTextarea v-model="form.thema!.definition" label="Kurze Definition des Themas" :rows="3"/>
        </template>

        <!-- 2. Warum wichtig -->
        <template v-else-if="section.key === 'warum_wichtig'">
          <GuideTextarea v-model="form.warum_wichtig!.praxisbezug" label="Praxisbezug"/>
          <GuideTextarea v-model="form.warum_wichtig!.sicherheitsrelevanz" label="Sicherheitsrelevanz"/>
          <GuideTextarea v-model="form.warum_wichtig!.verkehrssituationen" label="Typische Verkehrssituationen"/>
          <GuideTextarea v-model="form.warum_wichtig!.pruefungsrelevanz" label="Prüfungsrelevanz"/>
        </template>

        <!-- 3. Lernziele -->
        <template v-else-if="section.key === 'lernziele'">
          <GuideList v-model="form.lernziele!.wissen" label="Wissen — Der Fahrschüler weiß..." placeholder="z.B. Die gesetzliche Regelung zu ..."/>
          <GuideList v-model="form.lernziele!.verstehen" label="Verstehen — Der Fahrschüler versteht..." placeholder="z.B. Warum diese Regel gilt"/>
          <GuideList v-model="form.lernziele!.anwenden" label="Anwenden — Der Fahrschüler kann..." placeholder="z.B. Das richtige Verhalten demonstrieren"/>
          <GuideList v-model="form.lernziele!.risikokompetenz" label="Risikokompetenz" placeholder="z.B. Gefahrenpotenzial einschätzen"/>
        </template>

        <!-- 4. Kerninhalt -->
        <template v-else-if="section.key === 'kerninhalt'">
          <GuideTextarea v-model="form.kerninhalt!.text" label="Kompakte Erklärung" :rows="4"/>
          <GuideList v-model="form.kerninhalt!.definitionen" label="Definitionen" placeholder="Begriff: Erklärung"/>
          <GuideList v-model="form.kerninhalt!.regeln" label="Regeln" placeholder="z.B. Rechts vor Links gilt..."/>
          <GuideList v-model="form.kerninhalt!.merksaetze" label="Merksätze" placeholder="z.B. SIPPO — Spiegel, ..."/>
          <GuideList v-model="form.kerninhalt!.ausnahmen" label="Ausnahmen" placeholder="z.B. Ausnahme bei Einsatzfahrzeugen"/>
        </template>

        <!-- 5. Häufige Fehler -->
        <template v-else-if="section.key === 'haeufige_fehler'">
          <GuideList v-model="form.haeufige_fehler!" label="Häufige Fehler der Fahrschüler" placeholder="z.B. Blinker erst nach dem Lenken"/>
        </template>

        <!-- 6. Praxisbezug -->
        <template v-else-if="section.key === 'praxisbeispiele'">
          <div v-for="(ex, i) in form.praxisbeispiele" :key="i" class="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-gray-600">Beispiel {{ i + 1 }}</span>
              <button type="button" @click="form.praxisbeispiele!.splice(i, 1)" class="text-xs text-red-400 hover:text-red-600">Entfernen</button>
            </div>
            <GuideInput v-model="ex.situation" label="Situation"/>
            <GuideInput v-model="ex.richtiges_verhalten" label="Richtiges Verhalten"/>
            <GuideInput v-model="ex.warum" label="Warum?"/>
          </div>
          <button type="button" @click="form.praxisbeispiele!.push({ situation: '', richtiges_verhalten: '', warum: '' })" class="text-xs text-blue-600 hover:text-blue-800 font-semibold">+ Beispiel hinzufügen</button>
        </template>

        <!-- 7. Visualisierung -->
        <template v-else-if="section.key === 'visualisierung'">
          <GuideList v-model="form.visualisierung!.vorschlaege" label="Vorschläge (Bilder, Skizzen, Grafiken...)" placeholder="z.B. Magnettafel-Kreuzungssituation"/>
          <!-- Video links -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-xs font-semibold text-gray-700">Video-Links</label>
              <button type="button" @click="form.visualisierung!.video_links!.push('')" class="text-xs text-purple-600 hover:text-purple-800 font-semibold">+ Link</button>
            </div>
            <div v-for="(_, vi) in form.visualisierung!.video_links" :key="vi" class="flex gap-2 mb-1.5">
              <input v-model="form.visualisierung!.video_links![vi]" type="url" placeholder="https://youtube.com/..." class="flex-1 border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-purple-400 focus:outline-none"/>
              <button type="button" @click="form.visualisierung!.video_links!.splice(vi, 1)" class="text-red-400 hover:text-red-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          <!-- Image upload -->
          <GuideImageUpload
            :images="form.visualisierung!.images!"
            :previews="imagePreviews.get('vis') || []"
            :uploading="uploadingKey === 'vis'"
            @add-files="files => addFiles('vis', files)"
            @remove-existing="i => form.visualisierung!.images!.splice(i, 1)"
            @remove-preview="i => removePreview('vis', i)"
          />
        </template>

        <!-- 8. System / Vorgehensweise -->
        <template v-else-if="section.key === 'system'">
          <GuideTextarea v-model="form.system!.text" label="Beschreibung / Beispiel" :rows="3"/>
          <GuideList v-model="form.system!.schritte" label="Schritt-für-Schritt-Ablauf" placeholder="z.B. 1. Beobachten"/>
        </template>

        <!-- 9. Risikodialog -->
        <template v-else-if="section.key === 'risikodialog'">
          <GuideTextarea v-model="form.risikodialog!.was_schiefgehen" label="Was könnte hier schiefgehen?"/>
          <GuideTextarea v-model="form.risikodialog!.wer_gefaehrdet" label="Wer wird gefährdet?"/>
          <GuideTextarea v-model="form.risikodialog!.warum_fehler" label="Warum passieren hier häufig Fehler?"/>
          <GuideTextarea v-model="form.risikodialog!.risiko_reduzieren" label="Wie kann ich das Risiko reduzieren?"/>
        </template>

        <!-- 10. Prüfungsrelevanz -->
        <template v-else-if="section.key === 'pruefungsrelevanz'">
          <GuideList v-model="form.pruefungsrelevanz!" label="Worauf achten Prüfungsexperten besonders?" placeholder="z.B. Korrektes Einordnen vor Kreuzung"/>
        </template>

        <!-- 11. Kontrollfragen -->
        <template v-else-if="section.key === 'kontrollfragen'">
          <GuideList v-model="form.kontrollfragen!.wissensfragen" label="Wissensfragen" placeholder="z.B. Was bedeutet...?"/>
          <GuideList v-model="form.kontrollfragen!.verstaendnisfragen" label="Verständnisfragen" placeholder="z.B. Warum ist es wichtig, dass...?"/>
          <GuideList v-model="form.kontrollfragen!.reflexionsfragen" label="Reflexionsfragen" placeholder="z.B. Wie hättest du in dieser Situation reagiert?"/>
        </template>

        <!-- 12. Zusammenfassung -->
        <template v-else-if="section.key === 'zusammenfassung'">
          <p class="text-xs text-gray-500">Maximal 5 Stichpunkte.</p>
          <GuideList v-model="form.zusammenfassung!" label="" placeholder="Stichpunkt..." :max="5"/>
        </template>

        <!-- 13. Hausaufgabe -->
        <template v-else-if="section.key === 'hausaufgabe'">
          <GuideTextarea v-model="form.hausaufgabe" label="Was kann der Fahrschüler bis zur nächsten Fahrlektion üben oder beobachten?" :rows="4"/>
        </template>

        <!-- Tipps Fahrlehrer -->
        <template v-else-if="section.key === 'tipps_fahrlehrer'">
          <GuideList v-model="form.tipps_fahrlehrer!.unterrichtstipps" label="Unterrichtstipps" placeholder="Tipp für die Lektion..."/>
          <GuideList v-model="form.tipps_fahrlehrer!.typische_schuelermeinungen" label="Typische Schüleraussagen" placeholder="z.B. «Das hab ich doch schon gewusst!»"/>
          <GuideList v-model="form.tipps_fahrlehrer!.geeignete_fragen" label="Geeignete Fragen" placeholder="z.B. Was fällt dir an dieser Situation auf?"/>
          <GuideList v-model="form.tipps_fahrlehrer!.korrekturansaetze" label="Korrekturansätze" placeholder="z.B. Lass uns gemeinsam wiederholen..."/>
          <GuideTextarea v-model="form.tipps_fahrlehrer!.pruefungsbezug" label="Prüfungsbezug" :rows="3"/>
          <!-- Video links -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-xs font-semibold text-gray-700">Video-Links</label>
              <button type="button" @click="form.tipps_fahrlehrer!.video_links!.push('')" class="text-xs text-purple-600 hover:text-purple-800 font-semibold">+ Link</button>
            </div>
            <div v-for="(_, vi) in form.tipps_fahrlehrer!.video_links" :key="vi" class="flex gap-2 mb-1.5">
              <input v-model="form.tipps_fahrlehrer!.video_links![vi]" type="url" placeholder="https://youtube.com/..." class="flex-1 border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-purple-400 focus:outline-none"/>
              <button type="button" @click="form.tipps_fahrlehrer!.video_links!.splice(vi, 1)" class="text-red-400 hover:text-red-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          <GuideImageUpload
            :images="form.tipps_fahrlehrer!.images!"
            :previews="imagePreviews.get('tips') || []"
            :uploading="uploadingKey === 'tips'"
            @add-files="files => addFiles('tips', files)"
            @remove-existing="i => form.tipps_fahrlehrer!.images!.splice(i, 1)"
            @remove-preview="i => removePreview('tips', i)"
          />
        </template>

      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import type { StaffContent } from '~/types/staff-content'

// Sub-components defined inline via defineComponent below the script
// We use simple helper components within the same file

const props = defineProps<{
  modelValue: StaffContent
  /** Called with the image upload key and files to trigger actual upload in the parent */
  uploadingKey?: string | null
  /** Map of upload key → preview URLs (managed by parent during upload) */
  imagePreviews?: Map<string, string[]>
}>()

const emit = defineEmits<{
  'update:modelValue': [val: StaffContent]
  'add-files': [key: string, files: File[]]
  'remove-preview': [key: string, index: number]
}>()

const form = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

// Use ref-based open state (accordion)
const open = reactive<Record<string, boolean>>({})

const toggle = (key: string) => {
  open[key] = !open[key]
}

const imagePreviews = computed(() => props.imagePreviews ?? new Map<string, string[]>())
const uploadingKey = computed(() => props.uploadingKey ?? null)

const addFiles = (key: string, files: File[]) => emit('add-files', key, files)
const removePreview = (key: string, index: number) => emit('remove-preview', key, index)

type SectionDef = { key: string; num: string; label: string; teacher?: boolean }

const sections: SectionDef[] = [
  { key: 'thema', num: '1', label: 'Thema' },
  { key: 'warum_wichtig', num: '2', label: 'Warum ist das wichtig?' },
  { key: 'lernziele', num: '3', label: 'Lernziele' },
  { key: 'kerninhalt', num: '4', label: 'Kerninhalt' },
  { key: 'haeufige_fehler', num: '5', label: 'Häufige Fehler' },
  { key: 'praxisbeispiele', num: '6', label: 'Praxisbezug' },
  { key: 'visualisierung', num: '7', label: 'Visualisierung' },
  { key: 'system', num: '8', label: 'System / Vorgehensweise' },
  { key: 'risikodialog', num: '9', label: 'Risikodialog' },
  { key: 'pruefungsrelevanz', num: '10', label: 'Prüfungsrelevanz' },
  { key: 'kontrollfragen', num: '11', label: 'Kontrollfragen' },
  { key: 'zusammenfassung', num: '12', label: 'Zusammenfassung' },
  { key: 'hausaufgabe', num: '13', label: 'Hausaufgabe / Transfer' },
  { key: 'tipps_fahrlehrer', num: '★', label: 'Tipps für den Fahrlehrer', teacher: true }
]

/** Rough check: does this section have any non-empty content? */
const sectionHasContent = (key: string): boolean => {
  const sc = form.value as any
  const val = sc[key]
  if (!val) return false
  if (typeof val === 'string') return val.trim().length > 0
  if (Array.isArray(val)) return val.filter(Boolean).length > 0
  if (typeof val === 'object') {
    return Object.values(val).some(v =>
      v && (typeof v === 'string' ? v.trim().length > 0 : Array.isArray(v) ? v.filter(Boolean).length > 0 : false)
    )
  }
  return false
}
</script>

<!-- Inline helper components -->
<script lang="ts">
import { defineComponent, h } from 'vue'

// GuideTextarea
export const GuideTextarea = defineComponent({
  name: 'GuideTextarea',
  props: { modelValue: String, label: String, rows: { type: Number, default: 2 } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('div', [
      props.label ? h('label', { class: 'block text-xs font-semibold text-gray-600 mb-1 mt-2' }, props.label) : null,
      h('textarea', {
        value: props.modelValue ?? '',
        rows: props.rows,
        onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLTextAreaElement).value),
        class: 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none resize-none'
      })
    ])
  }
})

// GuideInput
export const GuideInput = defineComponent({
  name: 'GuideInput',
  props: { modelValue: String, label: String, placeholder: String },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('div', [
      props.label ? h('label', { class: 'block text-xs font-semibold text-gray-600 mb-1' }, props.label) : null,
      h('input', {
        type: 'text',
        value: props.modelValue ?? '',
        placeholder: props.placeholder ?? '',
        onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value),
        class: 'w-full border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none'
      })
    ])
  }
})

// GuideList
export const GuideList = defineComponent({
  name: 'GuideList',
  props: {
    modelValue: Array as () => string[],
    label: String,
    placeholder: String,
    max: Number
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const add = () => {
      if (props.max && (props.modelValue?.length ?? 0) >= props.max) return
      emit('update:modelValue', [...(props.modelValue ?? []), ''])
    }
    const remove = (i: number) => {
      const arr = [...(props.modelValue ?? [])]
      arr.splice(i, 1)
      emit('update:modelValue', arr)
    }
    const update = (i: number, val: string) => {
      const arr = [...(props.modelValue ?? [])]
      arr[i] = val
      emit('update:modelValue', arr)
    }

    return () => h('div', { class: 'space-y-1.5' }, [
      h('div', { class: 'flex items-center justify-between' }, [
        props.label ? h('label', { class: 'text-xs font-semibold text-gray-600' }, props.label) : null,
        (!props.max || (props.modelValue?.length ?? 0) < props.max)
          ? h('button', { type: 'button', onClick: add, class: 'text-xs text-indigo-600 hover:text-indigo-800 font-semibold' }, '+ Hinzufügen')
          : null
      ]),
      ...(props.modelValue ?? []).map((item, i) =>
        h('div', { key: i, class: 'flex gap-2 items-center' }, [
          h('input', {
            type: 'text',
            value: item,
            placeholder: props.placeholder ?? '',
            onInput: (e: Event) => update(i, (e.target as HTMLInputElement).value),
            class: 'flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none'
          }),
          h('button', {
            type: 'button',
            onClick: () => remove(i),
            class: 'text-red-400 hover:text-red-600 flex-shrink-0'
          }, h('svg', { class: 'w-4 h-4', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', viewBox: '0 0 24 24' },
            h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M6 18L18 6M6 6l12 12' })
          ))
        ])
      ),
      (props.modelValue?.length ?? 0) === 0
        ? h('p', { class: 'text-xs text-gray-400' }, 'Noch keine Einträge')
        : null
    ])
  }
})

// GuideImageUpload
export const GuideImageUpload = defineComponent({
  name: 'GuideImageUpload',
  props: {
    images: { type: Array as () => string[], default: () => [] },
    previews: { type: Array as () => string[], default: () => [] },
    uploading: Boolean
  },
  emits: ['add-files', 'remove-existing', 'remove-preview'],
  setup(props, { emit }) {
    const handleChange = (e: Event) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? [])
      if (files.length) emit('add-files', files)
    }
    return () => h('div', { class: 'space-y-2' }, [
      h('label', { class: 'text-xs font-semibold text-gray-600' }, 'Bilder'),
      h('div', { class: 'relative border-2 border-dashed rounded-xl p-3 text-center cursor-pointer border-gray-200 hover:border-indigo-400 transition-colors' }, [
        h('input', {
          type: 'file',
          accept: 'image/*',
          multiple: true,
          onChange: handleChange,
          class: 'absolute inset-0 opacity-0 cursor-pointer w-full h-full',
          style: 'pointer-events: auto;'
        }),
        h('p', { class: 'text-xs text-gray-400 pointer-events-none' }, 'Klicken oder Bild hierher ziehen')
      ]),
      (props.images.length > 0 || props.previews.length > 0)
        ? h('div', { class: 'grid grid-cols-3 gap-2' }, [
            ...props.images.map((url, i) =>
              h('div', { key: `e${i}`, class: 'relative group' }, [
                h('img', { src: url, class: 'w-full h-20 object-cover rounded-xl border border-gray-200' }),
                h('button', {
                  type: 'button',
                  onClick: () => emit('remove-existing', i),
                  class: 'absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs'
                }, '×')
              ])
            ),
            ...props.previews.map((url, i) =>
              h('div', { key: `p${i}`, class: 'relative group' }, [
                h('img', { src: url, class: 'w-full h-20 object-cover rounded-xl border border-gray-200' }),
                props.uploading
                  ? h('div', { class: 'absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center' },
                      h('div', { class: 'animate-spin rounded-full h-5 w-5 border-b-2 border-white' })
                    )
                  : h('button', {
                      type: 'button',
                      onClick: () => emit('remove-preview', i),
                      class: 'absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs'
                    }, '×')
              ])
            )
          ])
        : null
    ])
  }
})
</script>
