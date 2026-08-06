<template>
  <div class="stage" aria-hidden="true">
    <!-- Laptop -->
    <div class="laptop">
      <div class="lid">
        <div class="bezel">
          <div class="cam" />
          <div ref="desktopVp" class="viewport desktop-vp">
            <div
              class="ui desktop-ui"
              :style="{ transform: `scale(${desktopScale})` }"
            >
              <aside class="side" :style="sideStyle">
                <div class="brand-chip">
                  <img
                    :src="logoSrc || '/simy-logo.png'"
                    alt=""
                    width="140"
                    height="32"
                    :style="{ filter: logoColorFilter }"
                  />
                </div>
                <p class="lab">Hauptbereich</p>
                <div
                  v-for="item in navMain"
                  :key="item"
                  class="nav"
                  :class="{ on: item === 'Dashboard' }"
                >{{ item }}</div>
                <p class="lab">Verwaltung</p>
                <div v-for="item in navAdmin" :key="item" class="nav">{{ item }}</div>
                <div class="foot">
                  <span class="av">MS</span>
                  <div>
                    <strong>Mike Simy</strong>
                    <span>Admin · Zürich</span>
                  </div>
                </div>
              </aside>

              <main class="main">
                <header class="top">
                  <h3>Dashboard</h3>
                  <div class="top-r">
                    <span class="date">Mo., 03.08.</span>
                    <span class="live">Live</span>
                  </div>
                </header>

                <div class="pend">
                  <div class="pend-h">
                    <strong>Pendenzen</strong>
                    <span class="neu" :style="{ background: primaryColor }">+ Neu</span>
                  </div>
                  <div class="pend-g">
                    <div><b style="color:#3B82F6">3</b><span>Pendent</span></div>
                    <div><b style="color:#EF4444">1</b><span>Überfällig</span></div>
                    <div><b style="color:#F59E0B">2</b><span>In Arbeit</span></div>
                    <div><b style="color:#22C55E">14</b><span>Erledigt</span></div>
                  </div>
                </div>

                <div class="kpis">
                  <div class="kpi accent" :style="gradStyle">
                    <span>Umsatz (Monat)</span>
                    <strong>CHF 18’420</strong>
                    <em>+12% vs. Vormonat</em>
                  </div>
                  <div class="kpi">
                    <span>Woche</span>
                    <strong>CHF 4’280</strong>
                    <em class="up">↑ vs. CHF 3’910</em>
                  </div>
                  <div class="kpi warn">
                    <span>Ausstehend</span>
                    <strong>12</strong>
                    <em>CHF 3’640 offen</em>
                  </div>
                  <div class="kpi">
                    <span>Stunden heute</span>
                    <strong>14.5h</strong>
                    <em>Woche 62h</em>
                  </div>
                </div>

                <div class="split">
                  <div class="panel">
                    <div class="ph">Umsatz-Verlauf</div>
                    <div class="bars">
                      <div v-for="b in bars" :key="b.l" class="bc">
                        <div class="bar" :class="{ on: b.on }" :style="{ height: b.h, background: b.on ? primaryColor : `${primaryColor}40` }" />
                        <span>{{ b.l }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="panel">
                    <div class="ph">Offene Rechnungen · 8 Kunden</div>
                    <div v-for="s in students" :key="s.name" class="stu">
                      <span class="sav" :style="{ color: primaryColor, background: `${primaryColor}1a` }">{{ s.ini }}</span>
                      <div class="smeta">
                        <strong>{{ s.name }}</strong>
                        <span>{{ s.meta }}</span>
                      </div>
                      <b>{{ s.amt }}</b>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Phone -->
    <div class="phone">
      <div class="phone-shell">
        <div class="island" />
        <div ref="phoneVp" class="viewport phone-vp">
          <div
            class="ui phone-ui"
            :style="{ transform: `scale(${phoneScale})` }"
          >
            <div class="m-top">
              <img
                :src="logoSrc || '/simy-logo.png'"
                alt=""
                width="110"
                height="26"
                :style="{ filter: logoColorFilter }"
              />
              <span>Mo., 03.08.</span>
            </div>
            <div class="m-h">
              <strong>Heute</strong>
              <span>8 Termine</span>
            </div>
            <div class="m-next" :style="nextCardStyle">
              <p>Nächster Termin</p>
              <strong>09:00 · Lena Meier</strong>
              <span>Kat. Coaching · 45 Min</span>
            </div>
            <div class="m-stats">
              <div><b>14.5h</b><span>Heute</span></div>
              <div><b>12</b><span>Offen</span></div>
              <div><b>CHF 4.2k</b><span>Woche</span></div>
            </div>
            <div class="m-sec">Tagesplan</div>
            <div class="m-list">
              <div v-for="a in agenda" :key="a.t" class="m-row">
                <span class="t" :style="{ color: primaryColor }">{{ a.t }}</span>
                <span class="mav" :style="{ color: primaryColor, background: `${primaryColor}1a` }">{{ a.ini }}</span>
                <div>
                  <strong>{{ a.name }}</strong>
                  <p>{{ a.meta }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SIMY_BRAND, simyLogoColorFilter } from '~/utils/brand'

const props = withDefaults(defineProps<{
  primaryColor?: string
  secondaryColor?: string
  logoSrc?: string | null
}>(), {
  primaryColor: SIMY_BRAND.primary,
  secondaryColor: SIMY_BRAND.secondary,
  logoSrc: null,
})

const logoColorFilter = computed(() =>
  simyLogoColorFilter(props.primaryColor, { hasCustomLogo: !!props.logoSrc }),
)
const sideStyle = computed(() => ({
  background: `linear-gradient(180deg, ${props.primaryColor}, ${props.secondaryColor})`,
}))

const gradStyle = computed(() => ({
  background: `linear-gradient(135deg, ${props.primaryColor}, ${props.secondaryColor})`,
}))

const nextCardStyle = computed(() => ({
  ...gradStyle.value,
  boxShadow: `0 12px 28px ${props.primaryColor}47`,
}))

const desktopVp = ref<HTMLElement | null>(null)
const phoneVp = ref<HTMLElement | null>(null)
const desktopScale = ref(0.5)
const phoneScale = ref(0.4)

onMounted(() => {
  const cleanups: Array<() => void> = []
  const observe = (el: HTMLElement | null, base: number, set: (n: number) => void) => {
    if (!el) return
    const apply = () => set(el.clientWidth / base)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    cleanups.push(() => ro.disconnect())
  }
  observe(desktopVp.value, 1180, (n) => { desktopScale.value = n })
  observe(phoneVp.value, 390, (n) => { phoneScale.value = n })
  onBeforeUnmount(() => cleanups.forEach((fn) => fn()))
})

const navMain = ['Dashboard', 'Zahlungen', 'Rechnungen', 'Kunden']
const navAdmin = ['Kurse', 'Termine', 'Erinnerungen']
const bars = [
  { l: 'Mai', h: '48%', on: false },
  { l: 'Jun', h: '62%', on: false },
  { l: 'Jul', h: '55%', on: false },
  { l: 'Aug', h: '88%', on: true },
]
const students = [
  { ini: 'LM', name: 'Lena Meier', meta: '3 Rechnungen', amt: 'CHF 890' },
  { ini: 'SB', name: 'Sam Berger', meta: '1 Rechnung', amt: 'CHF 420' },
  { ini: 'AK', name: 'Ayla Keller', meta: '2 Rechnungen', amt: 'CHF 640' },
  { ini: 'NG', name: 'Noah Graf', meta: '1 Rechnung', amt: 'CHF 310' },
]
const agenda = [
  { t: '10:00', ini: 'JF', name: 'Jonas Frei', meta: 'Vor Ort' },
  { t: '11:30', ini: 'MW', name: 'Mia Weber', meta: 'Online' },
  { t: '14:00', ini: 'NG', name: 'Noah Graf', meta: 'Paket A' },
  { t: '15:30', ini: 'SK', name: 'Sara Kunz', meta: 'Workshop' },
  { t: '16:30', ini: 'TB', name: 'Tim Berger', meta: 'Follow-up' },
]
</script>

<style scoped>
/* Composition: full-size UI scaled into device frames (Linear/Stripe pattern) */
.stage {
  position: relative;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  height: clamp(240px, 38vw, 340px);
  perspective: 2000px;
  background: transparent;
}

.laptop {
  position: absolute;
  left: 0;
  top: 8%;
  width: 70%;
  transform: rotateY(-11deg) rotateX(5deg);
  transform-style: preserve-3d;
  animation: rise-laptop 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
  filter: drop-shadow(0 18px 32px rgba(0, 0, 0, 0.18));
}

.lid {
  background: linear-gradient(165deg, #3a3a3c 0%, #1a1a1c 100%);
  border-radius: 14px;
  padding: 5px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.bezel {
  position: relative;
  border-radius: 9px;
  overflow: hidden;
  background: #050505;
}

.cam {
  position: absolute;
  top: 5px;
  left: 50%;
  width: 4px;
  height: 4px;
  margin-left: -2px;
  border-radius: 50%;
  background: #2c2c2e;
  box-shadow: inset 0 0 0 1px #0a0a0a, 0 0 0 2px rgba(0, 0, 0, 0.35);
  z-index: 4;
  pointer-events: none;
}

.viewport {
  overflow: hidden;
  background: #f3f0f8;
  position: relative;
  border-radius: 5px;
}

.desktop-vp {
  width: 100%;
  aspect-ratio: 1180 / 720;
  height: auto;
}

.ui {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: top left;
  font-family: inherit;
  -webkit-font-smoothing: antialiased;
}

/* Full-size UI, scaled to fill device viewport width */
.desktop-ui {
  width: 1180px;
  height: 720px;
  display: grid;
  grid-template-columns: 220px 1fr;
  background: #f3f0f8;
}

.side {
  color: #fff;
  padding: 22px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-chip {
  background: #fff;
  border-radius: 14px;
  padding: 12px 14px;
  margin-bottom: 22px;
  display: flex;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(var(--brand-rgb), 0.18);
}

.brand-chip img {
  height: 28px;
  width: auto;
  display: block;
}

.lab {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.55;
  margin: 14px 8px 6px;
  font-weight: 700;
}

.nav {
  padding: 11px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  opacity: 0.88;
}

.nav.on {
  background: rgba(255, 255, 255, 0.18);
  font-weight: 700;
  opacity: 1;
}

.foot {
  margin-top: auto;
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.12);
}

.av {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: #fff;
  color: var(--brand-primary);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
  flex-shrink: 0;
}

.foot strong {
  display: block;
  font-size: 13px;
  line-height: 1.15;
}

.foot span {
  font-size: 11px;
  opacity: 0.75;
}

.main {
  padding: 24px 28px;
  min-width: 0;
  overflow: hidden;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.top h3 {
  font-size: 26px;
  font-weight: 800;
  color: #111;
  letter-spacing: -0.03em;
}

.top-r {
  display: flex;
  gap: 10px;
  align-items: center;
}

.date {
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
}

.live {
  font-size: 12px;
  font-weight: 700;
  color: #15803d;
  background: #dcfce7;
  padding: 5px 10px;
  border-radius: 999px;
}

.pend {
  background: #fff;
  border: 1px solid rgba(var(--brand-rgb), 0.12);
  border-radius: 16px;
  padding: 14px 16px;
  margin-bottom: 12px;
}

.pend-h {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.pend-h strong {
  font-size: 14px;
}

.neu {
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 11px;
  border-radius: 9px;
}

.pend-g {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  text-align: center;
}

.pend-g b {
  display: block;
  font-size: 22px;
  letter-spacing: -0.03em;
}

.pend-g span {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 600;
}

.kpis {
  display: grid;
  grid-template-columns: 1.35fr 1fr 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}

.kpi {
  background: #fff;
  border: 1px solid rgba(var(--brand-rgb), 0.12);
  border-radius: 16px;
  padding: 14px;
}

.kpi span {
  display: block;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #9ca3af;
  margin-bottom: 4px;
}

.kpi strong {
  display: block;
  font-size: 24px;
  color: #111;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.kpi em {
  font-style: normal;
  font-size: 12px;
  color: #9ca3af;
}

.kpi em.up {
  color: #16a34a;
  font-weight: 600;
}

.kpi.accent,
.kpi.warn {
  border: 0;
  color: #fff;
}

.kpi.accent span,
.kpi.accent em,
.kpi.warn span,
.kpi.warn em {
  color: rgba(255, 255, 255, 0.8);
}

.kpi.accent strong,
.kpi.warn strong {
  color: #fff;
}

.kpi.warn {
  background: linear-gradient(135deg, #f97316, #ef4444);
}

.split {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 10px;
}

.panel {
  background: #fff;
  border: 1px solid rgba(var(--brand-rgb), 0.12);
  border-radius: 16px;
  padding: 14px 16px;
}

.ph {
  font-size: 13px;
  font-weight: 700;
  color: #374151;
  margin-bottom: 12px;
}

.bars {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  height: 150px;
  padding: 0 6px;
}

.bc {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
}

.bar {
  width: 100%;
  border-radius: 8px 8px 3px 3px;
}

.bc span {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 600;
}

.stu {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #f3f0f8;
}

.stu:last-child {
  border-bottom: 0;
}

.sav {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 800;
  flex-shrink: 0;
}

.smeta {
  flex: 1;
  min-width: 0;
}

.smeta strong {
  display: block;
  font-size: 13px;
  color: #111;
}

.smeta span {
  font-size: 11px;
  color: #9ca3af;
}

.stu b {
  font-size: 13px;
  color: #111;
}

/* Phone */
.phone {
  position: absolute;
  right: 0;
  top: 0;
  width: 22%;
  max-width: 160px;
  min-width: 100px;
  transform: rotateY(-12deg) rotateX(4deg);
  transform-style: preserve-3d;
  animation: rise-phone 0.95s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
  filter: drop-shadow(0 14px 28px rgba(0, 0, 0, 0.22));
  z-index: 3;
}

.phone-shell {
  background: linear-gradient(160deg, #3a3a3c, #111);
  border-radius: 26px;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  position: relative;
}

.island {
  position: absolute;
  top: 10px;
  left: 50%;
  width: 34%;
  height: 8px;
  margin-left: -17%;
  background: #000;
  border-radius: 999px;
  z-index: 2;
}

.phone-vp {
  border-radius: 22px;
  width: 100%;
  aspect-ratio: 390 / 844;
  height: auto;
}

.phone-ui {
  width: 390px;
  height: 844px;
  padding: 54px 16px 16px;
  background: #f7f4fc;
  display: flex;
  flex-direction: column;
}

.m-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.m-top img {
  height: 24px;
  width: auto;
  display: block;
}

.m-top span {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 600;
}

.m-h {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 14px;
}

.m-h strong {
  font-size: 28px;
  color: #111;
  letter-spacing: -0.03em;
}

.m-h span {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 600;
}

.m-next {
  color: #fff;
  border-radius: 18px;
  padding: 16px;
  margin-bottom: 12px;
}

.m-next p {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.8;
  margin-bottom: 6px;
}

.m-next strong {
  display: block;
  font-size: 18px;
  letter-spacing: -0.02em;
}

.m-next span {
  font-size: 13px;
  opacity: 0.85;
}

.m-stats {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  margin-bottom: 14px;
}

.m-stats > div {
  background: #fff;
  border: 1px solid rgba(var(--brand-rgb), 0.12);
  border-radius: 14px;
  padding: 12px 8px;
  text-align: center;
}

.m-stats b {
  display: block;
  font-size: 16px;
  color: #111;
  letter-spacing: -0.02em;
}

.m-stats span {
  font-size: 10px;
  color: #9ca3af;
  font-weight: 600;
}

.m-sec {
  font-size: 13px;
  font-weight: 700;
  color: #374151;
  margin-bottom: 8px;
}

.m-list {
  flex: 1;
  background: #fff;
  border: 1px solid rgba(var(--brand-rgb), 0.12);
  border-radius: 18px;
  padding: 4px 12px;
}

.m-row {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px 2px;
  border-bottom: 1px solid #f0ebf7;
}

.m-row:last-child {
  border-bottom: 0;
}

.m-row .t {
  font-size: 13px;
  font-weight: 700;
  width: 44px;
  flex-shrink: 0;
}

.mav {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 800;
  flex-shrink: 0;
}

.m-row strong {
  display: block;
  font-size: 14px;
  color: #111;
}

.m-row p {
  font-size: 11px;
  color: #9ca3af;
}

@keyframes rise-laptop {
  from {
    opacity: 0;
    transform: translateY(28px) rotateY(-11deg) rotateX(5deg);
  }
  to {
    opacity: 1;
    transform: rotateY(-11deg) rotateX(5deg);
  }
}

@keyframes rise-phone {
  from {
    opacity: 0;
    transform: translateY(28px) rotateY(-12deg) rotateX(4deg);
  }
  to {
    opacity: 1;
    transform: rotateY(-12deg) rotateX(4deg);
  }
}

@media (max-width: 720px) {
  .stage {
    height: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 28px;
    padding: 4px 0;
    perspective: none;
  }

  .laptop,
  .phone {
    position: relative;
    left: auto;
    right: auto;
    top: auto;
    transform: none !important;
    filter: drop-shadow(0 16px 28px rgba(0, 0, 0, 0.16));
    animation: none;
  }

  .laptop {
    width: 100%;
  }

  .phone {
    width: 48%;
    max-width: 210px;
  }

  .desktop-vp {
    aspect-ratio: 1180 / 720;
  }

  .phone-vp {
    aspect-ratio: 390 / 844;
  }
}
</style>
