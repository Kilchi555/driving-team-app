<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { CalendarOptions } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import deLocale from '@fullcalendar/core/locales/de'
import EventModal from './EventModal.vue'

const calendar = ref()

interface Props {
  currentUser?: any // User aus useCurrentUser
}

const props = defineProps<Props>()

// NEU: Variablen für das zentrale Modal
const isModalVisible = ref(false)
const modalEventData = ref<any>(null) // Enthält die Daten für das Modal (Terminobjekt oder leeres Objekt für neu)
const modalMode = ref<'view' | 'edit' | 'create'>('create') // Steuert den Modus des Modals

// Bestehende ref-Variablen für das Kontextmenü und Kopieren/Einfügen
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const clickedEvent = ref<any>(null) // Speichert den Event, auf den geklickt wurde
const copiedEvent = ref<CalendarEvent | null>(null) // Speichert den kopierten Event

defineExpose({
  getApi: () => calendar.value?.getApi?.()
})

// Aktualisierte Typdefinition für CalendarEvent mit ID und allDay
type CalendarEvent = {
  id: string // Hinzugefügt: ID ist essentiell für die Bearbeitung und Löschung
  title: string
  start: string
  end: string
  allDay?: boolean; // Korrektur: Hinzugefügt, um den 'allDay' Fehler zu beheben
  extendedProps?: {
    location?: string
    staff_note?: string
    client_note?: string
  }
}

// Beispiel-Termine mit IDs
const calendarEvents = ref<CalendarEvent[]>([
  {
    id: 'test-event-1',
    title: 'Anna Müller - Fahrstunde B',
    start: new Date(Date.now() + 86400000).toISOString(), // Morgen
    end: new Date(Date.now() + 86400000 + 2700000).toISOString(), // 45min später
    extendedProps: {
      location: 'Bahnhof Zürich',
      staff_note: 'Erste Fahrstunde',
      client_note: 'Stadtverkehr üben'
    }
  }
])

const emit = defineEmits(['view-updated'])

// NEU: Funktion zum Öffnen des Modals im Erstellungsmodus (z.B. für einen "Neuer Termin"-Button)
const openCreateModal = () => {
  isModalVisible.value = true;
  modalMode.value = 'create';
  modalEventData.value = {
    title: '',
    start: new Date().toISOString(), // Standard Startzeit (jetzt)
    end: new Date(Date.now() + 3600000).toISOString(), // Standard Endzeit (1 Stunde später)
    extendedProps: {
      location: '',
      staff_note: '',
      client_note: ''
    },
    allDay: false // Standardwert
  };
};

// NEU: Handler für das Speichern eines Events vom EventModal
const handleSaveEvent = async (eventData: CalendarEvent) => {
  console.log('💾 Saving event:', eventData)
  
  // Erstmal nur lokal speichern (später Supabase)
  if (eventData.id) {
    // Event aktualisieren
    const index = calendarEvents.value.findIndex(e => e.id === eventData.id)
    if (index !== -1) {
      calendarEvents.value[index] = eventData
    }
  } else {
    // Neues Event hinzufügen
    const newId = Date.now().toString()
    calendarEvents.value.push({ ...eventData, id: newId })
  }
  
  isModalVisible.value = false
  
  // Kalender neu laden
  setTimeout(() => {
    calendar.value?.getApi()?.refetchEvents()
  }, 100)
}

// NEU: Handler für das Löschen eines Events vom EventModal
const handleDeleteEvent = async (eventData: CalendarEvent) => {
  console.log('🗑️ Deleting event:', eventData)
  
  // Erstmal nur lokal löschen (später Supabase)
  calendarEvents.value = calendarEvents.value.filter(e => e.id !== eventData.id)
  isModalVisible.value = false
  
  // Kalender neu laden
  setTimeout(() => {
    calendar.value?.getApi()?.refetchEvents()
  }, 100)
}


// Anpassung deiner Kontextmenü-Funktionen, um das Modal zu nutzen

const editEventFromContextMenu = () => {
  if (clickedEvent.value) {
    isModalVisible.value = true;
    modalMode.value = 'edit';
    modalEventData.value = {
      id: clickedEvent.value.id,
      title: clickedEvent.value.title,
      start: clickedEvent.value.startStr,
      end: clickedEvent.value.endStr,
      allDay: clickedEvent.value.allDay, // allDay hier übergeben
      extendedProps: { ...clickedEvent.value.extendedProps }
    };
  }
  showContextMenu.value = false;
};

