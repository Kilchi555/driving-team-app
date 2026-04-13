#!/usr/bin/env python3
"""
Fahrlehrer.ch Verzeichnis-Scraper
-----------------------------------
Scrapt eine fahrlehrer.ch Listing-Seite und extrahiert ALLE Einträge
(inkl. dynamisch geladene via Playwright/Headless Browser),
dann besucht jede externe Website für Email-Adressen.

Modi:
  Standard (requests):  Nur Premium-Einträge (~10-15), schnell
  Playwright (--full):  ALLE Einträge inkl. JS-gerenderte, langsamer

Verwendung:
    python3 tools/fahrlehrer_scraper.py
    python3 tools/fahrlehrer_scraper.py --full
    python3 tools/fahrlehrer_scraper.py --url "https://www.fahrlehrer.ch/autofahrschulen/zh/region-zuerich/zuerich.html" --full
    python3 tools/fahrlehrer_scraper.py --all-cantons --full
    python3 tools/fahrlehrer_scraper.py --no-email-scrape --full

Nützliche Listing-URLs auf fahrlehrer.ch:
    Alle Fahrschulen CH:    https://www.fahrlehrer.ch/fahrschulen
    Auto CH:                https://www.fahrlehrer.ch/autofahrschulen
    Auto ZH:                https://www.fahrlehrer.ch/autofahrschulen/zh/region-zuerich/zuerich.html
    Motorrad CH:            https://www.fahrlehrer.ch/motorradschulen
    Lastwagen CH:           https://www.fahrlehrer.ch/lastwagenschulen
"""

import sys
import re
import csv
import time
import random
import argparse
import urllib.parse
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Fehlende Pakete. Bitte ausführen: pip3 install requests beautifulsoup4 playwright fake-useragent playwright-stealth")
    sys.exit(1)

try:
    import logging
    logging.getLogger("fake_useragent").setLevel(logging.ERROR)
    from fake_useragent import UserAgent
    _ua = UserAgent(browsers=["chrome", "firefox", "safari"])
    def random_ua() -> str:
        return _ua.random
except Exception:
    _FALLBACK_UAS = [
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    ]
    def random_ua() -> str:
        return random.choice(_FALLBACK_UAS)

EMAIL_REGEX = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

def make_headers(referer: str = "") -> dict:
    """Generate realistic browser headers with a random User-Agent."""
    ua = random_ua()
    h = {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "de-CH,de;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none" if not referer else "same-origin",
        "Cache-Control": "max-age=0",
        "DNT": "1",
    }
    if referer:
        h["Referer"] = referer
    return h

def human_delay(base: float = 1.5, jitter: float = 2.0) -> None:
    """Sleep for a random human-like duration."""
    duration = base + random.uniform(0, jitter) + random.uniform(0, 0.5)
    time.sleep(duration)

EXCLUDED_EMAIL_DOMAINS = {
    "sentry.io", "example.com", "test.com", "wixpress.com",
    "squarespace.com", "shopify.com", "wordpress.com",
    "fahrlehrer.ch", "google.com", "apple.com",
}

FAHRLEHRER_CH_BASE = "https://www.fahrlehrer.ch"

# Alle Schweizer Kantone + URL-Kürzel für fahrlehrer.ch
ALL_CANTONS = [
    ("zh", "region-zuerich", "zuerich"),
    ("be", "region-bern", "bern"),
    ("lu", "region-luzern", "luzern"),
    ("ag", "region-aargau", "aarau"),
    ("sg", "region-st-gallen", "st-gallen"),
    ("vd", "region-lausanne", "lausanne"),
    ("ge", "region-genf", "genf"),
    ("bs", "region-basel", "basel"),
    ("bl", "region-baselland", "liestal"),
    ("so", "region-solothurn", "solothurn"),
    ("fr", "region-fribourg", "fribourg"),
    ("vs", "region-wallis", "sitten"),
    ("ti", "region-tessin", "bellinzona"),
    ("gr", "region-graubuenden", "chur"),
    ("tg", "region-thurgau", "frauenfeld"),
    ("sz", "region-schwyz", "schwyz"),
    ("zg", "region-zug", "zug"),
    ("ne", "region-neuenburg", "neuenburg"),
    ("sh", "region-schaffhausen", "schaffhausen"),
    ("ar", "region-appenzell", "herisau"),
    ("ai", "region-appenzell", "appenzell"),
    ("gl", "region-glarus", "glarus"),
    ("ur", "region-uri", "altdorf"),
    ("ow", "region-obwalden", "sarnen"),
    ("nw", "region-nidwalden", "stans"),
    ("ju", "region-jura", "delemont"),
]


_session = requests.Session()

