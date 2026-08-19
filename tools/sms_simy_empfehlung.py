#!/usr/bin/env python3
"""
SMS-Kampagne: Simy-Empfehlung an Fahrlehrer ohne E-Mail-Adresse
-----------------------------------------------------------------
Sendet eine einmalige SMS an alle fahrlehrer_leads, die KEINE E-Mail-Adresse
hinterlegt haben (egal ob status='new' oder 'contacted' von einer früheren
SMS-Kampagne), aber eine Mobilnummer (+41 7x) haben.

Nachricht (156 Zeichen, 1 SMS-Segment, GSM-7):
    "Die Fahrschule Driving Team empfiehlt die All-In-One Software Simy -
   deine Fahrschule auf Autopilot. Jetzt Kostenlos testen! simy.ch/fl
   Beste Grüsse, Pascal"

Der Link simy.ch/fl ist ein Kurzlink (apps/simy/server/routes/fl.get.ts),
der serverseitig auf /fahrschule mit UTM-Parametern weiterleitet und den
Klick in public.sms_link_clicks loggt.

Idempotent: Leads, deren notes-Feld bereits "Simy-SMS" enthält, werden bei
einem erneuten Lauf übersprungen (kein Doppelversand).

Verwendung:
    python3 tools/sms_simy_empfehlung.py --preview        # Zeigt Nachrichten, sendet nichts
    python3 tools/sms_simy_empfehlung.py --limit 5        # Sendet an max. 5 Kontakte (Test)
    python3 tools/sms_simy_empfehlung.py                  # Sendet an alle (~315 Kontakte)
    python3 tools/sms_simy_empfehlung.py --plz 8          # Nur Kanton Zürich (PLZ 8xxx)

Absender: "DrivingTeam" (alphanumerisch, max. 11 Zeichen)
"""

import sys
import time
import random
import argparse
from pathlib import Path
from datetime import datetime

try:
    import requests
    from twilio.rest import Client as TwilioClient
except ImportError:
    print("pip3 install requests twilio")
    sys.exit(1)

# ── Credentials ───────────────────────────────────────────────────────────────
def load_env():
    for path in [
        Path(__file__).parent.parent / ".env",
        Path(__file__).parent.parent / "apps" / "website" / ".env",
    ]:
        cfg = {}
        if path.exists():
            for line in path.read_text().splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, _, v = line.partition("=")
                    cfg[k.strip()] = v.strip()
            if cfg:
                return cfg
    return {}

env = load_env()
TWILIO_SID     = env.get("TWILIO_ACCOUNT_SID", "")
TWILIO_TOKEN   = env.get("TWILIO_AUTH_TOKEN", "")
SUPABASE_URL   = env.get("SUPABASE_URL", "")
SUPABASE_KEY   = env.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL:
    env2 = {}
    env2_path = Path(__file__).parent.parent / "apps" / "website" / ".env"
    if env2_path.exists():
        for line in env2_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                env2[k.strip()] = v.strip()
    SUPABASE_URL = env2.get("SUPABASE_URL", "")
    SUPABASE_KEY = env2.get("SUPABASE_SERVICE_ROLE_KEY", "")

SENDER_NAME = "DrivingTeam"  # Alphanumerischer Absender (max. 11 Zeichen)
NOTES_MARKER = "Simy-SMS"    # Für Idempotenz-Check im notes-Feld

SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

# ── Nachricht ─────────────────────────────────────────────────────────────────
def build_message() -> str:
    return (
        "Die Fahrschule Driving Team empfiehlt die All-In-One Software "
        "Simy - deine Fahrschule auf Autopilot. "
        "Jetzt Kostenlos testen! simy.ch/fl\n"
        "Beste Grüsse, Pascal"
    )

# ── Leads laden ───────────────────────────────────────────────────────────────
def fetch_leads(plz_prefix: str = "") -> list[dict]:
    leads, offset = [], 0
    while True:
        url = (
            f"{SUPABASE_URL}/rest/v1/fahrlehrer_leads"
            f"?select=id,name,first_name,phone,postal_code,city,notes"
            f"&or=(email.is.null,email.eq.)"
            f"&limit=1000&offset={offset}"
        )
        r = requests.get(url, headers=SB_HEADERS, timeout=30)
        r.raise_for_status()
        page = r.json()
        # Nur Handynummern (+41 7x) und noch nicht per Simy-SMS kontaktiert
        filtered = [
            l for l in page
            if (l.get("phone") or "").startswith("+41 7")
            and NOTES_MARKER not in (l.get("notes") or "")
        ]
        leads.extend(filtered)
        if len(page) < 1000:
            break
        offset += 1000

    if plz_prefix:
        leads = [l for l in leads if (l.get("postal_code") or "").startswith(plz_prefix)]

    return leads

