#!/usr/bin/env python3
"""
Schweizer Fahrlehrer – Telefon-Sammler (Deutschschweiz)
---------------------------------------------------------
Sammelt Telefonnummern + Name + Adresse aus mehreren Quellen
und speichert dedupliziert in ein CSV.

Quellen:
  1. fahrlehrer.ch        – statisches HTML, ~135 Seiten à 10 Einträge (~1'300 Schulen)
  2. fahrlehrervergleich.ch – Playwright Stealth, nach Stadt
  3. superfahrlehrer.ch   – statisches HTML (Listenformat)

Verwendung:
    python3 tools/sammle_tel.py                     # Alle Quellen, Deutschschweiz
    python3 tools/sammle_tel.py --source fahrlehrer  # Nur fahrlehrer.ch (schnell, ~5 Min)
    python3 tools/sammle_tel.py --source fv          # Nur fahrlehrervergleich.ch
    python3 tools/sammle_tel.py --output meine.csv
"""

import sys
import re
import csv
import time
import random
import logging
import argparse
import urllib.parse
import json
from pathlib import Path

logging.getLogger("fake_useragent").setLevel(logging.ERROR)
logging.basicConfig(level=logging.WARNING)

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("pip3 install requests beautifulsoup4 playwright playwright-stealth fake-useragent")
    sys.exit(1)

try:
    from fake_useragent import UserAgent
    _ua_gen = UserAgent(browsers=["chrome", "firefox"])
    def random_ua():
        return _ua_gen.random
except Exception:
    _UAS = [
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    ]
    def random_ua():
        return random.choice(_UAS)

PHONE_REGEX = re.compile(r"(\+41|0041|0)[\s\-]?([2-9]\d)[\s\-]?(\d{3})[\s\-]?(\d{2})[\s\-]?(\d{2})")
PLZ_REGEX   = re.compile(r"\b([3-9]\d{3})\s+([A-ZÄÖÜa-zäöü][A-ZÄÖÜa-zäöüß\- ]{1,25})")

_session = requests.Session()

def make_headers(referer=""):
    h = {
        "User-Agent": random_ua(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "de-CH,de;q=0.9,en;q=0.7",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "DNT": "1",
    }
    if referer:
        h["Referer"] = referer
    return h

def normalize_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("0041"):
        digits = digits[4:]
    elif digits.startswith("41") and len(digits) == 11:
        digits = digits[2:]
    elif digits.startswith("0"):
        digits = digits[1:]
    if len(digits) < 9:
        return ""
    return f"+41 {digits[:2]} {digits[2:5]} {digits[5:7]} {digits[7:9]}"

def human_delay(base=1.0, jitter=1.5):
    time.sleep(base + random.uniform(0, jitter))

def fetch_html(url, retries=3):
    for attempt in range(retries):
        try:
            r = _session.get(url, headers=make_headers(), timeout=12, allow_redirects=True)
            if r.status_code == 429:
                wait = (2 ** attempt) * random.uniform(4, 8)
                print(f"    ⚠ 429 – warte {wait:.0f}s", flush=True)
                time.sleep(wait)
                continue
            r.raise_for_status()
            return BeautifulSoup(r.text, "html.parser")
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt * 1.5)
            else:
                return None
    return None


# ─── SOURCE 1: fahrlehrer.ch ──────────────────────────────────────────────────

