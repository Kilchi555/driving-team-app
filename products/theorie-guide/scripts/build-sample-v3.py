#!/usr/bin/env python3
"""Sample v3: Cover + Kapitel 01 only — controlled layout, no Canva AI."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content" / "de.json"
CSS = (ROOT / "styles" / "guide.v3-sample.css").read_text(encoding="utf-8")
LOGO = ROOT / "assets" / "img" / "logo-crop.png"
OUT_HTML = ROOT / "build" / "sample-v3-kapitel-01.html"
OUT_PDF = ROOT / "build" / "Sample-v3-Kapitel-01.pdf"
DESKTOP_HTML = Path.home() / "Desktop" / "Driving-Team-Theorie-Sample-v3.html"
DESKTOP_PDF = Path.home() / "Desktop" / "Driving-Team-Theorie-Sample-v3.pdf"


def esc(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def logo_tag() -> str:
    return '<img class="logo" src="../assets/img/logo-crop.png" alt="Driving Team" />'


def render_stairs(levels: list) -> str:
    rows = []
    for lv in levels:
        ex = "".join(f"<li>{esc(e)}</li>" for e in lv.get("examples", []))
        note = f'<div class="note">{esc(lv["note"])}</div>' if lv.get("note") else ""
        rows.append(
            f"""
            <div class="stair rank-{lv['rank']}">
              <div class="n">{lv['rank']:02d}</div>
              <div>
                <div class="name">{esc(lv['name'])}</div>
                {note}
                <ul>{ex}</ul>
              </div>
            </div>"""
        )
    return "".join(rows)


def build_sample(data: dict) -> str:
    meta = data["meta"]
    ch = next(c for c in data["chapters"] if c["id"] == "vortrittshierarchie")
    sections = {s["type"]: s for s in ch["sections"]}

    hook = sections["hook"]
    hierarchy = sections["hierarchy"]
    memory = sections["memory"]
    check = sections["check"]
    fach = sections["fachbox"]

    return f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Sample v3 — {esc(ch['title'])}</title>
  <style>{CSS}</style>
</head>
<body>
  <section class="page cover">
    <div class="cover-accent"></div>
    <div class="cover-inner">
      <div class="cover-top">
        {logo_tag()}
        <div class="cover-edition">Premium Guide · Deutsch</div>
      </div>
      <div class="cover-main">
        <h1>{esc(meta['title'])}</h1>
        <p class="subtitle">{esc(meta['subtitle'])}</p>
        <div class="tagline">{esc(meta['tagline'])}</div>
      </div>
      <div class="cover-bottom">
        <div>
          <strong>{esc(meta['brand'])}</strong>
          Version {esc(meta['version'])} · {esc(meta['legalNote'])}
        </div>
        <div>drivingteam.ch</div>
      </div>
    </div>
  </section>

  <section class="page chapter-open">
    <div class="kicker">Kapitel {esc(ch['number'])}</div>
    <div class="num">{esc(ch['number'])}</div>
    <h1>{esc(ch['title'])}</h1>
    <p class="goal">{esc(ch['goal'])}</p>
    <div class="foot">
      {logo_tag()}
      <span>drivingteam.ch</span>
    </div>
  </section>

  <section class="page content">
    <div class="content-bar"></div>
    <div class="content-head">
      <span class="title">{esc(ch['title'])}</span>
      <span>{esc(meta['brand'])}</span>
    </div>
    <div class="section">
      <div class="section-label">Einstieg</div>
      <h2>{esc(hook['headline'])}</h2>
      <p>{esc(hook['body'])}</p>
    </div>
    <div class="page-foot">
      <span>{esc(meta['title'])}</span>
      <span>Kap. {esc(ch['number'])} · S. 3</span>
    </div>
  </section>

  <section class="page content">
    <div class="content-bar"></div>
    <div class="content-head">
      <span class="title">{esc(hierarchy['title'])}</span>
      <span>Kap. {esc(ch['number'])}</span>
    </div>
    <div class="section">
      <h2>{esc(hierarchy['title'])}</h2>
      <p class="small" style="font-size:9pt;color:var(--muted);margin-bottom:5mm;">Oben schlägt unten — merke die Reihenfolge.</p>
      <div class="stairs">{render_stairs(hierarchy['levels'])}</div>
    </div>
    <div class="page-foot">
      <span>{esc(meta['title'])}</span>
      <span>Kap. {esc(ch['number'])} · S. 4</span>
    </div>
  </section>

  <section class="page memory-page">
    <div class="label">{esc(memory['title'])}</div>
    <h2>B-P-A-S-G</h2>
    <p class="body">{esc(memory['body'])}</p>
    <div class="page-foot" style="color:rgba(255,255,255,0.45);border-top-color:rgba(255,255,255,0.15);">
      <span>{esc(meta['title'])}</span>
      <span>Kap. {esc(ch['number'])} · S. 5</span>
    </div>
  </section>

  <section class="page check-page">
    <div class="content-bar"></div>
    <div class="check-box">
      <div class="label">Prüfungs-Check</div>
      <h3>{esc(check['question'])}</h3>
    </div>
    <div class="answer">
      <strong>Antwort</strong>
      <p>{esc(check['answer'])}</p>
    </div>
    <div class="page-foot">
      <span>{esc(meta['title'])}</span>
      <span>Kap. {esc(ch['number'])} · S. 6</span>
    </div>
  </section>

  <section class="page fach-page">
    <div class="content-bar"></div>
    <div class="fach-box">
      <div class="label">{esc(fach['title'])}</div>
      <h3>Rechtliche Grundlage</h3>
      <p>{esc(fach['body'])}</p>
    </div>
    <div class="page-foot">
      <span>{esc(meta['title'])}</span>
      <span>Kap. {esc(ch['number'])} · S. 7</span>
    </div>
  </section>
</body>
</html>"""


def render_pdf(html_path: Path, pdf_path: Path) -> None:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(html_path.as_uri(), wait_until="networkidle")
        page.pdf(
            path=str(pdf_path),
            format="A4",
            print_background=True,
            margin={"top": "0", "bottom": "0", "left": "0", "right": "0"},
            prefer_css_page_size=True,
        )
        browser.close()


def main() -> None:
    data = json.loads(CONTENT.read_text(encoding="utf-8"))
    OUT_HTML.parent.mkdir(parents=True, exist_ok=True)
    html = build_sample(data)
    OUT_HTML.write_text(html, encoding="utf-8")
    render_pdf(OUT_HTML, OUT_PDF)
    shutil.copy2(OUT_HTML, DESKTOP_HTML)
    shutil.copy2(OUT_PDF, DESKTOP_PDF)
    print(f"HTML: {OUT_HTML}")
    print(f"PDF:  {OUT_PDF}")
    print(f"Desktop: {DESKTOP_PDF}")


if __name__ == "__main__":
    main()