const duplicateEvent = () => {
    if (clickedEvent.value) {
        isModalVisible.value = true;
        modalMode.value = 'create'; // Öffne als neuen Termin
        // Erstelle eine Kopie der Daten, passe Titel und Zeiten an
        modalEventData.value = {
            title: clickedEvent.value.title + ' (Kopie)',
            start: new Date(new Date(clickedEvent.value.start).getTime() + 3600000).toISOString(), // 1 Stunde später
            end: new Date(new Date(clickedEvent.value.end).getTime() + 3600000).toISOString(), // 1 Stunde später
            allDay: clickedEvent.value.allDay, // allDay hier übergeben
            extendedProps: { ...clickedEvent.value.extendedProps }
        };
    }
    showContextMenu.value = false;
};

const copyEvent = () => {
  if (clickedEvent.value) {
    copiedEvent.value = {
      id: clickedEvent.value.id, // ID mitkopieren, auch wenn sie für Einfügen nicht direkt genutzt wird
      title: clickedEvent.value.title,
      start: clickedEvent.value.startStr,
      end: clickedEvent.value.endStr,
      allDay: clickedEvent.value.allDay, // allDay hier übergeben
      extendedProps: { ...clickedEvent.value.extendedProps }
    }
    console.log('Termin kopiert:', copiedEvent.value.title)
  }
  showContextMenu.value = false
}

const pasteEvent = (arg: { date: Date }) => { // Typ des Arguments korrigiert
  if (copiedEvent.value) {
    isModalVisible.value = true;
    modalMode.value = 'create';
    const durationMs = new Date(copiedEvent.value.end).getTime() - new Date(copiedEvent.value.start).getTime();
    modalEventData.value = {
      title: copiedEvent.value.title,
      start: arg.date.toISOString(),
      end: new Date(arg.date.getTime() + durationMs).toISOString(),
      allDay: copiedEvent.value.allDay, // allDay hier übergeben
      extendedProps: { ...copiedEvent.value.extendedProps }
    };
  }
  showContextMenu.value = false;
};

// Löschen über Kontextmenü nutzt jetzt den zentralen handleDeleteEvent
const deleteEventFromContextMenu = () => {
  if (clickedEvent.value && clickedEvent.value.id) {
    // Rufe die zentrale Löschfunktion auf, die auch das Modal schliesst
    handleDeleteEvent({ id: clickedEvent.value.id, title: '', start: '', end: '' }); // Übergibt das minimale Event-Objekt mit ID
  }
  showContextMenu.value = false;
};


