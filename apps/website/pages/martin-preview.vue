<template>
  <div class="fs-root" :data-theme="isDark ? 'dark' : 'light'">

    <!-- BOOKING MODAL -->
    <Transition name="modal">
      <div v-if="showBooking" class="fs-modal-overlay" @click.self="closeBooking">
        <div class="fs-modal-bg" @click="closeBooking"></div>
        <div class="fs-modal-box">
          <div class="fs-modal-header">
            <div>
              <p class="fs-modal-title">Fahrstunde buchen</p>
              <p class="fs-modal-sub">fahre-schlau · Martin Scotti</p>
            </div>
            <button @click="closeBooking" class="fs-modal-close">×</button>
          </div>

          <div v-if="bookingStep===1" class="fs-modal-body">
            <p class="fs-step-label">1 / 4 — Kategorie wählen</p>
            <div class="fs-cat-grid">
              <button v-for="cat in categories" :key="cat.id" @click="selectedCategory=cat.id" class="fs-cat-btn" :class="selectedCategory===cat.id ? 'fs-cat-active' : ''">
                <p class="fs-cat-icon">{{ cat.icon }}</p>
                <p class="fs-cat-name">{{ cat.name }}</p>
                <p class="fs-cat-price">CHF {{ cat.price }}/45 Min.</p>
              </button>
            </div>
            <button @click="bookingStep=2" :disabled="!selectedCategory" class="fs-btn-primary" :class="!selectedCategory ? 'fs-btn-disabled' : ''">Weiter →</button>
          </div>

          <div v-if="bookingStep===2" class="fs-modal-body">
            <p class="fs-step-label">2 / 4 — Datum wählen</p>
            <div class="fs-cal-nav">
              <button @click="prevMonth" class="fs-cal-arrow">‹</button>
              <p class="fs-cal-month">{{ monthName }} {{ calYear }}</p>
              <button @click="nextMonth" class="fs-cal-arrow">›</button>
            </div>
            <div class="fs-cal-grid">
              <div v-for="d in ['Mo','Di','Mi','Do','Fr','Sa','So']" :key="d" class="fs-cal-dow">{{ d }}</div>
              <div v-for="n in calOffset" :key="'e'+n"></div>
              <button v-for="day in calDays" :key="day" @click="selectDay(day)" :disabled="isPast(day)"
                class="fs-cal-day"
                :class="selectedDay===day ? 'fs-cal-selected' : isPast(day) ? 'fs-cal-past' : isWeekend(day) ? 'fs-cal-weekend' : ''">
                {{ day }}
              </button>
            </div>
            <div class="fs-btn-row">
              <button @click="bookingStep=1" class="fs-btn-secondary">← Zurück</button>
              <button @click="bookingStep=3" :disabled="!selectedDay" class="fs-btn-primary fs-btn-grow" :class="!selectedDay ? 'fs-btn-disabled' : ''">Weiter →</button>
            </div>
          </div>

          <div v-if="bookingStep===3" class="fs-modal-body">
            <p class="fs-step-label">3 / 4 — Uhrzeit wählen</p>
            <div class="fs-time-grid">
              <button v-for="slot in timeSlots" :key="slot.time" @click="slot.free && (selectedTime=slot.time)" :disabled="!slot.free"
                class="fs-time-btn"
                :class="selectedTime===slot.time ? 'fs-time-selected' : !slot.free ? 'fs-time-taken' : ''">
                {{ slot.time }}
              </button>
            </div>
            <div class="fs-btn-row">
              <button @click="bookingStep=2" class="fs-btn-secondary">← Zurück</button>
              <button @click="bookingStep=4" :disabled="!selectedTime" class="fs-btn-primary fs-btn-grow" :class="!selectedTime ? 'fs-btn-disabled' : ''">Weiter →</button>
            </div>
          </div>

          <div v-if="bookingStep===4 && !bookingDone" class="fs-modal-body">
            <p class="fs-step-label">4 / 4 — Deine Angaben</p>
            <div class="fs-booking-summary">{{ categories.find(c=>c.id===selectedCategory)?.name }} · {{ monthName }} {{ selectedDay }}, {{ calYear }} · {{ selectedTime }}</div>
            <div class="fs-form-fields">
              <div class="fs-form-row">
                <div class="fs-form-group">
                  <label class="fs-label">Vorname</label>
                  <input v-model="form.firstName" placeholder="Max" class="fs-input" />
                </div>
                <div class="fs-form-group">
                  <label class="fs-label">Nachname</label>
                  <input v-model="form.lastName" placeholder="Muster" class="fs-input" />
                </div>
              </div>
              <div class="fs-form-group">
                <label class="fs-label">E-Mail</label>
                <input v-model="form.email" type="email" placeholder="deine@email.ch" class="fs-input" />
              </div>
              <div class="fs-form-group">
                <label class="fs-label">Telefon</label>
                <input v-model="form.phone" type="tel" placeholder="+41 79 000 00 00" class="fs-input" />
              </div>
            </div>
            <div class="fs-btn-row">
              <button @click="bookingStep=3" class="fs-btn-secondary">← Zurück</button>
              <button @click="confirmBooking" :disabled="!form.firstName||!form.email" class="fs-btn-primary fs-btn-grow" :class="!form.firstName||!form.email ? 'fs-btn-disabled' : ''">Bestätigen ✓</button>
            </div>
          </div>

          <div v-if="bookingDone" class="fs-modal-success">
            <div class="fs-success-icon">✓</div>
            <h3 class="fs-success-title">Buchung bestätigt!</h3>
            <p class="fs-success-cat">{{ categories.find(c=>c.id===selectedCategory)?.name }}</p>
            <p class="fs-success-time">{{ monthName }} {{ selectedDay }}, {{ calYear }} · {{ selectedTime }}</p>
            <p class="fs-success-msg">Bestätigung an <strong>{{ form.email }}</strong> geschickt. Martin freut sich auf dich!</p>
            <button @click="closeBooking" class="fs-btn-dark">Schliessen</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- CONTACT MODAL -->
    <Transition name="modal">
      <div v-if="showContact" class="fs-modal-overlay" @click.self="showContact=false">
        <div class="fs-modal-bg" @click="showContact=false"></div>
        <div class="fs-modal-box">
          <div v-if="!contactDone" class="fs-modal-body">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px;">
              <div>
                <p class="fs-modal-title">Nachricht senden</p>
                <p class="fs-modal-sub">Antwort innert 2 Stunden.</p>
              </div>
              <button @click="showContact=false" class="fs-modal-close">×</button>
            </div>
            <div class="fs-form-fields">
              <div class="fs-form-row">
                <div class="fs-form-group">
                  <label class="fs-label">Vorname</label>
                  <input v-model="contactForm.name" placeholder="Dein Name" class="fs-input" />
                </div>
                <div class="fs-form-group">
                  <label class="fs-label">Telefon</label>
                  <input v-model="contactForm.phone" placeholder="+41 79 ..." class="fs-input" />
                </div>
              </div>
              <div class="fs-form-group">
                <label class="fs-label">Ich interessiere mich für</label>
                <select v-model="contactForm.interest" class="fs-input">
                  <option>Autofahrstunden (Kat. B)</option>
                  <option>Automatik-Fahrstunden</option>
                  <option>Nothelferkurs</option>
                  <option>Verkehrskundeunterricht (VKU)</option>
                  <option>Allgemeine Infos</option>
                </select>
              </div>
              <div class="fs-form-group">
                <label class="fs-label">Nachricht (optional)</label>
                <textarea v-model="contactForm.message" placeholder="Hallo Martin, ich möchte gerne mit Fahrstunden beginnen..." rows="3" class="fs-input fs-textarea"></textarea>
              </div>
            </div>
            <button @click="submitContact" :disabled="!contactForm.name" class="fs-btn-primary fs-btn-full" :class="!contactForm.name ? 'fs-btn-disabled' : ''" style="margin-bottom:12px;">Absenden</button>
            <a :href="whatsappLink" target="_blank" class="fs-wa-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#16A34A"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Direkt via WhatsApp
            </a>
          </div>
          <div v-else class="fs-modal-success">
            <div class="fs-success-icon">✓</div>
            <h3 class="fs-success-title">Nachricht gesendet!</h3>
            <p class="fs-success-msg">Martin meldet sich innert 2 Stunden.</p>
            <button @click="showContact=false; contactDone=false" class="fs-btn-dark">Schliessen</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- VKU MODAL -->
    <Transition name="modal">
      <div v-if="showVKU" class="fs-modal-overlay" @click.self="showVKU=false">
        <div class="fs-modal-bg" @click="showVKU=false"></div>
        <div class="fs-modal-box fs-kurs-modal">
          <div class="fs-modal-header">
            <div>
              <p class="fs-modal-title">VKU – Verkehrskundeunterricht</p>
              <p class="fs-modal-sub">fahre-schlau GmbH · Pfäffikon ZH</p>
            </div>
            <button @click="showVKU=false" class="fs-modal-close">×</button>
          </div>

          <!-- DONE -->
          <div v-if="vkuStep==='done'" class="fs-modal-success">
            <div class="fs-success-icon">✓</div>
            <h3 class="fs-success-title">Anmeldung eingegangen!</h3>
            <p class="fs-success-cat">{{ vkuSelectedDate }}</p>
            <p class="fs-success-msg">Martin meldet sich innert 24h zur Bestätigung. Kurskosten CHF 180 bar am ersten Kurstag.</p>
            <button @click="showVKU=false; vkuStep='info'" class="fs-btn-dark">Schliessen</button>
          </div>

          <!-- INFO + DATUMSWAHL -->
          <div v-else class="fs-modal-body">
            <!-- Kursinfos -->
            <div class="fs-kurs-info-grid">
              <div class="fs-kurs-info-item"><span class="fs-kurs-info-icon">⏱</span><div><p class="fs-kurs-info-lbl">Dauer</p><p class="fs-kurs-info-val">8 Stunden / 2 Tage</p></div></div>
              <div class="fs-kurs-info-item"><span class="fs-kurs-info-icon">📅</span><div><p class="fs-kurs-info-lbl">Kurszeiten</p><p class="fs-kurs-info-val">Do 18–22 Uhr & Fr 18–22 Uhr</p></div></div>
              <div class="fs-kurs-info-item"><span class="fs-kurs-info-icon">💰</span><div><p class="fs-kurs-info-lbl">Kosten</p><p class="fs-kurs-info-val">CHF 180.– (bar, 1. Tag)</p></div></div>
              <div class="fs-kurs-info-item"><span class="fs-kurs-info-icon">📍</span><div><p class="fs-kurs-info-lbl">Standort</p><p class="fs-kurs-info-val">Bahnhofstrasse 7, Pfäffikon ZH</p></div></div>
              <div class="fs-kurs-info-item"><span class="fs-kurs-info-icon">☕</span><div><p class="fs-kurs-info-lbl">Verpflegung</p><p class="fs-kurs-info-val">Wasser & Kaffee inklusive</p></div></div>
              <div class="fs-kurs-info-item"><span class="fs-kurs-info-icon">⚠️</span><div><p class="fs-kurs-info-lbl">Abmeldung</p><p class="fs-kurs-info-val">Schriftlich &gt; 2 Werktage vorher</p></div></div>
            </div>

            <!-- Datumswahl -->
            <p class="fs-kurs-section-title">Kursdatum wählen</p>
            <div class="fs-kurs-dates">
              <button v-for="d in vkuDates" :key="d.id"
                @click="vkuSelectedDate=d.label; vkuStep='form'"
                class="fs-kurs-date-btn" :class="vkuSelectedDate===d.label ? 'fs-kurs-date-active' : ''">
                <div class="fs-kurs-date-left">
                  <p class="fs-kurs-date-label">{{ d.label }}</p>
                  <p class="fs-kurs-date-sub">{{ d.days }} · 18:00–22:00</p>
                </div>
                <span class="fs-kurs-spots">{{ d.spots }} Plätze frei</span>
              </button>
            </div>

            <!-- Formular (erscheint nach Datumswahl) -->
            <Transition name="modal">
              <div v-if="vkuStep==='form'" class="fs-kurs-form">
                <p class="fs-kurs-section-title">Deine Anmeldung für <strong>{{ vkuSelectedDate }}</strong></p>
                <div class="fs-form-fields">
                  <div class="fs-form-row">
                    <div class="fs-form-group"><label class="fs-label">Vorname</label><input v-model="vkuForm.firstName" class="fs-input" placeholder="Luca" /></div>
                    <div class="fs-form-group"><label class="fs-label">Nachname</label><input v-model="vkuForm.lastName" class="fs-input" placeholder="Müller" /></div>
                  </div>
                  <div class="fs-form-group"><label class="fs-label">E-Mail</label><input v-model="vkuForm.email" type="email" class="fs-input" placeholder="luca@beispiel.ch" /></div>
                  <div class="fs-form-group"><label class="fs-label">Telefon</label><input v-model="vkuForm.phone" type="tel" class="fs-input" placeholder="079 123 45 67" /></div>
                </div>
                <p class="fs-kurs-agb">Mit der Anmeldung akzeptierst du die <a href="https://storage.e.jimdo.com/file/bc181ee6-c60c-40ca-95e4-4a16a95ee629/AGB%20Kurse.pdf" target="_blank" class="fs-link">AGB</a> der Fahrschule fahre-schlau GmbH.</p>
                <div class="fs-btn-row">
                  <button @click="vkuStep='info'" class="fs-btn-secondary">← Zurück</button>
                  <button @click="submitVKU" :disabled="!vkuForm.firstName||!vkuForm.email" class="fs-btn-primary fs-btn-grow" :class="!vkuForm.firstName||!vkuForm.email ? 'fs-btn-disabled' : ''">Verbindlich anmelden</button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </Transition>

    <!-- NOTHILFE MODAL -->
    <Transition name="modal">
      <div v-if="showNothilfe" class="fs-modal-overlay" @click.self="showNothilfe=false">
        <div class="fs-modal-bg" @click="showNothilfe=false"></div>
        <div class="fs-modal-box fs-kurs-modal">
          <div class="fs-modal-header">
            <div>
              <p class="fs-modal-title">Nothelferkurs inkl. Ausweis</p>
              <p class="fs-modal-sub">ASTRA anerkannt · fahre-schlau GmbH</p>
            </div>
            <button @click="showNothilfe=false" class="fs-modal-close">×</button>
          </div>

          <!-- DONE -->
          <div v-if="nothilfeStep==='done'" class="fs-modal-success">
            <div class="fs-success-icon">✓</div>
            <h3 class="fs-success-title">Anfrage eingegangen!</h3>
            <p class="fs-success-msg">Martin meldet sich innert 24h mit einem Kursdatum. Kurskosten CHF 85 bar am ersten Kurstag.</p>
            <button @click="showNothilfe=false; nothilfeStep='info'" class="fs-btn-dark">Schliessen</button>
          </div>

          <div v-else class="fs-modal-body">
            <!-- Kursinfos -->
            <div class="fs-kurs-info-grid">
              <div class="fs-kurs-info-item"><span class="fs-kurs-info-icon">⏱</span><div><p class="fs-kurs-info-lbl">Dauer</p><p class="fs-kurs-info-val">10 Stunden / 2 Tage</p></div></div>
              <div class="fs-kurs-info-item"><span class="fs-kurs-info-icon">📅</span><div><p class="fs-kurs-info-lbl">Kurszeiten</p><p class="fs-kurs-info-val">Fr Abend + Sa ganzer Tag</p></div></div>
              <div class="fs-kurs-info-item"><span class="fs-kurs-info-icon">💰</span><div><p class="fs-kurs-info-lbl">Kosten</p><p class="fs-kurs-info-val">CHF 85.– (bar, 1. Tag)</p></div></div>
              <div class="fs-kurs-info-item"><span class="fs-kurs-info-icon">🏅</span><div><p class="fs-kurs-info-lbl">Ausweis</p><p class="fs-kurs-info-val">6 Jahre gültig (inkl.)</p></div></div>
              <div class="fs-kurs-info-item"><span class="fs-kurs-info-icon">📍</span><div><p class="fs-kurs-info-lbl">Standort</p><p class="fs-kurs-info-val">Bahnhofstrasse 7, Pfäffikon ZH</p></div></div>
              <div class="fs-kurs-info-item"><span class="fs-kurs-info-icon">✅</span><div><p class="fs-kurs-info-lbl">Anerkennung</p><p class="fs-kurs-info-val">ASTRA anerkannt</p></div></div>
            </div>

            <div class="fs-kurs-notice">
              <p>📋 Kursdaten auf Anfrage — Martin schickt dir die nächsten verfügbaren Daten direkt zu.</p>
            </div>

            <!-- Formular -->
            <p class="fs-kurs-section-title">Jetzt Platz reservieren</p>
            <div v-if="nothilfeStep==='info' || nothilfeStep==='form'" class="fs-kurs-form">
              <div class="fs-form-fields">
                <div class="fs-form-row">
                  <div class="fs-form-group"><label class="fs-label">Vorname</label><input v-model="nothilfeForm.firstName" class="fs-input" placeholder="Luca" /></div>
                  <div class="fs-form-group"><label class="fs-label">Nachname</label><input v-model="nothilfeForm.lastName" class="fs-input" placeholder="Müller" /></div>
                </div>
                <div class="fs-form-group"><label class="fs-label">E-Mail</label><input v-model="nothilfeForm.email" type="email" class="fs-input" placeholder="luca@beispiel.ch" /></div>
                <div class="fs-form-group"><label class="fs-label">Telefon</label><input v-model="nothilfeForm.phone" type="tel" class="fs-input" placeholder="079 123 45 67" /></div>
              </div>
              <p class="fs-kurs-agb">Mit der Anmeldung akzeptierst du die <a href="https://storage.e.jimdo.com/file/bc181ee6-c60c-40ca-95e4-4a16a95ee629/AGB%20Kurse.pdf" target="_blank" class="fs-link">AGB</a> der Fahrschule fahre-schlau GmbH.</p>
              <button @click="submitNothilfe" :disabled="!nothilfeForm.firstName||!nothilfeForm.email" class="fs-btn-primary fs-btn-full" :class="!nothilfeForm.firstName||!nothilfeForm.email ? 'fs-btn-disabled' : ''">Platz reservieren</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- NAV -->
    <nav class="fs-nav">
      <div class="fs-nav-logo">
        <img src="/images/fahre-schlau-logo-transparent.png" alt="fahre-schlau" class="fs-logo-img" />
      </div>
      <div class="fs-nav-links">
        <a href="#ueber" class="fs-nav-link">Über Martin</a>
        <a href="#preise" class="fs-nav-link">Preise</a>
        <a href="#kurse" class="fs-nav-link">Kurse</a>
        <button @click="showContact=true" class="fs-nav-link fs-nav-btn-ghost">Kontakt</button>
      </div>
      <div class="fs-nav-ctas">
        <button @click="isDark=!isDark" class="fs-theme-toggle" :title="isDark ? 'Light mode' : 'Dark mode'">
          <span v-if="isDark">☀️</span>
          <span v-else>🌙</span>
        </button>
        <a :href="whatsappLink" target="_blank" class="fs-nav-wa">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#4ADE80"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          <span class="fs-nav-wa-text">WhatsApp</span>
        </a>
        <button @click="openBooking" class="fs-nav-book">Termin buchen</button>
      </div>
    </nav>

    <!-- HERO -->
    <section class="fs-hero">
      <div class="fs-hero-grid"></div>
      <div class="fs-hero-glow1"></div>
      <div class="fs-hero-glow2"></div>
      <div class="fs-hero-content">
        <div class="fs-hero-left">
          <div class="fs-hero-badge-row">
            <span class="fs-stars">★★★★★</span>
            <span class="fs-badge-text">5.0 · Jeder Schüler hat bestanden</span>
            <span class="fs-badge-pill">100% Erfolgsquote</span>
          </div>
          <h1 class="fs-h1">
            Dein Führerschein.<br/>
            <span class="fs-h1-outline">Beim ersten</span><br/>
            <span class="fs-h1-blue">Versuch.</span>
          </h1>
          <p class="fs-hero-sub">Martin Scotti — eidg. Fahrlehrer in Pfäffikon ZH. Ruhig, direkt, mit 100% Erfolgsquote.</p>
          <div class="fs-hero-ctas">
            <button @click="openBooking" class="fs-cta-primary">
              Kurs buchen
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <a :href="whatsappLink" target="_blank" class="fs-cta-wa">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#4ADE80"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
          </div>
        </div>
        <div class="fs-hero-right">
          <div class="fs-photo-card">
            <img src="/images/martin-scotti.png" alt="Martin Scotti" class="fs-photo" />
            <div class="fs-photo-info">
              <p class="fs-photo-name">Martin Scotti</p>
              <p class="fs-photo-role">Eidg. Fahrlehrer · Pfäffikon ZH</p>
            </div>
          </div>
          <div class="fs-badge-top">
            <p class="fs-badge-pct">100%</p>
            <p class="fs-badge-pct-lbl">Erfolgsquote</p>
          </div>
          <div class="fs-badge-bottom">
            <div class="fs-badge-stars">★★★★★</div>
            <p class="fs-badge-google">Google · 5.0</p>
          </div>
        </div>
      </div>
    </section>

    <!-- STATS BAND -->
    <div class="fs-stats-band">
      <div class="fs-stats-band-inner">
        <div v-for="stat in stats" :key="stat.label" class="fs-band-stat">
          <p class="fs-band-val">{{ stat.value }}</p>
          <p class="fs-band-lbl">{{ stat.label }}</p>
        </div>
      </div>
    </div>

    <!-- ÜBER -->
    <section id="ueber" class="fs-section">
      <div class="fs-about-grid">
        <div>
          <p class="fs-eyebrow">Dein Fahrlehrer</p>
          <h2 class="fs-h2">Gelassen.<br/>Methodisch.<br/>Nachweislich.</h2>
          <p class="fs-body">Aufgewachsen im Tessin, seit 2013 in der Deutschschweiz. 2019 Fahrlehrerausbildung abgeschlossen, <strong>fahre-schlau in Pfäffikon ZH gegründet.</strong></p>
          <p class="fs-body">Meine Ruhe überträgt sich. Ich erkläre klar, trainiere gezielt auf den echten Prüfungsrouten.</p>
          <div class="fs-facts-grid">
            <div v-for="fact in facts" :key="fact.label" class="fs-fact">
              <p class="fs-fact-lbl">{{ fact.label }}</p>
              <p class="fs-fact-val">{{ fact.value }}</p>
            </div>
          </div>
          <div class="fs-about-ctas">
            <button @click="openBooking" class="fs-cta-primary">Termin buchen →</button>
            <a :href="whatsappLink" target="_blank" class="fs-cta-wa-light">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#16A34A"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
          </div>
        </div>
        <div class="fs-about-right">
          <div class="fs-driving-img">
            <img src="/images/martin-fahrzeuge.png" alt="Martin Scotti mit seinen Fahrzeugen – Seat Leon und Audi A3" class="fs-img-full" />
          </div>
          <div class="fs-quote-card">
            <svg style="margin-bottom:14px; display:block; flex-shrink:0;" width="26" height="18" viewBox="0 0 32 22" fill="#3B82F6"><path d="M0 22V13.5C0 9.667 1.083 6.5 3.25 4S8.25 0 12 0v4c-2 0-3.5.75-4.5 2.25S6 9.833 6 12v1h6v9H0zm18 0V13.5c0-3.833 1.083-7 3.25-9.5S26.25 0 30 0v4c-2 0-3.5.75-4.5 2.25S24 9.833 24 12v1h6v9H18z"/></svg>
            <blockquote class="fs-quote">"Dank meiner gelassenen Art freue ich mich, meinen Fahrschülern das Autofahren beizubringen – damit sie sich sicher im Strassenverkehr fühlen."</blockquote>
            <div class="fs-quote-author">
              <div class="fs-quote-avatar">M</div>
              <div>
                <p class="fs-quote-name">Martin Scotti</p>
                <p class="fs-quote-role">fahre-schlau GmbH</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- DER WEG ZUM FÜHRERSCHEIN -->
    <section class="fs-section fs-section-gray" id="schritte">
      <div class="fs-section-header">
        <p class="fs-eyebrow">Schritt für Schritt</p>
        <h2 class="fs-h2 fs-center">8 Schritte bis zu<br/>deinem Führerschein.</h2>
        <p class="fs-body fs-center" style="max-width:520px;margin:0 auto;">Der gesamte Weg — von Nothilfe bis Ausweis auf Probe. Die Schritte, bei denen Martin dich begleitet, sind blau markiert.</p>
      </div>
      <div class="fs-steps-grid">
        <div v-for="step in licenseSteps" :key="step.nr" class="fs-step-card" :class="step.martin ? 'fs-step-martin' : ''">
          <div class="fs-step-nr" :class="step.martin ? 'fs-step-nr-active' : ''">{{ step.nr }}</div>
          <div class="fs-step-body">
            <p class="fs-step-title">{{ step.title }}</p>
            <p class="fs-step-desc">{{ step.desc }}</p>
            <span v-if="step.martin" class="fs-step-tag">✓ Mit Martin</span>
          </div>
        </div>
      </div>
    </section>

    <!-- PREISE -->
    <section id="preise" class="fs-section fs-section-gray">
      <div class="fs-section-header">
        <p class="fs-eyebrow">Transparent & fair</p>
        <h2 class="fs-h2 fs-center">Preise</h2>
      </div>
      <div class="fs-price-grid">
        <div v-for="(p, i) in prices" :key="i" class="fs-price-card" :class="p.highlight ? 'fs-price-dark' : ''">
          <div v-if="p.highlight" class="fs-price-badge">Empfohlen</div>
          <p class="fs-price-lbl" :class="p.highlight ? 'fs-price-lbl-dark' : ''">{{ p.label }}</p>
          <p class="fs-price-amt" :class="p.highlight ? 'fs-price-amt-dark' : ''">CHF {{ p.price }}</p>
          <p class="fs-price-unit" :class="p.highlight ? 'fs-price-unit-dark' : ''">{{ p.unit }}</p>
          <ul class="fs-price-features">
            <li v-for="f in p.features" :key="f" class="fs-price-feature" :class="p.highlight ? 'fs-price-feature-dark' : ''">
              <span class="fs-check">✓</span> {{ f }}
            </li>
          </ul>
          <button @click="openBooking" class="fs-price-cta" :class="p.highlight ? 'fs-price-cta-blue' : 'fs-price-cta-gray'">Jetzt buchen</button>
        </div>
      </div>
      <p class="fs-price-note">Fragen? <button @click="showContact=true" class="fs-link">Schreib mir direkt →</button></p>
    </section>

    <!-- KURSE -->
    <section id="kurse" class="fs-section">
      <div class="fs-section-header">
        <p class="fs-eyebrow">Mehr als Fahrstunden</p>
        <h2 class="fs-h2 fs-center">Alle Kurse & Angebote</h2>
        <p class="fs-body fs-center" style="max-width:560px;margin:0 auto;">Alles, was du für den Führerschein brauchst — bei einem einzigen Ansprechpartner in Pfäffikon ZH.</p>
      </div>
      <div class="fs-courses-grid">
        <div class="fs-course-card fs-course-highlight">
          <div class="fs-course-icon-box fs-course-icon-blue">🚗</div>
          <h3 class="fs-course-title">Fahrstunden Kat. B</h3>
          <p class="fs-course-desc">Schaltung oder Automat — in deinem Tempo, auf den echten Prüfungsrouten in Pfäffikon ZH.</p>
          <ul class="fs-course-list">
            <li>✓ Audi A3 (Schaltung)</li>
            <li>✓ Seat Leon (Automat)</li>
            <li>✓ BPT / Taxi möglich</li>
          </ul>
          <div class="fs-course-price">ab CHF 85.– <span>/ 45 Min</span></div>
          <button @click="openBooking" class="fs-price-cta fs-price-cta-blue">Termin buchen →</button>
        </div>
        <div class="fs-course-card">
          <div class="fs-course-icon-box fs-course-icon-amber">📚</div>
          <h3 class="fs-course-title">VKU – Verkehrskundeunterricht</h3>
          <p class="fs-course-desc">Intensiv-VKU an zwei Abenden (Do + Fr). Pflicht für den Führerschein Kat. B.</p>
          <ul class="fs-course-list">
            <li>✓ Do &amp; Fr, jeweils 18:00–22:00</li>
            <li>✓ Bahnhofstrasse 7, Pfäffikon ZH</li>
            <li>✓ Anmeldung über ASA/Strassenverkehrsamt</li>
          </ul>
          <div class="fs-vku-dates">
            <p class="fs-vku-dates-title">Nächste Kursdaten 2026</p>
            <div class="fs-vku-date-row"><span class="fs-vku-dot"></span><span>18.–19. Juni 2026</span><span class="fs-vku-spots">8 Plätze frei</span></div>
            <div class="fs-vku-date-row"><span class="fs-vku-dot"></span><span>20.–21. August 2026</span><span class="fs-vku-spots">12 Plätze frei</span></div>
            <div class="fs-vku-date-row"><span class="fs-vku-dot"></span><span>17.–18. September 2026</span><span class="fs-vku-spots">12 Plätze frei</span></div>
            <div class="fs-vku-date-row"><span class="fs-vku-dot"></span><span>29.–30. Oktober 2026</span><span class="fs-vku-spots">12 Plätze frei</span></div>
          </div>
          <div class="fs-course-price">CHF 180.– <span>/ Kurs</span></div>
          <button @click="openVKU" class="fs-price-cta fs-price-cta-gray">Kursdaten & Anmelden →</button>
        </div>
        <div class="fs-course-card">
          <div class="fs-course-icon-box fs-course-icon-green">🏥</div>
          <h3 class="fs-course-title">Nothelferkurs</h3>
          <p class="fs-course-desc">ASTRA anerkannt — 10h über 2 Tage (Fr Abend + Sa). Ausweis 6 Jahre gültig, Unterlagen inklusive.</p>
          <ul class="fs-course-list">
            <li>✓ Pflicht vor Lernfahrausweis</li>
            <li>✓ Praxisnah, Kleingruppenformat</li>
            <li>✓ Ausweis inkl. (6 J. gültig)</li>
          </ul>
          <div class="fs-course-price">CHF 85.– <span>/ Person</span></div>
          <button @click="openNothilfe" class="fs-price-cta fs-price-cta-gray">Platz reservieren →</button>
        </div>
        <div class="fs-course-card">
          <h3 class="fs-course-title">Theorielektion</h3>
          <p class="fs-course-desc">Gezielter Theorieunterricht — ideal zur Vorbereitung auf die Theorieprüfung.</p>
          <ul class="fs-course-list">
            <li>✓ Einzelunterricht</li>
            <li>✓ Lernmaterialien inkl.</li>
            <li>✓ Schwächen gezielt trainieren</li>
          </ul>
          <div class="fs-course-price">CHF 40.– <span>/ 45 Min</span></div>
          <button @click="showContact=true" class="fs-price-cta fs-price-cta-gray">Anfragen →</button>
        </div>
      </div>
      <div class="fs-insurance-note">
        <span>🔒</span>
        <p>Einmalige Fahrzeugversicherung: <strong>CHF 120.–</strong> — einmalig pro Schüler, unabhängig von der Anzahl Stunden.</p>
      </div>
    </section>

    <!-- FAHRZEUGE -->
    <div class="fs-stats-band">
      <div class="fs-vehicles-inner">
        <p class="fs-eyebrow fs-center" style="grid-column:1/-1; margin-bottom:12px;">Ausbildungsfahrzeuge</p>
        <div class="fs-vehicle-card">
          <div class="fs-vehicle-icon">⚙️</div>
          <div>
            <p class="fs-vehicle-name">Audi A3</p>
            <p class="fs-vehicle-type">Schaltgetriebe · Kategorie B</p>
          </div>
        </div>
        <div class="fs-vehicle-sep"></div>
        <div class="fs-vehicle-card">
          <div class="fs-vehicle-icon">🔄</div>
          <div>
            <p class="fs-vehicle-name">Seat Leon</p>
            <p class="fs-vehicle-type">Automatik · Kategorie B</p>
          </div>
        </div>
      </div>
    </div>

    <!-- KONTAKT -->
    <section id="kontakt" class="fs-section fs-section-gray">
      <div class="fs-contact-grid">
        <div>
          <p class="fs-eyebrow">Direkt & unkompliziert</p>
          <h2 class="fs-h2">Kontakt &amp;<br/>Standort</h2>
          <p class="fs-body">Martin antwortet in der Regel innerhalb weniger Stunden. Schreib ihm direkt oder ruf an — kein Call Center, keine Warteliste.</p>
          <div class="fs-contact-items">
            <a :href="whatsappLink" target="_blank" class="fs-contact-item fs-contact-wa">
              <span class="fs-contact-icon">💬</span>
              <div>
                <p class="fs-contact-label">WhatsApp (bevorzugt)</p>
                <p class="fs-contact-val">079 124 89 22</p>
              </div>
            </a>
            <a href="tel:+41791248922" class="fs-contact-item">
              <span class="fs-contact-icon">📞</span>
              <div>
                <p class="fs-contact-label">Telefon</p>
                <p class="fs-contact-val">079 124 89 22</p>
              </div>
            </a>
            <a href="mailto:info@fahre-schlau.com" class="fs-contact-item">
              <span class="fs-contact-icon">✉️</span>
              <div>
                <p class="fs-contact-label">E-Mail</p>
                <p class="fs-contact-val">info@fahre-schlau.com</p>
              </div>
            </a>
            <div class="fs-contact-item">
              <span class="fs-contact-icon">📍</span>
              <div>
                <p class="fs-contact-label">Standort</p>
                <p class="fs-contact-val">Bahnhofstrasse 7, 8330 Pfäffikon ZH</p>
              </div>
            </div>
            <div class="fs-contact-item">
              <span class="fs-contact-icon">🕐</span>
              <div>
                <p class="fs-contact-label">Verfügbarkeit</p>
                <p class="fs-contact-val">Mo–Fr 6:00–20:00 Uhr</p>
              </div>
            </div>
            <div class="fs-contact-item">
              <span class="fs-contact-icon">🌍</span>
              <div>
                <p class="fs-contact-label">Sprachen</p>
                <p class="fs-contact-val">Deutsch · Italiano · English</p>
              </div>
            </div>
          </div>
        </div>
        <div class="fs-map-box">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2706.5!2d8.775!3d47.372!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x479aa0e0b1b1b1b1%3A0x0!2sbahnhofstrasse+7+pfaeffikon+zh!5e0!3m2!1sde!2sch!4v1716000000000!5m2!1sde!2sch"
            width="100%" height="100%" style="border:0;" allowfullscreen loading="lazy"
            referrerpolicy="no-referrer-when-downgrade">
          </iframe>
        </div>
      </div>
    </section>

    <!-- FINAL CTA -->
    <section class="fs-section">
      <div class="fs-final-box">
        <div class="fs-final-glow"></div>
        <div style="position:relative; z-index:1;">
          <p class="fs-eyebrow fs-eyebrow-blue">Bereit?</p>
          <h2 class="fs-final-h2">Starte jetzt.<br/>Besteh beim ersten Mal.</h2>
          <p class="fs-final-sub">Kein Risiko. Keine Vorauszahlung. 100% Erfolgsquote.</p>
          <div class="fs-final-ctas">
            <button @click="openBooking" class="fs-cta-primary fs-cta-lg">
              Termin buchen
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <a :href="whatsappLink" target="_blank" class="fs-cta-wa fs-cta-wa-dark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#4ADE80"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            <button @click="showContact=true" class="fs-cta-ghost">Kontaktformular</button>
          </div>
        </div>
      </div>
    </section>

    <!-- MOBILE STICKY BAR -->
    <div class="fs-mobile-bar">
      <a :href="whatsappLink" target="_blank" class="fs-mobile-wa">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#16A34A"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        WhatsApp
      </a>
      <button @click="openBooking" class="fs-mobile-book">Termin buchen</button>
    </div>

    <footer class="fs-footer">
      <div class="fs-footer-inner">
        <img src="/images/fahre-schlau-logo-transparent.png" alt="fahre-schlau" class="fs-footer-logo-img" />
        <p class="fs-footer-copy">Martin Scotti · Bahnhofstrasse 7, 8330 Pfäffikon ZH · 079 124 89 22 · © {{ new Date().getFullYear() }}</p>
        <a href="https://www.fahre-schlau.com" target="_blank" class="fs-footer-link">fahre-schlau.com →</a>
      </div>
    </footer>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
