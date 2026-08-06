#!/usr/bin/env python3
"""
Merge Carzi + Marketing-Fahrlehrer-Leads into fahrlehrer_leads, then enrich contacts.

Phases:
  1. merge   – load sources, dedupe by phone/email, upsert into fahrlehrer_leads
  2. enrich  – for phone-only: find email (priority); for email-only: find phone

Usage:
  python3 tools/merge_enrich_fahrlehrer_leads.py merge
  python3 tools/merge_enrich_fahrlehrer_leads.py enrich --limit 50
  python3 tools/merge_enrich_fahrlehrer_leads.py enrich --emails-only --limit 100
  python3 tools/merge_enrich_fahrlehrer_leads.py enrich --phones-only --limit 50
  python3 tools/merge_enrich_fahrlehrer_leads.py stats
"""

from __future__ import annotations

import argparse
import json
import os
import re
import ssl
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("pip3 install requests beautifulsoup4")
    raise SystemExit(1)


# ── Env ──────────────────────────────────────────────────────────────────────
def load_env() -> dict:
    config: dict[str, str] = {}
    # Later files override earlier (root .env has new sb_secret_ keys)
    for rel in ("apps/website/.env", ".env", ".env.local"):
        path = Path(__file__).parent.parent / rel
        if not path.exists():
            continue
        for line in path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                config[k.strip()] = v.strip().strip('"').strip("'")
    return config


ENV = load_env()
SUPABASE_URL = ENV.get("SUPABASE_URL", "").rstrip("/")
# Prefer modern sb_secret_ over disabled legacy JWTs
_candidates = [
    ENV.get("SUPABASE_SECRET_KEY", ""),
    ENV.get("SUPABASE_SERVICE_ROLE_KEY", ""),
]
SERVICE_KEY = next((k for k in _candidates if k.startswith("sb_secret_")), "") or next(
    (k for k in _candidates if k), ""
)
if not SUPABASE_URL or not SERVICE_KEY:
    print("FEHLER: SUPABASE_URL / SERVICE_ROLE_KEY fehlen")
    raise SystemExit(1)
print(f"Using key type: {'sb_secret' if SERVICE_KEY.startswith('sb_secret_') else 'legacy/other'}")

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}
ENDPOINT = f"{SUPABASE_URL}/rest/v1/fahrlehrer_leads"
LEADS_ENDPOINT = f"{SUPABASE_URL}/rest/v1/leads"

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(
    r"(?:\+|00)?(?:41)?[\s./\-()]*(?:0?7[5-9]|0?8[0-9]|0?4[1-9]|0?2[1-9])[\d\s./\-()]{6,14}"
)
EXCLUDED_EMAIL_DOMAINS = {
    "sentry.io", "example.com", "test.com", "wixpress.com", "squarespace.com",
    "shopify.com", "wordpress.com", "google.com", "apple.com", "github.com",
    "cloudflare.com", "w3.org", "schema.org", "facebook.com", "instagram.com",
    "googleapis.com", "gstatic.com", "carzi.ch",
}
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
)


# ── Normalize helpers ────────────────────────────────────────────────────────
def strip_accents(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c)
    )


def norm_email(e: str | None) -> str | None:
    if not e:
        return None
    e = e.strip().lower()
    if "@" not in e or e.endswith(tuple(EXCLUDED_EMAIL_DOMAINS)):
        return None
    if any(e.endswith("@" + d) or e.endswith("." + d) for d in EXCLUDED_EMAIL_DOMAINS):
        return None
    return e


def norm_phone(p: str | None) -> str | None:
    if not p:
        return None
    digits = re.sub(r"[^\d+]", "", p.strip())
    if digits.startswith("00"):
        digits = "+" + digits[2:]
    if digits.startswith("0") and not digits.startswith("00"):
        digits = "+41" + digits[1:]
    if digits.startswith("41") and not digits.startswith("+"):
        digits = "+" + digits
    if re.fullmatch(r"7\d{8}", digits):
        digits = "+41" + digits
    # pretty format +41 XX XXX XX XX when possible
    m = re.fullmatch(r"\+41(\d{9})", digits)
    if m:
        d = m.group(1)
        return f"+41 {d[0:2]} {d[2:5]} {d[5:7]} {d[7:9]}"
    if len(re.sub(r"\D", "", digits)) < 9:
        return None
    return digits


