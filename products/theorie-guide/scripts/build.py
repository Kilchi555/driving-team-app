#!/usr/bin/env python3
"""Build Driving Team Theorie Guide HTML + PDF from content/de.json"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content" / "de.json"
CSS_PATH = ROOT / "styles" / "guide.embedded.css"
if not CSS_PATH.exists():
    CSS_PATH = ROOT / "styles" / "guide.css"
CSS = CSS_PATH.read_text(encoding="utf-8")
LOGO = ROOT / "assets" / "svg" / "logo.svg"
OUT_HTML = ROOT / "build" / "theorie-verstehen-de.html"
OUT_PDF = ROOT / "build" / "Theorie-verstehen-Driving-Team-DE.pdf"


def esc(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def logo_img(light: bool = False) -> str:
    svg = LOGO.read_text(encoding="utf-8")
    if light:
        svg = svg.replace('fill="#111827"', 'fill="#ffffff"')
        svg = svg.replace('fill="#374151"', 'fill="#dbeafe"')
        svg = svg.replace('fill="#019ee5"', 'fill="#5ec32a"')
    svg = svg.replace("<svg", '<svg class="logo"', 1)
    return svg


def svg_hierarchy_cover() -> str:
    return """
<svg viewBox="0 0 640 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vortrittstreppe">
  <text x="8" y="28" font-family="Syne,Arial Black,sans-serif" font-size="18" font-weight="800" fill="#ffffff">Wer steht über wem?</text>
  <g font-family="Syne,Arial Black,sans-serif" font-size="13" font-weight="800" fill="#fff">
    <rect x="8" y="48" width="210" height="26" fill="#ea580c"/><text x="18" y="66">05  Blaulicht</text>
    <rect x="8" y="78" width="270" height="26" fill="#c026d3"/><text x="18" y="96">04  Verkehrsdienst</text>
    <rect x="8" y="108" width="330" height="26" fill="#0d9488"/><text x="18" y="126">03  Lichtsignale</text>
    <rect x="8" y="138" width="390" height="26" fill="#2f9e1e"/><text x="18" y="156">02  Signale &amp; Markierungen</text>
    <rect x="8" y="168" width="450" height="26" fill="#019ee5"/><text x="18" y="186">01  Grundregeln</text>
  </g>
</svg>"""


def svg_intersection(kind: str) -> str:
    base = """
<svg viewBox="0 0 280 200" xmlns="http://www.w3.org/2000/svg">
  <rect width="280" height="200" fill="#e7f6ea"/>
  <rect x="100" y="0" width="80" height="200" fill="#6b7c8f"/>
  <rect x="0" y="60" width="280" height="80" fill="#6b7c8f"/>
  <g stroke="#fff" stroke-width="1.6" stroke-dasharray="5 5" opacity=".85">
    <line x1="140" y1="0" x2="140" y2="60"/>
    <line x1="140" y1="140" x2="140" y2="200"/>
    <line x1="0" y1="100" x2="100" y2="100"/>
    <line x1="180" y1="100" x2="280" y2="100"/>
  </g>
  {extras}
  <rect x="123" y="150" width="24" height="38" rx="4" fill="#f5d000" stroke="#111" stroke-width="1"/>
  <rect x="205" y="88" width="38" height="24" rx="4" fill="#e11d48" stroke="#111" stroke-width="1"/>
</svg>"""
    extras = {
        "klassisch": "",
        "fuehrungslinien": """
  <path d="M140 140 Q140 100 180 100" fill="none" stroke="#fff" stroke-width="2.2" stroke-dasharray="3 4"/>
  <path d="M140 60 Q140 100 100 100" fill="none" stroke="#fff" stroke-width="2.2" stroke-dasharray="3 4"/>
""",
        "regenrinne": """
  <rect x="180" y="60" width="7" height="80" fill="#1f2937"/>