definePageMeta({ layout: false })

const whatsappMsg = encodeURIComponent('Hallo Martin 👋 Ich interessiere mich für Fahrstunden bei fahre-schlau. Kannst du mir mehr Infos geben und einen Termin vorschlagen?')
const whatsappLink = `https://wa.me/41791248922?text=${whatsappMsg}`

const showBooking = ref(false)
const bookingStep = ref(1)
const bookingDone = ref(false)
const selectedCategory = ref('')
const selectedDay = ref<number|null>(null)
const selectedTime = ref('')
const form = ref({ firstName: '', lastName: '', email: '', phone: '' })

const today = new Date()
const calMonth = ref(today.getMonth())
const calYear = ref(today.getFullYear())
const months = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
const monthName = computed(() => months[calMonth.value])
const calDays = computed(() => new Date(calYear.value, calMonth.value + 1, 0).getDate())
const calOffset = computed(() => { const d = new Date(calYear.value, calMonth.value, 1).getDay(); return d === 0 ? 6 : d - 1 })
const isPast = (day: number) => { const d = new Date(calYear.value, calMonth.value, day); const t = new Date(); t.setHours(0,0,0,0); return d < t }
const isWeekend = (day: number) => { const d = new Date(calYear.value, calMonth.value, day).getDay(); return d === 0 || d === 6 }
const selectDay = (day: number) => { if (!isPast(day)) selectedDay.value = day }
const prevMonth = () => { if (calMonth.value === 0) { calMonth.value = 11; calYear.value-- } else calMonth.value-- }
const nextMonth = () => { if (calMonth.value === 11) { calMonth.value = 0; calYear.value++ } else calMonth.value++ }