def norm_name_key(name: str | None) -> str:
    if not name:
        return ""
    s = strip_accents(name).lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    for w in (
        "fahrschule", "fahrschuel", "fahrschue", "auto ecole", "autoecole",
        "driving", "school", "gmbh", "ag", "the", "die", "der", "das", "und",
    ):
        s = s.replace(w, " ")
    return re.sub(r"\s+", " ", s).strip()


def first_name_from(name: str | None) -> str | None:
    if not name:
        return None
    parts = re.split(r"[\s&/,]+", name.strip())
    if not parts:
        return None
    # skip generic prefixes
    skip = {"fahrschule", "fs", "auto", "ecole"}
    for p in parts:
        if p.lower() not in skip and len(p) > 1:
            return p
    return parts[0]


def domain_from_email(email: str) -> str | None:
    try:
        return email.split("@", 1)[1].lower()
    except Exception:
        return None


def website_candidates(email: str | None, website: str | None, name: str | None) -> list[str]:
    out: list[str] = []
    if website:
        w = website.strip()
        if not w.startswith("http"):
            w = "https://" + w
        out.append(w)
    if email:
        dom = domain_from_email(email)
        if dom and not any(dom.endswith(d) for d in ("gmail.com", "bluewin.ch", "hotmail.com", "gmx.ch", "gmx.net", "outlook.com", "yahoo.com", "icloud.com", "hispeed.ch", "sunrise.ch", "me.com", "ggaweb.ch", "msn.com")):
            out.append(f"https://{dom}")
            out.append(f"https://www.{dom}")
    # de-dupe preserve order
    seen = set()
    uniq = []
    for u in out:
        if u not in seen:
            seen.add(u)
            uniq.append(u)
    return uniq


# ── HTTP helpers ─────────────────────────────────────────────────────────────
def http_get_json(url: str) -> dict | list:
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60, context=ssl.create_default_context()) as r:
        return json.loads(r.read().decode())


def fetch_soup(url: str, timeout: int = 12) -> BeautifulSoup | None:
    try:
        resp = requests.get(
            url,
            headers={"User-Agent": UA, "Accept": "text/html", "Accept-Language": "de-CH,de;q=0.9"},
            timeout=timeout,
            allow_redirects=True,
        )
        if resp.status_code >= 400:
            return None
        return BeautifulSoup(resp.text, "html.parser")
    except Exception:
        return None


def extract_emails(soup: BeautifulSoup) -> list[str]:
    found: set[str] = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.lower().startswith("mailto:"):
            addr = href[7:].split("?")[0].strip().lower()
            if EMAIL_RE.match(addr):
                found.add(addr)
    for m in EMAIL_RE.findall(soup.get_text(" ")):
        found.add(m.lower())
    return [
        e for e in sorted(found)
        if not any(e.endswith(d) or e.split("@")[-1].endswith(d) for d in EXCLUDED_EMAIL_DOMAINS)
        and not e.endswith((".png", ".jpg", ".webp", ".svg"))
    ]


def extract_phones(soup: BeautifulSoup) -> list[str]:
    found: set[str] = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.lower().startswith("tel:"):
            n = norm_phone(href[4:])
            if n:
                found.add(n)
    text = soup.get_text(" ")
    for m in PHONE_RE.findall(text):
        n = norm_phone(m)
        if n:
            found.add(n)
    return sorted(found)


def duckduckgo_first_website(query: str) -> str | None:
    """Best-effort public HTML search for a school website."""
    url = "https://html.duckduckgo.com/html/?" + urllib.parse.urlencode({"q": query})
    try:
        resp = requests.post(
            url,
            data={"q": query},
            headers={"User-Agent": UA},
            timeout=15,
        )
        soup = BeautifulSoup(resp.text, "html.parser")
        for a in soup.select("a.result__a"):
            href = a.get("href") or ""
            # ddg redirect
            if "uddg=" in href:
                href = urllib.parse.unquote(href.split("uddg=")[-1].split("&")[0])
            if not href.startswith("http"):
                continue
            host = urllib.parse.urlparse(href).netloc.lower()
            if any(x in host for x in ("duckduckgo.", "facebook.", "instagram.", "linkedin.", "youtube.", "local.ch", "search.ch", "tel.search", "maps.google")):
                continue
            return href
    except Exception:
        return None
    return None


