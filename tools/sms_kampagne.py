#!/usr/bin/env python3
"""
SMS-Kampagne: Fahrlehrerweiterbildung
--------------------------------------
Sendet personalisierte SMS an alle fahrlehrer_leads mit status='new'
und einer Handynummer (+41 7x). Setzt danach status='contacted'.

Verwendung:
    python3 tools/sms_kampagne.py --preview        # Zeigt erste 5 Nachrichten, sendet nichts
    python3 tools/sms_kampagne.py --limit 10       # Sendet an max. 10 Kontakte (Test)
    python3 tools/sms_kampagne.py                  # Sendet an alle (445 Kontakte)
    python3 tools/sms_kampagne.py --plz 8          # Nur Kanton Zürich (PLZ 8xxx)

Absender: "DrivingTeam" (alphanumerisch, max. 11 Zeichen)
"""

import sys
import time
import random
import argparse
from pathlib import Path

try:
    import requests
    from twilio.rest import Client as TwilioClient
except ImportError:
    print("pip3 install requests twilio")
    sys.exit(1)

# ── Credentials ───────────────────────────────────────────────────────────────
def load_env():
    # Versuche zuerst Root-.env, dann apps/website/.env
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
TWILIO_FROM    = env.get("TWILIO_PHONE_NUMBER", "")
SUPABASE_URL   = env.get("SUPABASE_URL", "")
SUPABASE_KEY   = env.get("SUPABASE_SERVICE_ROLE_KEY", "")

# Falls Supabase noch nicht aus Root-.env geladen, hole aus apps/website/.env
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

SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

# ── Nachricht ─────────────────────────────────────────────────────────────────
def build_message(first_name: str) -> str:
    return (
        f"Hallo {first_name}, wir vom Driving Team bieten 2 einzigartige "
        f"FL-Weiterbildungen an: einmal als Motorbootschüler:in auf dem See, einmal als "
        f"LKW-Fahrer:in - und du darfst jeweils selbst ans Steuer. "
        f"Interesse? drivingteam.ch/fahrlehrerweiterbildung "
        f"Beste Grüsse Pascal"
    )

# ── Leads laden ───────────────────────────────────────────────────────────────
def fetch_leads(plz_prefix: str = "") -> list[dict]:
    leads, offset = [], 0
    while True:
        url = (
            f"{SUPABASE_URL}/rest/v1/fahrlehrer_leads"
            f"?select=id,name,first_name,phone,postal_code,city"
            f"&status=eq.new"
            f"&limit=1000&offset={offset}"
        )
        r = requests.get(url, headers=SB_HEADERS, timeout=30)
        r.raise_for_status()
        data = r.json()
        # Nur Handynummern (+41 7x)
        data = [l for l in data if (l.get("phone") or "").startswith("+41 7")]
        leads.extend(data)
        if len(data) < 1000:
            break
        offset += 1000

    if plz_prefix:
        leads = [l for l in leads if (l.get("postal_code") or "").startswith(plz_prefix)]

    return leads

# ── Status in Supabase setzen ─────────────────────────────────────────────────
def mark_contacted(lead_id: str, twilio_sid: str):
    requests.patch(
        f"{SUPABASE_URL}/rest/v1/fahrlehrer_leads?id=eq.{lead_id}",
        json={
            "status": "contacted",
            "contacted_at": "now()",
            "notes": f"SMS gesendet (SID: {twilio_sid})",
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
    parser = argparse.ArgumentParser(description="Fahrlehrerweiterbildung SMS-Kampagne")
    parser.add_argument("--preview", action="store_true", help="Vorschau (kein Versand)")
    parser.add_argument("--limit",   type=int, default=0,  help="Max. Anzahl SMS")
    parser.add_argument("--plz",     default="",           help="Nur PLZ die mit diesem Prefix beginnen (z.B. '8' für Zürich)")
    args = parser.parse_args()

    leads = fetch_leads(plz_prefix=args.plz)
    if args.limit:
        leads = leads[:args.limit]

    total = len(leads)
    print(f"\n{'='*55}")
    print(f"  SMS-Kampagne: Fahrlehrerweiterbildung")
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
        print("Keine Leads gefunden.")
        return

    # Vorschau: erste 5 Nachrichten zeigen
    print("Beispiel-Nachrichten:")
    for lead in leads[:3]:
        fn  = lead.get("first_name") or "liebe Fahrlehrerkolleg:innen"
        msg = build_message(fn)
        print(f"\n  An: {lead['phone']}  ({lead.get('name')})")
        print(f"  Von: {SENDER_NAME}")
        print(f"  Text ({len(msg)} Zeichen / ~{len(msg)//153+1} SMS-Teil(e)):")
        print(f"  {msg[:120]}…")

    if args.preview:
        print(f"\n→ Vorschau-Modus: Kein Versand.")
        return

    print(f"\nStarte Versand in 5 Sekunden … (Ctrl+C zum Abbrechen)")
    time.sleep(5)

    sent, failed, skipped = 0, 0, 0
    failed_leads = []

    for i, lead in enumerate(leads, 1):
        phone    = (lead.get("phone") or "").strip()
        fn       = (lead.get("first_name") or "liebe Fahrlehrerkolleg:innen").strip()
        lead_id  = lead["id"]
        name     = lead.get("name", "")

        if not phone:
            skipped += 1
            continue

        message = build_message(fn)

        # 3 Versuche pro Nummer
        success = False
        last_error = ""
        for attempt in range(1, 4):
            try:
                sid = send_sms(phone, message, dry_run=False)
                mark_contacted(lead_id, sid)
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

        # Menschliche Verzögerung: 2–4 Sekunden zwischen SMS
        if i < total:
            time.sleep(random.uniform(2, 4))

    # Fehlschläge in Datei speichern für manuellen Retry
    if failed_leads:
        log_path = Path(__file__).parent / "sms_fehler.log"
        with open(log_path, "a", encoding="utf-8") as f:
            import json
            from datetime import datetime
            f.write(f"\n--- {datetime.now().isoformat()} ---\n")
            for fl in failed_leads:
                f.write(json.dumps(fl, ensure_ascii=False) + "\n")
        print(f"\n  ⚠ Fehlschläge gespeichert in: {log_path}")

    print(f"\n{'='*55}")
    print(f"  Gesendet:     {sent}")
    print(f"  Fehler:       {failed}{'  ← sms_fehler.log prüfen' if failed else ''}")
    print(f"  Übersprungen: {skipped}")
    print(f"  Verbleibend:  {total - sent - skipped}  (status='new')")
    print(f"{'='*55}\n")
    if failed:
        print("  Zum Retry der Fehlschläge:")
        print("  python3 tools/sms_kampagne.py")
        print("  (bereits gesendete werden automatisch übersprungen)\n")


if __name__ == "__main__":
    main()
