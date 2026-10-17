# Fahrschule Sara — Navbar, Logo und Hash-Navigation

**Verdict:** `CONDITIONAL PASS — SPECIFIC TESTS REMAIN`

Separater Draft-PR. Nicht gemergt, nicht deployed, nicht undrafted. PR #458 ist nicht der Träger.

## Identität

| | |
|---|---|
| Branch | `cursor/sara-navbar-hash-nav-adc4` |
| Base | `main` |
| Base SHA | `a9a9745123e124d51ad5fa13a84523055c3a90ef` |
| Implementation SHA | `1e311734893ad8c154b66f21e91f3858c50c5d8b` |
| Handoff SHA | `7dccd6f57fa6de9bd5f5bb48e28cd374f9e7673b` |
| Head SHA | `5723d59142f5b39b363981cbfb4ba28815cb2055` (PR-URL). Der Tip-Commit danach ergänzt die Pre-push-Zeile; die PR-Beschreibung nennt diesen Tip. |
| PR | https://github.com/Kilchi555/driving-team-app/pull/468 |

## Ursachen

1. **Logo zu klein und potenziell beschnitten.** Beide Templates setzten in scoped CSS `.lp-nav .lp-logo` auf 40px / `min(168px, 46vw)` und unter 860px auf 36px / `min(152px, 62vw)`. `.lp-brand` war `overflow: hidden`, `flex: 0 1 auto`, `min-width: 0`. Eine scoped Regel schlägt ein unscoped Override, deshalb wurden die alten Masse entfernt statt mit einer weiteren Regel überdeckt. Die Unterseite hatte zusätzlich `.lp-brand-link { min-width: 0 }`, wodurch der Link unter dem Logo schrumpfen konnte.

2. **Navbar nicht sticky beim Hash-Sprung.** `.lp-nav { position: sticky; top: 0 }` war bereits gesetzt. `assets/css/tenant-branding.css` setzt `html, body { overflow-x: hidden }`. CSS berechnet dann `overflow-y` zu `auto`. Der Body wird zum Scrollport und zum Sticky-Containing-Block, die Navbar scrollt mit dem Dokument weg. Reproduziert in Chrome: mit `overflow-x: hidden` lag `navTop` bei etwa −663 nach `scrollY` 663; mit `overflow-x: clip` und `overflow-y: visible` blieb `navTop` bei 0. `clip` erzwingt die andere Achse nicht auf `auto`. Die globale WebView-Regel wurde nicht geändert. `overflow-x: clip` gilt nur für `html:has(.site-root)` und `body:has(.site-root)`, also das öffentliche Site-Layout.

3. **Section-Offset fehlte.** Die Ziele `#angebot`, `#produkte`, `#team`, `#kurse`, `#kontakt`, `#standort` und `#termine` hatten `scroll-margin-top: 0`. Der Offset ist jetzt `--lp-nav-offset`: Desktop `calc(60px + 1.4rem + 1px)`, unter 860px `calc(54px + 1.4rem + 1px)`. Das entspricht Logo-Höhe, vertikalem Padding `0.7rem` oben und unten und dem 1px-Rand der geschlossenen Leiste. Die geöffnete Mobile-Drawer vergrössert den Offset nicht.

4. **Reduced Motion.** Native Hash-Links waren bereits ohne Smooth-Scroll. Es gibt kein `scroll-behavior: smooth` auf `html` oder `body`, und es wurde keines ergänzt. Der einzige animierte Sprung war `scrollIntoView({ behavior: 'smooth' })` in `askPickupLead` auf Home und Unterseite. Der geht jetzt über `scrollToLandingTarget`: `smooth` bei normaler Einstellung, `auto` bei `prefers-reduced-motion: reduce`. Hero-Animationen sind unverändert.

## Geänderte Dateien

- `assets/css/website-landing-nav.css` (neu)
- `layouts/site.vue` (lädt das Stylesheet)
- `pages/s/[subdomain]/index.vue`
- `pages/s/[subdomain]/[slug].vue`
- `utils/website-landing-scroll.ts` (neu)
- `utils/__tests__/website-landing-scroll.test.ts` (neu)
- `utils/__tests__/website-landing-nav.browser.test.ts` (neu)
- dieses Handoff

Logo-URLs, Tenant-Konfiguration, Adressen, Katalog, FAQ, Testimonials und Legal-Inhalte sind nicht geändert. `tenant-branding.css` ist nicht geändert.

## Testmatrix

Synthetische Seite in System-Chrome (`/usr/local/bin/google-chrome`) über Playwright. Die Seite lädt die echte `overflow-x: hidden`-Regel und `website-landing-nav.css`. Navbar-Struktur (Padding, Flex, Drawer, Breakpoint 1100px) spiegelt die Templates. Kein Login, kein Schreibzugriff.

