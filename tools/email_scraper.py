#!/usr/bin/env python3
"""
Email Scraper für Fahrlehrer-URLs
----------------------------------
Liest URLs aus einer CSV-Datei, scrapt jede Seite nach Email-Adressen
(via mailto:-Links + Text-Regex) und speichert die Ergebnisse in ein neues CSV.

Verwendung:
    python3 tools/email_scraper.py input.csv
    python3 tools/email_scraper.py input.csv --column 0        # Spaltenindex (default: 0)
    python3 tools/email_scraper.py input.csv --output out.csv  # Output-Dateiname
"""

import sys
import re
import csv
import time
import argparse
import urllib.parse
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Fehlende Pakete. Bitte ausführen: pip3 install requests beautifulsoup4")
    sys.exit(1)

EMAIL_REGEX = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/123.0.0.0 Safari/537.36"
    )
}

EXCLUDED_EMAIL_DOMAINS = {
    "sentry.io", "example.com", "test.com", "wixpress.com",
    "squarespace.com", "shopify.com", "wordpress.com",
}


def normalize_url(url: str) -> str:
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url


def scrape_emails(url: str, timeout: int = 10) -> tuple[list[str], str]:
    """Returns (emails, status)"""
    try:
        response = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        response.raise_for_status()
    except requests.exceptions.Timeout:
        return [], "Timeout"
    except requests.exceptions.ConnectionError:
        return [], "Verbindungsfehler"
    except requests.exceptions.HTTPError as e:
        return [], f"HTTP {e.response.status_code}"
    except Exception as e:
        return [], f"Fehler: {str(e)[:60]}"

    soup = BeautifulSoup(response.text, "html.parser")

    emails: set[str] = set()

    # 1. mailto: Links
    for tag in soup.find_all("a", href=True):
        href = tag["href"]
        if href.lower().startswith("mailto:"):
            addr = href[7:].split("?")[0].strip().lower()
            if EMAIL_REGEX.match(addr):
                emails.add(addr)

    # 2. Sichtbarer Text der ganzen Seite
    text = soup.get_text(separator=" ")
    for match in EMAIL_REGEX.findall(text):
        emails.add(match.lower())

    # Filter offensichtliche False-Positives raus
    filtered = [
        e for e in emails
        if not any(e.endswith(d) for d in EXCLUDED_EMAIL_DOMAINS)
        and not e.startswith("@")
    ]

    status = f"OK ({response.status_code})" if filtered else f"Keine Email gefunden ({response.status_code})"
    return sorted(filtered), status


def main():
    parser = argparse.ArgumentParser(description="Email-Scraper für Fahrlehrer-URLs")
    parser.add_argument("input", help="Eingabe-CSV mit URLs")
    parser.add_argument("--column", type=int, default=0, help="Spaltenindex der URLs (default: 0)")
    parser.add_argument("--output", default=None, help="Output-CSV Dateiname")
    parser.add_argument("--delay", type=float, default=1.0, help="Pause zwischen Requests in Sekunden (default: 1.0)")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Datei nicht gefunden: {input_path}")
        sys.exit(1)

    output_path = args.output or input_path.stem + "_emails.csv"

    # URLs einlesen
    urls = []
    with open(input_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        for row in reader:
            if row and len(row) > args.column:
                url = row[args.column].strip()
                if url:
                    urls.append(url)

    if not urls:
        print(f"Keine URLs in Spalte {args.column} gefunden.")
        sys.exit(1)

    print(f"\n{len(urls)} URLs gefunden. Starte Scraping...\n")

    results = []
    for i, raw_url in enumerate(urls, 1):
        url = normalize_url(raw_url)
        print(f"[{i}/{len(urls)}] {url} ...", end=" ", flush=True)
        emails, status = scrape_emails(url)
        print(status)
        results.append({
            "url": url,
            "emails": "; ".join(emails),
            "anzahl_emails": len(emails),
            "status": status,
        })
        if i < len(urls):
            time.sleep(args.delay)

    # Output schreiben
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["url", "emails", "anzahl_emails", "status"])
        writer.writeheader()
        writer.writerows(results)

    found = sum(1 for r in results if r["anzahl_emails"] > 0)
    print(f"\nFertig! {found}/{len(urls)} Seiten mit Email-Adressen.")
    print(f"Gespeichert in: {output_path}")


if __name__ == "__main__":
    main()