const timeSlots = [
  {time:'07:00',free:true},{time:'07:45',free:false},{time:'08:30',free:true},
  {time:'09:15',free:true},{time:'10:00',free:false},{time:'10:45',free:true},
  {time:'11:30',free:true},{time:'13:00',free:false},{time:'13:45',free:true},
  {time:'14:30',free:true},{time:'15:15',free:false},{time:'16:00',free:true},
  {time:'16:45',free:true},{time:'17:30',free:true},{time:'18:15',free:false},
]
const categories = [
  {id:'auto',icon:'🚗',name:'Auto (Schaltung)',price:85},
  {id:'automat',icon:'🚙',name:'Auto (Automat)',price:85},
  {id:'bpt',icon:'🚕',name:'BPT / Taxi (Kat. D)',price:85},
  {id:'nothelfer',icon:'🏥',name:'Nothelferkurs',price:85},
  {id:'vku',icon:'📚',name:'VKU Intensiv',price:180},
  {id:'theorie',icon:'📖',name:'Theorielektion',price:40},
]
const openBooking = () => { bookingStep.value=1; bookingDone.value=false; selectedCategory.value=''; selectedDay.value=null; selectedTime.value=''; form.value={firstName:'',lastName:'',email:'',phone:''}; showBooking.value=true }
const closeBooking = () => { showBooking.value=false }
const confirmBooking = () => { bookingDone.value=true }

