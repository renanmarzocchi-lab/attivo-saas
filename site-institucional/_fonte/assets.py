#!/usr/bin/env python3
"""Gera SVGs do logo, PNGs, favicon.ico e imagem de compartilhamento."""
import io
import os
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, '..', 'site')
A = os.path.join(OUT, 'assets')
BR = os.path.join(OUT, 'marca')
os.makedirs(A, exist_ok=True)
os.makedirs(BR, exist_ok=True)

NAVY, AMBER, WHITE, MUTED = '#0B1F3A', '#F2A33A', '#FFFFFF', '#B7C3D4'


def letters(c, dot):
    return (f'<polygon points="0,80 23,0 37,0 60,80 46,80 30,24 14,80" fill="{c}"/>'
            f'<circle cx="30" cy="62" r="6.5" fill="{dot}"/>'
            f'<rect x="72" y="0" width="80" height="14" fill="{c}"/>'
            f'<rect x="85" y="0" width="14" height="80" fill="{c}"/>'
            f'<rect x="125" y="0" width="14" height="80" fill="{c}"/>'
            f'<rect x="166" y="0" width="14" height="80" fill="{c}"/>'
            f'<polygon points="194,0 208,0 224,56 240,0 254,0 231,80 217,80" fill="{c}"/>'
            f'<circle cx="306" cy="40" r="33" fill="none" stroke="{c}" stroke-width="14"/>')


def tagline_paths():
    # tagline convertida em texto com fonte de sistema não é confiável fora do site,
    # então o SVG de marca carrega a tagline como <text> com fallback de fontes.
    return None


def full(c, dot, tag):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -8 362 130" width="362" height="130">'
            f'<title>ATTIVO Corretora de Seguros</title>{letters(c, dot)}'
            f'<text x="1" y="110" textLength="344" lengthAdjust="spacing" font-family="Manrope, Arial, Helvetica, sans-serif" '
            f'font-weight="600" font-size="15" fill="{tag}">CORRETORA DE SEGUROS</text></svg>')


def wordmark(c, dot):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 358 92" width="358" height="92">'
            f'<title>ATTIVO</title>{letters(c, dot)}</svg>')


def symbol(bg=NAVY, rx=24):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">'
            f'<rect width="100" height="100" rx="{rx}" fill="{bg}"/>'
            f'<g transform="translate(26 18) scale(0.8)"><polygon points="0,80 23,0 37,0 60,80 46,80 30,24 14,80" fill="{WHITE}"/>'
            f'<circle cx="30" cy="62" r="6.5" fill="{AMBER}"/></g></svg>')


def avatar():
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">'
            f'<rect width="100" height="100" fill="{NAVY}"/>'
            f'<g transform="translate(29 23) scale(0.7)"><polygon points="0,80 23,0 37,0 60,80 46,80 30,24 14,80" fill="{WHITE}"/>'
            f'<circle cx="30" cy="62" r="6.5" fill="{AMBER}"/></g></svg>')


files = {
    os.path.join(A, 'logo.svg'): full(NAVY, AMBER, NAVY),
    os.path.join(A, 'logo-branco.svg'): full(WHITE, AMBER, MUTED),
    os.path.join(A, 'simbolo.svg'): symbol(),
    os.path.join(OUT, 'favicon.svg'): symbol(),
    os.path.join(BR, 'attivo-logo.svg'): full(NAVY, AMBER, NAVY),
    os.path.join(BR, 'attivo-logo-negativo.svg'): full(WHITE, AMBER, MUTED),
    os.path.join(BR, 'attivo-logo-mono-preto.svg'): full('#111111', '#111111', '#111111'),
    os.path.join(BR, 'attivo-assinatura.svg'): wordmark(NAVY, AMBER),
    os.path.join(BR, 'attivo-simbolo.svg'): symbol(),
    os.path.join(BR, 'attivo-avatar-redes.svg'): avatar(),
}
for p, s in files.items():
    with open(p, 'w') as f:
        f.write(s)

FONT = ('<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&family=Sora:wght@600;700&display=swap" rel="stylesheet">')


