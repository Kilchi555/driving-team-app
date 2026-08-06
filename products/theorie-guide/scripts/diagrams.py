"""Diagrams for the Theorie PDF — Rechtsvortritt compare cards.

Base scenes are the ORIGINAL intersection illustrations from the Driving
Team Keynote (products/theorie-guide/assets/img/keynote-scenes/) — textured
asphalt, grass, real crosswalk paint. Rule-specific markings (guide lines,
gutter, stop sign, sidewalk crossing) are added as thin SVG overlays so each
of the six scenarios reads clearly without needing six separate photos.
"""

DANGER = "#e11d48"
INK = "#0b1620"

IMG_PLAIN = "../assets/img/keynote-scenes/rechtsvortritt-intersection.png"
IMG_KEIN_VORTRITT = "../assets/img/keynote-scenes/kein-vortritt-intersection.png"

CAR_PATHS = """
  <path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
  <path d="M15 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
  <path d="M5 17h-2v-6l2 -5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5" />
"""

OCTAGON_POINTS = "10,2 22,2 30,10 30,22 22,30 10,30 2,22 2,10"


def _car_badge() -> str:
    return f"""
    <div class="car-badge">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="{INK}"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{CAR_PATHS}</svg>
    </div>"""


def _overlay(inner: str) -> str:
    return f'<svg class="overlay" viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">{inner}</svg>'


def _photo(src: str, overlay: str = "", position: str = "center top") -> str:
    return f"""
    <div class="diagram photo">
      <img src="{src}" alt="" style="object-position:{position};" />
      {overlay}
      {_car_badge()}
    </div>"""


def klassisch() -> str:
    return _photo(IMG_PLAIN)


def fuehrungslinien() -> str:
    overlay = _overlay(
        """
        <path d="M55,35 L105,75" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-dasharray="4 4" opacity="0.95"/>
        <path d="M105,35 L55,75" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-dasharray="4 4" opacity="0.95"/>
        """
    )
    return _photo(IMG_PLAIN, overlay)


def regenrinne() -> str:
    overlay = _overlay('<rect x="59" y="0" width="3" height="110" fill="#1e293b" opacity="0.85"/>')
    return _photo(IMG_PLAIN, overlay)


def trottoir() -> str:
    overlay = _overlay(
        """
        <rect x="46" y="68" width="68" height="14" fill="#e2e8f0" opacity="0.92"/>
        <line x1="46" y1="68" x2="114" y2="68" stroke="#ffffff" stroke-width="2.3"/>
        <line x1="46" y1="82" x2="114" y2="82" stroke="#ffffff" stroke-width="2.3"/>
        """
    )
    return _photo(IMG_PLAIN, overlay)


def stop_sign() -> str:
    cx, cy, s = 104, 62, 0.62
    overlay = _overlay(
        f"""
        <rect x="64" y="80" width="32" height="3" fill="#ffffff"/>
        <g transform="translate({cx - 16 * s},{cy - 16 * s}) scale({s})">
          <polygon points="{OCTAGON_POINTS}" fill="{DANGER}" stroke="#ffffff" stroke-width="1.8"/>
          <text x="16" y="20.5" font-family="Space Grotesk,Arial,sans-serif" font-size="9.5"
                font-weight="700" fill="#fff" text-anchor="middle">STOP</text>
        </g>
        """
    )
    return _photo(IMG_PLAIN, overlay)


def kein_vortritt() -> str:
    return _photo(IMG_KEIN_VORTRITT, position="center 34%")


_DIAGRAMS = {
    "klassisch": klassisch,
    "fuehrungslinien": fuehrungslinien,
    "regenrinne": regenrinne,
    "trottoir": trottoir,
    "stop": stop_sign,
    "kein-vortritt": kein_vortritt,
}


def diagram_for(kind: str) -> str:
    fn = _DIAGRAMS.get(kind)
    return fn() if fn else ""
