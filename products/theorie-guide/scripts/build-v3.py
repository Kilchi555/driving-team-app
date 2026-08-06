#!/usr/bin/env python3
"""Driving Team — Theorie verstehen v3.

Controlled, code-driven PDF layout (no Canva AI). Renders Cover + selected
chapters from content/de.json using the v3 design system.

Currently renders: Kapitel 01 (Vortrittshierarchie, complete) + Kapitel 02
(Rechtsvortritt, complete) as the quality reference before rolling out all
14 chapters.
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import diagrams  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content" / "de.json"
CSS = (ROOT / "styles" / "guide.v3-sample.css").read_text(encoding="utf-8")
OUT_HTML = ROOT / "build" / "theorie-v3-preview.html"
OUT_PDF = ROOT / "build" / "Theorie-v3-Preview-Kap01-02.pdf"
DESKTOP_PDF = Path.home() / "Desktop" / "Driving-Team-Theorie-Sample-v3.pdf"
DESKTOP_HTML = Path.home() / "Desktop" / "Driving-Team-Theorie-Sample-v3.html"

CHAPTERS_TO_RENDER = ["vortrittshierarchie", "rechtsvortritt"]

_page_counter = {"n": 1}


def next_page() -> int:
    _page_counter["n"] += 1
    return _page_counter["n"]


def esc(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def logo_tag() -> str:
    return '<img class="logo" src="../assets/img/logo-crop.png" alt="Driving Team" />'


def foot(meta: dict, ch: dict, page_num: int, dark: bool = False) -> str:
    style = (
        ' style="color:rgba(255,255,255,0.45);border-top-color:rgba(255,255,255,0.15);"'
        if dark
        else ""
    )
    return f"""
    <div class="page-foot"{style}>
      <span>{esc(meta['title'])}</span>
      <span>Kap. {esc(ch['number'])} · S. {page_num}</span>
    </div>"""


def render_cover(meta: dict) -> str:
    return f"""
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
  </section>"""


def render_chapter_opener(ch: dict) -> str:
    return f"""
  <section class="page chapter-open">
    <div class="kicker">Kapitel {esc(ch['number'])}</div>
    <div class="num">{esc(ch['number'])}</div>
    <h1>{esc(ch['title'])}</h1>
    <p class="goal">{esc(ch['goal'])}</p>
    <div class="foot">
      {logo_tag()}
      <span>drivingteam.ch</span>
    </div>
  </section>"""


def render_hook(sec: dict, meta: dict, ch: dict) -> str:
    pn = next_page()
    return f"""
  <section class="page content">
    <div class="content-bar"></div>
    <div class="content-head">
      <span class="title">{esc(ch['title'])}</span>
      <span>{esc(meta['brand'])}</span>
    </div>
    <div class="section">
      <div class="section-label">Einstieg</div>
      <h2>{esc(sec['headline'])}</h2>
      <p>{esc(sec['body'])}</p>
    </div>
    {foot(meta, ch, pn)}
  </section>"""


def render_rule(sec: dict, meta: dict, ch: dict) -> str:
    pn = next_page()
    return f"""
  <section class="page content">
    <div class="content-bar"></div>
    <div class="content-head">
      <span class="title">{esc(ch['title'])}</span>
      <span>{esc(meta['brand'])}</span>
    </div>
    <div class="section">
      <div class="section-label">Grundregel</div>
      <h2>{esc(sec['headline'])}</h2>
      <p>{esc(sec['body'])}</p>
    </div>
    {foot(meta, ch, pn)}
  </section>"""


def render_hierarchy(sec: dict, meta: dict, ch: dict) -> str:
    pn = next_page()
    rows = []
    for lv in sec["levels"]:
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
    return f"""
  <section class="page content">
    <div class="content-bar"></div>
    <div class="content-head">
      <span class="title">{esc(sec['title'])}</span>
      <span>Kap. {esc(ch['number'])}</span>
    </div>
    <div class="section">
      <h2>{esc(sec['title'])}</h2>
      <p class="small" style="font-size:9pt;color:var(--muted);margin-bottom:5mm;">Oben schlägt unten — merke die Reihenfolge.</p>
      <div class="stairs">{''.join(rows)}</div>
    </div>
    {foot(meta, ch, pn)}
  </section>"""


def render_memory(sec: dict, meta: dict, ch: dict, headline: str = "") -> str:
    pn = next_page()
    return f"""
  <section class="page memory-page">
    <div class="label">{esc(sec['title'])}</div>
    <h2>{esc(headline) if headline else esc(sec['title'])}</h2>
    <p class="body">{esc(sec['body'])}</p>
    {foot(meta, ch, pn, dark=True)}
  </section>"""


def render_check(sec: dict, meta: dict, ch: dict) -> str:
    pn = next_page()
    return f"""
  <section class="page check-page">
    <div class="content-bar"></div>
    <div class="check-box">
      <div class="label">Prüfungs-Check</div>
      <h3>{esc(sec['question'])}</h3>
    </div>
    <div class="answer">
      <strong>Antwort</strong>
      <p>{esc(sec['answer'])}</p>
    </div>
    {foot(meta, ch, pn)}
  </section>"""


def render_fachbox(sec: dict, meta: dict, ch: dict) -> str:
    pn = next_page()
    return f"""
  <section class="page fach-page">
    <div class="content-bar"></div>
    <div class="fach-box">
      <div class="label">{esc(sec['title'])}</div>
      <h3>Rechtliche Grundlage</h3>
      <p>{esc(sec['body'])}</p>
    </div>
    {foot(meta, ch, pn)}
  </section>"""


def render_compare(sec: dict, meta: dict, ch: dict) -> str:
    pn = next_page()

    def col(items: list) -> str:
        cards = []
        for it in items:
            diag_html = diagrams.diagram_for(it.get("id", ""))
            cards.append(
                f"""
                <div class="compare-card">
                  <strong>{esc(it['title'])}</strong>
                  <p>{esc(it['body'])}</p>
                  {diag_html}
                </div>"""
            )
        return "".join(cards)

    return f"""
  <section class="page compare-page">
    <div class="content-bar"></div>
    <div class="content-head">
      <span class="title">{esc(sec['title'])}</span>
      <span>Kap. {esc(ch['number'])}</span>
    </div>
    <h2 style="font-size:20pt;margin-bottom:2mm;">{esc(sec['title'])}</h2>
    <div class="compare-grid">
      <div class="compare-col yes">
        <div class="compare-col-head">✓ &nbsp;{esc(sec['yesTitle'])}</div>
        {col(sec['yes'])}
      </div>
      <div class="compare-col no">
        <div class="compare-col-head">✕ &nbsp;{esc(sec['noTitle'])}</div>
        {col(sec['no'])}
      </div>
    </div>
    {foot(meta, ch, pn)}
  </section>"""


def render_pitfall(sec: dict, meta: dict, ch: dict) -> str:
    pn = next_page()
    return f"""
  <section class="page pitfall-page">
    <div class="pitfall-eyebrow">Prüfungsfalle</div>
    <div class="pitfall-banner">
      <h2>{esc(sec['title'].replace('Prüfungsfalle: ', ''))}</h2>
      <p>{esc(sec['body'])}</p>
    </div>
    {foot(meta, ch, pn)}
  </section>"""


SECTION_RENDERERS = {
    "hook": render_hook,
    "rule": render_rule,
    "hierarchy": render_hierarchy,
    "memory": render_memory,
    "check": render_check,
    "fachbox": render_fachbox,
    "compare": render_compare,
    "pitfall": render_pitfall,
}


def render_chapter(ch: dict, meta: dict) -> str:
    parts = [render_chapter_opener(ch)]
    for sec in ch["sections"]:
        fn = SECTION_RENDERERS.get(sec["type"])
        if fn:
            parts.append(fn(sec, meta, ch))
    return "".join(parts)


def build_html(data: dict) -> str:
    meta = data["meta"]
    chapters = {c["id"]: c for c in data["chapters"]}
    body_parts = [render_cover(meta)]
    for cid in CHAPTERS_TO_RENDER:
        _page_counter["n"] = 1
        body_parts.append(render_chapter(chapters[cid], meta))

    return f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>{esc(meta['title'])} — v3 Preview</title>
  <style>{CSS}</style>
</head>
<body>
{''.join(body_parts)}
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
    html = build_html(data)
    OUT_HTML.write_text(html, encoding="utf-8")
    render_pdf(OUT_HTML, OUT_PDF)
    shutil.copy2(OUT_HTML, DESKTOP_HTML)
    shutil.copy2(OUT_PDF, DESKTOP_PDF)
    print(f"HTML: {OUT_HTML}")
    print(f"PDF:  {OUT_PDF}")
    print(f"Desktop: {DESKTOP_PDF}")


if __name__ == "__main__":
    main()
