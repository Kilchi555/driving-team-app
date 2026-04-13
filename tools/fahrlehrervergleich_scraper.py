#!/usr/bin/env python3
"""
fahrlehrervergleich.ch Scraper
--------------------------------
Scrapt fahrlehrervergleich.ch mit Playwright (Stealth-Modus).
Extrahiert: Name, Adresse, Telefon (inkl. "Nummer anzeigen" Click),
externe Website, und sucht dort nach Email-Adressen.

Verwendung:
    python3 tools/fahrlehrervergleich_scraper.py
    python3 tools/fahrlehrervergleich_scraper.py --city "zuerich-r:ORS2S6p0"
    python3 tools/fahrlehrervergleich_scraper.py --city "bern-r:..." --output bern.csv
    python3 tools/fahrlehrervergleich_scraper.py --no-email-scrape
    python3 tools/fahrlehrervergleich_scraper.py --all-cities

Stadt-IDs für --city findest du in der URL:
    https://www.fahrlehrervergleich.ch/r/fahrschulen/zuerich-r:ORS2S6p0
                                                      ^^^^^^^^^^^^^^^^^^^
"""

import sys
import re
import csv
import time
import random
import logging
import argparse
import urllib.parse
from pathlib import Path

logging.getLogger("fake_useragent").setLevel(logging.ERROR)

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("pip3 install requests beautifulsoup4 playwright fake-useragent playwright-stealth")
    sys.exit(1)

try:
    from fake_useragent import UserAgent
    _ua = UserAgent(browsers=["chrome", "firefox"])
    def random_ua() -> str:
        return _ua.random
except Exception:
    _FALLBACK_UAS = [
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    ]
    def random_ua() -> str:
        return random.choice(_FALLBACK_UAS)

EMAIL_REGEX = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
PHONE_REGEX = re.compile(r"(\+41|0041|0)[\s\-]?(\d{2})[\s\-]?(\d{3})[\s\-]?(\d{2})[\s\-]?(\d{2})")
BASE_URL = "https://www.fahrlehrervergleich.ch"

EXCLUDED_EMAIL_DOMAINS = {
    "sentry.io", "example.com", "test.com", "wixpress.com",
    "squarespace.com", "fahrlehrervergleich.ch", "google.com", "apple.com",
}

# Known city slugs — add more as needed
CITY_SLUGS = [
    "zuerich-r:ORS2S6p0",
    "bern-r:ORS2S3j0",
    "basel-r:ORS2S0Z0",
    "luzern-r:ORS2SMl0",
    "winterthur-r:ORS2SYA0",
    "st-gallen-r:ORS2SVp0",
    "lausanne-r:O3h2SOR1",
    "genf-r:ORS2Slp0",
    "aarau-r:ORS2SA00",
    "zug-r:ORS2SqX0",
]


# ─── Human-like helpers ────────────────────────────────────────────────────────

def human_delay(base: float = 1.2, jitter: float = 2.5) -> None:
    time.sleep(base + random.uniform(0, jitter))

def micro_delay() -> None:
    time.sleep(random.uniform(0.15, 0.6))

def human_mouse_move(page, x: int, y: int) -> None:
    """Move mouse in a curved path to target, not a straight line."""
    steps = random.randint(8, 15)
    cur_x = page.evaluate("() => window.__mouseX || 400")
    cur_y = page.evaluate("() => window.__mouseY || 300")
    for i in range(steps):
        t = (i + 1) / steps
        # Add slight curve/wobble
        wx = random.randint(-8, 8)
        wy = random.randint(-8, 8)
        nx = int(cur_x + (x - cur_x) * t + wx)
        ny = int(cur_y + (y - cur_y) * t + wy)
        page.mouse.move(nx, ny)
        time.sleep(random.uniform(0.01, 0.04))

def human_scroll(page, direction: str = "down", amount: int = None) -> None:
    """Scroll in a human-like pattern."""
    if amount is None:
        amount = random.randint(250, 700)
    if direction == "up":
        amount = -amount
    page.evaluate(f"window.scrollBy({{ top: {amount}, behavior: 'smooth' }})")
    time.sleep(random.uniform(0.4, 1.1))