// Definiere die Optionen hier, da die Plugins direkt verwendet werden
const calendarOptions = ref<CalendarOptions>({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'timeGridWeek',
  locale: deLocale,
  timeZone: 'local',
  height: 'auto',
  contentHeight: 600,
  scrollTime: '08:00:00',
  scrollTimeReset: false,  
  stickyHeaderDates: true,
  headerToolbar: false, // Toolbar ausgeblendet
  selectable: true, // Ermöglicht das Ziehen und Auswählen von Bereichen
  editable: true, // Ermöglicht das Verschieben und Ändern der Grösse von Terminen
  selectMirror: true, // Spiegelt die Auswahl beim Ziehen
  events: () => calendarEvents.value, 
  slotMinTime: '06:00:00', // Startzeit der Anzeige
  slotMaxTime: '22:00:00', // Endzeit der Anzeige
  allDaySlot: false, // Ganztägiger Slot am oberen Rand ausblenden
  

  datesSet(info) {
    emit('view-updated', info.start)
  },
  eventAllow: (dropInfo: any) => {
    const now = new Date()
    return dropInfo.start > now // Termine nur in der Zukunft zulassen
  },
  dayHeaderContent: (arg: any) => {
    const date = arg.date
    const weekday = date.toLocaleDateString('de-CH', { weekday: 'short' }) // z. B. "Mo"
    const day = date.getDate().toString().padStart(2, '0') // z. B. "24"

    return {
      html: `<div class="fc-day-header-content"><span class="block">${weekday}</span><span class="block">${day}</span></div>`
    }
  },
  eventContent: (arg: any) => {
    const { title } = arg.event
    const ext = arg.event.extendedProps
    return {
      html: `
        <div class="fc-event-custom">
          <div class="event-name">${title || 'Termin'}</div>
          ${ext?.location ? `<div class="event-subline">📍 ${ext.location}</div>` : ''}
        </div>
      `
    }
  },

  // NEU: Unified select Handler (für Bereichs-Auswahl)
  select: (arg) => {
    isModalVisible.value = true;
    modalMode.value = 'create';
    modalEventData.value = {
      title: '',
      start: arg.startStr,
      end: arg.endStr,
      allDay: arg.allDay, // Korrektur: allDay Property hinzugefügt
      extendedProps: {
        location: '',
        staff_note: '',
        client_note: ''
      }
    };
    calendar.value.getApi().unselect(); // Auswahl im Kalender aufheben
  },

  // NEU: unified eventClick Handler (für Klick auf bestehenden Termin)
  eventClick: (clickInfo) => {
    isModalVisible.value = true;
    modalMode.value = 'edit'; // Oder 'view', wenn nur Ansicht erlaubt ist
    modalEventData.value = {
      id: clickInfo.event.id,
      title: clickInfo.event.title,
      start: clickInfo.event.startStr,
      end: clickInfo.event.endStr,
      allDay: clickInfo.event.allDay, // allDay hier übergeben
      extendedProps: { ...clickInfo.event.extendedProps }
    };
  },

  // NEU: dateClick Handler (für Klick auf leeren Tag/Zeit-Slot)
  dateClick: (arg) => {
    // Prüfen, ob es ein Rechtsklick war (für Desktop-Kontextmenü beibehalten)
    if (arg.jsEvent.button === 2) {
      arg.jsEvent.preventDefault(); // Verhindert Standard-Browser-Kontextmenü
      showContextMenu.value = true;
      contextMenuX.value = arg.jsEvent.clientX;
      contextMenuY.value = arg.jsEvent.clientY;
      clickedEvent.value = null; // Bei Klick auf Hintergrund kein spezifisches Event ausgewählt
      // Wenn etwas kopiert wurde, soll die Paste-Option verfügbar sein
    } else { // Linksklick auf einen leeren Slot
      isModalVisible.value = true;
      modalMode.value = 'create';
      modalEventData.value = {
        title: '',
        start: arg.date.toISOString(), // Start ist der Klickzeitpunkt
        end: new Date(arg.date.getTime() + 3600000).toISOString(), // Ende ist 1 Stunde später
        allDay: arg.allDay, // allDay hier übergeben
        extendedProps: {
          location: '',
          staff_note: '',
          client_note: ''
        }
      };
    }
  },

  // eventDidMount für Kontextmenü (Rechtsklick auf Desktop)
  eventDidMount: (info) => {
      info.el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          showContextMenu.value = true;
          contextMenuX.value = e.clientX;
          contextMenuY.value = e.clientY;
          clickedEvent.value = info.event;
      });
  },

  eventDrop: (dropInfo) => {
    // Logik zum Aktualisieren des Events im Array (via ID)
    const index = calendarEvents.value.findIndex(e => e.id === dropInfo.event.id);
    if (index !== -1) {
      calendarEvents.value[index].start = dropInfo.event.startStr;
      calendarEvents.value[index].end = dropInfo.event.endStr;
      calendarEvents.value[index].allDay = dropInfo.event.allDay; // allDay aktualisieren
    }
    console.log('Termin verschoben:', dropInfo.event);
  },
  eventResize: (resizeInfo) => {
    // Logik zum Aktualisieren des Events im Array (via ID)
    const index = calendarEvents.value.findIndex(e => e.id === resizeInfo.event.id);
    if (index !== -1) {
      calendarEvents.value[index].start = resizeInfo.event.startStr;
      calendarEvents.value[index].end = resizeInfo.event.endStr;
      calendarEvents.value[index].allDay = resizeInfo.event.allDay; // allDay aktualisieren
    }
    console.log('Termin Grösse geändert:', resizeInfo.event);
  },
})

const isCalendarReady = ref(false)