const showContact = ref(false)
const isDark = ref(true)
const contactDone = ref(false)
const contactForm = ref({ name:'', phone:'', interest:'Autofahrstunden (Kat. B)', message:'' })
const submitContact = () => { contactDone.value=true }

const stats = [
  {value:'100%',label:'Bestehensquote'},
  {value:'5.0 ★',label:'Google Bewertung'},
  {value:'6+',label:'Jahre Erfahrung'},
  {value:'1:1',label:'Einzelunterricht'},
]
const facts = [
  {label:'Ausbildung',value:'Eidg. Fahrlehrer Kat. B'},
  {label:'Fahrlehrer seit',value:'November 2019'},
  {label:'Jahrgang',value:'1992'},
  {label:'Standort',value:'Pfäffikon ZH & Umgebung'},
  {label:'Fahrzeuge',value:'Audi A3 / Seat Leon (Automat)'},
  {label:'Sprachen',value:'DE · IT · EN'},
]
const prices = [
  {label:'Einzelstunde',price:'85',unit:'45 Min · Kat. B (Schaltung)',highlight:false,features:['Audi A3 oder Seat Leon','Flexible Terminwahl','Persönliches Feedback']},
  {label:'10er Paket',price:'850',unit:'10×45 Min · CHF 85.-/Std.',highlight:true,features:['Schaltung oder Automat','Flexibel einlösbar','Prüfungsvorbereitung inkl.']},
  {label:'WarmUp & Prüfung',price:'280',unit:'Prüfungsvorbereitung',highlight:false,features:['1h Intensivvorbereitung','Prüfungsfahrt mit Martin','Begleitung bis Prüfung']},
]
const showVKU = ref(false)
const vkuStep = ref<'info'|'form'|'done'>('info')
const vkuSelectedDate = ref('')
const vkuForm = ref({firstName:'',lastName:'',email:'',phone:''})
const submitVKU = () => { vkuStep.value = 'done' }
const openVKU = () => { vkuStep.value='info'; vkuSelectedDate.value=''; vkuForm.value={firstName:'',lastName:'',email:'',phone:''}; showVKU.value=true }

const showNothilfe = ref(false)
const nothilfeStep = ref<'info'|'form'|'done'>('info')
const nothilfeSelectedDate = ref('')
const nothilfeForm = ref({firstName:'',lastName:'',email:'',phone:''})
const submitNothilfe = () => { nothilfeStep.value = 'done' }
const openNothilfe = () => { nothilfeStep.value='info'; nothilfeSelectedDate.value=''; nothilfeForm.value={firstName:'',lastName:'',email:'',phone:''}; showNothilfe.value=true }

const vkuDates = [
  {id:'jun',label:'18. – 19. Juni 2026',days:'Do 18.6. + Fr 19.6.',spots:8},
  {id:'aug',label:'20. – 21. Aug. 2026',days:'Do 20.8. + Fr 21.8.',spots:12},
  {id:'sep',label:'17. – 18. Sept. 2026',days:'Do 17.9. + Fr 18.9.',spots:12},
  {id:'okt',label:'29. – 30. Okt. 2026',days:'Do 29.10. + Fr 30.10.',spots:12},
  {id:'nov',label:'19. – 20. Nov. 2026',days:'Do 19.11. + Fr 20.11.',spots:12},
  {id:'dez',label:'17. – 18. Dez. 2026',days:'Do 17.12. + Fr 18.12.',spots:12},
]
const licenseSteps = [
  {nr:1,title:'Nothelferkurs',desc:'Pflicht vor dem Lernfahrausweis. Darf nicht älter als 6 Jahre sein.',martin:true},
  {nr:2,title:'Gesuch Lernfahrausweis',desc:'Gesuch beim StVA oder online. Gemeinde bestätigt Identität, Sehtest ggf. beim Optiker.',martin:false},
  {nr:3,title:'Theorieprüfung',desc:'Beim StVA ablegen. Kat. A/A1-Inhaber sind befreit.',martin:false},
  {nr:4,title:'Lernfahrausweis',desc:'Kommt per Post (2 Jahre gültig). Private Fahrten nur mit Begleiter (min. 23 J., 3 J. Ausweis).',martin:false},
  {nr:5,title:'Fahrlektionen',desc:'Martin bereitet dich gezielt und effizient auf die praktische Prüfung vor.',martin:true},
  {nr:6,title:'VKU – Verkehrskundeunterricht',desc:'Intensivkurs Do/Fr abends bei Martin am Bahnhof Pfäffikon ZH. Darf max. 2 Jahre alt sein.',martin:true},
  {nr:7,title:'Praktische Führerprüfung',desc:'45 Minuten. Gemeinsam entscheiden wir, wann du bereit bist.',martin:true},
  {nr:8,title:'Ausweis auf Probe',desc:'3 Jahre Probezeit. WAB-Kurs im ersten Jahr Pflicht. Danach automatisch definitiver Ausweis.',martin:false},
]
useHead({ title:'fahre-schlau – Martin Scotti | Fahrlehrer Pfäffikon ZH', meta:[{name:'robots',content:'noindex'}] })
</script>