| Check | Desktop 1280 | Mobile 390 | Ergebnis |
|---|---|---|---|
| Home, quadratisches Logo | 60×60, `object-fit: contain`, im Brand, nicht abgeschnitten | 54×54 | bestanden |
| Unterseite, gleiche Box | 60×60, kein Überlapp mit Links | 54×54, kein horizontaler Scroll | bestanden |
| Breites Logo | Höhe 60, Breite ≤ 252, Kanten treffen das Bild, kein Überlapp | Höhe 54, Breite ≤ 228 | bestanden |
| Jeder Hash (`angebot`, `produkte`, `team`, `kurse`, `kontakt`, `standort`, `termine`) | Ziel unter der Navbar, Navbar `top` ≈ 0 | gleich | bestanden |
| Direkter Aufruf `#angebot` | Section unter der Leiste, Navbar bleibt oben | — | bestanden |
| Scrollen | nach `scrollY` 640 bleibt `navTop` 0 | gleich | bestanden |
| Mobile Drawer | — | öffnet, 7 Links, kein horizontaler Scroll | bestanden |
| Enger Desktop 1100 und Phone 360 | Zusatzmessung: Logo rechts 272, Links links 284, `scrollWidth` 1100 | 360px: Logo 223×54, Toggle bei 291, `scrollWidth` 360 | bestanden, ausserhalb der Vitest-Datei |

Reduced Motion:

| Pfad | Ergebnis |
|---|---|
| `landingScrollBehavior(false)` | `smooth` |
| `landingScrollBehavior(true)` | `auto` |
| Pickup-Helfer bei `prefers-reduced-motion: reduce` | `scrollIntoView` mit `auto`, keine Zwischenposition |
| Pickup-Helfer ohne Reduced Motion | `scrollIntoView` mit `smooth` |
| Hash-Navigation | nativer Sprung, kein neues Smooth-Scroll |

Vitest: 11 Tests, 2 Dateien, alle grün.

## CI, Typecheck, Lint, Build

| Gate | Status |
|---|---|
| ESLint auf den neuen Scroll- und Testdateien, `--max-warnings 0` | bestanden |
| `npm run lint` (nur `server/utils/__tests__`) | nicht der Pfad dieser Dateien; CI-Lint auf dem PR steht aus |
| Vitest, gezielt die neuen Dateien | bestanden |
| Repo-weiter `vue-tsc` | nicht erneut ausgeführt. Bekannte Baseline bleibt rot und ist kein Required-Check. Dieses PR lockert TypeScript nicht. |
| `NITRO_PRESET=vercel NODE_OPTIONS=--max-old-space-size=4096 npx nuxt build` | bestanden. Client 49332 ms, Server 30422 ms, Nitro-Server gebaut. Exit 0. Nicht deployed. |
| Pre-push Hook | gebaut und `/api/health` antwortete 200. Kein Deploy. |
| Required Ruleset: Test and lint, E2E login, Dependency review | auf diesem Head noch nicht gelaufen |

## Nicht verifiziert

- `https://app.simy.ch/s/fahrschule-sara` nach diesem Fix. Die Seite zeigt weiter `main`, bis ein Mensch mergt.
- Hydriertes Nuxt mit echten Tenant-Daten. Die Templates wurden als Quelle geprüft; der Browser mass das echte Stylesheet in einer synthetischen Seite.
- Required CI auf dem exakten Head.

## Grenzen und Impact

Öffentliches Darstellung-CSS für jedes Tenant-Site-Layout (`/s/`, inklusive Impressum und Datenschutz, solange sie `layouts/site.vue` nutzen). Kein Auth-, RLS-, Payment- oder Middleware-Pfad. `useTenantBranding` und `assets/css/tenant-branding.css` sind nicht bearbeitet. Die Overflow-Korrektur ist auf `.site-root` begrenzt, weil die globale `overflow-x: hidden`-Regel die Sticky-Ursache ist.

Nicht angefasst: Reinach/Basel, Telefon, Preise, Katalog, doppelte Mehr-Links, FAQ zum Verschieben, Du/Sie, Team-Sprachen, Testimonials, Custom-Domain-Routing aus PR #458.

## Bestätigung

Keine Produktionsdaten, Tenant-Einstellungen, Adressen, Telefonnummern, Preise, Buchungen, Rechnungen oder Zahlungsdaten wurden gelesen zum Schreiben oder geschrieben. Keine Migration, kein DNS, keine Vercel-Konfiguration, kein Deploy, kein Merge.