onMounted(() => {
  isCalendarReady.value = true
  emit('view-updated', calendar.value?.getApi()?.view?.currentStart)

  // Scroll-Fix nach dem Rendern
  setTimeout(() => {
    const calendarEl = calendar.value?.$el
    if (calendarEl) {
      const scroller = calendarEl.querySelector('.fc-scroller')
      if (scroller) {
        scroller.style.overflowY = 'auto'
        scroller.style.maxHeight = '70vh'
      }
    }
  }, 200)

  // Listener zum Schliessen des Kontextmenüs bei Klick ausserhalb
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    // Sicherstellen, dass der Klick nicht auf das Kontextmenü selbst ging
    if (showContextMenu.value && !target.closest('.context-menu')) {
      showContextMenu.value = false;
    }
  });
})
</script>

<template>
  <ClientOnly>
    <FullCalendar
      v-if="isCalendarReady"
      ref="calendar"
      :options="calendarOptions"
    />
    <div v-else>
      Kalender wird geladen...
    </div>

    <EventModal
      :is-visible="isModalVisible"
      :event-data="modalEventData"
      :mode="modalMode"
      :current-user="props.currentUser" 
      @close="isModalVisible = false"
      @save-event="handleSaveEvent"
      @delete-event="handleDeleteEvent"
    />

    <div
      v-if="showContextMenu"
      class="context-menu"
      :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }"
      @click.stop=""
    >
      <div v-if="clickedEvent" class="context-menu-item" @click="editEventFromContextMenu">Termin bearbeiten</div>
      <div v-if="clickedEvent" class="context-menu-item" @click="duplicateEvent">Termin duplizieren</div>
      <div v-if="clickedEvent" class="context-menu-item" @click="copyEvent">Termin kopieren</div>
      <div v-if="clickedEvent" class="context-menu-item" @click="deleteEventFromContextMenu">Termin löschen</div>
      <div v-if="!clickedEvent && copiedEvent" class="context-menu-item" @click="pasteEvent({ date: new Date(contextMenuY)}) ">Termin hier einfügen</div>
      <div v-if="!clickedEvent && !copiedEvent" class="context-menu-item disabled">Nichts zum Einfügen</div>
    </div>
  </ClientOnly>
</template>

