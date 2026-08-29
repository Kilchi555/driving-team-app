<template>
  <div class="rounded-[1.75rem] border border-black/[0.06] bg-[#0c0a12] text-white overflow-hidden shadow-[0_28px_70px_rgba(15,10,30,0.22)]">
    <div class="flex items-center justify-between px-5 py-3 border-b border-white/10">
      <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Beispiel · Standort 8610 Uster</p>
      <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full" style="background: rgba(var(--brand-rgb),0.35); color: #E8D9FF">
        {{ radius }} Min. Radius
      </span>
    </div>

    <div class="p-5 sm:p-6">
      <p class="text-sm text-white/70 mb-4 leading-relaxed">
        Wähle eine PLZ. Simy prüft <strong class="text-white font-semibold">Fahrzeit</strong>, nicht Kilometer auf der Karte.
      </p>

      <div class="flex flex-wrap gap-2 mb-5">
        <button
          v-for="ex in examples"
          :key="ex.plz"
          type="button"
          class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
          :class="active.plz === ex.plz
            ? 'text-white border-transparent'
            : 'text-white/70 border-white/15 hover:border-white/30'"
          :style="active.plz === ex.plz ? { background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' } : {}"
          @click="active = ex"
        >
          {{ ex.plz }} {{ ex.city }}
        </button>
      </div>

      <div class="rounded-2xl bg-white/[0.06] border border-white/10 p-4 sm:p-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs text-white/45 mb-1">Treffpunkt {{ active.plz }} {{ active.city }}</p>
            <p class="text-2xl font-black tracking-tight">{{ active.min === 0 ? 'Am Standort' : `${active.min} Min. Fahrzeit` }}</p>
            <p class="text-sm mt-1" :class="active.ok ? 'text-emerald-300' : 'text-amber-200'">
              {{ active.ok ? 'Buchbar — im Radius.' : 'Nicht buchbar — ausserhalb des Radius.' }}
            </p>
          </div>
          <span
            class="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-black"
            :class="active.ok ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-200'"
          >
            {{ active.ok ? '✓' : '–' }}
          </span>
        </div>
        <p class="text-[11px] text-white/40 mt-4 leading-relaxed">
          Demo mit Beispielfahrzeiten. In Simy kommen Peak/Nebenzeit aus dem PLZ-Paar — plus Puffer zur vorherigen Stunde.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type Example = { plz: string; city: string; min: number; ok: boolean }

const radius = 15

const examples: Example[] = [
  { plz: '8610', city: 'Uster', min: 0, ok: true },
  { plz: '8600', city: 'Dübendorf', min: 12, ok: true },
  { plz: '8001', city: 'Zürich', min: 22, ok: false },
  { plz: '8640', city: 'Rapperswil', min: 28, ok: false },
]

const active = ref(examples[1])
</script>