def scrape_fahrlehrer_ch(max_pages=138) -> list[dict]:
    """
    Scrapes ALL pages of fahrlehrer.ch/fahrschulen?resultpage=N
    Static HTML → very fast. ~1,300 unique entries across 135 pages.
    """
    print(f"\n[fahrlehrer.ch] Seiten 1–{max_pages} scrapen (~{max_pages*10} Einträge erwartet)")
    results = []
    seen_phones = set()
    empty_streak = 0

    for page in range(1, max_pages + 1):
        url = f"https://www.fahrlehrer.ch/fahrschulen?resultpage={page}"
        soup = fetch_html(url)

        if soup is None:
            empty_streak += 1
            if empty_streak >= 3:
                break
            continue

        # Extract tel: links and their surrounding context
        tel_links = soup.find_all("a", href=lambda h: h and h.startswith("tel:"))

        if not tel_links:
            empty_streak += 1
            if empty_streak >= 3:
                print(f"  Seite {page}: leer (3x) → Ende")
                break
            continue
        empty_streak = 0

        page_entries = []
        processed_phones = set()

        for tel_a in tel_links:
            raw = tel_a["href"][4:].strip()
            phone = normalize_phone(raw)
            if not phone or phone in seen_phones or phone in processed_phones:
                continue
            processed_phones.add(phone)
            seen_phones.add(phone)

            # Walk up to find the name (nearest h2)
            container = tel_a
            name = ""
            address = ""
            for _ in range(12):
                if container is None:
                    break
                h2 = container.find("h2")
                if h2:
                    name = h2.get_text(strip=True)
                    break
                container = container.parent

            # Address from text
            if container:
                text = container.get_text(" ")
                plz = PLZ_REGEX.search(text)
                if plz:
                    address = f"{plz.group(1)} {plz.group(2).strip()}"

            page_entries.append({
                "name": name,
                "phone": phone,
                "address": address,
                "source": "fahrlehrer.ch",
            })

        results.extend(page_entries)

        if page % 10 == 0 or page <= 5:
            print(f"  Seite {page:3d}: +{len(page_entries)} Einträge (total: {len(results)})")

        human_delay(0.8, 1.2)

    print(f"[fahrlehrer.ch] Fertig: {len(results)} Einträge")
    return results


# ─── SOURCE 2: fahrlehrervergleich.ch ────────────────────────────────────────

# All known city slugs for Deutschschweiz
FV_CITY_SLUGS_DE = [
    # Zürich
    "zuerich-r:ORS2S6p0", "winterthur-r:ORS2SYA0", "uster-r:ORS2Sqg0",
    "buelach-r:ORS2SKk0", "dietikon-r:ORS2Sjk0", "regensdorf-r:ORS2S8k0",
    "schlieren-r:ORS2SAp0", "horgen-r:ORS2SXp0", "thalwil-r:ORS2SiA0",
    "adliswil-r:ORS2SAA0", "kloten-r:ORS2SRk0", "dübendorf-r:ORS2SNA0",
    "wetzikon-zh-r:ORS2SBk0", "pfäffikon-zh-r:ORS2S6A0",
    # Bern
    "bern-r:ORS2S3j0", "thun-r:ORS2S3A0", "biel-bienne-r:ORS2S4j0",
    "köniz-r:ORS2S3p0", "ostermundigen-r:ORS2S4p0", "worb-r:ORS2S2A0",
    # Basel
    "basel-r:ORS2S0Z0", "liestal-r:ORS2S0j0", "allschwil-r:ORS2S1j0",
    "münchenbuchsee-r:ORS2S1A0", "birsfelden-r:ORS2S0p0",
    # Luzern
    "luzern-r:ORS2SMl0", "emmen-r:ORS2SNl0", "kriens-r:ORS2SMp0",
    "sursee-r:ORS2SNp0", "willisau-r:ORS2SMZ0",
    # Aargau
    "aarau-r:ORS2SA00", "baden-ag-r:ORS2SB00", "wettingen-r:ORS2SB0Z",
    "brugg-r:ORS2SA0Z", "zofingen-r:ORS2SA0p",
    # St. Gallen
    "st-gallen-r:ORS2SVp0", "gossau-sg-r:ORS2SWp0", "rapperswil-jona-r:ORS2SZp0",
    "wil-sg-r:ORS2SVZ0", "buchs-sg-r:ORS2SWZ0",
    # Schaffhausen
    "schaffhausen-r:ORS2Snp0",
    # Thurgau
    "frauenfeld-r:ORS2Sol0", "kreuzlingen-r:ORS2Sp0Z",
    # Zug
    "zug-r:ORS2SqX0", "baar-r:ORS2SqA0",
    # Schwyz
    "schwyz-r:ORS2Spj0", "lachen-r:ORS2SoX0",
    # Graubünden
    "chur-r:ORS2SlZ0",
    # Solothurn
    "solothurn-r:ORS2SnZ0", "olten-r:ORS2SoZ0",
]

