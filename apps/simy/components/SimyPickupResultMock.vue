<template>
  <div class="rounded-[1.35rem] border border-black/[0.07] bg-white overflow-hidden shadow-[0_20px_50px_rgba(15,10,30,0.08)]">
    <div class="px-5 py-3 border-b border-gray-100">
      <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Buchung · eigener Treffpunkt</p>
      <p class="font-bold text-gray-900 text-sm">PLZ 8001 Zürich</p>
    </div>
    <div class="p-5 space-y-3">
      <div class="rounded-xl bg-amber-50 border border-amber-100 p-3">
        <p class="text-sm font-bold text-amber-950">Keine Zeiten in diesem Radius</p>
        <p class="text-xs text-amber-800 mt-1 leading-relaxed">
          Fahrzeit vom Standort 8610: 22 Min. Dein Radius: 15 Min. Der Slot erscheint nicht.
        </p>
      </div>
      <div class="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
        <p class="text-sm font-bold text-emerald-950">8600 Dübendorf · 12 Min.</p>
        <p class="text-xs text-emerald-800 mt-1">Im Radius. Freie Zeiten werden angezeigt.</p>
      </div>
    </div>
  </div>
</template>
