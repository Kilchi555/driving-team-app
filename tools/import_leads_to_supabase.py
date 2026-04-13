#!/usr/bin/env python3
"""
Importiert gescrapte Fahrlehrer-Leads aus CSV(s) in die Supabase-Tabelle fahrlehrer_leads.

Verwendung:
    python3 tools/import_leads_to_supabase.py /tmp/fahrlehrer_alle_tel.csv
    python3 tools/import_leads_to_supabase.py /tmp/file1.csv /tmp/file2.csv

Credentials werden aus apps/website/.env gelesen (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
"""

import sys
import re
import csv
import os
from pathlib import Path

try:
    import requests
except ImportError:
    print("pip3 install requests")
    sys.exit(1)

# ── Credentials ─────────────────────────────────────────────────────────────
def load_env():
    env_path = Path(__file__).parent.parent / "apps" / "website" / ".env"
    config = {}
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                config[k.strip()] = v.strip()
    return config

env = load_env()
SUPABASE_URL = env.get("SUPABASE_URL", "")
SERVICE_KEY  = env.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SERVICE_KEY:
    print("FEHLER: SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlen in apps/website/.env")
    sys.exit(1)

# ── Adress-Parser ────────────────────────────────────────────────────────────
PLZ_CITY_RE = re.compile(r"\b([3-9]\d{3})\s+(.+)")

def parse_address(raw: str):
    """Gibt (postal_code, city) zurück oder ('', '')."""
    if not raw:
        return "", ""
    m = PLZ_CITY_RE.search(raw.strip())
    if m:
        return m.group(1), m.group(2).strip().rstrip(",").strip()
    return "", ""

# ── Supabase Insert ──────────────────────────────────────────────────────────
ENDPOINT = f"{SUPABASE_URL}/rest/v1/fahrlehrer_leads"
HEADERS  = {
    "apikey":        SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "return=minimal",
}

BATCH = 200

def fetch_existing_phones() -> set:
    """Lädt alle bereits gespeicherten Telefonnummern aus Supabase."""
    existing = set()
    offset = 0
    limit  = 1000
    while True:
        resp = requests.get(
            f"{ENDPOINT}?select=phone&phone=not.is.null&limit={limit}&offset={offset}",
            headers=HEADERS,
            timeout=30,
        )
        if not resp.ok:
            print(f"  Warnung: Konnte existierende Phones nicht laden ({resp.status_code})")
            break
        data = resp.json()
        for row in data:
            if row.get("phone"):
                existing.add(row["phone"])
        if len(data) < limit:
            break
        offset += limit
    return existing

def insert_batch(rows: list[dict]) -> int:
    """Fügt neue Zeilen ein (kein Upsert – Duplikate wurden bereits gefiltert)."""
    resp = requests.post(ENDPOINT, json=rows, headers=HEADERS, timeout=30)
    if not resp.ok:
        print(f"  HTTP {resp.status_code}: {resp.text[:300]}")
    return resp.status_code

# ── CSV laden ────────────────────────────────────────────────────────────────
def load_csv(path: str) -> list[dict]:
    rows = []
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            plz, city = parse_address(row.get("address", ""))
            rows.append({
                "name":        (row.get("name") or "").strip() or None,
                "phone":       (row.get("phone") or "").strip() or None,
                "address":     (row.get("address") or "").strip() or None,
                "postal_code": plz or None,
                "city":        city or None,
                "email":       (row.get("email") or "").strip() or None,
                "website":     (row.get("website") or "").strip() or None,
                "source":      (row.get("source") or "unbekannt").strip(),
                "source_url":  (row.get("source_url") or "").strip() or None,
                "status":      "new",
            })
    return rows

# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    files = sys.argv[1:] or ["/tmp/fahrlehrer_alle_tel.csv"]

    all_rows = []
    for f in files:
        if not os.path.exists(f):
            print(f"Datei nicht gefunden: {f}")
            continue
        loaded = load_csv(f)
        print(f"  {f}: {len(loaded)} Zeilen geladen")
        all_rows.extend(loaded)

    if not all_rows:
        print("Keine Daten zum Importieren.")
        sys.exit(1)

    # Deduplizierung nach Phone vor dem Upload
    seen, deduped = set(), []
    for r in all_rows:
        key = r["phone"] or f"{r['name']}_{r['source']}"
        if key not in seen:
            seen.add(key)
            deduped.append(r)

    total = len(deduped)
    print(f"\nPrüfe existierende Einträge in Supabase …")
    existing_phones = fetch_existing_phones()
    print(f"  {len(existing_phones)} Telefonnummern bereits in DB")

    new_only = [r for r in deduped if not r["phone"] or r["phone"] not in existing_phones]
    skipped  = total - len(new_only)
    print(f"  {skipped} übersprungen (Duplikate), {len(new_only)} neu zu importieren")

    if not new_only:
        print("Keine neuen Einträge.")
        return

    print(f"\nStarte Import: {len(new_only)} neue Einträge → {SUPABASE_URL}")

    imported, failed = 0, 0
    for i in range(0, len(new_only), BATCH):
        batch = new_only[i : i + BATCH]
        status = insert_batch(batch)
        if status in (200, 201):
            imported += len(batch)
            print(f"  Batch {i // BATCH + 1}: {len(batch)} Einträge ✓")
        else:
            failed += len(batch)
            print(f"  Batch {i // BATCH + 1}: FEHLER (HTTP {status})")

    print(f"\n{'='*50}")
    print(f"  Importiert: {imported}")
    print(f"  Fehler:     {failed}")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()
