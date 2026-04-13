#!/usr/bin/env python3
"""
Extrahiert Vornamen aus dem 'name'-Feld aller fahrlehrer_leads
und speichert sie in der Spalte 'first_name' für manuelle Kontrolle.

Verwendung:
    python3 tools/extract_firstnames.py           # Alle ohne first_name befüllen
    python3 tools/extract_firstnames.py --all     # Alle überschreiben (auch bereits befüllte)
    python3 tools/extract_firstnames.py --preview # Nur Vorschau, nichts speichern
"""

import sys
import re
import argparse
from pathlib import Path

try:
    import requests
except ImportError:
    print("pip3 install requests")
    sys.exit(1)

# ── Supabase ──────────────────────────────────────────────────────────────────
def load_env():
    env_path = Path(__file__).parent.parent / "apps" / "website" / ".env"
    cfg = {}
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                cfg[k.strip()] = v.strip()
    return cfg.get("SUPABASE_URL", ""), cfg.get("SUPABASE_SERVICE_ROLE_KEY", "")

URL, KEY = load_env()
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

# ── Vorname-Extraktion ────────────────────────────────────────────────────────

# Wörter die KEIN Vorname sind
SKIP = {
    "fahrschule", "fahrschulen", "fahrlehrer", "fahrlehrerin", "fahrlehrerinnen",
    "driving", "school", "team", "gmbh", "ag", "sa", "llc", "ltd", "inc",
    "center", "centre", "schule", "verkehr", "verkehrskunde", "motorrad",
    "auto", "moto", "taxi", "bus", "lkw", "pkw", "camion", "boot", "segelschule",
    "motorboot", "test", "alle", "kategorien", "region", "und", "von", "de",
    "the", "zürich", "zuerich", "bern", "basel", "luzern", "winterthur", "aarau",
    "zug", "chur", "schaffhausen", "frauenfeld", "thun", "biel", "bülach",
    "uster", "horgen", "thalwil", "dietikon", "schlieren", "regensdorf",
    "dübendorf", "kloten", "rapperswil", "wettingen", "olten", "solothurn",
    "liestal", "allschwil", "kreuzlingen", "weinfelden", "arbon", "emmen",
    "kriens", "sursee", "willisau", "worb", "köniz", "ostermundigen", "steffisburg",
    "1x1",
}

# Typische Firmen-Suffixe
COMPANY_RE = re.compile(
    r"\b(gmbh|ag|sa|llc|ltd|inc|co\.|gmbh\.)\b", re.IGNORECASE
)

# Städte / Kantone nach denen kein Vorname folgt
LOCATION_RE = re.compile(
    r"\b(zürich|bern|basel|luzern|winterthur|aarau|zug|chur|schaffhausen|"
    r"frauenfeld|thun|biel|st\.?\s*gallen|aargau|solothurn|thurgau|glarus)\b",
    re.IGNORECASE,
)

