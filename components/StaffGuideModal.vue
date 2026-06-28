<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[300] bg-black/50 flex items-end sm:items-center justify-center" @click.self="$emit('close')">
      <div class="bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92svh] sm:max-h-[85vh] overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
          <div class="flex items-center gap-2.5 min-w-0">
            <button @click="sidebarOpen = !sidebarOpen" class="sm:hidden w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 active:opacity-60">
              <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <div class="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25"/>
              </svg>
            </div>
            <div class="min-w-0">
              <h2 class="font-bold text-gray-900 text-sm leading-tight">{{ isEditing ? 'Guide bearbeiten' : 'Unterrichtsguide' }}</h2>
              <p v-if="activeCriterion" class="text-xs text-gray-400 truncate">{{ activeCriterion.name }}</p>
            </div>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <!-- Pencil icon — view mode only -->
            <button
              v-if="activeCriterion && canEditResolved && !isEditing"
              @click="enterEditMode"
              title="Guide bearbeiten"
              class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors active:opacity-60"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
            </button>
            <button @click="$emit('close')" class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:opacity-60 flex-shrink-0">
              <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="flex-1 flex items-center justify-center py-12">
          <div class="animate-spin w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
        </div>

        <div v-else class="flex flex-1 overflow-hidden relative">

          <!-- Mobile Sidebar -->
          <Transition name="slide-sidebar">
            <div v-if="sidebarOpen" class="absolute inset-0 z-20 flex sm:hidden" @click.self="sidebarOpen = false">
              <div class="w-64 bg-white h-full flex flex-col shadow-xl overflow-hidden">
                <div class="px-2 pt-3 pb-1.5 flex gap-1 overflow-x-auto scrollbar-none flex-shrink-0">
                  <button v-for="d in ['', ...drivingCats]" :key="d" @click="activeDrivingCat = d" :class="['flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors', activeDrivingCat === d ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200']">{{ d || 'Alle' }}</button>
                </div>
                <div class="px-2 pb-2 flex-shrink-0">
                  <input v-model="search" type="text" placeholder="Suchen..." class="w-full text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 outline-none focus:ring-1 focus:ring-indigo-400"/>
                </div>
                <div class="flex-1 overflow-y-auto">
                  <template v-for="cat in filteredGrouped" :key="cat.id">
                    <div class="px-3 pt-2.5 pb-1"><p class="text-[10px] font-bold uppercase tracking-wider text-gray-400">{{ cat.name }}</p></div>
                    <button v-for="c in cat.criteria" :key="c.id" @click="selectCriterion(c)" :class="['w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2', activeCriterion?.id === c.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-50']">
                      <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :class="c.staff_content ? 'bg-indigo-400' : 'bg-gray-200'"/>
                      <span class="truncate">{{ c.name }}</span>
                    </button>
                  </template>
                  <p v-if="filteredGrouped.length === 0" class="text-xs text-gray-400 text-center py-6">Keine Treffer</p>
                </div>
              </div>
              <div class="flex-1" @click="sidebarOpen = false"/>
            </div>
          </Transition>

          <!-- Desktop Sidebar -->
          <div class="hidden sm:flex w-56 border-r border-gray-100 flex-col flex-shrink-0 overflow-hidden">
            <div class="px-2 pt-3 pb-1.5 flex gap-1 overflow-x-auto scrollbar-none flex-shrink-0">
              <button v-for="d in ['', ...drivingCats]" :key="d" @click="activeDrivingCat = d" :class="['flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors', activeDrivingCat === d ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200']">{{ d || 'Alle' }}</button>
            </div>
            <div class="px-2 pb-2 flex-shrink-0">
              <input v-model="search" type="text" placeholder="Suchen..." class="w-full text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 outline-none focus:ring-1 focus:ring-indigo-400"/>
            </div>
            <div class="flex-1 overflow-y-auto">
              <template v-for="cat in filteredGrouped" :key="cat.id">
                <div class="px-3 pt-2.5 pb-1"><p class="text-[10px] font-bold uppercase tracking-wider text-gray-400">{{ cat.name }}</p></div>
                <button v-for="c in cat.criteria" :key="c.id" @click="selectCriterion(c)" :class="['w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2', activeCriterion?.id === c.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-50']">
                  <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :class="c.staff_content ? 'bg-indigo-400' : 'bg-gray-200'"/>
                  <span class="truncate">{{ c.name }}</span>
                </button>
              </template>
              <p v-if="filteredGrouped.length === 0" class="text-xs text-gray-400 text-center py-6">Keine Treffer</p>
            </div>
          </div>

          <!-- Main content -->
          <div class="flex-1 overflow-y-auto">

            <!-- Empty state -->
            <div v-if="!activeCriterion" class="flex flex-col items-center justify-center h-full text-center py-10 px-5">
              <div class="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-3">
                <svg class="w-7 h-7 text-indigo-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25"/></svg>
              </div>
              <p class="text-sm font-semibold text-gray-700">Kriterium wählen</p>
              <p class="text-xs text-gray-400 mt-1 sm:hidden">Tippe oben links auf das Menü-Icon</p>
              <p class="text-xs text-gray-400 mt-1 hidden sm:block">Links ein Thema anklicken</p>
            </div>

            <!-- EDIT MODE -->
            <div v-else-if="isEditing" class="p-4">
              <!-- Title + responsive action bar -->
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div class="min-w-0">
                  <p class="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-0.5">{{ activeCriterion.category_name }}</p>
                  <div class="flex items-center gap-2">
                    <h3 class="text-base font-bold text-gray-900 truncate">{{ activeCriterion.name }}</h3>
                    <div v-if="activeCriterion.driving_categories?.length" class="relative flex-shrink-0" @mouseenter="showDrivingCatTooltip = true" @mouseleave="showDrivingCatTooltip = false" @click.stop="showDrivingCatTooltip = !showDrivingCatTooltip">
                      <button class="w-5 h-5 rounded-full bg-gray-100 text-gray-400 hover:bg-indigo-100 hover:text-indigo-500 flex items-center justify-center transition-colors text-[11px] font-bold leading-none flex-shrink-0" tabindex="-1">i</button>
                      <div v-if="showDrivingCatTooltip" class="absolute right-0 top-7 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-48">
                        <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Fahrkategorien</p>
                        <div class="flex flex-wrap gap-1">
                          <span v-for="dc in activeCriterion.driving_categories" :key="dc" class="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-semibold border border-indigo-100">{{ normalizeDrivingCat(dc) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <button @click="cancelEdit" class="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors text-center">
                    Abbrechen
                  </button>
                  <button
                    @click="saveGuide"
                    :disabled="isSaving || isUploadingImage"
                    class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    <svg v-if="isSaving || isUploadingImage" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                    {{ isUploadingImage ? 'Bilder...' : isSaving ? 'Speichern...' : 'Speichern' }}
                  </button>
                </div>
              </div>
              <StaffGuideEditorForm
                v-model="editForm"
                :uploading-key="currentUploadingSection"
                :image-previews="imagePreviews"
                @add-files="handleAddFiles"
                @remove-preview="handleRemovePreview"
              />
            </div>

            <!-- VIEW MODE -->
            <div v-else class="p-5 space-y-6">

              <!-- No content yet -->
              <div v-if="!hasContent" class="flex flex-col items-center justify-center text-center py-10">
                <div class="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                  <svg class="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
                </div>
                <p class="text-sm font-semibold text-gray-600">Noch kein Lehrguide</p>
                <p v-if="canEditResolved" class="text-xs text-gray-400 mt-1 max-w-[220px]">Klicke auf «Bearbeiten» um den Guide zu erstellen.</p>
                <p v-else class="text-xs text-gray-400 mt-1 max-w-[220px]">Dieser Guide wurde noch nicht ausgefüllt.</p>
              </div>

              <template v-else>
                <!-- Criterion title -->
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-1">{{ activeCriterion.category_name }}</p>
                  <div class="flex items-center gap-2">
                    <h3 class="text-xl font-bold text-gray-900">{{ activeCriterion.name }}</h3>
                    <div v-if="activeCriterion.driving_categories?.length" class="relative flex-shrink-0" @mouseenter="showDrivingCatTooltip = true" @mouseleave="showDrivingCatTooltip = false" @click.stop="showDrivingCatTooltip = !showDrivingCatTooltip">
                      <button class="w-5 h-5 rounded-full bg-gray-100 text-gray-400 hover:bg-indigo-100 hover:text-indigo-500 flex items-center justify-center transition-colors text-[11px] font-bold leading-none flex-shrink-0" tabindex="-1">i</button>
                      <div v-if="showDrivingCatTooltip" class="absolute right-0 top-7 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-48">
                        <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Fahrkategorien</p>
                        <div class="flex flex-wrap gap-1">
                          <span v-for="dc in activeCriterion.driving_categories" :key="dc" class="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-semibold border border-indigo-100">{{ normalizeDrivingCat(dc) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 1. Thema -->
                <ViewSection v-if="content.thema?.definition" num="1" title="Thema">
                  <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{{ content.thema.definition }}</p>
                </ViewSection>

                <!-- 2. Warum wichtig -->
                <ViewSection v-if="hasObj(content.warum_wichtig)" num="2" title="Warum ist das wichtig?">
                  <ViewPair v-if="content.warum_wichtig?.praxisbezug" label="Praxisbezug" :value="content.warum_wichtig.praxisbezug"/>
                  <ViewPair v-if="content.warum_wichtig?.sicherheitsrelevanz" label="Sicherheitsrelevanz" :value="content.warum_wichtig.sicherheitsrelevanz"/>
                  <ViewPair v-if="content.warum_wichtig?.verkehrssituationen" label="Typische Verkehrssituationen" :value="content.warum_wichtig.verkehrssituationen"/>
                  <ViewPair v-if="content.warum_wichtig?.pruefungsrelevanz" label="Prüfungsrelevanz" :value="content.warum_wichtig.pruefungsrelevanz"/>
                </ViewSection>

                <!-- 3. Lernziele -->
                <ViewSection v-if="hasObj(content.lernziele)" num="3" title="Lernziele" subtitle="Der Fahrschüler kann:">
                  <ViewList v-if="content.lernziele?.wissen?.length" label="Wissen" :items="content.lernziele.wissen" color="indigo"/>
                  <ViewList v-if="content.lernziele?.verstehen?.length" label="Verstehen" :items="content.lernziele.verstehen" color="blue"/>
                  <ViewList v-if="content.lernziele?.anwenden?.length" label="Anwenden" :items="content.lernziele.anwenden" color="teal"/>
                  <ViewList v-if="content.lernziele?.risikokompetenz?.length" label="Risikokompetenz" :items="content.lernziele.risikokompetenz" color="orange"/>
                </ViewSection>

                <!-- 4. Kerninhalt -->
                <ViewSection v-if="hasObj(content.kerninhalt)" num="4" title="Kerninhalt">
                  <p v-if="content.kerninhalt?.text" class="text-sm text-gray-700 leading-relaxed whitespace-pre-line mb-3">{{ content.kerninhalt.text }}</p>
                  <ViewList v-if="content.kerninhalt?.definitionen?.length" label="Definitionen" :items="content.kerninhalt.definitionen" color="gray"/>
                  <ViewList v-if="content.kerninhalt?.regeln?.length" label="Regeln" :items="content.kerninhalt.regeln" color="gray"/>
                  <ViewList v-if="content.kerninhalt?.merksaetze?.length" label="Merksätze" :items="content.kerninhalt.merksaetze" color="indigo" badge/>
                  <ViewList v-if="content.kerninhalt?.ausnahmen?.length" label="Ausnahmen" :items="content.kerninhalt.ausnahmen" color="amber"/>
                </ViewSection>

                <!-- 5. Häufige Fehler -->
                <ViewSection v-if="content.haeufige_fehler?.length" num="5" title="Häufige Fehler" bg="amber">
                  <ul class="space-y-1.5">
                    <li v-for="(f, i) in content.haeufige_fehler" :key="i" class="flex items-start gap-2 text-sm text-amber-900">
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-2"/>
                      {{ f }}
                    </li>
                  </ul>
                </ViewSection>

                <!-- 6. Praxisbezug -->
                <ViewSection v-if="content.praxisbeispiele?.length" num="6" title="Praxisbezug">
                  <div v-for="(ex, i) in content.praxisbeispiele" :key="i" class="bg-gray-50 rounded-xl p-3 space-y-1.5 mb-3">
                    <p v-if="ex.situation" class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Situation</p>
                    <p v-if="ex.situation" class="text-sm text-gray-800">{{ ex.situation }}</p>
                    <p v-if="ex.richtiges_verhalten" class="text-xs font-semibold text-emerald-600 uppercase tracking-wide mt-2">Richtiges Verhalten</p>
                    <p v-if="ex.richtiges_verhalten" class="text-sm text-gray-800">{{ ex.richtiges_verhalten }}</p>
                    <p v-if="ex.warum" class="text-xs font-semibold text-blue-600 uppercase tracking-wide mt-2">Warum?</p>
                    <p v-if="ex.warum" class="text-sm text-gray-700">{{ ex.warum }}</p>
                  </div>
                </ViewSection>

                <!-- 7. Visualisierung -->
                <ViewSection v-if="hasObj(content.visualisierung)" num="7" title="Visualisierung">
                  <ViewList v-if="content.visualisierung?.vorschlaege?.length" label="Vorschläge" :items="content.visualisierung.vorschlaege" color="purple"/>
                  <ViewLinks v-if="content.visualisierung?.video_links?.length" :links="content.visualisierung.video_links"/>
                  <div v-if="content.visualisierung?.images?.length" class="grid grid-cols-2 gap-2 mt-2">
                    <img v-for="(img, i) in content.visualisierung.images" :key="i" :src="img" class="w-full rounded-xl border object-contain max-h-48"/>
                  </div>
                </ViewSection>

                <!-- 8. System / Vorgehensweise -->
                <ViewSection v-if="hasObj(content.system)" num="8" title="System / Vorgehensweise">
                  <p v-if="content.system?.text" class="text-sm text-gray-700 leading-relaxed whitespace-pre-line mb-3">{{ content.system.text }}</p>
                  <ol v-if="content.system?.schritte?.length" class="space-y-1.5">
                    <li v-for="(s, i) in content.system.schritte" :key="i" class="flex items-start gap-2.5 text-sm text-gray-800">
                      <span class="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold mt-0.5">{{ i + 1 }}</span>
                      {{ s }}
                    </li>
                  </ol>
                </ViewSection>

                <!-- 9. Risikodialog -->
                <ViewSection v-if="hasObj(content.risikodialog)" num="9" title="Risikodialog" bg="red">
                  <ViewPair v-if="content.risikodialog?.was_schiefgehen" label="Was könnte hier schiefgehen?" :value="content.risikodialog.was_schiefgehen"/>
                  <ViewPair v-if="content.risikodialog?.wer_gefaehrdet" label="Wer wird gefährdet?" :value="content.risikodialog.wer_gefaehrdet"/>
                  <ViewPair v-if="content.risikodialog?.warum_fehler" label="Warum passieren hier häufig Fehler?" :value="content.risikodialog.warum_fehler"/>
                  <ViewPair v-if="content.risikodialog?.risiko_reduzieren" label="Wie kann ich das Risiko reduzieren?" :value="content.risikodialog.risiko_reduzieren"/>
                </ViewSection>

                <!-- 10. Prüfungsrelevanz -->
                <ViewSection v-if="content.pruefungsrelevanz?.length" num="10" title="Prüfungsrelevanz">
                  <ul class="space-y-1.5">
                    <li v-for="(p, i) in content.pruefungsrelevanz" :key="i" class="flex items-start gap-2 text-sm text-gray-800">
                      <svg class="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      {{ p }}
                    </li>
                  </ul>
                </ViewSection>

                <!-- 11. Kontrollfragen -->
                <ViewSection v-if="hasObj(content.kontrollfragen)" num="11" title="Kontrollfragen">
                  <ViewList v-if="content.kontrollfragen?.wissensfragen?.length" label="Wissensfragen" :items="content.kontrollfragen.wissensfragen" color="gray"/>
                  <ViewList v-if="content.kontrollfragen?.verstaendnisfragen?.length" label="Verständnisfragen" :items="content.kontrollfragen.verstaendnisfragen" color="blue"/>
                  <ViewList v-if="content.kontrollfragen?.reflexionsfragen?.length" label="Reflexionsfragen" :items="content.kontrollfragen.reflexionsfragen" color="indigo"/>
                </ViewSection>

                <!-- 12. Zusammenfassung -->
                <ViewSection v-if="content.zusammenfassung?.length" num="12" title="Zusammenfassung" bg="indigo">
                  <ul class="space-y-1.5">
                    <li v-for="(z, i) in content.zusammenfassung" :key="i" class="flex items-start gap-2 text-sm text-indigo-900">
                      <span class="w-5 h-5 bg-white rounded-full text-indigo-600 flex items-center justify-center flex-shrink-0 text-[10px] font-bold shadow-sm mt-0.5">{{ i + 1 }}</span>
                      {{ z }}
                    </li>
                  </ul>
                </ViewSection>

                <!-- 13. Hausaufgabe -->
                <ViewSection v-if="content.hausaufgabe" num="13" title="Hausaufgabe / Transfer">
                  <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{{ content.hausaufgabe }}</p>
                </ViewSection>

                <!-- Tipps für den Fahrlehrer -->
                <ViewSection v-if="hasObj(content.tipps_fahrlehrer)" num="★" title="Tipps für den Fahrlehrer" teacher>
                  <ViewList v-if="content.tipps_fahrlehrer?.unterrichtstipps?.length" label="Unterrichtstipps" :items="content.tipps_fahrlehrer.unterrichtstipps" color="indigo"/>
                  <ViewList v-if="content.tipps_fahrlehrer?.typische_schuelermeinungen?.length" label="Typische Schüleraussagen" :items="content.tipps_fahrlehrer.typische_schuelermeinungen" color="gray"/>
                  <ViewList v-if="content.tipps_fahrlehrer?.geeignete_fragen?.length" label="Geeignete Fragen" :items="content.tipps_fahrlehrer.geeignete_fragen" color="teal"/>
                  <ViewList v-if="content.tipps_fahrlehrer?.korrekturansaetze?.length" label="Korrekturansätze" :items="content.tipps_fahrlehrer.korrekturansaetze" color="orange"/>
                  <ViewPair v-if="content.tipps_fahrlehrer?.pruefungsbezug" label="Prüfungsbezug" :value="content.tipps_fahrlehrer.pruefungsbezug"/>
                  <ViewLinks v-if="content.tipps_fahrlehrer?.video_links?.length" :links="content.tipps_fahrlehrer.video_links"/>
                  <div v-if="content.tipps_fahrlehrer?.images?.length" class="grid grid-cols-2 gap-2 mt-2">
                    <img v-for="(img, i) in content.tipps_fahrlehrer.images" :key="i" :src="img" class="w-full rounded-xl border object-contain max-h-48"/>
                  </div>
                </ViewSection>

              </template>
            </div>
          </div>
        </div>

        <!-- Footer (view mode only) -->
        <div v-if="!isEditing" class="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 flex-shrink-0 bg-gray-50">
          <button @click="navigatePrev" :disabled="currentFlatIndex <= 0" class="flex items-center gap-1 text-xs font-medium text-gray-500 disabled:opacity-30 active:opacity-60 px-2 py-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            Vorheriges
          </button>
          <span class="text-xs text-gray-400">{{ currentFlatIndex + 1 }} / {{ flatCriteria.length }}</span>
          <button @click="navigateNext" :disabled="currentFlatIndex >= flatCriteria.length - 1" class="flex items-center gap-1 text-xs font-medium text-gray-500 disabled:opacity-30 active:opacity-60 px-2 py-1.5">
            Nächstes
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'
import { parseStaffContent, serializeStaffContent, emptyStaffContent } from '~/types/staff-content'
import type { StaffContent } from '~/types/staff-content'
import StaffGuideEditorForm from '~/components/StaffGuideEditorForm.vue'

// View sub-components
import ViewSection from '~/components/guide/ViewSection.vue'
import ViewPair from '~/components/guide/ViewPair.vue'
import ViewList from '~/components/guide/ViewList.vue'
import ViewLinks from '~/components/guide/ViewLinks.vue'

const props = defineProps<{
  initialCriterionId?: string | null
  canEdit?: boolean
}>()

defineEmits<{ close: [] }>()

const supabase = getSupabase()
const authStore = useAuthStore()

const isLoading = ref(true)
const search = ref('')
const activeDrivingCat = ref('')
const sidebarOpen = ref(false)
const allCriteria = ref<any[]>([])
const categories = ref<any[]>([])
const canEditResolved = ref(false)
const activeCriterion = ref<any>(null)

const showDrivingCatTooltip = ref(false)

// Edit mode
const isEditing = ref(false)
const isSaving = ref(false)
const isUploadingImage = ref(false)
const currentUploadingSection = ref<string | null>(null)
const imagePreviews = ref<Map<string, string[]>>(new Map())
const pendingFiles = ref<Map<string, File[]>>(new Map())
const editForm = ref<StaffContent>(emptyStaffContent())

const content = computed<StaffContent>(() => {
  if (!activeCriterion.value?.staff_content) return {}
  return parseStaffContent(activeCriterion.value.staff_content)
})

const hasContent = computed(() => {
  if (!activeCriterion.value?.staff_content) return false
  const sc = activeCriterion.value.staff_content
  const parsed = typeof sc === 'string' ? JSON.parse(sc) : sc
  return parsed && Object.keys(parsed).length > 0
})

const hasObj = (val: any) => val && typeof val === 'object' && Object.values(val).some(v =>
  v && (typeof v === 'string' ? v.trim().length > 0 : Array.isArray(v) ? v.filter(Boolean).length > 0 : false)
)

const DRIVING_CAT_ORDER = ['A', 'A1', 'A35kW', 'B', 'B Automatik', 'B Schaltung', 'BE', 'BPT', 'Boot', 'C', 'C1', 'CE', 'C1D1', 'C1/D1', 'D', 'D1', 'Motorboot']

// Normalize inconsistent DB values
const normalizeDrivingCat = (cat: string) => cat === 'C1D1' ? 'C1/D1' : cat

const drivingCats = computed(() => {
  const set = new Set<string>()
  for (const c of allCriteria.value) {
    for (const cat of (c.driving_categories || [])) set.add(normalizeDrivingCat(cat))
  }
  return Array.from(set).sort((a, b) => {
    const ai = DRIVING_CAT_ORDER.indexOf(a)
    const bi = DRIVING_CAT_ORDER.indexOf(b)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.localeCompare(b)
  })
})

const grouped = computed(() =>
  categories.value
    .map(cat => ({
      ...cat,
      criteria: allCriteria.value.filter(c =>
        c.category_id === cat.id &&
        (!activeDrivingCat.value || (c.driving_categories || []).map(normalizeDrivingCat).includes(activeDrivingCat.value))
      )
    }))
    .filter(cat => cat.criteria.length > 0)
)

const filteredGrouped = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return grouped.value
  return grouped.value
    .map(cat => ({ ...cat, criteria: cat.criteria.filter((c: any) => c.name.toLowerCase().includes(q)) }))
    .filter(cat => cat.criteria.length > 0)
})

const flatCriteria = computed(() => filteredGrouped.value.flatMap(cat => cat.criteria))
const currentFlatIndex = computed(() =>
  activeCriterion.value ? flatCriteria.value.findIndex(c => c.id === activeCriterion.value?.id) : -1
)

const enterEditMode = () => {
  editForm.value = parseStaffContent(activeCriterion.value?.staff_content)
  imagePreviews.value.clear()
  pendingFiles.value.clear()
  isEditing.value = true
}

const cancelEdit = () => {
  isEditing.value = false
  imagePreviews.value.clear()
  pendingFiles.value.clear()
}

const handleAddFiles = (key: string, files: File[]) => {
  const prev = imagePreviews.value.get(key) || []
  const pend = pendingFiles.value.get(key) || []
  for (const f of files) { prev.push(URL.createObjectURL(f)); pend.push(f) }
  imagePreviews.value.set(key, [...prev])
  pendingFiles.value.set(key, [...pend])
}

const handleRemovePreview = (key: string, index: number) => {
  const prev = imagePreviews.value.get(key) || []
  const pend = pendingFiles.value.get(key) || []
  prev.splice(index, 1); pend.splice(index, 1)
  imagePreviews.value.set(key, [...prev])
  pendingFiles.value.set(key, [...pend])
}

const uploadImages = async (key: string, criterionId: string): Promise<string[]> => {
  const files = pendingFiles.value.get(key) || []
  const urls: string[] = []
  for (const file of files) {
    currentUploadingSection.value = key
    isUploadingImage.value = true
    const ext = file.name.split('.').pop()
    const fileName = `staff/${criterionId}/${key}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
    const reader = new FileReader()
    const fileData = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    const res = await $fetch('/api/system/secure-operations', {
      method: 'POST',
      body: { action: 'upload-evaluation-content', file: { data: fileData.split(',')[1], name: fileName, type: file.type }, fileName }
    }) as any
    if (!res?.success) throw new Error(res?.error || 'Upload failed')
    urls.push(res.data.publicUrl)
  }
  return urls
}

const saveGuide = async () => {
  if (!activeCriterion.value) return
  isSaving.value = true
  try {
    const form = editForm.value
    const criterionId = activeCriterion.value.id

    // Upload images
    const visUrls = await uploadImages('vis', criterionId)
    const tipsUrls = await uploadImages('tips', criterionId)
    if (visUrls.length) form.visualisierung!.images = [...(form.visualisierung!.images || []), ...visUrls]
    if (tipsUrls.length) form.tipps_fahrlehrer!.images = [...(form.tipps_fahrlehrer!.images || []), ...tipsUrls]

    const staffContent = serializeStaffContent(form)

    await $fetch('/api/staff/save-guide-content', {
      method: 'POST',
      body: { criterion_id: criterionId, staff_content: staffContent }
    })

    // Update local state
    const idx = allCriteria.value.findIndex(c => c.id === criterionId)
    if (idx !== -1) allCriteria.value[idx] = { ...allCriteria.value[idx], staff_content: staffContent }
    activeCriterion.value = { ...activeCriterion.value, staff_content: staffContent }

    isEditing.value = false
    imagePreviews.value.clear()
    pendingFiles.value.clear()
    currentUploadingSection.value = null
    isUploadingImage.value = false
  } catch (e: any) {
    console.error('Error saving guide:', e)
    alert('Fehler beim Speichern: ' + e.message)
  } finally {
    isSaving.value = false
    isUploadingImage.value = false
  }
}

const selectCriterion = (c: any) => {
  if (isEditing.value) cancelEdit()
  activeCriterion.value = c
  sidebarOpen.value = false
  showDrivingCatTooltip.value = false
}

const navigatePrev = () => {
  const idx = currentFlatIndex.value
  if (idx > 0) selectCriterion(flatCriteria.value[idx - 1])
}

const navigateNext = () => {
  const idx = currentFlatIndex.value
  if (idx < flatCriteria.value.length - 1) selectCriterion(flatCriteria.value[idx + 1])
}

const loadData = async () => {
  isLoading.value = true
  try {
    const user = authStore.user
    if (!user) return
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id, role, can_edit_guide')
      .eq('auth_user_id', user.id)
      .single()

    // Resolve edit permission directly from DB — don't depend on prop chain
    canEditResolved.value = !!(
      props.canEdit ||
      profile?.can_edit_guide === true ||
      profile?.role === 'admin' ||
      profile?.role === 'tenant_admin'
    )
    if (!profile?.tenant_id) return

    // Load both tenant-specific and global categories; prefer tenant-specific when names clash
    const { data: cats } = await supabase
      .from('evaluation_categories')
      .select('id, name, color, display_order')
      .eq('is_active', true)
      .or(`tenant_id.eq.${profile.tenant_id},tenant_id.is.null`)
      .order('display_order')

    // Build raw category lookup: id → name (needed to remap criteria later)
    const rawCatIdToName = new Map((cats || []).map((c: any) => [c.id, c.name]))

    // Deduplicate by name: tenant-specific overrides global
    const catMap = new Map<string, any>()
    for (const c of (cats || [])) {
      const existing = catMap.get(c.name)
      if (!existing || !existing.tenant_id) catMap.set(c.name, c)
    }
    const allCats = Array.from(catMap.values()).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))

    // Build preferred category lookup: name → preferred (deduped) id
    const catNameToPreferredId = new Map(allCats.map(c => [c.name, c.id]))

    if (!allCats.length) return

    const { data: crit } = await supabase
      .from('evaluation_criteria')
      .select('id, name, description, category_id, display_order, staff_content, tenant_id, driving_categories')
      .eq('is_active', true)
      .or(`tenant_id.eq.${profile.tenant_id},tenant_id.is.null`)
      .order('category_id, display_order')

    const critMap = new Map<string, any>()
    for (const c of (crit || [])) {
      const existing = critMap.get(c.name)
      if (!existing || (!existing.tenant_id && c.tenant_id) || (!existing.staff_content && c.staff_content)) critMap.set(c.name, c)
    }

    // Remap each criterion's category_id to the preferred (deduped) category id
    // This resolves mismatches where global criteria point to global category IDs
    // but the dedup prefers the tenant-specific category ID for the same name
    allCriteria.value = Array.from(critMap.values()).map(c => {
      const catName = rawCatIdToName.get(c.category_id)
      const preferredId = catName ? catNameToPreferredId.get(catName) : null
      return preferredId ? { ...c, category_id: preferredId } : c
    })

    // Only keep categories that have at least one criterion after remapping
    const usedCatIds = new Set(allCriteria.value.map(c => c.category_id))
    categories.value = allCats.filter(c => usedCatIds.has(c.id))

    const catById = new Map(categories.value.map(c => [c.id, c]))
    allCriteria.value = allCriteria.value.map(c => ({ ...c, category_name: catById.get(c.category_id)?.name || '' }))

    if (props.initialCriterionId) {
      const found = allCriteria.value.find(c => c.id === props.initialCriterionId)
      if (found) activeCriterion.value = found
    }
    if (!activeCriterion.value && flatCriteria.value.length > 0) activeCriterion.value = flatCriteria.value[0]
  } finally {
    isLoading.value = false
  }
}

onMounted(loadData)

watch(() => props.initialCriterionId, (id) => {
  if (id && allCriteria.value.length) {
    const found = allCriteria.value.find(c => c.id === id)
    if (found) activeCriterion.value = found
  }
})
</script>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
.slide-sidebar-enter-active { transition: opacity 0.2s ease; }
.slide-sidebar-leave-active { transition: opacity 0.2s ease; }
.slide-sidebar-enter-from,
.slide-sidebar-leave-to { opacity: 0; }
</style>