""",
        "trottoir": """
  <rect x="180" y="48" width="100" height="16" fill="#cbd5e1"/>
  <rect x="180" y="136" width="100" height="16" fill="#cbd5e1"/>
  <rect x="180" y="64" width="10" height="72" fill="#e5e7eb"/>
  <line x1="180" y1="64" x2="180" y2="136" stroke="#fff" stroke-width="3"/>
  <line x1="190" y1="64" x2="190" y2="136" stroke="#fff" stroke-width="3"/>
""",
        "stop": """
  <rect x="186" y="60" width="8" height="80" fill="#fff"/>
  <rect x="214" y="34" width="34" height="34" fill="#e11d48"/>
  <text x="231" y="56" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="8" fill="#fff">STOP</text>
""",
        "kein-vortritt": """
  <g fill="#fff">
    <polygon points="188,72 198,78 188,84"/>
    <polygon points="188,92 198,98 188,104"/>
    <polygon points="188,112 198,118 188,124"/>
    <polygon points="188,132 198,138 188,144"/>
  </g>
  <polygon points="231,36 245,60 217,60" fill="#fff" stroke="#e11d48" stroke-width="3"/>
  <polygon points="231,42 239,56 223,56" fill="#e11d48"/>
""",
    }.get(kind, "")
    return base.format(extras=extras)


def svg_lights_memory() -> str:
    return """
<svg viewBox="0 0 640 180" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="180" fill="#0b1620"/>
  <rect x="48" y="24" width="64" height="132" rx="10" fill="#111827"/>
  <circle cx="80" cy="52" r="14" fill="#3f3f46"/>
  <circle cx="80" cy="90" r="14" fill="#3f3f46"/>
  <circle cx="80" cy="128" r="16" fill="#22c55e"/>
  <path d="M80 138 V118 M72 126 L80 118 L88 126" stroke="#052e16" stroke-width="3" fill="none"/>
  <text x="140" y="78" fill="#86efac" font-family="Syne,Arial Black,sans-serif" font-size="18" font-weight="800">Grüner Pfeil allein,</text>
  <text x="140" y="104" fill="#86efac" font-family="Syne,Arial Black,sans-serif" font-size="18" font-weight="800">ich allein!</text>
  <text x="140" y="132" fill="#fda4af" font-family="Manrope,Arial,sans-serif" font-size="12">Gegenverkehr &amp; Fussgänger: rot</text>
  <line x1="360" y1="28" x2="360" y2="152" stroke="#334155"/>
  <rect x="390" y="30" width="50" height="100" rx="10" fill="#111827"/>
  <circle cx="415" cy="55" r="11" fill="#3f3f46"/>
  <circle cx="415" cy="82" r="11" fill="#3f3f46"/>
  <circle cx="415" cy="110" r="13" fill="#22c55e"/>
  <circle cx="470" cy="82" r="9" fill="#fbbf24"/>
  <g stroke="#fbbf24" stroke-width="2">
    <line x1="470" y1="66" x2="470" y2="60"/><line x1="470" y1="98" x2="470" y2="104"/>
    <line x1="454" y1="82" x2="448" y2="82"/><line x1="486" y1="82" x2="492" y2="82"/>
  </g>
  <rect x="500" y="40" width="44" height="86" rx="10" fill="#111827"/>
  <circle cx="522" cy="68" r="10" fill="#3f3f46"/>
  <circle cx="522" cy="98" r="12" fill="#22c55e"/>
  <text x="390" y="160" fill="#fdba74" font-family="Syne,Arial Black,sans-serif" font-size="12" font-weight="800">Warnlampe / Vollgrün = Vorsicht teilen</text>
</svg>"""


def svg_autobahn() -> str:
    return """