def scrape_fahrlehrervergleich_city(city_slug: str) -> list[dict]:
    """Scrape one city page on fahrlehrervergleich.ch using Playwright stealth."""
    from playwright.sync_api import sync_playwright

    city_url = f"https://www.fahrlehrervergleich.ch/r/fahrschulen/{city_slug}"
    results = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
            )
            context = browser.new_context(
                user_agent=random_ua(),
                locale="de-CH",
                timezone_id="Europe/Zurich",
                viewport={"width": random.randint(1280,1440), "height": random.randint(768,900)},
            )
            context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                Object.defineProperty(navigator, 'languages', { get: () => ['de-CH', 'de', 'en'] });
                window.chrome = { runtime: {} };
            """)

            try:
                from playwright_stealth import stealth_sync
                stealth_fn = stealth_sync
            except Exception:
                stealth_fn = None

            page = context.new_page()
            if stealth_fn:
                stealth_fn(page)

            # Natural browsing: homepage first
            page.goto("https://www.fahrlehrervergleich.ch", wait_until="domcontentloaded", timeout=20000)
            time.sleep(random.uniform(1.0, 2.0))

            page.goto(city_url, wait_until="networkidle", timeout=25000)
            time.sleep(random.uniform(1.2, 2.2))

            # Scroll to load all entries
            prev = 0
            for _ in range(8):
                page.evaluate(f"window.scrollBy(0, {random.randint(300,600)})")
                time.sleep(random.uniform(0.4, 0.9))
                curr = page.evaluate("document.body.scrollHeight")
                links = page.query_selector_all("a[href*='/d/fahrschulen/']")
                if len(links) == prev:
                    break
                prev = len(links)

            # Collect profile links
            profile_links = set()
            for a in page.query_selector_all("a[href*='/d/fahrschulen/']"):
                href = a.get_attribute("href") or ""
                if href and "#" not in href:
                    profile_links.add(urllib.parse.urljoin("https://www.fahrlehrervergleich.ch", href))

            for profile_url in list(profile_links):
                try:
                    page.goto(profile_url, wait_until="domcontentloaded", timeout=18000,
                              referer=city_url)
                    time.sleep(random.uniform(0.8, 1.8))

                    # Get full HTML (including hidden elements)
                    html = page.content()
                    soup = BeautifulSoup(html, "html.parser")
                    full_text = soup.get_text(" ")

                    # Name
                    h1 = soup.find("h1")
                    name = h1.get_text(strip=True) if h1 else ""

                    # Phone from full DOM
                    phone = ""
                    for m in PHONE_REGEX.finditer(full_text):
                        p = normalize_phone(m.group(0))
                        if p:
                            phone = p
                            break

                    # Address
                    address = ""
                    plz = PLZ_REGEX.search(full_text)
                    if plz:
                        address = f"{plz.group(1)} {plz.group(2).strip()}"

                    if name or phone:
                        results.append({
                            "name": name,
                            "phone": phone,
                            "address": address,
                            "source": "fahrlehrervergleich.ch",
                        })

                    time.sleep(random.uniform(1.2, 2.5))

                except Exception:
                    pass

            browser.close()

    except Exception as e:
        print(f"  Fehler bei {city_slug}: {str(e)[:60]}")

    return results


def scrape_fahrlehrervergleich(city_slugs=None) -> list[dict]:
    slugs = city_slugs or FV_CITY_SLUGS_DE
    print(f"\n[fahrlehrervergleich.ch] {len(slugs)} Städte scrapen")
    all_results = []
    seen_phones = set()

    for i, slug in enumerate(slugs, 1):
        city = slug.split("-r:")[0]
        print(f"  [{i}/{len(slugs)}] {city} ...", end=" ", flush=True)
        entries = scrape_fahrlehrervergleich_city(slug)

        new = 0
        for e in entries:
            p = e.get("phone", "")
            if p not in seen_phones:
                seen_phones.add(p)
                all_results.append(e)
                new += 1

        print(f"+{new} (total: {len(all_results)})")
        if i < len(slugs):
            human_delay(2.0, 4.0)

    print(f"[fahrlehrervergleich.ch] Fertig: {len(all_results)} Einträge")
    return all_results


# ─── SOURCE 3: superfahrlehrer.ch ─────────────────────────────────────────────

SUPERFAHRLEHRER_CITIES = [
    "Zürich", "Bern", "Basel", "Luzern", "Winterthur", "Aarau", "St. Gallen",
    "Schaffhausen", "Frauenfeld", "Solothurn", "Thun", "Biel", "Zug", "Schwyz",
    "Chur", "Glarus", "Altdorf", "Sarnen", "Stans", "Herisau", "Appenzell",
    "Rapperswil", "Wettingen", "Baden", "Olten", "Dietikon", "Dübendorf",
    "Uster", "Kloten", "Wädenswil", "Horgen", "Thalwil", "Küsnacht", "Schlieren",
    "Regensdorf", "Bülach", "Kriens", "Emmen", "Sursee", "Willisau",
    "Liestal", "Allschwil", "Birsfelden", "Pratteln",
    "Köniz", "Ostermundigen", "Worb", "Steffisburg",
    "Kreuzlingen", "Weinfelden", "Arbon", "Arlesheim",
]

def scrape_superfahrlehrer(cities=None) -> list[dict]:
    print(f"\n[superfahrlehrer.ch] Städte scrapen")
    results = []
    seen_phones = set()
    cities = cities or SUPERFAHRLEHRER_CITIES

    for city in cities:
        url = f"https://superfahrlehrer.ch/de/fahrschulen-fahrlehrer/{urllib.parse.quote(city)}"
        soup = fetch_html(url)
        if soup is None:
            continue

        tel_links = soup.find_all("a", href=lambda h: h and h.startswith("tel:"))
        page_new = 0
        for tel_a in tel_links:
            phone = normalize_phone(tel_a["href"][4:])
            if not phone or phone in seen_phones:
                continue
            seen_phones.add(phone)

            # Name: navigate up to .inner container, then find .teacher-list-name
            name = ""
            inner = tel_a.find_parent(class_="inner")
            if inner:
                name_tag = inner.find(class_="teacher-list-name")
                if name_tag:
                    name = name_tag.get_text(strip=True)

            # Address: find PLZ near the card
            address = city
            if inner:
                text = inner.get_text(" ")
                m = PLZ_REGEX.search(text)
                if m:
                    address = f"{m.group(1)} {m.group(2).strip()}"

            results.append({"name": name, "phone": phone, "address": address, "source": "superfahrlehrer.ch"})
            page_new += 1

        if page_new:
            print(f"  {city}: +{page_new}")
        human_delay(0.6, 1.0)

    print(f"[superfahrlehrer.ch] Fertig: {len(results)} Einträge")
    return results


# ─── SUPABASE IMPORT ──────────────────────────────────────────────────────────

PLZ_CITY_RE = re.compile(r"\b([3-9]\d{3})\s+(.+)")

def _load_supabase_env():
    env_path = Path(__file__).parent.parent / "apps" / "website" / ".env"
    cfg = {}
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                cfg[k.strip()] = v.strip()
    return cfg.get("SUPABASE_URL", ""), cfg.get("SUPABASE_SERVICE_ROLE_KEY", "")

def _import_to_supabase(entries: list[dict]):
    url, key = _load_supabase_env()
    if not url or not key:
        print("FEHLER: Supabase-Credentials fehlen.")
        return

    endpoint = f"{url}/rest/v1/fahrlehrer_leads"
    headers  = {
        "apikey":        key,
        "Authorization": f"Bearer {key}",
        "Content-Type":  "application/json",
        "Prefer":        "return=minimal",
    }

    def parse_addr(raw):
        m = PLZ_CITY_RE.search((raw or "").strip())
        return (m.group(1), m.group(2).strip()) if m else ("", "")

    rows = []
    for e in entries:
        plz, city = parse_addr(e.get("address", ""))
        rows.append({
            "name":        (e.get("name") or "").strip() or None,
            "phone":       (e.get("phone") or "").strip() or None,
            "address":     (e.get("address") or "").strip() or None,
            "postal_code": plz or None,
            "city":        city or None,
            "source":      (e.get("source") or "unbekannt").strip(),
            "status":      "new",
        })

    # Fetch existing phones to skip duplicates
    print(f"[Supabase] Prüfe existierende Einträge …")
    existing = set()
    offset = 0
    while True:
        r = requests.get(
            f"{endpoint}?select=phone&phone=not.is.null&limit=1000&offset={offset}",
            headers=headers, timeout=30
        )
        if not r.ok: break
        data = r.json()
        for row in data:
            if row.get("phone"): existing.add(row["phone"])
        if len(data) < 1000: break
        offset += 1000
    print(f"[Supabase] {len(existing)} bereits vorhanden")

    new_rows = [r for r in rows if not r["phone"] or r["phone"] not in existing]
    skipped  = len(rows) - len(new_rows)
    if skipped: print(f"[Supabase] {skipped} Duplikate übersprungen")

    if not new_rows:
        print("[Supabase] Keine neuen Einträge.")
        return

    BATCH = 200
    imported, failed = 0, 0
    print(f"[Supabase] Importiere {len(new_rows)} neue Einträge …")
    for i in range(0, len(new_rows), BATCH):
        batch = new_rows[i:i+BATCH]
        resp  = requests.post(endpoint, json=batch, headers=headers, timeout=30)
        if resp.ok:
            imported += len(batch)
            print(f"  Batch {i//BATCH+1}: {len(batch)} ✓")
        else:
            failed += len(batch)
            print(f"  Batch {i//BATCH+1}: FEHLER {resp.status_code} – {resp.text[:200]}")

    print(f"[Supabase] Fertig: {imported} importiert, {failed} Fehler\n")


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Schweizer Fahrlehrer Telefon-Sammler")
    parser.add_argument(
        "--source",
        default="all",
        choices=["all", "fahrlehrer", "fv", "superfahrlehrer"],
        help="Welche Quelle scrapen (default: all)",
    )
    parser.add_argument("--output", default="fahrlehrer_telefone_ch.csv", help="Output CSV")
    parser.add_argument("--max-pages", type=int, default=138, help="Max Seiten fahrlehrer.ch (default: 138)")
    parser.add_argument("--to-supabase", action="store_true", help="Ergebnisse direkt in Supabase laden")
    args = parser.parse_args()

    print(f"\n{'='*55}")
    print(f"  Schweizer Fahrlehrer Telefon-Sammler")
    print(f"  Quelle: {args.source} | Output: {args.output}")
    print(f"{'='*55}")

    all_entries: list[dict] = []
    seen_phones: set[str] = set()

    def add_entries(entries):
        new = 0
        for e in entries:
            p = e.get("phone", "")
            key = p if p else f"{e.get('name','')}__{e.get('source','')}"
            if key not in seen_phones:
                seen_phones.add(key)
                all_entries.append(e)
                new += 1
        return new

    if args.source in ("all", "fahrlehrer"):
        entries = scrape_fahrlehrer_ch(max_pages=args.max_pages)
        n = add_entries(entries)
        print(f"  → {n} neue nach Dedup")

    if args.source in ("all", "fv"):
        entries = scrape_fahrlehrervergleich()
        n = add_entries(entries)
        print(f"  → {n} neue nach Dedup")

    if args.source in ("all", "superfahrlehrer"):
        entries = scrape_superfahrlehrer()
        n = add_entries(entries)
        print(f"  → {n} neue nach Dedup")

    # Write CSV
    with open(args.output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["name", "phone", "address", "source"],
            extrasaction="ignore",
        )
        writer.writeheader()
        writer.writerows(all_entries)

    with_phone = sum(1 for e in all_entries if e.get("phone"))
    print(f"\n{'='*55}")
    print(f"  Einträge gesamt:        {len(all_entries)}")
    print(f"  Davon mit Telefon:      {with_phone}")
    print(f"  Gespeichert in:         {args.output}")
    print(f"{'='*55}\n")

    if args.to_supabase:
        _import_to_supabase(all_entries)


if __name__ == "__main__":
    main()