def make_stealth_context(playwright):
    """Create a fully stealthed browser context."""
    browser = playwright.chromium.launch(
        headless=True,
        args=[
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-infobars",
            "--window-size=1366,768",
            "--start-maximized",
        ],
    )
    context = browser.new_context(
        user_agent=random_ua(),
        locale="de-CH",
        timezone_id="Europe/Zurich",
        viewport={"width": random.randint(1280, 1440), "height": random.randint(768, 900)},
        color_scheme="light",
        java_script_enabled=True,
        # Realistic device memory + hardware concurrency
        extra_http_headers={
            "Accept-Language": "de-CH,de;q=0.9,en;q=0.7",
            "DNT": "1",
        },
    )
    # Override automation fingerprints
    context.add_init_script("""
        // Hide webdriver
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        // Realistic plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
        });
        Object.defineProperty(navigator, 'languages', {
            get: () => ['de-CH', 'de', 'en-US', 'en'],
        });
        Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
        // Chrome runtime
        window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {} };
        // Track mouse position for human_mouse_move
        document.addEventListener('mousemove', (e) => {
            window.__mouseX = e.clientX;
            window.__mouseY = e.clientY;
        });
        // Permissions API
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) =>
            parameters.name === 'notifications'
                ? Promise.resolve({ state: Notification.permission })
                : originalQuery(parameters);
    """)

    try:
        from playwright_stealth import stealth_sync
        # Will be applied per-page
        context._stealth = stealth_sync
    except ImportError:
        context._stealth = None

    return browser, context


# ─── Email scraping (requests-based, fast) ────────────────────────────────────

_req_session = requests.Session()

def scrape_email_from_url(url: str) -> tuple[list[str], str]:
    """Fetch an external website and extract emails."""
    try:
        ua = random_ua()
        resp = _req_session.get(
            url,
            headers={
                "User-Agent": ua,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "de-CH,de;q=0.9",
                "Accept-Encoding": "gzip, deflate",
                "Connection": "keep-alive",
                "DNT": "1",
                "Referer": BASE_URL,
            },
            timeout=12,
            allow_redirects=True,
        )
        if resp.status_code == 429:
            time.sleep(random.uniform(5, 12))
            return [], "Rate-limit"
        resp.raise_for_status()
    except Exception as e:
        return [], str(e)[:50]

    soup = BeautifulSoup(resp.text, "html.parser")
    emails: set[str] = set()

    for a in soup.find_all("a", href=True):
        if a["href"].lower().startswith("mailto:"):
            addr = a["href"][7:].split("?")[0].strip().lower()
            if EMAIL_REGEX.match(addr):
                emails.add(addr)

    for m in EMAIL_REGEX.findall(soup.get_text(" ")):
        emails.add(m.lower())

    filtered = sorted(
        e for e in emails
        if not any(e.endswith(d) for d in EXCLUDED_EMAIL_DOMAINS)
        and "@" in e and "." in e.split("@")[-1]
    )
    return filtered, f"OK – {len(filtered)} Email(s)" if filtered else "Keine Email"


# ─── Main Playwright scraper ───────────────────────────────────────────────────