<svg viewBox="0 0 640 170" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="170" fill="#0b1620"/>
  <rect x="30" y="28" width="580" height="48" fill="#4b5563"/>
  <rect x="30" y="94" width="580" height="48" fill="#4b5563"/>
  <rect x="30" y="76" width="580" height="18" fill="#166534"/>
  <g stroke="#fff" stroke-width="2" stroke-dasharray="10 8" opacity=".9">
    <line x1="40" y1="44" x2="600" y2="44"/>
    <line x1="40" y1="62" x2="600" y2="62"/>
    <line x1="40" y1="118" x2="600" y2="118"/>
  </g>
  <rect x="120" y="108" width="34" height="20" rx="3" fill="#f5d000"/>
  <rect x="280" y="108" width="34" height="20" rx="3" fill="#019ee5"/>
  <rect x="430" y="38" width="34" height="20" rx="3" fill="#e11d48"/>
  <text x="30" y="22" fill="#86efac" font-family="Syne,Arial Black,sans-serif" font-size="12" font-weight="800">RECHTS FAHREN  ·  LINKS ÜBERHOLEN  ·  2 SEKUNDEN</text>
</svg>"""


def svg_einfahrt() -> str:
    return """
<svg viewBox="0 0 640 220" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="220" fill="#0b1620"/>
  <rect x="30" y="30" width="400" height="80" fill="#4b5563"/>
  <path d="M280 110 L280 160 Q280 190 340 190 L610 190 L610 150 Q530 150 490 110 Z" fill="#4b5563"/>
  <g stroke="#fff" stroke-width="2" stroke-dasharray="8 7" opacity=".85">
    <line x1="40" y1="56" x2="420" y2="56"/>
    <line x1="40" y1="84" x2="420" y2="84"/>
  </g>
  <line x1="280" y1="110" x2="460" y2="110" stroke="#fff" stroke-width="3"/>
  <line x1="460" y1="110" x2="550" y2="160" stroke="#fff" stroke-width="2" stroke-dasharray="6 5"/>
  <rect x="190" y="88" width="30" height="18" rx="3" fill="#e11d48"/>
  <rect x="500" y="162" width="30" height="18" rx="3" fill="#f5d000"/>
  <g font-family="Syne,Arial Black,sans-serif" font-size="11" font-weight="800" fill="#fff">
    <circle cx="540" cy="182" r="10" fill="#019ee5"/><text x="536" y="186">1</text>
    <circle cx="500" cy="160" r="10" fill="#019ee5"/><text x="496" y="164">3</text>
    <circle cx="450" cy="130" r="10" fill="#019ee5"/><text x="446" y="134">5</text>
    <circle cx="390" cy="118" r="10" fill="#5ec32a"/><text x="386" y="122">7</text>
  </g>
  <text x="30" y="22" fill="#7dd3fc" font-family="Syne,Arial Black,sans-serif" font-size="12" font-weight="800">EINFAHRT: BESCHLEUNIGEN → PRÜFEN → EINORDNEN</text>
</svg>"""


def svg_sichtweite() -> str:
    return """
<svg viewBox="0 0 640 190" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="190" fill="#f4f8fb"/>
  <path d="M24 150 C110 150 130 55 290 48" fill="none" stroke="#64748b" stroke-width="30" stroke-linecap="round"/>
  <path d="M40 135 L130 75 L210 68" fill="#fecaca" opacity=".5"/>
  <rect x="36" y="138" width="20" height="12" rx="2" fill="#f5d000"/>
  <text x="24" y="180" font-family="Syne,Arial Black,sans-serif" font-size="12" font-weight="800" fill="#15803d">GANZE SICHTWEITE</text>
  <path d="M340 150 C426 150 446 55 606 48" fill="none" stroke="#64748b" stroke-width="30" stroke-linecap="round"/>
  <path d="M356 135 L416 90 L466 78" fill="#fecaca" opacity=".5"/>
  <line x1="356" y1="118" x2="450" y2="88" stroke="#019ee5" stroke-width="3"/>
  <text x="390" y="110" font-family="Syne,Arial Black,sans-serif" font-size="16" font-weight="800" fill="#0369a1">1/2</text>
  <rect x="356" y="138" width="20" height="12" rx="2" fill="#f5d000"/>
  <rect x="500" y="62" width="20" height="12" rx="2" fill="#e11d48"/>
  <text x="340" y="180" font-family="Syne,Arial Black,sans-serif" font-size="12" font-weight="800" fill="#be123c">HALBE SICHTWEITE</text>