def fetch(url: str, timeout: int = 12, referer: str = "", retries: int = 3) -> tuple[BeautifulSoup | None, str]:
    """Fetch a URL with stealth headers, session cookies, and exponential backoff."""
    for attempt in range(retries):
        try:
            resp = _session.get(
                url,
                headers=make_headers(referer),
                timeout=timeout,
                allow_redirects=True,
            )
            # Rate-limit: wait and retry
            if resp.status_code in (429, 503):
                wait = (2 ** attempt) * random.uniform(3, 6)
                print(f"    ⚠ Rate-limit ({resp.status_code}), warte {wait:.1f}s ...", flush=True)
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return BeautifulSoup(resp.text, "html.parser"), f"OK ({resp.status_code})"
        except requests.exceptions.Timeout:
            if attempt < retries - 1:
                time.sleep(2 ** attempt * 2)
                continue
            return None, "Timeout"
        except requests.exceptions.ConnectionError:
            if attempt < retries - 1:
                time.sleep(2 ** attempt * 2)
                continue
            return None, "Verbindungsfehler"
        except requests.exceptions.HTTPError as e:
            return None, f"HTTP {e.response.status_code}"
        except Exception as e:
            return None, f"Fehler: {str(e)[:60]}"
    return None, "Max Retries erreicht"


def extract_emails_from_soup(soup: BeautifulSoup) -> list[str]:
    """Extract email addresses from a parsed page."""
    emails: set[str] = set()

    # mailto: links
    for tag in soup.find_all("a", href=True):
        href = tag["href"]
        if href.lower().startswith("mailto:"):
            addr = href[7:].split("?")[0].strip().lower()
            if EMAIL_REGEX.match(addr):
                emails.add(addr)

    # Plain text regex
    text = soup.get_text(separator=" ")
    for match in EMAIL_REGEX.findall(text):
        emails.add(match.lower())

    return sorted(
        e for e in emails
        if not any(e.endswith(d) for d in EXCLUDED_EMAIL_DOMAINS)
        and not e.startswith("@")
        and "." in e.split("@")[-1]
    )