def scrape_city(city_slug: str, no_email_scrape: bool = False) -> list[dict]:
    """
    Scrape all school profiles for a given city slug.
    Returns list of dicts with: name, address, phone, website, emails.
    """
    from playwright.sync_api import sync_playwright

    city_url = f"{BASE_URL}/r/fahrschulen/{city_slug}"
    print(f"\n  Stadt: {city_url}")
    results: list[dict] = []

    with sync_playwright() as p:
        browser, context = make_stealth_context(p)

        try:
            page = context.new_page()
            if context._stealth:
                context._stealth(page)

            # 1. Visit homepage first (natural browsing)
            page.goto(BASE_URL, wait_until="domcontentloaded", timeout=20000)
            human_delay(1.5, 2.0)

            # 2. Navigate to city listing
            page.goto(city_url, wait_until="networkidle", timeout=30000)
            human_delay(1.5, 2.5)

            # Scroll down to load all listings (lazy loading / infinite scroll)
            prev_count = 0
            for _ in range(10):
                human_scroll(page, amount=random.randint(400, 800))
                time.sleep(random.uniform(0.8, 1.5))
                links_now = page.query_selector_all("a[href*='/d/fahrschulen/']")
                if len(links_now) == prev_count:
                    break
                prev_count = len(links_now)

            # Also check for "Mehr laden" / pagination buttons and click them
            for _ in range(5):
                try:
                    more_btn = page.query_selector(
                        "button:has-text('Mehr'), button:has-text('Weitere'), "
                        "a:has-text('Mehr'), [class*='load-more'], [class*='pagination'] a"
                    )
                    if more_btn and more_btn.is_visible():
                        box = more_btn.bounding_box()
                        if box:
                            human_mouse_move(page, int(box["x"] + box["width"]/2), int(box["y"] + box["height"]/2))
                            micro_delay()
                        more_btn.dispatch_event("click")
                        time.sleep(random.uniform(1.5, 2.5))
                    else:
                        break
                except Exception:
                    break

            # 3. Collect all profile links
            profile_links = set()
            for a in page.query_selector_all("a[href*='/d/fahrschulen/']"):
                href = a.get_attribute("href") or ""
                if href and "#" not in href:
                    full = urllib.parse.urljoin(BASE_URL, href)
                    profile_links.add(full)

            print(f"  → {len(profile_links)} Profile gefunden")

            # Randomize visit order
            profile_list = list(profile_links)
            random.shuffle(profile_list)

            for i, profile_url in enumerate(profile_list, 1):
                print(f"  [{i}/{len(profile_list)}] {profile_url.split('/')[-1][:50]}", end=" ... ", flush=True)

                entry = {
                    "name": "",
                    "address": "",
                    "phone": "",
                    "website": "",
                    "emails": "",
                    "email_count": 0,
                    "profile_url": profile_url,
                    "city": city_slug.split("-r:")[0],
                }

                try:
                    # Navigate with referer set to city listing
                    page.goto(profile_url, wait_until="domcontentloaded", timeout=20000,
                              referer=city_url)
                    human_delay(0.8, 1.5)

                    # Scroll a bit to appear human
                    human_scroll(page, amount=random.randint(150, 400))
                    micro_delay()

                    # ── Extract name ──
                    h1 = page.query_selector("h1")
                    if h1:
                        entry["name"] = h1.inner_text().strip()

                    # ── Extract address ──
                    # Look for text matching PLZ pattern
                    page_text = page.inner_text("body")
                    plz = re.search(r"(\d{4})\s+([A-ZÄÖÜa-zäöü][^\n,]{2,30})", page_text)
                    if plz:
                        entry["address"] = f"{plz.group(1)} {plz.group(2).strip()}"

                    # ── Click "Nummer anzeigen" to reveal phone ──
                    try:
                        phone_btn = page.query_selector(
                            "button:has-text('anzeigen'), "
                            "a:has-text('anzeigen'), "
                            "span:has-text('anzeigen'), "
                            "[data-testid*='phone'], "
                            "[class*='reveal'], [class*='show-phone']"
                        )
                        if phone_btn:
                            box = phone_btn.bounding_box()
                            if box:
                                tx = int(box["x"] + box["width"] / 2)
                                ty = int(box["y"] + box["height"] / 2)
                                human_mouse_move(page, tx, ty)
                                micro_delay()
                            # Use dispatch_event to avoid navigation timeouts
                            phone_btn.dispatch_event("click")
                            time.sleep(random.uniform(0.4, 0.9))
                    except Exception:
                        pass  # Phone reveal failed silently

                    # ── Extract phone from full DOM (incl. hidden elements) ──
                    # Phone is often in display:none until clicked, use innerHTML
                    try:
                        html_content = page.content()
                        phone_soup = BeautifulSoup(html_content, "html.parser")
                        phone_text = phone_soup.get_text(" ")
                        phone_matches = PHONE_REGEX.findall(phone_text)
                        if phone_matches:
                            m = phone_matches[0]
                            digits = re.sub(r"\D", "", "".join(m))
                            if digits.startswith("0041"):
                                digits = digits[4:]
                            elif digits.startswith("41") and len(digits) > 10:
                                digits = digits[2:]
                            elif digits.startswith("0"):
                                digits = digits[1:]
                            if len(digits) >= 9:
                                entry["phone"] = f"+41 {digits[:2]} {digits[2:5]} {digits[5:7]} {digits[7:9]}"
                    except Exception:
                        pass

                    # ── Extract external website (filter browser-suggestion links & CDN) ──
                    SKIP_DOMAINS = {
                        "fahrlehrervergleich.ch", "microsoft.com", "google.com",
                        "mozilla.org", "apple.com", "facebook.com", "instagram.com",
                        "twitter.com", "getfirefox.com", "wa.me", "rokka.io",
                        "youtube.com", "linkedin.com", "maps.google", "goo.gl",
                    }
                    SKIP_EXTENSIONS = (".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".pdf")
                    for a in page.query_selector_all("a[href]"):
                        href = a.get_attribute("href") or ""
                        if (
                            href.startswith("http")
                            and not any(d in href for d in SKIP_DOMAINS)
                            and not any(href.lower().endswith(ext) for ext in SKIP_EXTENSIONS)
                            and len(href) > 12
                        ):
                            entry["website"] = href
                            break

                    print(f"{entry['name'][:38]} | {entry['phone'] or 'kein Tel'}", end="")

                    # ── Scrape external website for email ──
                    if entry["website"] and not no_email_scrape:
                        emails, email_status = scrape_email_from_url(entry["website"])
                        entry["emails"] = "; ".join(emails)
                        entry["email_count"] = len(emails)
                        print(f" | {email_status}", end="")
                        human_delay(1.0, 1.5)

                    print()
                    results.append(entry)

                except Exception as e:
                    print(f"Fehler: {str(e)[:60]}")
                    results.append(entry)

                # Human-like delay between profiles
                human_delay(1.5, 3.0)

        finally:
            browser.close()

    return results


def main():
    parser = argparse.ArgumentParser(description="fahrlehrervergleich.ch Scraper (Playwright Stealth)")
    parser.add_argument(
        "--city",
        default="zuerich-r:ORS2S6p0",
        help="Stadt-Slug aus der URL (default: zuerich)",
    )
    parser.add_argument(
        "--all-cities",
        action="store_true",
        help="Alle bekannten Städte scrapen",
    )
    parser.add_argument("--output", default=None, help="Output CSV-Dateiname")
    parser.add_argument(
        "--with-emails",
        action="store_true",
        help="Externe Websites nach Emails durchsuchen (langsamer, Standard: aus)",
    )
    args = parser.parse_args()

    # Email scraping is OFF by default — phone-only is fast
    no_email_scrape = not args.with_emails

    cities = CITY_SLUGS if args.all_cities else [args.city]
    output = args.output or f"tel_{args.city.split('-r:')[0]}.csv"
    if args.all_cities:
        output = args.output or "tel_alle_staedte.csv"

    mode = "Telefon + Name + Adresse" if no_email_scrape else "Telefon + Name + Adresse + Email"
    print(f"\n=== fahrlehrervergleich.ch Scraper ===")
    print(f"Modus:  {mode}")
    print(f"Städte: {len(cities)} | Output: {output}\n")

    all_results: list[dict] = []
    seen: set[str] = set()

    for city_slug in cities:
        entries = scrape_city(city_slug, no_email_scrape=no_email_scrape)
        for e in entries:
            key = e.get("profile_url", e.get("name", ""))
            if key and key not in seen:
                seen.add(key)
                all_results.append(e)
        print(f"  → {len(entries)} Profile für {city_slug.split('-r:')[0]}")
        if len(cities) > 1:
            human_delay(3.0, 5.0)

    # Output only the relevant columns
    if no_email_scrape:
        fieldnames = ["name", "phone", "address", "city", "profile_url"]
    else:
        fieldnames = ["name", "phone", "address", "website", "emails", "email_count", "city", "profile_url"]
    # Strip unwanted fields before writing
    with open(output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(all_results)

    found_phone = sum(1 for r in all_results if r.get("phone"))
    found_email = sum(1 for r in all_results if r.get("email_count", 0) > 0)

    print(f"\n=== Fertig ===")
    print(f"Profile total:      {len(all_results)}")
    print(f"Mit Telefonnummer:  {found_phone}")
    print(f"Mit Email:          {found_email}")
    print(f"Gespeichert in:     {output}")


if __name__ == "__main__":
    main()