</svg>"""


def svg_anhalteweg() -> str:
    return """
<svg viewBox="0 0 640 140" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="140" fill="#0b1620"/>
  <rect x="24" y="28" width="592" height="26" fill="#0369a1"/>
  <text x="34" y="46" fill="#fff" font-family="Syne,Arial Black,sans-serif" font-size="14" font-weight="800">ANHALTEWEG</text>
  <rect x="24" y="68" width="200" height="22" fill="#019ee5"/>
  <rect x="224" y="68" width="392" height="22" fill="#67e8f9"/>
  <text x="34" y="84" fill="#fff" font-family="Syne,Arial Black,sans-serif" font-size="11" font-weight="800">REAKTION</text>
  <text x="236" y="84" fill="#0c4a6e" font-family="Syne,Arial Black,sans-serif" font-size="11" font-weight="800">BREMSWEG</text>
  <text x="24" y="118" fill="#94a3b8" font-family="Manrope,Arial,sans-serif" font-size="12">2× Tempo ≈ 4× Bremsweg · Bremsbereit ≈ 1/3 Reaktionsweg</text>
</svg>"""


DIAGRAMS = {
    "lichtsignale": svg_lights_memory,
    "geschwindigkeit": svg_sichtweite,
}


def render_section(sec: dict) -> str:
    t = sec.get("type")
    if t in {"intro", "hook"}:
        return f"""
        <div class="block hook keep-together">
          <h2>{esc(sec['headline'])}</h2>
          <p>{esc(sec['body'])}</p>
        </div>"""
    if t == "learningGoals":
        items = "".join(f"<li>{esc(i)}</li>" for i in sec["items"])
        return f'<div class="block keep-together"><h2>Lernziele</h2><ul>{items}</ul></div>'
    if t == "roadmap":
        items = "".join(
            f'<div class="road-item"><span>{i:02d}</span>{esc(x)}</div>'
            for i, x in enumerate(sec["items"], 1)
        )
        return f'<div class="block keep-together"><h2>{esc(sec["title"])}</h2><div class="roadmap">{items}</div></div>'
    if t == "examBox":
        return f"""
        <div class="block exam-box keep-together">
          <div class="kicker">Prüfungs-Know-how · {esc(sec.get('source',''))}</div>
          <h3>{esc(sec['title'])}</h3>
          <p>{esc(sec['body'])}</p>
        </div>"""
    if t == "hierarchy":
        color_map = {
            "orange": "c-orange",
            "magenta": "c-magenta",
            "teal": "c-teal",
            "green": "c-green",
            "blue": "c-blue",
        }
        rows = []
        for lv in sec["levels"]:
            note = f"<small>{esc(lv['note'])}</small>" if lv.get("note") else ""
            ex = "".join(f"<li>{esc(e)}</li>" for e in lv.get("examples", []))
            rows.append(
                f"""
                <div class="stair-row keep-together">
                  <div class="stair-bar {color_map.get(lv['color'],'c-blue')}">
                    {lv['rank']:02d}  {esc(lv['name'])}{note}
                  </div>
                  <div class="stair-meta"><ul>{ex}</ul></div>
                </div>"""
            )
        return f'<div class="block"><h2>{esc(sec["title"])}</h2><div class="stairs">{"".join(rows)}</div></div>'
    if t == "memory":
        return f"""
        <div class="block memory keep-together">
          <div class="label">Merke dir</div>
          <h3>{esc(sec['title'])}</h3>
          <p>{esc(sec['body'])}</p>
        </div>"""
    if t == "check":
        return f"""
        <div class="block check keep-together">
          <div class="kicker">Check dich selbst</div>
          <h3>{esc(sec['question'])}</h3>
          <p><strong>Antwort:</strong> {esc(sec['answer'])}</p>
        </div>"""
    if t == "fachbox":
        return f"""
        <div class="block fachbox keep-together">
          <div class="kicker">Fachliche Ergänzung</div>
          <h3>{esc(sec['title'])}</h3>
          <p>{esc(sec['body'])}</p>
        </div>"""
    if t == "pitfall":
        return f"""
        <div class="block pitfall keep-together">
          <div class="kicker">Prüfungsfalle</div>
          <h3>{esc(sec['title'])}</h3>
          <p>{esc(sec['body'])}</p>
        </div>"""
    if t == "rule":
        return f"""
        <div class="block memory keep-together">
          <div class="label">Grundregel</div>
          <h2>{esc(sec['headline'])}</h2>
          <p>{esc(sec['body'])}</p>
        </div>"""
    if t == "points":
        title = f"<h2>{esc(sec['title'])}</h2>" if sec.get("title") else ""
        items = "".join(
            f"""<div class="point keep-together"><div class="n">{i:02d}</div><div><strong>{esc(it['title'])}</strong><p>{esc(it['body'])}</p></div></div>"""
            for i, it in enumerate(sec["items"], 1)
        )
        return f'<div class="block">{title}<div class="points">{items}</div></div>'
    if t == "basics":
        items = "".join(
            f"""<div class="basic keep-together"><strong>{esc(it['title'])}</strong><p>{esc(it['body'])}</p></div>"""
            for it in sec["items"]
        )
        return f'<div class="block"><h2>{esc(sec["title"])}</h2><div class="two-col">{items}</div></div>'
    if t == "split":
        return f"""
        <div class="block">
          <h2>{esc(sec['title'])}</h2>
          <div class="compare">
            <div class="col yes"><h3>{esc(sec['left']['title'])}</h3><p>{esc(sec['left']['body'])}</p></div>
            <div class="col no"><h3>{esc(sec['right']['title'])}</h3><p>{esc(sec['right']['body'])}</p></div>
          </div>
        </div>"""
    if t == "compare":
        ids = {"klassisch", "fuehrungslinien", "regenrinne", "trottoir", "stop", "kein-vortritt"}

        def items(arr):
            out = []
            for it in arr:
                diag = (
                    f'<div class="diagram">{svg_intersection(it["id"])}</div>'
                    if it.get("id") in ids
                    else ""
                )
                out.append(
                    f'<div class="item keep-together"><strong>{esc(it["title"])}</strong><p>{esc(it["body"])}</p>{diag}</div>'
                )
            return "".join(out)

        return f"""
        <div class="block">
          <h2>{esc(sec['title'])}</h2>
          <div class="compare">
            <div class="col yes"><h3>{esc(sec['yesTitle'])}</h3>{items(sec['yes'])}</div>
            <div class="col no"><h3>{esc(sec['noTitle'])}</h3>{items(sec['no'])}</div>
          </div>
        </div>"""
    if t == "dosDonts":
        dos = "".join(
            f"<div class='dd-row'><strong>{esc(x['label'])}</strong><span>{esc(x['text'])}</span></div>"
            for x in sec["dos"]
        )
        donts = "".join(
            f"<div class='dd-row'><strong>{esc(x['label'])}</strong><span>{esc(x['text'])}</span></div>"
            for x in sec["donts"]
        )
        return f"""
        <div class="block">
          <h2>{esc(sec['title'])}</h2>
          <div class="diagram">{svg_autobahn()}</div>
          <div class="dosdonts">
            <div class="dd-col do"><h3>Mache das!</h3>{dos}</div>
            <div class="dd-col dont"><h3>Mache das NICHT!</h3>{donts}</div>
          </div>
        </div>"""
    if t == "steps":
        diagram = (
            f'<div class="diagram">{svg_einfahrt()}</div>'
            if "Einfahrt" in sec.get("title", "")
            else ""
        )
        items = "".join(f'<div class="step"><div>{esc(x)}</div></div>' for x in sec["items"])
        return f'<div class="block keep-together"><h2>{esc(sec["title"])}</h2>{diagram}<div class="steps">{items}</div></div>'
    if t == "law":
        return f"""
        <div class="block law keep-together">
          <cite>{esc(sec['cite'])}</cite>
          <p>{esc(sec['body'])}</p>
        </div>"""
    if t == "formula":
        return f"""
        <div class="block">
          <h2>{esc(sec['title'])}</h2>
          <div class="diagram">{svg_anhalteweg()}</div>
          <div class="formula">{esc(sec['body'])}</div>
        </div>"""
    if t == "cta":
        return f"""
        <div class="block cta keep-together">
          <h2>{esc(sec['headline'])}</h2>
          <p>{esc(sec['body'])}</p>
        </div>"""
    return ""


def build_html(data: dict) -> str:
    meta = data["meta"]
    chapters_html = []
    for idx, ch in enumerate(data["chapters"]):
        sections = "\n".join(render_section(s) for s in ch["sections"])
        extra = ""
        if ch["id"] in DIAGRAMS:
            extra = f'<div class="block diagram">{DIAGRAMS[ch["id"]]()}</div>'
        alt = " alt" if idx % 2 else ""
        # Full-bleed opener for content chapters (not intro)
        if ch["id"] != "einleitung":
            chapters_html.append(
                f"""
                <section class="page chapter">
                  <div class="chapter-bleed{alt}">
                    <div>
                      <div class="chapter-kicker">Driving Team · Theorie verstehen</div>
                      <div class="chapter-num">{esc(ch['number'])}</div>
                      <h1>{esc(ch['title'])}</h1>
                      <p class="chapter-goal">{esc(ch['goal'])}</p>
                    </div>
                    <div class="chapter-foot">
                      <span>Kapitel {esc(ch['number'])}</span>
                      <span>drivingteam.ch</span>
                    </div>
                  </div>
                </section>"""
            )
        chapters_html.append(
            f"""
            <section class="page content-page">
              <div class="running-head">
                <span><span class="dot">●</span> {esc(ch['title'])}</span>
                <span>{esc(meta['brand'])}</span>
              </div>
              {extra}
              {sections}
              <div class="page-footer">
                <span>{esc(meta['title'])}</span>
                <span>Kap. {esc(ch['number'])}</span>
              </div>
            </section>"""
        )

    return f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>{esc(meta['title'])} — {esc(meta['brand'])}</title>
  <style>{CSS}</style>
</head>
<body>
  <section class="page cover">
    <div class="cover-inner">
      <div class="cover-top">
        <div class="cover-badge">Online-Theoriekurs · Premium Guide</div>
        {logo_img(light=True)}
      </div>
      <div class="cover-mid">
        <h1 class="display">{esc(meta['title'])}</h1>
        <p class="subtitle">{esc(meta['subtitle'])}</p>
        <div class="tagline">{esc(meta['tagline'])}</div>
        <div class="cover-visual">{svg_hierarchy_cover()}</div>
        <div class="cover-stats">
          <div class="cover-stat"><strong>14</strong><span>Kapitel aus dem Kurs</span></div>
          <div class="cover-stat"><strong>DE</strong><span>Englisch folgt als 2. Version</span></div>
          <div class="cover-stat"><strong>asa</strong><span>Prüfungsnah ergänzt</span></div>
        </div>
      </div>
      <div class="cover-bottom">
        <div class="cover-meta">
          <strong>{esc(meta['author'])}</strong>
          Version {esc(meta['version'])} · Deutsch<br/>
          {esc(meta['legalNote'])}
        </div>
        <div class="cover-url">drivingteam.ch</div>
      </div>
    </div>
  </section>
  {''.join(chapters_html)}
</body>
</html>"""


def render_pdf(html_path: Path, pdf_path: Path) -> None:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(html_path.as_uri(), wait_until="networkidle")
        # zero margin: page shells own the bleed
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
    print(f"HTML: {OUT_HTML}")
    render_pdf(OUT_HTML, OUT_PDF)
    print(f"PDF:  {OUT_PDF} ({OUT_PDF.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