def fetch_full_html_playwright(url: str) -> tuple[str | None, str]:
    """
    Use Playwright (headless Chromium) with stealth to fetch a fully JS-rendered page.
    Stealth mode hides navigator.webdriver and other bot fingerprints.
    Scrolls to bottom to trigger lazy loading of all entries.
    """
    try:
        from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    except ImportError:
        return None, "Playwright nicht installiert"

    try:
        from playwright_stealth import stealth_sync
        has_stealth = True
    except ImportError:
        has_stealth = False

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                ],
            )
            context = browser.new_context(
                user_agent=random_ua(),
                locale="de-CH",
                timezone_id="Europe/Zurich",
                viewport={"width": random.randint(1280, 1920), "height": random.randint(800, 1080)},
                # Realistic screen properties
                color_scheme="light",
                java_script_enabled=True,
            )

            # Add realistic browser fingerprint via JS overrides
            context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                Object.defineProperty(navigator, 'languages', { get: () => ['de-CH', 'de', 'en'] });
                Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });
                window.chrome = { runtime: {} };
            """)

            page = context.new_page()

            if has_stealth:
                stealth_sync(page)

            # Simulate a natural browsing path: visit homepage first
            parsed = urllib.parse.urlparse(url)
            homepage = f"{parsed.scheme}://{parsed.netloc}"
            page.goto(homepage, wait_until="domcontentloaded", timeout=20000)
            time.sleep(random.uniform(0.8, 2.0))

            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            time.sleep(random.uniform(1.0, 2.5))

            # Scroll down in human-like increments
            prev_height = 0
            for _ in range(25):
                # Scroll by a random amount (not always to the very bottom)
                scroll_amount = random.randint(400, 900)
                page.evaluate(f"window.scrollBy(0, {scroll_amount})")
                time.sleep(random.uniform(0.3, 0.9))

                curr_height = page.evaluate("document.body.scrollHeight")
                scroll_pos = page.evaluate("window.scrollY + window.innerHeight")
                if scroll_pos >= curr_height and curr_height == prev_height:
                    break
                prev_height = curr_height

            html = page.content()
            browser.close()
            return html, "OK"
    except Exception as e:
        return None, f"Playwright Fehler: {str(e)[:80]}"


def scrape_fahrlehrer_listing(url: str, use_playwright: bool = False) -> list[dict]:
    """
    Scrape a fahrlehrer.ch listing page.
    Returns list of dicts with: name, phone, website, address, profile_url
    """
    print(f"  Lade Verzeichnis: {url}", end="")
    if use_playwright:
        print(" [Playwright – vollständige Liste] ...", flush=True)
        html, status = fetch_full_html_playwright(url)
        if html is None:
            print(f"  Fehler: {status}")
            return []
        soup = BeautifulSoup(html, "html.parser")
    else:
        print(" [requests – nur Premium] ...", flush=True)
        soup, status = fetch(url)
        if soup is None:
            print(f"  Fehler: {status}")
            return []

    entries = []
    seen_names = set()

    # Each school entry has an h2 heading
    for h2 in soup.find_all("h2"):
        name = h2.get_text(strip=True)
        if not name or name in seen_names:
            continue

        # Find the containing block (walk up to find the parent section)
        parent = h2.parent
        # Walk up a few levels to capture the full entry block
        for _ in range(5):
            if parent is None:
                break
            parent = parent.parent

        # Search in a wider context around this h2
        # Since the HTML is flat, look at siblings relative to h2
        block_soup = h2.parent if h2.parent else h2

        entry = {
            "name": name,
            "phone": "",
            "website": "",
            "website_domain": "",
            "address": "",
            "profile_url": "",
        }

        # Find the parent article/div containing this entry
        container = h2
        for _ in range(8):
            if container.name in ["article", "section", "div"] and len(str(container)) > 200:
                break
            container = container.parent if container.parent else container

        # Phone: tel: links
        for a in container.find_all("a", href=True):
            href = a["href"]
            if href.startswith("tel:"):
                number = href[4:].strip()
                if number and not entry["phone"]:
                    entry["phone"] = number

        # External website link (not fahrlehrer.ch, not tel:, not mailto:, not wa.me)
        for a in container.find_all("a", href=True):
            href = a["href"]
            if (href.startswith("http") and
                "fahrlehrer.ch" not in href and
                "wa.me" not in href and
                "mobility.ch" not in href and
                "verkehrstheorie.ch" not in href):
                entry["website"] = href
                try:
                    entry["website_domain"] = urllib.parse.urlparse(href).netloc
                except Exception:
                    pass
                break

        # Profile URL on fahrlehrer.ch
        for a in container.find_all("a", href=True):
            href = a["href"]
            if "/fahrschulen/" in href and "fahrlehrer.ch" in href:
                entry["profile_url"] = href
                break

        # Address: look for PLZ pattern (4 digits + city)
        text = container.get_text(separator=" ")
        plz_match = re.search(r'\b(\d{4})\s+([A-ZÄÖÜa-zäöü][a-zäöüA-ZÄÖÜ\s\-]+?)(?=\n|$|\s{2,})', text)
        if plz_match:
            entry["address"] = f"{plz_match.group(1)} {plz_match.group(2).strip()}"

        if entry["name"] and entry["name"] not in seen_names:
            seen_names.add(entry["name"])
            entries.append(entry)

    return entries


def scrape_email_from_website(url: str, referer: str = "") -> tuple[list[str], str]:
    """Scrape a school's own website for email addresses."""
    soup, status = fetch(url, referer=referer)
    if soup is None:
        return [], status
    emails = extract_emails_from_soup(soup)
    if emails:
        return emails, f"OK – {len(emails)} Email(s)"
    return [], f"Keine Email – {status}"


def find_city_urls_in_region(base_url: str) -> list[str]:
    """
    Given a fahrlehrer.ch region/category URL, find all linked city-level
    sub-pages within the same category/region.
    E.g. /autofahrschulen/zh/region-zuerich/zuerich.html
      → finds all /autofahrschulen/zh/region-*/city.html links
    """
    soup, status = fetch(base_url)
    if soup is None:
        return []

    # Determine the category prefix (e.g. /autofahrschulen/)
    parsed = urllib.parse.urlparse(base_url)
    path_parts = parsed.path.strip("/").split("/")
    category = path_parts[0] if path_parts else "autofahrschulen"

    city_urls: list[str] = []
    seen: set[str] = set()

    for a in soup.find_all("a", href=True):
        href = a["href"]
        # Normalize to absolute URL
        full = urllib.parse.urljoin(FAHRLEHRER_CH_BASE, href)
        parsed_link = urllib.parse.urlparse(full)

        # Must be on fahrlehrer.ch, same category, and end in .html
        if (
            parsed_link.netloc == "www.fahrlehrer.ch"
            and parsed_link.path.startswith(f"/{category}/")
            and parsed_link.path.endswith(".html")
            and full not in seen
        ):
            seen.add(full)
            city_urls.append(full)

    return city_urls