def extract_firstname(name: str) -> str:
    if not name:
        return ""

    # ── Priorität 1: Name in Klammern ────────────────────────────────────────
    # "Fahrschule XY (Peter Muster)" → "Peter"
    m = re.search(r"\(([^)]+)\)", name)
    if m:
        inner = m.group(1).strip()
        # Klammerninhalt darf keine reine Kategorie-Beschreibung sein
        if not re.search(r"\b(alle|kategorien|zürich|bern|basel)\b", inner, re.IGNORECASE):
            words = inner.split()
            if words:
                candidate = words[0]
                # Überspringen: Abkürzung (C.), zu kurz, nicht grossgeschrieben
                if (len(candidate) > 2
                        and candidate[0].isupper()
                        and not candidate.endswith(".")
                        and candidate.lower() not in SKIP):
                    return candidate

    # ── Priorität 2: Bereinigter Name ohne Klammern ───────────────────────────
    clean = re.sub(r"\(.*?\)", "", name)          # Klammern entfernen
    clean = re.sub(r"\[.*?\]", "", clean)
    clean = COMPANY_RE.sub(" ", clean)            # GmbH, AG etc.
    clean = LOCATION_RE.sub(" ", clean)           # Städte
    clean = re.sub(                               # "Fahrschule"-Varianten
        r"\b(fahrschule[n]?|fahrlehrer[in]*|fahrlehr\w*|"
        r"driving\s*school|driving\s*team|verkehrsschule|"
        r"motorboot.*?schule|segelschule)\b",
        " ", clean, flags=re.IGNORECASE
    )
    clean = re.sub(r"[-/&|]", " ", clean)        # Trennzeichen
    clean = re.sub(r"\d+\.?\w*", " ", clean)     # Zahlen / "1x1"
    clean = re.sub(r"[^\w\s]", " ", clean)       # Sonderzeichen
    clean = re.sub(r"\s+", " ", clean).strip()

    words = [
        w for w in clean.split()
        if len(w) > 2
        and w.lower() not in SKIP
        and w[0].isupper()           # Gross geschrieben
        and not w.isupper()          # Keine VOLLSTÄNDIGEN GROSSBUCHSTABEN (Abkürzung)
    ]

    if not words:
        return ""

    # ── Priorität 3: Genitiv-s entfernen ("Gordanas" → "Gordana") ────────────
    # Wenn nur ein Wort, und es endet auf 's' nach einem Vokal → Genitiv
    if len(words) == 1:
        w = words[0]
        if w.endswith("s") and len(w) > 4 and w[-2].lower() in "aeiou":
            return w[:-1]
        return w

    # ── Priorität 4: "Nachname Vorname" vs "Vorname Nachname" erkennen ────────
    # Heuristik 1: Letztes Wort endet auf Vokal (a, e, i, o) → wahrscheinlich Vorname
    # z.B. "Senn Gabi" → "Gabi", "Zumbrunn Cornelia" → "Cornelia"
    last  = words[-1]
    first = words[0]
    if last[-1].lower() in "aeiou" and first[-1].lower() not in "aeiou":
        return last

    # Heuristik 2: Erstes Wort endet auf typische Nachnamen-Endungen
    lastname_suffixes = re.compile(r"(mann|stein|berg|brunn|thaler|meier|müller|walter|ler|cker|ner|nig)$", re.IGNORECASE)
    if lastname_suffixes.search(first):
        return last

    return first


# ── Alle Leads laden ──────────────────────────────────────────────────────────
def fetch_leads(only_empty: bool) -> list[dict]:
    leads, offset = [], 0
    filt = "&first_name=is.null" if only_empty else ""
    while True:
        r = requests.get(
            f"{URL}/rest/v1/fahrlehrer_leads?select=id,name,first_name{filt}&limit=1000&offset={offset}",
            headers=HEADERS, timeout=30
        )
        r.raise_for_status()
        data = r.json()
        leads.extend(data)
        if len(data) < 1000:
            break
        offset += 1000
    return leads


def update_firstname(lead_id: str, first_name: str):
    r = requests.patch(
        f"{URL}/rest/v1/fahrlehrer_leads?id=eq.{lead_id}",
        json={"first_name": first_name or None},
        headers=HEADERS, timeout=30
    )
    r.raise_for_status()


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--all",     action="store_true", help="Auch bereits befüllte überschreiben")
    parser.add_argument("--preview", action="store_true", help="Nur Vorschau, nichts speichern")
    args = parser.parse_args()

    only_empty = not args.all
    leads = fetch_leads(only_empty)
    print(f"{len(leads)} Einträge geladen {'(nur leere first_name)' if only_empty else '(alle)'}")

    updated, skipped, no_name = 0, 0, 0

    for lead in leads:
        name  = lead.get("name") or ""
        fn    = extract_firstname(name)
        label = fn if fn else "(kein Vorname erkannt)"

        if args.preview:
            print(f"  {label:<20} ← {name}")
            continue

        if fn:
            update_firstname(lead["id"], fn)
            updated += 1
        else:
            # Leer lassen – Mensch soll manuell eintragen
            no_name += 1

        if updated % 50 == 0 and updated > 0:
            print(f"  {updated} aktualisiert …")

    if not args.preview:
        print(f"\n{'='*50}")
        print(f"  Vorname extrahiert:    {updated}")
        print(f"  Kein Vorname erkannt:  {no_name}  ← manuell prüfen!")
        print(f"  Übersprungen:          {skipped}")
        print(f"{'='*50}")
        print(f"\nJetzt in Supabase kontrollieren:")
        print(f"  SELECT name, first_name FROM fahrlehrer_leads")
        print(f"  WHERE first_name IS NULL ORDER BY name;")


if __name__ == "__main__":
    main()