def shot(page, html, w, h, path, transparent=False):
    page.set_viewport_size({'width': w, 'height': h})
    page.set_content(f'<!doctype html><html><head>{FONT}<style>html,body{{margin:0;width:{w}px;height:{h}px;overflow:hidden;'
                     f'{"background:transparent" if transparent else ""}}}</style></head><body>{html}</body></html>')
    page.wait_for_load_state('networkidle')
    page.evaluate('document.fonts.ready')
    page.screenshot(path=path, omit_background=transparent, clip={'x': 0, 'y': 0, 'width': w, 'height': h})


def svg_box(svg, w, h, bg='transparent', pad=0):
    return (f'<div style="width:{w}px;height:{h}px;background:{bg};display:flex;align-items:center;justify-content:center;'
            f'box-sizing:border-box;padding:{pad}px">{svg.replace("<svg ", "<svg style=\'width:100%;height:100%\' ", 1)}</div>')


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()

    # ícones
    for size, name in [(16, 'favicon-16.png'), (32, 'favicon-32.png'), (48, 'favicon-48.png'), (180, 'apple-touch-icon.png'),
                       (192, 'favicon-192.png'), (512, 'favicon-512.png')]:
        sv = symbol(rx=0) if name == 'apple-touch-icon.png' else symbol()
        shot(pg, svg_box(sv, size, size), size, size, os.path.join(OUT, name), transparent=True)
    imgs = [Image.open(os.path.join(OUT, n)).convert('RGBA') for n in ['favicon-16.png', 'favicon-32.png', 'favicon-48.png']]
    imgs[2].save(os.path.join(OUT, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)], append_images=imgs[:2])

    # logos em PNG (fundo transparente)
    shot(pg, svg_box(full(NAVY, AMBER, NAVY), 800, 288), 800, 288, os.path.join(A, 'logo-full.png'), transparent=True)
    shot(pg, svg_box(full(NAVY, AMBER, NAVY), 2000, 720, pad=0), 2000, 720, os.path.join(BR, 'attivo-logo.png'), transparent=True)
    shot(pg, svg_box(full(WHITE, AMBER, MUTED), 2000, 720), 2000, 720, os.path.join(BR, 'attivo-logo-negativo.png'), transparent=True)
    shot(pg, svg_box(avatar(), 1080, 1080), 1080, 1080, os.path.join(BR, 'attivo-avatar-redes.png'))
    shot(pg, svg_box(symbol(), 1024, 1024), 1024, 1024, os.path.join(BR, 'attivo-simbolo.png'), transparent=True)

    # imagem de compartilhamento 1200x630
    og = f'''<div style="width:1200px;height:630px;background:{NAVY};box-sizing:border-box;padding:72px 80px;display:flex;flex-direction:column;justify-content:space-between;font-family:Manrope,sans-serif;color:#fff;position:relative;overflow:hidden">
<div style="position:absolute;right:-120px;top:-120px;width:520px;height:520px;border-radius:50%;border:70px solid #13305A"></div>
<div style="width:300px;position:relative">{full(WHITE, AMBER, MUTED).replace('<svg ', '<svg style="width:100%;height:auto" ', 1)}</div>
<div style="position:relative;display:flex;flex-direction:column;gap:22px">
<div style="width:64px;height:8px;border-radius:4px;background:{AMBER}"></div>
<div style="font-family:Sora,sans-serif;font-weight:700;font-size:62px;line-height:1.06;letter-spacing:-0.02em;max-width:900px">Seguro sob medida para você, sua família e sua empresa.</div>
<div style="font-size:26px;color:#C9D3E0;font-weight:600">Corretora independente • Americana/SP • Atendimento em todo o Brasil</div>
</div></div>'''
    shot(pg, og, 1200, 630, os.path.join(A, 'og-image.png'))
    b.close()

# hero-home.png era a imagem de compartilhamento antiga: mantém o endereço vivo
import shutil
shutil.copy(os.path.join(A, 'og-image.png'), os.path.join(A, 'hero-home.png'))
print('assets ok')