<style>
/* === KALENDER BASIS === */
.fc {
  background-color: white !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

/* === HEADER & NAVIGATION === */
.fc-header-toolbar {
  padding: 16px 20px !important;
  background-color: #fafafa !important;
  border-bottom: 1px solid #e5e7eb !important;
}

.fc-col-header-cell {
  background-color: #f8fafc !important;
  color: #374151 !important;
  font-weight: 600 !important;
  font-size: 0.875rem !important;
  padding: 12px 8px !important;
  border-bottom: 2px solid #e5e7eb !important;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.fc-col-header-cell .fc-scrollgrid-sync-inner {
  color: #374151 !important;
}

/* Heute hervorheben */
.fc-col-header-cell.fc-day-today {
  background-color: #dbeafe !important;
  color: #1d4ed8 !important;
}

.fc-col-header-cell.fc-day-today .fc-day-header-content span {
  color: #1d4ed8 !important;
  font-weight: 700;
}

/* === ZEIT-SPALTE === */
.fc-timegrid-axis {
  background-color: #f9fafb !important;
  border-right: 1px solid #e5e7eb !important;
}

.fc-timegrid-slot-label {
  color: #6b7280 !important;
  font-size: 0.75rem !important;
  font-weight: 500 !important;
}

/* === GRID & SLOTS === */
.fc-timegrid-slot {
  background-color: white !important;
  border-color: #f3f4f6 !important;
  height: 40px !important;
}

.fc-timegrid-slot-minor {
  border-color: #f9fafb !important;
}

.fc-scrollgrid {
  background-color: white !important;
  border: 1px solid #e5e7eb !important;
}

.fc-scrollgrid-section-body table {
  border-color: #e5e7eb !important;
}

/* === HEUTE HERVORHEBEN === */
.fc-day-today {
  background-color: #fffbeb !important;
}

.fc-timegrid-col.fc-day-today {
  background-color: #fffbeb !important;
}

/* === EVENTS === */
.fc-event {
  background-color: #62b22f !important;
  border: none !important;
  border-radius: 6px !important;
  padding: 1px 1px !important;
  margin: 1px !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
  font-weight: 500 !important;
  transition: all 0.2s ease !important;
}

.fc-event:hover {
  background-color: #54a026 !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}

.fc-event-title {
  font-weight: 600 !important;
  color: white !important;
}

/* === EVENT KATEGORIEN === */
.fc-event[data-category="driving_b"] {
  background-color: #62b22f !important;
}

.fc-event[data-category="driving_a"] {
  background-color: #019ee5 !important;
}

.fc-event[data-category="theory"] {
  background-color: #666666 !important;
}

.fc-event[data-category="exam"] {
  background-color: #1d1e19 !important;
}

.fc-event[data-category="consultation"] {
  background-color: #f59e0b !important;
}

/* === BUTTONS === */
.fc-button {
  background-color: white !important;
  border: 1px solid #d1d5db !important;
  color: #374151 !important;
  border-radius: 8px !important;
  padding: 8px 16px !important;
  font-weight: 500 !important;
  font-size: 0.875rem !important;
  transition: all 0.2s ease !important;
}

.fc-button:hover {
  background-color: #f9fafb !important;
  border-color: #9ca3af !important;
  transform: translateY(-1px);
}

.fc-button-primary {
  background-color: #62b22f !important;
  border-color: #62b22f !important;
  color: white !important;
}

.fc-button-primary:hover {
  background-color: #54a026 !important;
  border-color: #54a026 !important;
}

.fc-button:disabled {
  background-color: #f3f4f6 !important;
  color: #9ca3af !important;
  cursor: not-allowed !important;
}

/* === TOOLBAR === */
.fc-toolbar {
  padding: 16px 20px !important;
  background-color: white !important;
  border-bottom: 1px solid #e5e7eb !important;
  gap: 12px !important;
}

.fc-toolbar-chunk {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fc-toolbar-title {
  font-size: 1.5rem !important;
  font-weight: 700 !important;
  color: #111827 !important;
  margin: 0 16px !important;
}

/* === CUSTOM EVENT CONTENT === */
.fc-event-custom {
  font-size: 0.75rem;
  padding: 2px 4px;
  line-height: 1.3;
}

.event-name {
  font-weight: 600;
  color: white;
  margin-bottom: 2px;
}

.event-subline {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  gap: 2px;
}

/* === CONTEXT MENU === */
.context-menu {
  position: fixed;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 1000;
  min-width: 180px;
  overflow: hidden;
  padding: 4px 0;
}

.context-menu-item {
  padding: 10px 16px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
  transition: background-color 0.15s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.context-menu-item:hover {
  background-color: #f3f4f6;
}

.context-menu-item.disabled {
  color: #9ca3af;
  cursor: not-allowed;
  background-color: transparent;
}

.context-menu-item.disabled:hover {
  background-color: transparent;
}

/* === RESPONSIVE === */
@media (max-width: 768px) {
  .fc-toolbar {
    flex-direction: column;
    gap: 8px;
    padding: 12px 16px !important;
  }
  
  .fc-toolbar-title {
    font-size: 1.25rem !important;
    margin: 0 !important;
  }
  
  .fc-button {
    padding: 6px 12px !important;
    font-size: 0.8rem !important;
  }
  
  .fc-col-header-cell {
    padding: 8px 4px !important;
    font-size: 0.75rem !important;
  }
  
  .fc-timegrid-slot {
    height: 35px !important;
  }
}

/* === LOADING STATE === */
.fc-loading {
  background-color: #f9fafb !important;
  opacity: 0.7;
}

/* === SELECTION === */
.fc-highlight {
  background-color: rgba(98, 178, 47, 0.2) !important;
  border-radius: 4px;
}

/* === SCROLL FIXES === */
.fc-scroller {
  overflow-y: auto !important;
  max-height: 70vh !important;
}

.fc-timegrid-slots {
  overflow-y: auto !important;
  max-height: 70vh !important;
}

.fc-view-harness {
  height: auto !important;
  overflow: visible !important;
}

.fc {
  height: auto !important;
  min-height: 600px !important;
}

/* Scrollbar Styling */
.fc-scroller::-webkit-scrollbar {
  width: 8px;
}

.fc-scroller::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.fc-scroller::-webkit-scrollbar-thumb {
  background: #62b22f;
  border-radius: 4px;
}

.fc-scroller::-webkit-scrollbar-thumb:hover {
  background: #54a026;
}
</style>