def main():
    parser = argparse.ArgumentParser(description="fahrlehrer.ch Verzeichnis-Scraper")
    parser.add_argument(
        "--url",
        default="https://www.fahrlehrer.ch/autofahrschulen",
        help="fahrlehrer.ch Listing-URL (default: /autofahrschulen)",
    )
    parser.add_argument("--output", default=None, help="Output CSV-Dateiname")
    parser.add_argument(
        "--full",
        action="store_true",
        help="Playwright verwenden: ALLE Einträge laden (inkl. JS-gerenderte, langsamer)",
    )
    parser.add_argument(
        "--crawl-region",
        action="store_true",
        help="Alle Städte/Ortschaften der Region automatisch durchsuchen (viel mehr Einträge)",
    )
    parser.add_argument(
        "--no-email-scrape",
        action="store_true",
        help="Nur Einträge sammeln, keine Email-Suche auf externen Websites",
    )
    parser.add_argument(
        "--all-cantons",
        action="store_true",
        help="Alle Kantone für Auto-Kategorie durchgehen (dauert länger)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.5,
        help="Pause zwischen Requests in Sekunden (default: 1.5)",
    )
    args = parser.parse_args()

    # Build list of URLs to scrape
    listing_urls = []
    if args.all_cantons:
        for canton, region, city in ALL_CANTONS:
            listing_urls.append(
                f"{FAHRLEHRER_CH_BASE}/autofahrschulen/{canton}/{region}/{city}.html"
            )
        print(f"Modus: Alle {len(listing_urls)} Kantone (Auto-Kategorie)")
    elif args.crawl_region:
        # Start with the given URL, then find all city sub-pages
        print(f"\nSuche alle Städte in: {args.url}")
        city_urls = find_city_urls_in_region(args.url)
        if args.url not in city_urls:
            city_urls.insert(0, args.url)
        listing_urls = city_urls
        print(f"  → {len(listing_urls)} Stadtseiten gefunden")
    else:
        listing_urls = [args.url]

    # Determine output file name
    if args.output:
        output_path = args.output
    elif args.all_cantons:
        output_path = "fahrlehrer_alle_kantone_emails.csv"
    elif args.crawl_region:
        slug = args.url.rstrip("/").split("/")[-2] if "/" in args.url else "region"
        output_path = f"fahrlehrer_{slug}_alle_staedte_emails.csv"
    else:
        slug = args.url.rstrip("/").split("/")[-1].replace(".html", "")
        output_path = f"fahrlehrer_{slug}_emails.csv"

    # Step 1: Collect entries from listing pages
    print("\n=== Schritt 1: Einträge aus Verzeichnis sammeln ===")
    if args.full:
        print("  Modus: Playwright (vollständige Liste – alle Einträge)")
    else:
        print("  Modus: requests (nur Premium-Einträge – für alle: --full verwenden)")
    all_entries = []
    seen_names: set[str] = set()

    for listing_url in listing_urls:
        entries = scrape_fahrlehrer_listing(listing_url, use_playwright=args.full)
        for entry in entries:
            if entry["name"] not in seen_names:
                seen_names.add(entry["name"])
                all_entries.append(entry)
        print(f"  → {len(entries)} Einträge gefunden ({len(all_entries)} total bisher)")
        if len(listing_urls) > 1:
            human_delay(args.delay, jitter=1.5)

    print(f"\nGesamt: {len(all_entries)} einzigartige Einträge")

    if not all_entries:
        print("Keine Einträge gefunden. Bitte URL prüfen.")
        sys.exit(1)

    # Step 2: Scrape external websites for emails
    if not args.no_email_scrape:
        print("\n=== Schritt 2: Externe Websites nach Emails durchsuchen ===")
        # Randomize order to avoid predictable patterns
        entries_to_scrape = [(i, e) for i, e in enumerate(all_entries) if e.get("website")]
        random.shuffle(entries_to_scrape)

        for idx, (orig_i, entry) in enumerate(entries_to_scrape, 1):
            website = entry["website"]
            print(f"[{idx}/{len(entries_to_scrape)}] {entry['name'][:40]:<40} {entry['website_domain']} ...", end=" ", flush=True)
            emails, status = scrape_email_from_website(website, referer="https://www.fahrlehrer.ch/")
            entry["emails"] = "; ".join(emails)
            entry["email_count"] = len(emails)
            entry["email_status"] = status
            print(status[:60])
            if idx < len(entries_to_scrape):
                human_delay(args.delay, jitter=2.0)

        # Fill in entries without websites
        for entry in all_entries:
            if "emails" not in entry:
                entry["emails"] = ""
                entry["email_count"] = 0
                entry["email_status"] = "Keine externe Website"
    else:
        for entry in all_entries:
            entry["emails"] = ""
            entry["email_count"] = 0
            entry["email_status"] = "nicht gesucht"
    # Write CSV
    fieldnames = ["name", "phone", "address", "website", "website_domain",
                  "emails", "email_count", "email_status", "profile_url"]
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_entries)

    found = sum(1 for e in all_entries if e.get("email_count", 0) > 0)
    has_website = sum(1 for e in all_entries if e.get("website"))
    print(f"\n=== Fertig ===")
    print(f"Einträge total:        {len(all_entries)}")
    print(f"Mit externer Website:  {has_website}")
    print(f"Mit Email gefunden:    {found}")
    print(f"Gespeichert in:        {output_path}")


if __name__ == "__main__":
    main()