# ── Supabase fetch/upsert ────────────────────────────────────────────────────
def sb_get_all(endpoint: str, select: str, extra: str = "") -> list[dict]:
    rows: list[dict] = []
    offset = 0
    limit = 1000
    while True:
        url = f"{endpoint}?select={select}{extra}&limit={limit}&offset={offset}"
        resp = requests.get(url, headers={**HEADERS, "Prefer": "count=exact"}, timeout=60)
        if not resp.ok:
            raise RuntimeError(f"GET {endpoint} -> {resp.status_code} {resp.text[:200]}")
        batch = resp.json()
        rows.extend(batch)
        if len(batch) < limit:
            break
        offset += limit
    return rows


def sb_patch(lead_id: str, data: dict) -> bool:
    resp = requests.patch(
        f"{ENDPOINT}?id=eq.{lead_id}",
        headers=HEADERS,
        json=data,
        timeout=30,
    )
    return resp.ok


def sb_insert(rows: list[dict]) -> tuple[int, str]:
    if not rows:
        return 0, ""
    resp = requests.post(ENDPOINT, headers=HEADERS, json=rows, timeout=60)
    if resp.ok:
        return len(resp.json()) if resp.text else len(rows), ""
    return 0, f"{resp.status_code}: {resp.text[:300]}"