# ── Status in Supabase setzen (notes ergänzen, nicht überschreiben) ──────────
def mark_sent(lead_id: str, existing_notes: str, twilio_sid: str):
    stamp = f"{NOTES_MARKER} gesendet (SID: {twilio_sid}) am {datetime.now().isoformat(timespec='seconds')}"
    new_notes = f"{existing_notes}\n{stamp}".strip() if existing_notes else stamp
    requests.patch(
        f"{SUPABASE_URL}/rest/v1/fahrlehrer_leads?id=eq.{lead_id}",
        json={
            "status": "contacted",
            "contacted_at": "now()",
            "notes": new_notes,
        },
        headers=SB_HEADERS,
        timeout=30,
    )

# ── SMS senden ────────────────────────────────────────────────────────────────
def send_sms(to: str, message: str, dry_run: bool = False) -> str:
    """Gibt Twilio Message SID zurück (oder 'DRY_RUN')."""
    if dry_run:
        return "DRY_RUN"
    client = TwilioClient(TWILIO_SID, TWILIO_TOKEN)
    msg = client.messages.create(
        body=message,
        from_=SENDER_NAME,
        to=to,
    )
    return msg.sid

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Simy-Empfehlung SMS-Kampagne (Fahrlehrer ohne E-Mail)")
    parser.add_argument("--preview", action="store_true", help="Vorschau (kein Versand)")
    parser.add_argument("--limit",   type=int, default=0,  help="Max. Anzahl SMS")
    parser.add_argument("--plz",     default="",           help="Nur PLZ die mit diesem Prefix beginnen (z.B. '8' für Zürich)")
    args = parser.parse_args()

    message = build_message()
    print(f"\nNachricht ({len(message)} Zeichen, 1 Segment):\n  {message}\n")

    leads = fetch_leads(plz_prefix=args.plz)
    if args.limit:
        leads = leads[:args.limit]

    total = len(leads)
    print(f"{'='*55}")
    print(f"  SMS-Kampagne: Simy-Empfehlung")
    print(f"  Absender:  {SENDER_NAME}")
    print(f"  Kontakte:  {total}")
    if args.plz:
        print(f"  PLZ-Filter: {args.plz}xxx")
    if args.preview:
        print(f"  Modus:     VORSCHAU (kein Versand)")
    elif args.limit:
        print(f"  Modus:     Test ({args.limit} SMS)")
    else:
        print(f"  Modus:     LIVE-VERSAND")
    print(f"{'='*55}\n")

    if not leads:
        print("Keine Leads gefunden (alle bereits kontaktiert oder keine Mobilnummer).")
        return

    print("Beispiel-Empfänger:")
    for lead in leads[:5]:
        print(f"  {lead['phone']}  ({lead.get('name')})")

    if args.preview:
        print(f"\n→ Vorschau-Modus: Kein Versand.")
        return

    print(f"\nStarte Versand in 5 Sekunden … (Ctrl+C zum Abbrechen)")
    time.sleep(5)

    sent, failed, skipped = 0, 0, 0
    failed_leads = []

    for i, lead in enumerate(leads, 1):
        phone    = (lead.get("phone") or "").strip()
        lead_id  = lead["id"]
        name     = lead.get("name", "")
        notes    = lead.get("notes") or ""

        if not phone:
            skipped += 1
            continue

        success = False
        last_error = ""
        for attempt in range(1, 4):
            try:
                sid = send_sms(phone, message, dry_run=False)
                mark_sent(lead_id, notes, sid)
                sent += 1
                print(f"  [{i}/{total}] ✓ {phone}  ({name[:40]})")
                success = True
                break
            except Exception as e:
                last_error = str(e)
                if attempt < 3:
                    wait = attempt * 5
                    print(f"  [{i}/{total}] ⚠ Versuch {attempt} fehlgeschlagen – warte {wait}s … ({phone})")
                    time.sleep(wait)

        if not success:
            failed += 1
            failed_leads.append({"id": lead_id, "phone": phone, "name": name, "error": last_error})
            print(f"  [{i}/{total}] ✗ {phone}  FEHLER nach 3 Versuchen: {last_error[:80]}")

        if i < total:
            time.sleep(random.uniform(2, 4))

    if failed_leads:
        log_path = Path(__file__).parent / "sms_fehler.log"
        with open(log_path, "a", encoding="utf-8") as f:
            import json
            f.write(f"\n--- {datetime.now().isoformat()} (sms_simy_empfehlung) ---\n")
            for fl in failed_leads:
                f.write(json.dumps(fl, ensure_ascii=False) + "\n")
        print(f"\n  ⚠ Fehlschläge gespeichert in: {log_path}")

    print(f"\n{'='*55}")
    print(f"  Gesendet:     {sent}")
    print(f"  Fehler:       {failed}{'  ← sms_fehler.log prüfen' if failed else ''}")
    print(f"  Übersprungen: {skipped}")
    print(f"{'='*55}\n")
    if failed:
        print("  Zum Retry der Fehlschläge:")
        print("  python3 tools/sms_simy_empfehlung.py")
        print("  (bereits gesendete werden automatisch übersprungen)\n")


if __name__ == "__main__":
    main()