<style>
/* ── Base ── */
.fs-root { font-family: 'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#111827; background:#fff; -webkit-font-smoothing:antialiased; overflow-x:hidden; max-width:100vw; }
*, *::before, *::after { box-sizing: border-box; }
/* ── Nav ── */
.fs-nav { position:fixed; top:0; left:0; right:0; z-index:100; display:flex; align-items:center; justify-content:space-between; padding:16px 48px; background:rgba(5,5,5,0.88); backdrop-filter:blur(24px); border-bottom:1px solid rgba(255,255,255,0.07); gap:16px; max-width:100vw; }
.fs-nav-logo { display:flex; align-items:center; flex-shrink:0; }
.fs-logo-img { height:38px; width:auto; max-width:160px; display:block; object-fit:contain; flex-shrink:0; transition:filter 0.3s ease, opacity 0.3s ease; }
/* Transparent PNG: dark logo-farben → in dark mode aufhellen */
[data-theme="dark"] .fs-logo-img  { filter: brightness(0) invert(1); opacity:0.92; }
/* Light mode: original dark logo auf hellem nav */
[data-theme="light"] .fs-logo-img { filter: none; opacity:1; }
.fs-nav-links { display:flex; align-items:center; gap:24px; }
.fs-nav-link { color:rgba(255,255,255,0.5); font-size:14px; font-weight:500; text-decoration:none; }
.fs-nav-btn-ghost { background:none; border:none; cursor:pointer; }
.fs-nav-ctas { display:flex; align-items:center; gap:10px; }
.fs-nav-wa { display:flex; align-items:center; gap:6px; background:rgba(22,163,74,0.15); border:1px solid rgba(22,163,74,0.3); color:#4ADE80; font-size:13px; font-weight:700; padding:8px 14px; border-radius:10px; text-decoration:none; }
.fs-nav-book { background:#3B82F6; color:white; font-size:14px; font-weight:700; padding:10px 18px; border-radius:12px; border:none; cursor:pointer; white-space:nowrap; }
/* ── Hero ── */
.fs-hero { background:#050505; min-height:100vh; display:flex; align-items:center; position:relative; overflow:hidden; }
.fs-hero-grid { position:absolute; inset:0; opacity:0.04; background-image:linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px); background-size:64px 64px; }
.fs-hero-glow1 { position:absolute; top:-300px; right:-200px; width:900px; height:900px; background:radial-gradient(circle,rgba(59,130,246,0.14) 0%,transparent 65%); pointer-events:none; }
.fs-hero-glow2 { position:absolute; bottom:-200px; left:-150px; width:600px; height:600px; background:radial-gradient(circle,rgba(99,102,241,0.08) 0%,transparent 65%); pointer-events:none; }
.fs-hero-content { position:relative; z-index:10; max-width:1280px; margin:0 auto; padding:140px 48px 80px; width:100%; min-width:0; display:grid; grid-template-columns:1fr 400px; gap:80px; align-items:center; }
.fs-hero-badge-row { display:flex; align-items:center; gap:10px; margin-bottom:28px; flex-wrap:wrap; }
.fs-stars { color:#F59E0B; font-size:13px; letter-spacing:1px; }
.fs-badge-text { color:rgba(255,255,255,0.4); font-size:13px; }
.fs-badge-pill { background:rgba(59,130,246,0.18); border:1px solid rgba(59,130,246,0.35); color:#60A5FA; font-size:11px; font-weight:700; padding:4px 12px; border-radius:100px; text-transform:uppercase; letter-spacing:0.06em; }
.fs-h1 { color:white; font-weight:900; line-height:1.0; margin:0 0 28px; letter-spacing:-0.04em; font-size:clamp(46px,6vw,84px); }
.fs-h1-outline { color:transparent; -webkit-text-stroke:1.5px rgba(255,255,255,0.28); }
.fs-h1-blue { color:#3B82F6; }
.fs-hero-sub { color:rgba(255,255,255,0.45); font-size:18px; line-height:1.7; margin:0 0 40px; max-width:500px; }
.fs-hero-ctas { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:48px; }
.fs-cta-primary { background:#3B82F6; color:white; font-weight:700; font-size:16px; padding:16px 28px; border-radius:14px; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:8px; text-decoration:none; white-space:nowrap; }
.fs-cta-wa { display:inline-flex; align-items:center; gap:8px; background:rgba(22,163,74,0.15); border:1px solid rgba(22,163,74,0.3); color:rgba(255,255,255,0.8); font-weight:600; font-size:16px; padding:16px 24px; border-radius:14px; text-decoration:none; white-space:nowrap; }
.fs-cta-wa-dark { background:rgba(22,163,74,0.15) !important; border-color:rgba(22,163,74,0.3) !important; }
.fs-cta-lg { font-size:17px; padding:18px 36px; }
.fs-cta-ghost { border:1px solid rgba(255,255,255,0.14); color:rgba(255,255,255,0.65); font-weight:600; font-size:17px; padding:18px 32px; border-radius:14px; background:none; cursor:pointer; }
.fs-stats-row { display:grid; grid-template-columns:repeat(3,auto); max-width:380px; }
.fs-stat { border-top:2px solid rgba(255,255,255,0.09); padding-top:18px; padding-right:28px; }
.fs-stat-border { border-left:1px solid rgba(255,255,255,0.06); padding-left:28px; }
.fs-stat-val { color:white; font-weight:900; font-size:30px; letter-spacing:-0.04em; margin:0 0 4px; }
.fs-stat-lbl { color:rgba(255,255,255,0.3); font-size:10px; text-transform:uppercase; letter-spacing:0.1em; margin:0; }
.fs-photo-card { position:relative; border-radius:22px; overflow:hidden; aspect-ratio:4/5; background:#1e293b; border:1px solid rgba(255,255,255,0.09); }
.fs-photo { width:100%; height:100%; object-fit:cover; object-position:center top; display:block; }
.fs-photo-info { position:absolute; bottom:0; left:0; right:0; padding:24px; background:linear-gradient(to top,rgba(0,0,0,0.9) 0%,transparent 100%); }
.fs-photo-name { color:white; font-weight:900; font-size:21px; letter-spacing:-0.03em; margin:0 0 3px; }
.fs-photo-role { color:rgba(255,255,255,0.45); font-size:12px; margin:0; }
.fs-badge-top { position:absolute; top:-14px; right:-14px; background:#3B82F6; color:white; border-radius:14px; padding:12px 16px; transform:rotate(3deg); }
.fs-badge-pct { font-weight:900; font-size:24px; letter-spacing:-0.04em; margin:0; }
.fs-badge-pct-lbl { color:rgba(255,255,255,0.75); font-size:10px; font-weight:600; margin:2px 0 0; }
.fs-badge-bottom { position:absolute; bottom:-14px; left:-14px; background:#111; border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:10px 14px; }
.fs-badge-stars { color:#F59E0B; font-size:11px; margin-bottom:3px; }
.fs-badge-google { color:white; font-size:11px; font-weight:700; margin:0; }
.fs-hero-right { position:relative; }
/* ── Stats Band ── */
.fs-stats-band { background:#F9FAFB; border-top:1px solid #F0F0F0; border-bottom:1px solid #F0F0F0; padding:36px 48px; }
.fs-stats-band-inner { max-width:1280px; margin:0 auto; display:grid; grid-template-columns:repeat(4,1fr); gap:24px; text-align:center; }
.fs-band-val { font-weight:900; font-size:34px; letter-spacing:-0.04em; color:#111827; margin:0 0 4px; }
.fs-band-lbl { color:#6B7280; font-size:11px; text-transform:uppercase; letter-spacing:0.08em; margin:0; }
/* ── Section ── */
.fs-section { padding:100px 48px; max-width:1280px; margin:0 auto; }
.fs-section-gray { max-width:100% !important; background:#F9FAFB; border-top:1px solid #F3F4F6; padding:100px 48px; }
.fs-section-gray > * { max-width:1280px; margin:0 auto; }
.fs-eyebrow { color:#3B82F6; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; margin:0 0 16px; }
.fs-eyebrow-blue { color:#3B82F6; }
.fs-h2 { font-weight:900; font-size:clamp(32px,3.5vw,52px); letter-spacing:-0.04em; line-height:1.05; color:#111827; margin:0 0 28px; }
.fs-center { text-align:center; }
.fs-body { color:#4B5563; font-size:17px; line-height:1.75; margin:0 0 16px; }
.fs-body strong { color:#111827; }
/* ── About ── */
.fs-about-grid { display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:start; }
.fs-facts-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:28px 0 32px; }
.fs-fact { background:#F9FAFB; border:1px solid #F3F4F6; border-radius:14px; padding:16px 18px; }
.fs-fact-lbl { color:#9CA3AF; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; margin:0 0 5px; }
.fs-fact-val { color:#111827; font-weight:700; font-size:13px; margin:0; }
.fs-about-ctas { display:flex; gap:12px; flex-wrap:wrap; }
.fs-cta-wa-light { display:inline-flex; align-items:center; gap:8px; background:#F0FDF4; border:1px solid #BBF7D0; color:#15803D; font-weight:700; font-size:15px; padding:14px 22px; border-radius:12px; text-decoration:none; }
.fs-about-right { display:flex; flex-direction:column; gap:16px; }
.fs-driving-img { border-radius:22px; overflow:hidden; aspect-ratio:16/9; }
.fs-img-full { width:100%; height:100%; object-fit:cover; display:block; }
.fs-quote-card { background:#050505; border:1px solid rgba(255,255,255,0.07); border-radius:22px; padding:30px; }
.fs-quote { color:rgba(255,255,255,0.85); font-size:16px; font-weight:500; line-height:1.7; margin:0 0 22px; }
.fs-quote-author { display:flex; align-items:center; gap:12px; padding-top:18px; border-top:1px solid rgba(255,255,255,0.08); }
.fs-quote-avatar { width:38px; height:38px; border-radius:50%; background:#3B82F6; display:flex; align-items:center; justify-content:center; color:white; font-weight:900; font-size:13px; flex-shrink:0; }
.fs-quote-name { color:white; font-weight:700; font-size:14px; margin:0 0 2px; }
.fs-quote-role { color:rgba(255,255,255,0.3); font-size:12px; margin:0; }
/* ── Prices ── */
.fs-section-header { text-align:center; margin-bottom:64px; }
.fs-price-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; max-width:1000px; margin:0 auto 40px; }
.fs-price-card { background:white; border:1px solid #F3F4F6; border-radius:22px; padding:32px; display:flex; flex-direction:column; }
.fs-price-dark { background:#050505; border-color:rgba(255,255,255,0.07); }
.fs-price-badge { display:inline-block; background:#3B82F6; color:white; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:0.08em; padding:5px 12px; border-radius:100px; margin-bottom:16px; width:fit-content; }
.fs-price-lbl { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; margin:0 0 12px; color:#9CA3AF; }
.fs-price-lbl-dark { color:rgba(255,255,255,0.25); }
.fs-price-amt { font-weight:900; font-size:40px; letter-spacing:-0.04em; margin:0 0 4px; color:#111827; }
.fs-price-amt-dark { color:white; }
.fs-price-unit { font-size:13px; margin:0 0 28px; color:#9CA3AF; }
.fs-price-unit-dark { color:rgba(255,255,255,0.3); }
.fs-price-features { list-style:none; margin:0 0 28px; padding:0; display:flex; flex-direction:column; gap:10px; flex:1; }
.fs-price-feature { display:flex; align-items:flex-start; gap:8px; font-size:14px; color:#4B5563; }
.fs-price-feature-dark { color:rgba(255,255,255,0.6); }
.fs-check { color:#3B82F6; font-weight:900; flex-shrink:0; }
.fs-price-cta { display:block; width:100%; text-align:center; font-weight:700; font-size:14px; padding:14px; border-radius:12px; border:none; cursor:pointer; }
.fs-price-cta-blue { background:#3B82F6; color:white; }
.fs-price-cta-gray { background:#F3F4F6; color:#111827; }
.fs-price-note { text-align:center; color:#9CA3AF; font-size:13px; margin:0; }
.fs-link { color:#3B82F6; font-weight:700; background:none; border:none; cursor:pointer; font-size:13px; }
/* ── Steps ── */
.fs-steps-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
.fs-step-card { background:white; border:1px solid #F3F4F6; border-radius:18px; padding:22px 20px; display:flex; gap:16px; align-items:flex-start; }
.fs-step-martin { border-color:rgba(59,130,246,0.25); background:#F8FBFF; }
.fs-step-nr { width:36px; height:36px; border-radius:10px; background:#F3F4F6; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:15px; color:#9CA3AF; flex-shrink:0; }
.fs-step-nr-active { background:#3B82F6; color:white; }
.fs-step-body { min-width:0; }
.fs-step-title { font-weight:700; font-size:14px; color:#111827; margin:0 0 5px; line-height:1.3; }
.fs-step-desc { font-size:12px; color:#6B7280; line-height:1.55; margin:0 0 8px; }
.fs-step-tag { display:inline-block; background:rgba(59,130,246,0.1); color:#2563EB; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; padding:3px 8px; border-radius:100px; }
/* ── Kurs Modals ── */
.fs-kurs-modal { max-width:600px; }
.fs-kurs-info-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:22px; }
.fs-kurs-info-item { display:flex; align-items:center; gap:10px; padding:12px 14px; background:#F9FAFB; border:1px solid #F3F4F6; border-radius:12px; }
.fs-kurs-info-icon { font-size:18px; flex-shrink:0; }
.fs-kurs-info-lbl { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#9CA3AF; margin:0 0 2px; }
.fs-kurs-info-val { font-size:13px; font-weight:600; color:#111827; margin:0; line-height:1.3; }
.fs-kurs-section-title { font-weight:800; font-size:14px; color:#111827; margin:0 0 12px; letter-spacing:-0.01em; }
.fs-kurs-section-title strong { color:#3B82F6; }
.fs-kurs-dates { display:flex; flex-direction:column; gap:8px; margin-bottom:20px; }
.fs-kurs-date-btn { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; background:#F9FAFB; border:2px solid #F3F4F6; border-radius:14px; cursor:pointer; text-align:left; transition:all 0.15s; }
.fs-kurs-date-btn:hover { border-color:#BAE6FD; background:#F0F9FF; }
.fs-kurs-date-active { border-color:#3B82F6 !important; background:#EFF6FF !important; }
.fs-kurs-date-label { font-weight:700; font-size:14px; color:#111827; margin:0 0 2px; }
.fs-kurs-date-sub { font-size:12px; color:#6B7280; margin:0; }
.fs-kurs-spots { font-size:11px; font-weight:700; background:#DCFCE7; color:#15803D; padding:4px 10px; border-radius:100px; white-space:nowrap; flex-shrink:0; }
.fs-kurs-form { border-top:1px solid #F3F4F6; padding-top:18px; margin-top:4px; }
.fs-kurs-agb { font-size:11px; color:#9CA3AF; margin:0 0 14px; line-height:1.5; }
.fs-kurs-notice { background:#FFF7ED; border:1px solid #FED7AA; border-radius:12px; padding:12px 14px; margin-bottom:18px; font-size:13px; color:#92400E; line-height:1.5; }
.fs-kurs-notice p { margin:0; }
/* Dark mode kurs modal */
[data-theme="dark"] .fs-kurs-info-item { background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.07); }
[data-theme="dark"] .fs-kurs-info-lbl { color:rgba(255,255,255,0.3); }
[data-theme="dark"] .fs-kurs-info-val { color:white; }
[data-theme="dark"] .fs-kurs-section-title { color:white; }
[data-theme="dark"] .fs-kurs-date-btn { background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.08); }
[data-theme="dark"] .fs-kurs-date-btn:hover { border-color:rgba(59,130,246,0.4); background:rgba(59,130,246,0.08); }
[data-theme="dark"] .fs-kurs-date-label { color:white; }
[data-theme="dark"] .fs-kurs-date-sub { color:rgba(255,255,255,0.4); }
[data-theme="dark"] .fs-kurs-form { border-top-color:rgba(255,255,255,0.08); }
[data-theme="dark"] .fs-kurs-agb { color:rgba(255,255,255,0.3); }
[data-theme="dark"] .fs-kurs-notice { background:rgba(251,191,36,0.08); border-color:rgba(251,191,36,0.2); color:#FCD34D; }
.fs-courses-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; margin-bottom:28px; }
.fs-course-card { background:white; border:1px solid #F3F4F6; border-radius:22px; padding:28px 28px 24px; display:flex; flex-direction:column; gap:0; }
.fs-course-highlight { border-color:rgba(59,130,246,0.3); box-shadow:0 0 0 1px rgba(59,130,246,0.15); }
.fs-course-icon-box { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px; margin-bottom:14px; }
.fs-course-icon-blue { background:rgba(59,130,246,0.12); }
.fs-course-icon-amber { background:rgba(245,158,11,0.12); }
.fs-course-icon-green { background:rgba(22,163,74,0.12); }
.fs-course-icon-purple { background:rgba(139,92,246,0.12); }
.fs-course-title { font-weight:800; font-size:17px; letter-spacing:-0.02em; margin:0 0 8px; color:#111827; }
.fs-course-desc { font-size:14px; line-height:1.65; color:#6B7280; margin:0 0 16px; }
.fs-course-list { list-style:none; padding:0; margin:0 0 16px; display:flex; flex-direction:column; gap:6px; }
.fs-course-list li { font-size:13px; color:#374151; display:flex; align-items:center; gap:6px; }
.fs-vku-dates { background:#F9FAFB; border:1px solid #F3F4F6; border-radius:12px; padding:12px 14px; margin-bottom:16px; }
.fs-vku-dates-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#9CA3AF; margin:0 0 10px; }
.fs-vku-date-row { display:flex; align-items:center; gap:8px; font-size:13px; color:#374151; margin-bottom:6px; }
.fs-vku-date-row:last-child { margin-bottom:0; }
.fs-vku-dot { width:6px; height:6px; border-radius:50%; background:#3B82F6; flex-shrink:0; }
.fs-vku-spots { margin-left:auto; font-size:11px; background:#DCFCE7; color:#15803D; font-weight:600; padding:2px 8px; border-radius:100px; }
.fs-course-price { font-weight:900; font-size:22px; letter-spacing:-0.03em; color:#111827; margin:0 0 14px; margin-top:auto; padding-top:16px; }
.fs-course-price span { font-size:13px; font-weight:400; color:#9CA3AF; }
.fs-course-link { text-decoration:none; display:block; }
.fs-insurance-note { display:flex; align-items:center; gap:12px; background:#F0F9FF; border:1px solid #BAE6FD; border-radius:14px; padding:14px 20px; }
.fs-insurance-note span { font-size:20px; flex-shrink:0; }
.fs-insurance-note p { margin:0; font-size:14px; color:#0369A1; line-height:1.5; }
.fs-insurance-note strong { color:#0C4A6E; }
/* ── Vehicles ── */
.fs-vehicles-inner { max-width:1280px; margin:0 auto; display:grid; grid-template-columns:1fr auto 1fr; gap:0; align-items:center; text-align:center; padding:0 48px; }
.fs-vehicle-card { display:flex; align-items:center; gap:16px; justify-content:center; padding:8px 0; }
.fs-vehicle-icon { font-size:32px; }
.fs-vehicle-name { font-weight:900; font-size:20px; letter-spacing:-0.03em; margin:0 0 3px; color:#111827; }
.fs-vehicle-type { font-size:13px; color:#6B7280; margin:0; }
.fs-vehicle-sep { width:1px; height:48px; background:#F0F0F0; }
/* ── Contact ── */
.fs-contact-grid { display:grid; grid-template-columns:1fr 1fr; gap:64px; align-items:start; }
.fs-contact-items { display:flex; flex-direction:column; gap:12px; margin-top:28px; }
.fs-contact-item { display:flex; align-items:center; gap:14px; padding:14px 16px; background:white; border:1px solid #F3F4F6; border-radius:14px; text-decoration:none; }
.fs-contact-wa { border-color:rgba(22,163,74,0.2); background:#F0FDF4; }
.fs-contact-icon { font-size:20px; flex-shrink:0; }
.fs-contact-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#9CA3AF; margin:0 0 2px; }
.fs-contact-val { font-size:15px; font-weight:700; color:#111827; margin:0; }
.fs-contact-wa .fs-contact-label { color:#15803D; }
.fs-contact-wa .fs-contact-val { color:#14532D; }
.fs-map-box { border-radius:22px; overflow:hidden; height:480px; border:1px solid #F3F4F6; }
/* ── Footer logo ── */
.fs-footer-logo-img { height:28px; width:auto; display:block; filter:brightness(0) invert(1); opacity:0.45; transition:opacity 0.3s; }
.fs-footer-logo-img:hover { opacity:0.7; }
.fs-final-box { background:#050505; border:1px solid rgba(255,255,255,0.07); border-radius:28px; padding:88px 64px; text-align:center; position:relative; overflow:hidden; }
.fs-final-glow { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:600px; height:600px; background:radial-gradient(circle,rgba(59,130,246,0.12) 0%,transparent 65%); pointer-events:none; }
.fs-final-h2 { font-weight:900; font-size:clamp(36px,5vw,68px); letter-spacing:-0.04em; line-height:1.0; color:white; margin:0 0 20px; }
.fs-final-sub { color:rgba(255,255,255,0.35); font-size:18px; line-height:1.7; margin:0 auto 44px; max-width:500px; }
.fs-final-ctas { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
/* ── Mobile bar ── */
.fs-mobile-bar { display:none; }
/* ── Footer ── */
.fs-footer { background:#050505; border-top:1px solid rgba(255,255,255,0.06); padding:36px 48px; }
.fs-footer-inner { max-width:1280px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
.fs-footer-logo { color:white; font-weight:900; font-size:16px; letter-spacing:-0.02em; }
.fs-footer-copy { color:rgba(255,255,255,0.2); font-size:12px; margin:0; }
.fs-footer-link { color:rgba(255,255,255,0.25); font-size:12px; text-decoration:none; }
/* ── Modal ── */
.fs-modal-overlay { position:fixed; inset:0; z-index:200; display:flex; align-items:flex-end; justify-content:center; padding:0; }
.fs-modal-bg { position:absolute; inset:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(8px); }
.fs-modal-box { position:relative; z-index:1; background:white; border-radius:28px 28px 0 0; width:100%; max-width:540px; max-height:92vh; overflow-y:auto; box-shadow:0 -16px 64px rgba(0,0,0,0.3); }
.fs-modal-header { padding:24px 28px 20px; border-bottom:1px solid #F3F4F6; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; background:white; z-index:1; }
.fs-modal-title { font-weight:900; font-size:18px; letter-spacing:-0.02em; margin:0 0 2px; }
.fs-modal-sub { color:#6B7280; font-size:12px; margin:0; }
.fs-modal-close { width:34px; height:34px; border-radius:50%; background:#F9FAFB; border:1px solid #F3F4F6; cursor:pointer; font-size:18px; color:#6B7280; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.fs-modal-body { padding:24px 28px; }
.fs-step-label { font-weight:700; font-size:13px; color:#6B7280; margin:0 0 16px; }
.fs-cat-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px; }
.fs-cat-btn { padding:14px; border-radius:14px; text-align:left; cursor:pointer; border:2px solid #F3F4F6; background:#F9FAFB; }
.fs-cat-active { border-color:#3B82F6 !important; background:#EFF6FF !important; }
.fs-cat-icon { font-size:20px; margin:0 0 5px; }
.fs-cat-name { font-weight:700; font-size:13px; color:#111827; margin:0 0 2px; }
.fs-cat-price { color:#9CA3AF; font-size:11px; margin:0; }
.fs-cal-nav { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
.fs-cal-arrow { width:32px; height:32px; border-radius:8px; border:1px solid #E5E7EB; background:white; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center; }
.fs-cal-month { font-weight:700; font-size:15px; margin:0; color:#111827; }
.fs-cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; margin-bottom:20px; }
.fs-cal-dow { text-align:center; font-size:10px; font-weight:700; color:#9CA3AF; padding:4px 0; }
.fs-cal-day { aspect-ratio:1; border-radius:8px; border:none; font-size:12px; font-weight:600; cursor:pointer; background:#F9FAFB; color:#111827; display:flex; align-items:center; justify-content:center; }
.fs-cal-selected { background:#3B82F6 !important; color:white !important; }
.fs-cal-past { opacity:0.25; cursor:not-allowed; }
.fs-cal-weekend { background:#FEF3C7; color:#92400E; }
.fs-time-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:20px; }
.fs-time-btn { padding:11px 6px; border-radius:10px; border:2px solid #F3F4F6; font-size:13px; font-weight:600; cursor:pointer; background:#F9FAFB; color:#111827; }
.fs-time-selected { background:#3B82F6 !important; color:white !important; border-color:#3B82F6 !important; }
.fs-time-taken { color:#D1D5DB; text-decoration:line-through; cursor:not-allowed; }
.fs-booking-summary { background:#F0F9FF; border:1px solid #BAE6FD; border-radius:10px; padding:10px 14px; margin-bottom:18px; font-size:13px; color:#0369A1; font-weight:500; }
.fs-form-fields { display:flex; flex-direction:column; gap:12px; margin-bottom:18px; }
.fs-form-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.fs-form-group { display:flex; flex-direction:column; gap:5px; }
.fs-label { font-size:12px; font-weight:600; color:#374151; }
.fs-input { padding:12px 14px; border:1.5px solid #E5E7EB; border-radius:12px; font-size:14px; outline:none; font-family:inherit; width:100%; }
.fs-textarea { resize:none; }
.fs-btn-primary { width:100%; background:#3B82F6; color:white; font-weight:700; font-size:15px; padding:15px; border-radius:14px; border:none; cursor:pointer; }
.fs-btn-full { width:100%; }
.fs-btn-grow { flex:2; width:auto; }
.fs-btn-disabled { opacity:0.4; cursor:not-allowed; }
.fs-btn-secondary { flex:1; width:auto; background:#F9FAFB; color:#374151; font-weight:600; font-size:14px; padding:14px; border-radius:12px; border:1px solid #E5E7EB; cursor:pointer; }
.fs-btn-dark { background:#111827; color:white; font-weight:700; padding:13px 28px; border-radius:12px; border:none; cursor:pointer; font-size:14px; }
.fs-btn-row { display:flex; gap:10px; }
.fs-wa-btn { display:flex; align-items:center; justify-content:center; gap:10px; background:#F0FDF4; border:1px solid #BBF7D0; border-radius:14px; padding:13px; text-decoration:none; font-weight:700; font-size:14px; color:#15803D; }
.fs-modal-success { padding:44px 28px; text-align:center; }
.fs-success-icon { width:68px; height:68px; background:#DCFCE7; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; font-size:28px; color:#16A34A; }
.fs-success-title { font-weight:900; font-size:22px; letter-spacing:-0.03em; margin:0 0 8px; }
.fs-success-cat { color:#6B7280; font-size:14px; margin:0 0 4px; }
.fs-success-time { color:#3B82F6; font-weight:700; font-size:15px; margin:0 0 16px; }
.fs-success-msg { color:#6B7280; font-size:14px; line-height:1.6; margin:0 0 24px; }
/* ── Transitions ── */
.modal-enter-active, .modal-leave-active { transition:opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity:0; }

/* ─────────────────────────────────────────
   THEME TOGGLE BUTTON
───────────────────────────────────────── */
.fs-theme-toggle {
  width:38px; height:38px; border-radius:50%;
  border:1px solid rgba(255,255,255,0.15);
  background:rgba(255,255,255,0.08);
  cursor:pointer; font-size:16px;
  display:flex; align-items:center; justify-content:center;
  transition:all 0.2s;
}
[data-theme="light"] .fs-theme-toggle {
  border-color:rgba(0,0,0,0.12);
  background:rgba(0,0,0,0.05);
}

/* ─────────────────────────────────────────
   CSS VARIABLES – dark is default
───────────────────────────────────────── */
[data-theme="dark"] {
  --fs-page-bg:        #050505;
  --fs-hero-bg:        #050505;
  --fs-nav-bg:         rgba(5,5,5,0.88);
  --fs-nav-border:     rgba(255,255,255,0.07);
  --fs-nav-text:       rgba(255,255,255,0.5);
  --fs-card-bg:        #111;
  --fs-card-border:    rgba(255,255,255,0.07);
  --fs-section-bg:     #050505;
  --fs-band-bg:        #0e0e0e;
  --fs-band-border:    rgba(255,255,255,0.06);
  --fs-h1:             #ffffff;
  --fs-h2-color:       #ffffff;
  --fs-body-color:     rgba(255,255,255,0.5);
  --fs-strong:         #ffffff;
  --fs-eyebrow:        #60A5FA;
  --fs-band-val:       #ffffff;
  --fs-band-lbl:       rgba(255,255,255,0.3);
  --fs-fact-bg:        rgba(255,255,255,0.04);
  --fs-fact-border:    rgba(255,255,255,0.07);
  --fs-fact-lbl:       rgba(255,255,255,0.3);
  --fs-fact-val:       #ffffff;
  --fs-stat-top:       rgba(255,255,255,0.09);
  --fs-stat-val:       #ffffff;
  --fs-stat-lbl:       rgba(255,255,255,0.3);
  --fs-hero-sub:       rgba(255,255,255,0.45);
  --fs-quote-bg:       #050505;
  --fs-quote-text:     rgba(255,255,255,0.85);
  --fs-quote-border:   rgba(255,255,255,0.08);
  --fs-quote-name:     #ffffff;
  --fs-quote-role:     rgba(255,255,255,0.3);
  --fs-price-gray-bg:  #111827;
  --fs-price-gray-txt: #e5e7eb;
  --fs-gray-section:   #0a0a0a;
  --fs-gray-border:    rgba(255,255,255,0.05);
  --fs-price-note:     rgba(255,255,255,0.25);
  --fs-footer-bg:      #050505;
  --fs-footer-border:  rgba(255,255,255,0.06);
  --fs-footer-copy:    rgba(255,255,255,0.2);
  --fs-footer-link:    rgba(255,255,255,0.25);
  --fs-final-bg:       #050505;
  --fs-final-border:   rgba(255,255,255,0.07);
  --fs-final-h2:       #ffffff;
  --fs-final-sub:      rgba(255,255,255,0.35);
  --fs-modal-bg-box:   #111;
  --fs-modal-hdr-bg:   #111;
  --fs-modal-hdr-bdr:  rgba(255,255,255,0.08);
  --fs-modal-title:    #ffffff;
  --fs-modal-sub-c:    rgba(255,255,255,0.4);
  --fs-modal-close-bg: rgba(255,255,255,0.08);
  --fs-modal-close-bd: rgba(255,255,255,0.1);
  --fs-modal-close-c:  rgba(255,255,255,0.5);
  --fs-input-bg:       #1a1a1a;
  --fs-input-border:   rgba(255,255,255,0.12);
  --fs-input-text:     #ffffff;
  --fs-input-ph:       rgba(255,255,255,0.3);
  --fs-cat-bg:         rgba(255,255,255,0.04);
  --fs-cat-border:     rgba(255,255,255,0.08);
  --fs-cat-name:       #ffffff;
  --fs-cat-price:      rgba(255,255,255,0.3);
  --fs-cal-day-bg:     rgba(255,255,255,0.06);
  --fs-cal-day-c:      #ffffff;
  --fs-time-bg:        rgba(255,255,255,0.06);
  --fs-time-c:         #ffffff;
  --fs-time-border:    rgba(255,255,255,0.08);
  --fs-step-lbl:       rgba(255,255,255,0.4);
  --fs-sec-btn-bg:     rgba(255,255,255,0.06);
  --fs-sec-btn-bdr:    rgba(255,255,255,0.1);
  --fs-sec-btn-c:      rgba(255,255,255,0.6);
  --fs-mobile-bar-bg:  rgba(5,5,5,0.95);
  --fs-mobile-bar-bdr: rgba(255,255,255,0.08);
  --fs-summary-bg:     rgba(59,130,246,0.15);
  --fs-summary-border: rgba(59,130,246,0.3);
  --fs-summary-text:   #93C5FD;
}

[data-theme="light"] {
  --fs-page-bg:        #ffffff;
  --fs-hero-bg:        #F0F4FF;
  --fs-nav-bg:         rgba(255,255,255,0.92);
  --fs-nav-border:     rgba(0,0,0,0.08);
  --fs-nav-text:       #374151;
  --fs-card-bg:        #ffffff;
  --fs-card-border:    #E5E7EB;
  --fs-section-bg:     #ffffff;
  --fs-band-bg:        #F9FAFB;
  --fs-band-border:    #F0F0F0;
  --fs-h1:             #0F172A;
  --fs-h2-color:       #0F172A;
  --fs-body-color:     #4B5563;
  --fs-strong:         #111827;
  --fs-eyebrow:        #2563EB;
  --fs-band-val:       #111827;
  --fs-band-lbl:       #6B7280;
  --fs-fact-bg:        #F9FAFB;
  --fs-fact-border:    #F3F4F6;
  --fs-fact-lbl:       #9CA3AF;
  --fs-fact-val:       #111827;
  --fs-stat-top:       rgba(0,0,0,0.1);
  --fs-stat-val:       #0F172A;
  --fs-stat-lbl:       #6B7280;
  --fs-hero-sub:       #4B5563;
  --fs-quote-bg:       #F1F5F9;
  --fs-quote-text:     #1E293B;
  --fs-quote-border:   #E2E8F0;
  --fs-quote-name:     #0F172A;
  --fs-quote-role:     #64748B;
  --fs-price-gray-bg:  #F3F4F6;
  --fs-price-gray-txt: #374151;
  --fs-gray-section:   #F8F9FA;
  --fs-gray-border:    #E5E7EB;
  --fs-price-note:     #9CA3AF;
  --fs-footer-bg:      #0F172A;
  --fs-footer-border:  rgba(255,255,255,0.06);
  --fs-footer-copy:    rgba(255,255,255,0.3);
  --fs-footer-link:    rgba(255,255,255,0.35);
  --fs-final-bg:       #0F172A;
  --fs-final-border:   rgba(255,255,255,0.06);
  --fs-final-h2:       #ffffff;
  --fs-final-sub:      rgba(255,255,255,0.45);
  --fs-modal-bg-box:   #ffffff;
  --fs-modal-hdr-bg:   #ffffff;
  --fs-modal-hdr-bdr:  #F3F4F6;
  --fs-modal-title:    #111827;
  --fs-modal-sub-c:    #6B7280;
  --fs-modal-close-bg: #F9FAFB;
  --fs-modal-close-bd: #F3F4F6;
  --fs-modal-close-c:  #6B7280;
  --fs-input-bg:       #ffffff;
  --fs-input-border:   #E5E7EB;
  --fs-input-text:     #111827;
  --fs-input-ph:       #9CA3AF;
  --fs-cat-bg:         #F9FAFB;
  --fs-cat-border:     #F3F4F6;
  --fs-cat-name:       #111827;
  --fs-cat-price:      #9CA3AF;
  --fs-cal-day-bg:     #F9FAFB;
  --fs-cal-day-c:      #111827;
  --fs-time-bg:        #F9FAFB;
  --fs-time-c:         #111827;
  --fs-time-border:    #F3F4F6;
  --fs-step-lbl:       #6B7280;
  --fs-sec-btn-bg:     #F9FAFB;
  --fs-sec-btn-bdr:    #E5E7EB;
  --fs-sec-btn-c:      #374151;
  --fs-mobile-bar-bg:  rgba(255,255,255,0.95);
  --fs-mobile-bar-bdr: rgba(0,0,0,0.08);
  --fs-summary-bg:     #EFF6FF;
  --fs-summary-border: #BAE6FD;
  --fs-summary-text:   #0369A1;
}

/* ─────────────────────────────────────────
   APPLY VARIABLES
───────────────────────────────────────── */
.fs-root { background: var(--fs-page-bg); transition: background 0.3s, color 0.3s; }
.fs-nav { background: var(--fs-nav-bg); border-bottom-color: var(--fs-nav-border); }
.fs-nav-link, .fs-nav-btn-ghost { color: var(--fs-nav-text); }
.fs-hero { background: var(--fs-hero-bg); }
[data-theme="light"] .fs-hero-grid { opacity: 0.025; }
[data-theme="light"] .fs-hero-glow1 { background: radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 65%); }
.fs-h1 { color: var(--fs-h1); }
[data-theme="light"] .fs-h1-outline { -webkit-text-stroke: 1.5px rgba(0,0,0,0.2); }
.fs-hero-sub { color: var(--fs-hero-sub); }
.fs-stat-val { color: var(--fs-stat-val); }
.fs-stat-lbl { color: var(--fs-stat-lbl); }
.fs-stat { border-top-color: var(--fs-stat-top); }
.fs-stats-band { background: var(--fs-band-bg); border-color: var(--fs-band-border); }
.fs-band-val { color: var(--fs-band-val); }
.fs-band-lbl { color: var(--fs-band-lbl); }
.fs-eyebrow { color: var(--fs-eyebrow); }
.fs-h2 { color: var(--fs-h2-color); }
.fs-body { color: var(--fs-body-color); }
.fs-body strong { color: var(--fs-strong); }
.fs-fact { background: var(--fs-fact-bg); border-color: var(--fs-fact-border); }
.fs-fact-lbl { color: var(--fs-fact-lbl); }
.fs-fact-val { color: var(--fs-fact-val); }
.fs-quote-card { background: var(--fs-quote-bg); border-color: var(--fs-card-border); }
.fs-quote { color: var(--fs-quote-text); }
.fs-quote-author { border-top-color: var(--fs-quote-border); }
.fs-quote-name { color: var(--fs-quote-name); }
.fs-quote-role { color: var(--fs-quote-role); }
.fs-section-gray { background: var(--fs-gray-section); border-color: var(--fs-gray-border); }
.fs-price-card:not(.fs-price-dark) { background: white; border-color: var(--fs-gray-border); }
/* Featured dark card stays dark in BOTH modes – text is always white */
.fs-price-dark { background: #050505 !important; border-color: rgba(255,255,255,0.07) !important; }
[data-theme="dark"] .fs-price-badge { background: white; color: #111827; }
[data-theme="dark"] .fs-price-card:not(.fs-price-dark) { background: #111; border-color: rgba(255,255,255,0.07); }
[data-theme="dark"] .fs-price-lbl { color: rgba(255,255,255,0.25); }
[data-theme="dark"] .fs-price-amt { color: #ffffff; }
[data-theme="dark"] .fs-price-unit { color: rgba(255,255,255,0.3); }
[data-theme="dark"] .fs-price-feature { color: rgba(255,255,255,0.6); }
[data-theme="dark"] .fs-price-cta-gray { background: rgba(255,255,255,0.08); color: #fff; }
.fs-price-note { color: var(--fs-price-note); }
.fs-final-box { background: var(--fs-final-bg); border-color: var(--fs-final-border); }
.fs-final-h2 { color: var(--fs-final-h2); }
.fs-final-sub { color: var(--fs-final-sub); }
.fs-footer { background: var(--fs-footer-bg); border-top-color: var(--fs-footer-border); }
.fs-footer-copy { color: var(--fs-footer-copy); }
.fs-footer-link { color: var(--fs-footer-link); }
/* Modal theming */
.fs-modal-box { background: var(--fs-modal-bg-box); }
.fs-modal-header { background: var(--fs-modal-hdr-bg); border-bottom-color: var(--fs-modal-hdr-bdr); }
.fs-modal-title { color: var(--fs-modal-title); }
.fs-modal-sub { color: var(--fs-modal-sub-c); }
.fs-modal-close { background: var(--fs-modal-close-bg); border-color: var(--fs-modal-close-bd); color: var(--fs-modal-close-c); }
.fs-step-label { color: var(--fs-step-lbl); }
.fs-cat-btn { background: var(--fs-cat-bg); border-color: var(--fs-cat-border); }
.fs-cat-name { color: var(--fs-cat-name); }
.fs-cat-price { color: var(--fs-cat-price); }
.fs-input { background: var(--fs-input-bg); border-color: var(--fs-input-border); color: var(--fs-input-text); }
.fs-input::placeholder { color: var(--fs-input-ph); }
.fs-cal-day { background: var(--fs-cal-day-bg); color: var(--fs-cal-day-c); }
.fs-time-btn { background: var(--fs-time-bg); color: var(--fs-time-c); border-color: var(--fs-time-border); }
.fs-btn-secondary { background: var(--fs-sec-btn-bg); border-color: var(--fs-sec-btn-bdr); color: var(--fs-sec-btn-c); }
.fs-mobile-bar { background: var(--fs-mobile-bar-bg); border-top-color: var(--fs-mobile-bar-bdr); }
.fs-booking-summary { background: var(--fs-summary-bg); border-color: var(--fs-summary-border); color: var(--fs-summary-text); }
/* Light mode: dark photo badge stays dark regardless */
[data-theme="light"] .fs-badge-bottom { background: #0F172A; }
[data-theme="light"] .fs-photo-info { background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%); }

/* ── Previously missing overrides ── */

/* Nav badge text inherit text-color variable */
.fs-badge-text { color: var(--fs-hero-sub); }

/* Photo card border */
.fs-photo-card { border-color: var(--fs-card-border); }

/* Stat divider border in hero */
.fs-stat-border { border-left-color: var(--fs-stat-top); }

/* Hero WA CTA: white text on dark hero is fine; on light hero it needs green */
[data-theme="light"] .fs-cta-wa {
  color: #15803D;
  background: rgba(22,163,74,0.1);
  border-color: rgba(22,163,74,0.3);
}

/* Dark mode: calendar inside modal */
[data-theme="dark"] .fs-cal-arrow { background:#1a1a1a; border-color:rgba(255,255,255,0.12); color:white; }
[data-theme="dark"] .fs-cal-month { color:white; }
[data-theme="dark"] .fs-cal-dow { color:rgba(255,255,255,0.3); }
[data-theme="dark"] .fs-cal-weekend { background:rgba(245,158,11,0.15); color:#FCD34D; }

/* Dark mode: form labels & success screen */
[data-theme="dark"] .fs-label { color:rgba(255,255,255,0.65); }
[data-theme="dark"] .fs-modal-success { background:#111; }
[data-theme="dark"] .fs-success-title { color:white; }
[data-theme="dark"] .fs-success-cat,
[data-theme="dark"] .fs-success-msg { color:rgba(255,255,255,0.5); }

/* Dark mode: about section WA light CTA */
[data-theme="dark"] .fs-cta-wa-light {
  background:rgba(22,163,74,0.12);
  border-color:rgba(22,163,74,0.25);
  color:#4ADE80;
}
/* Dark mode: courses & contact */
[data-theme="dark"] .fs-step-card { background:#111; border-color:rgba(255,255,255,0.07); }
[data-theme="dark"] .fs-step-martin { background:rgba(59,130,246,0.06); border-color:rgba(59,130,246,0.2); }
[data-theme="dark"] .fs-step-nr { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.3); }
[data-theme="dark"] .fs-step-title { color:white; }
[data-theme="dark"] .fs-step-desc { color:rgba(255,255,255,0.4); }
[data-theme="dark"] .fs-course-card { background:#111; border-color:rgba(255,255,255,0.07); }
[data-theme="dark"] .fs-course-title { color:white; }
[data-theme="dark"] .fs-course-desc { color:rgba(255,255,255,0.4); }
[data-theme="dark"] .fs-course-list li { color:rgba(255,255,255,0.6); }
[data-theme="dark"] .fs-course-price { color:white; }
[data-theme="dark"] .fs-vku-dates { background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.07); }
[data-theme="dark"] .fs-vku-dates-title { color:rgba(255,255,255,0.3); }
[data-theme="dark"] .fs-vku-date-row { color:rgba(255,255,255,0.7); }
[data-theme="dark"] .fs-insurance-note { background:rgba(59,130,246,0.08); border-color:rgba(59,130,246,0.2); }
[data-theme="dark"] .fs-insurance-note p { color:#93C5FD; }
[data-theme="dark"] .fs-insurance-note strong { color:#BFDBFE; }
[data-theme="dark"] .fs-vehicle-name { color:white; }
[data-theme="dark"] .fs-vehicle-type { color:rgba(255,255,255,0.4); }
[data-theme="dark"] .fs-vehicle-sep { background:rgba(255,255,255,0.08); }
[data-theme="dark"] .fs-contact-item { background:#111; border-color:rgba(255,255,255,0.07); }
[data-theme="dark"] .fs-contact-wa { background:rgba(22,163,74,0.1); border-color:rgba(22,163,74,0.2); }
[data-theme="dark"] .fs-contact-label { color:rgba(255,255,255,0.3); }
[data-theme="dark"] .fs-contact-val { color:white; }
[data-theme="dark"] .fs-contact-wa .fs-contact-label { color:rgba(74,222,128,0.6); }
[data-theme="dark"] .fs-contact-wa .fs-contact-val { color:#4ADE80; }
[data-theme="dark"] .fs-map-box { border-color:rgba(255,255,255,0.07); }
[data-theme="dark"] .fs-course-highlight { border-color:rgba(59,130,246,0.35); }

/* Light mode: ghost CTA on light hero background */
[data-theme="light"] .fs-cta-ghost {
  border-color:rgba(0,0,0,0.15);
  color:#374151;
}

/* Smooth transitions everywhere */
.fs-nav, .fs-hero, .fs-stats-band, .fs-section, .fs-quote-card,
.fs-price-card, .fs-final-box, .fs-footer, .fs-fact, .fs-h1,
.fs-h2, .fs-body, .fs-band-val, .fs-stat-val,
.fs-nav-logo, .fs-badge-text, .fs-photo-card, .fs-cal-arrow,
.fs-label, .fs-modal-success, .fs-success-title, .fs-cta-wa {
  transition: background 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

/* ── RESPONSIVE ── */
@media (max-width: 1024px) {
  .fs-nav { padding:14px 24px; }
  .fs-nav-links { display:none; }
  .fs-hero-content { grid-template-columns:1fr; padding:120px 24px 60px; gap:0; }
  .fs-hero-right { display:none; }
  .fs-h1 { font-size: clamp(42px, 10vw, 64px); }
  .fs-hero-sub { font-size:16px; }
  .fs-stats-row { max-width:100%; }
  .fs-stats-band { padding:28px 24px; }
  .fs-stats-band-inner { grid-template-columns:repeat(2,1fr); gap:20px; }
  .fs-section { padding:72px 24px; }
  .fs-section-gray { padding:72px 24px; }
  .fs-about-grid { grid-template-columns:1fr; gap:48px; }
  .fs-about-right { order:-1; }
  .fs-driving-img { aspect-ratio:3/2; }
  .fs-price-grid { grid-template-columns:1fr; max-width:420px; }
  .fs-courses-grid { grid-template-columns:1fr; }
  .fs-steps-grid { grid-template-columns:repeat(2,1fr); }
  .fs-vehicles-inner { grid-template-columns:1fr; gap:16px; padding:0 24px; }
  .fs-vehicle-sep { width:48px; height:1px; }
  .fs-contact-grid { grid-template-columns:1fr; gap:36px; }
  .fs-map-box { height:280px; }
  .fs-final-box { padding:56px 28px; }
  .fs-final-ctas { flex-direction:column; align-items:center; }
  .fs-cta-ghost { display:none; }
  .fs-footer { padding:28px 24px; }
  .fs-footer-inner { flex-direction:column; text-align:center; gap:8px; }
}
@media (max-width: 640px) {
  .fs-logo-img { height:28px; max-width:120px; }
  .fs-nav-wa { display:none; }
  .fs-nav-book { display:none; }
  .fs-nav-wa-text { display:none; }
  .fs-h1 { font-size: clamp(34px, 11vw, 48px); }
  .fs-nav-wa { padding:8px 10px; }
  .fs-hero-content { padding:100px 20px 80px; }
  .fs-hero-left { min-width:0; width:100%; }
  .fs-hero-ctas { flex-direction:column; }
  .fs-hero-ctas .fs-cta-wa { display:none; }
  .fs-cta-primary { width:100%; justify-content:center; box-sizing:border-box; }
  .fs-stats-band-inner { grid-template-columns:repeat(2,1fr); }
  .fs-about-ctas { flex-direction:column; }
  .fs-cta-wa-light { justify-content:center; }
  .fs-facts-grid { grid-template-columns:1fr; }
  .fs-steps-grid { grid-template-columns:1fr; }
  .fs-final-ctas .fs-cta-primary, .fs-final-ctas .fs-cta-wa { width:100%; justify-content:center; }
  .fs-form-row { grid-template-columns:1fr; }
  .fs-mobile-bar { display:flex; position:fixed; bottom:0; left:0; right:0; z-index:90; padding:12px 16px 20px; background:rgba(5,5,5,0.95); backdrop-filter:blur(12px); border-top:1px solid rgba(255,255,255,0.08); gap:10px; }
  .fs-mobile-wa { flex:1; display:flex; align-items:center; justify-content:center; gap:8px; background:rgba(22,163,74,0.2); border:1px solid rgba(22,163,74,0.35); color:#4ADE80; font-weight:700; font-size:15px; padding:14px; border-radius:14px; text-decoration:none; }
  .fs-mobile-book { flex:2; background:#3B82F6; color:white; font-weight:700; font-size:15px; padding:14px; border-radius:14px; border:none; cursor:pointer; }
  .fs-section { padding-bottom:120px; }
  .fs-final-box { border-radius:20px; padding:44px 20px; }
  .fs-modal-overlay { align-items:flex-end; padding:0; }
}
</style>