def fetch_carzi_coaches() -> list[dict]:
    coaches: list[dict] = []
    offset = 0
    while True:
        url = f"https://www.app.carzi.ch/api/users/coaches/?limit=100&offset={offset}"
        # curl-style via requests (ssl ok)
        resp = requests.get(url, headers={"Accept": "application/json", "User-Agent": UA}, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        batch = data.get("results", [])
        coaches.extend(batch)
        if not data.get("next") or not batch:
            break
        offset += 100
    return coaches


# ── Merge phase ──────────────────────────────────────────────────────────────
def merge() -> None:
    print("=== MERGE ===")
    print("Lade bestehende fahrlehrer_leads…")
    existing = sb_get_all(
        ENDPOINT,
        "id,name,first_name,phone,email,website,address,city,postal_code,source,source_url,status,notes",
    )
    print(f"  {len(existing)} vorhanden")

    print("Lade Marketing-Leads source=Fahrlehrer…")
    marketing = sb_get_all(
        LEADS_ENDPOINT,
        "id,email,first_name,last_name,phone,status,source,categories",
        "&source=eq.Fahrlehrer",
    )
    print(f"  {len(marketing)} vorhanden")

    print("Lade Carzi coaches…")
    carzi = fetch_carzi_coaches()
    print(f"  {len(carzi)} coaches")

    # Index existing
    by_phone: dict[str, dict] = {}
    by_email: dict[str, dict] = {}
    for row in existing:
        p = norm_phone(row.get("phone"))
        e = norm_email(row.get("email"))
        if p:
            by_phone[p] = row
        if e:
            by_email[e] = row

    updates: list[tuple[str, dict]] = []  # (id, patch)
    inserts: list[dict] = []
    stats = defaultdict(int)

    def merge_into(target: dict, incoming: dict, source_tag: str) -> dict:
        """Fill empty fields on target from incoming; return patch dict of changes."""
        patch: dict = {}
        field_map = {
            "name": incoming.get("name"),
            "first_name": incoming.get("first_name"),
            "phone": incoming.get("phone"),
            "email": incoming.get("email"),
            "website": incoming.get("website"),
            "address": incoming.get("address"),
            "city": incoming.get("city"),
            "postal_code": incoming.get("postal_code"),
            "source_url": incoming.get("source_url"),
        }
        for k, v in field_map.items():
            if not v:
                continue
            cur = target.get(k)
            if cur is None or str(cur).strip() == "":
                patch[k] = v
                target[k] = v
        # annotate source in notes
        note = target.get("notes") or ""
        tag = f"src:{source_tag}"
        if tag not in note:
            patch["notes"] = (note + (" | " if note else "") + tag).strip(" |")
            target["notes"] = patch["notes"]
        # keep original source if empty
        if not target.get("source"):
            patch["source"] = source_tag
            target["source"] = source_tag
        return patch

    def upsert_record(rec: dict, source_tag: str) -> None:
        phone = norm_phone(rec.get("phone"))
        email = norm_email(rec.get("email"))
        if phone:
            rec["phone"] = phone
        if email:
            rec["email"] = email

        hit = None
        if phone and phone in by_phone:
            hit = by_phone[phone]
        elif email and email in by_email:
            hit = by_email[email]

        if hit:
            patch = merge_into(hit, rec, source_tag)
            if patch:
                updates.append((hit["id"], patch))
                stats["updated"] += 1
            else:
                stats["unchanged"] += 1
            # refresh indexes if new phone/email filled
            if hit.get("phone"):
                by_phone[norm_phone(hit["phone"]) or ""] = hit
            if hit.get("email"):
                by_email[norm_email(hit["email"]) or ""] = hit
            return

        # new row
        row = {
            "name": rec.get("name"),
            "first_name": rec.get("first_name") or first_name_from(rec.get("name")),
            "phone": phone,
            "email": email,
            "website": rec.get("website"),
            "address": rec.get("address"),
            "city": rec.get("city"),
            "postal_code": rec.get("postal_code"),
            "source": source_tag,
            "source_url": rec.get("source_url"),
            "status": "new",
            "notes": f"src:{source_tag}",
        }
        # skip completely empty
        if not row["phone"] and not row["email"]:
            stats["skipped_empty"] += 1
            return
        inserts.append(row)
        # provisional index to avoid dup inserts in same run
        fake = {**row, "id": f"pending-{len(inserts)}"}
        if phone:
            by_phone[phone] = fake
        if email:
            by_email[email] = fake
        stats["inserted"] += 1

    # 1) Carzi
    for c in carzi:
        school = (c.get("school") or {}).get("name") or ""
        name = f"{c.get('first_name', '')} {c.get('last_name', '')}".strip()
        full = f"{name} ({school})" if school and school.lower() not in name.lower() else (name or school)
        upsert_record(
            {
                "name": full or school or name,
                "first_name": c.get("first_name") or first_name_from(name),
                "email": c.get("email"),
                "phone": None,
                "website": None,
                "source_url": f"https://www.app.carzi.ch/",
            },
            "carzi",
        )

    # 2) Marketing email list
    for m in marketing:
        fn = (m.get("first_name") or "").strip()
        ln = (m.get("last_name") or "").strip()
        name = f"{fn} {ln}".strip() or None
        email = m.get("email")
        # derive rough name from email local part if missing
        if not name and email and "@" in email:
            local = email.split("@")[0]
            if local not in ("info", "kontakt", "mail", "office", "admin", "hello"):
                name = local.replace(".", " ").replace("_", " ").title()
            else:
                dom = domain_from_email(email) or ""
                name = dom.split(".")[0].replace("-", " ").title() if dom else None
        upsert_record(
            {
                "name": name,
                "first_name": fn or first_name_from(name),
                "email": email,
                "phone": m.get("phone"),
                "website": f"https://{domain_from_email(email)}" if domain_from_email(email or "") else None,
            },
            "marketing_fahrlehrer",
        )

    # Cross-fill emails onto phone-only by name key (existing + pending)
    print("Name-Matching Phone↔Email…")
    phone_only = [r for r in list(by_phone.values()) if r.get("phone") and not r.get("email")]
    email_idx: dict[str, list[dict]] = defaultdict(list)
    for r in list(by_email.values()):
        if r.get("email"):
            email_idx[norm_name_key(r.get("name"))].append(r)
            email_idx[norm_name_key(r.get("first_name"))].append(r)

    name_matched = 0
    for r in phone_only:
        keys = {norm_name_key(r.get("name")), norm_name_key(r.get("first_name"))}
        keys.discard("")
        candidates = []
        for k in keys:
            candidates.extend(email_idx.get(k, []))
        # unique by email
        seen_e = set()
        uniq = []
        for c in candidates:
            e = norm_email(c.get("email"))
            if e and e not in seen_e:
                seen_e.add(e)
                uniq.append(c)
        if len(uniq) == 1:
            e = norm_email(uniq[0].get("email"))
            if e and r.get("id") and not str(r["id"]).startswith("pending"):
                patch = {"email": e}
                if uniq[0].get("website") and not r.get("website"):
                    patch["website"] = uniq[0]["website"]
                updates.append((r["id"], patch))
                r["email"] = e
                by_email[e] = r
                name_matched += 1
                stats["name_matched_email"] += 1
    print(f"  Name-Matches: {name_matched}")

    # Apply updates (dedupe patches per id)
    merged_patches: dict[str, dict] = {}
    for lid, patch in updates:
        if str(lid).startswith("pending"):
            continue
        merged_patches.setdefault(lid, {}).update(patch)

    print(f"Patches anwenden: {len(merged_patches)}")
    ok = fail = 0
    for lid, patch in merged_patches.items():
        if sb_patch(lid, patch):
            ok += 1
        else:
            fail += 1
    print(f"  OK={ok} FAIL={fail}")

    # Inserts in batches
    print(f"Inserts: {len(inserts)}")
    # final dedupe inserts by phone/email against each other
    final_inserts = []
    seen_p, seen_e = set(), set()
    for row in inserts:
        p, e = row.get("phone"), row.get("email")
        if p and p in seen_p:
            continue
        if e and e in seen_e:
            continue
        if p:
            seen_p.add(p)
        if e:
            seen_e.add(e)
        # strip None website noise for free-mail
        if e and row.get("website"):
            dom = domain_from_email(e) or ""
            if any(dom.endswith(x) for x in ("gmail.com", "bluewin.ch", "hotmail.com", "gmx.ch", "gmx.net", "outlook.com", "icloud.com", "hispeed.ch", "sunrise.ch")):
                row["website"] = None
        final_inserts.append(row)

    inserted = 0
    for i in range(0, len(final_inserts), 100):
        batch = final_inserts[i : i + 100]
        n, err = sb_insert(batch)
        if err:
            print(f"  Batch {i}: {err}")
            # fallback one-by-one
            for row in batch:
                n1, err1 = sb_insert([row])
                if n1:
                    inserted += n1
                else:
                    print(f"    skip: {err1} | {row.get('email') or row.get('phone')}")
        else:
            inserted += n
        print(f"  inserted so far {inserted}/{len(final_inserts)}")

    print("\n=== MERGE DONE ===")
    for k, v in sorted(stats.items()):
        print(f"  {k}: {v}")
    print(f"  inserts_applied: {inserted}")
    print(f"  patches_applied: {ok}")
    stats_cmd()


def stats_cmd() -> None:
    rows = sb_get_all(ENDPOINT, "id,email,phone,website,source,status")
    total = len(rows)
    with_email = sum(1 for r in rows if r.get("email"))
    with_phone = sum(1 for r in rows if r.get("phone"))
    both = sum(1 for r in rows if r.get("email") and r.get("phone"))
    email_only = sum(1 for r in rows if r.get("email") and not r.get("phone"))
    phone_only = sum(1 for r in rows if r.get("phone") and not r.get("email"))
    with_web = sum(1 for r in rows if r.get("website"))
    print("\n=== STATS fahrlehrer_leads ===")
    print(f"  total:       {total}")
    print(f"  with email:  {with_email}")
    print(f"  with phone:  {with_phone}")
    print(f"  both:        {both}")
    print(f"  email-only:  {email_only}")
    print(f"  phone-only:  {phone_only}")
    print(f"  with website:{with_web}")
    by_src: dict[str, int] = defaultdict(int)
    for r in rows:
        by_src[r.get("source") or "?"] += 1
    print("  by source:")
    for s, n in sorted(by_src.items(), key=lambda x: -x[1]):
        print(f"    {n:4d}  {s}")


# ── Enrich phase ─────────────────────────────────────────────────────────────
def enrich(limit: int, emails_only: bool, phones_only: bool, delay: float) -> None:
    print("=== ENRICH ===")
    rows = sb_get_all(
        ENDPOINT,
        "id,name,first_name,phone,email,website,source,notes",
    )

    phone_only = [r for r in rows if r.get("phone") and not r.get("email")]
    email_only = [r for r in rows if r.get("email") and not r.get("phone")]
    print(f"phone-only needing email: {len(phone_only)}")
    print(f"email-only needing phone: {len(email_only)}")

    email_found = phone_found = 0

    # Priority: emails for phone-only
    if not phones_only:
        email_targets = phone_only[:limit]
        print(f"\nSuche Emails für {len(email_targets)} Phone-only Leads…")
        for i, r in enumerate(email_targets, 1):
            name = r.get("name") or r.get("first_name") or ""
            candidates = website_candidates(None, r.get("website"), name)
            if not candidates and name:
                q = f"{name} Fahrschule Schweiz Kontakt"
                site = duckduckgo_first_website(q)
                if site:
                    candidates = [site]
                    sb_patch(r["id"], {"website": site})

            emails: list[str] = []
            used_url = None
            for url in candidates:
                soup = fetch_soup(url)
                if not soup:
                    continue
                emails = extract_emails(soup)
                if emails:
                    used_url = url
                    break
                for path in ("/kontakt", "/contact", "/impressum", "/about"):
                    soup2 = fetch_soup(urllib.parse.urljoin(url, path))
                    if soup2:
                        emails = extract_emails(soup2)
                        if emails:
                            used_url = urllib.parse.urljoin(url, path)
                            break
                if emails:
                    break

            if emails:
                email = emails[0]
                patch = {"email": email}
                if used_url and not r.get("website"):
                    patch["website"] = used_url
                note = r.get("notes") or ""
                if "enriched:email" not in note:
                    patch["notes"] = (note + " | enriched:email").strip(" |")
                if sb_patch(r["id"], patch):
                    email_found += 1
                    print(f"  [{i}/{len(email_targets)}] ✓ {name[:40]:<40} {email}")
                else:
                    print(f"  [{i}/{len(email_targets)}] patch fail {name}")
            else:
                print(f"  [{i}/{len(email_targets)}] – {name[:50]}")
            time.sleep(delay)

    if not emails_only:
        phone_limit = limit if phones_only else max(20, limit // 3)
        phone_targets = email_only[:phone_limit]
        print(f"\nSuche Telefone für {len(phone_targets)} Email-only Leads…")
        for i, r in enumerate(phone_targets, 1):
            email = r.get("email")
            name = r.get("name") or ""
            candidates = website_candidates(email, r.get("website"), name)
            phones: list[str] = []
            used_url = None
            for url in candidates:
                soup = fetch_soup(url)
                if not soup:
                    continue
                phones = extract_phones(soup)
                if phones:
                    used_url = url
                    break
                for path in ("/kontakt", "/contact", "/impressum"):
                    soup2 = fetch_soup(urllib.parse.urljoin(url, path))
                    if soup2:
                        phones = extract_phones(soup2)
                        if phones:
                            used_url = urllib.parse.urljoin(url, path)
                            break
                if phones:
                    break

            if phones:
                phone = phones[0]
                patch = {"phone": phone}
                if used_url and not r.get("website"):
                    patch["website"] = used_url
                note = r.get("notes") or ""
                if "enriched:phone" not in note:
                    patch["notes"] = (note + " | enriched:phone").strip(" |")
                if sb_patch(r["id"], patch):
                    phone_found += 1
                    print(f"  [{i}/{len(phone_targets)}] ✓ {email:<40} {phone}")
                else:
                    print(f"  [{i}/{len(phone_targets)}] conflict/fail {email} {phone}")
            else:
                print(f"  [{i}/{len(phone_targets)}] – {email}")
            time.sleep(delay)

    print("\n=== ENRICH DONE ===")
    print(f"  emails found: {email_found}")
    print(f"  phones found: {phone_found}")
    stats_cmd()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["merge", "enrich", "stats"])
    parser.add_argument("--limit", type=int, default=80, help="Max leads to enrich this run")
    parser.add_argument("--emails-only", action="store_true")
    parser.add_argument("--phones-only", action="store_true")
    parser.add_argument("--delay", type=float, default=1.2)
    args = parser.parse_args()

    if args.command == "merge":
        merge()
    elif args.command == "enrich":
        enrich(args.limit, args.emails_only, args.phones_only, args.delay)
    else:
        stats_cmd()


if __name__ == "__main__":
    main()
