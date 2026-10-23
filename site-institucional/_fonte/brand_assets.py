#!/usr/bin/env python3
"""Copia a marca para o site e gera PNG, ICO e imagem de compartilhamento."""
import os
import re
import shutil
from PIL import Image
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
SCR = os.path.join(HERE, '..')
M = os.path.join(SCR, 'marca2')
ST = os.path.join(HERE, 'static')
A = os.path.join(ST, 'assets')
KIT = os.path.join(SCR, 'kit-marca')
os.makedirs(A, exist_ok=True)
os.makedirs(KIT, exist_ok=True)

shutil.copy(os.path.join(M, 'attivo-assinatura.svg'), os.path.join(A, 'logo.svg'))
shutil.copy(os.path.join(M, 'attivo-logo-negativo.svg'), os.path.join(A, 'logo-negativo.svg'))
shutil.copy(os.path.join(M, 'attivo-simbolo.svg'), os.path.join(ST, 'favicon.svg'))
for f in os.listdir(M):
    if f.endswith('.svg'):
        shutil.copy(os.path.join(M, f), os.path.join(KIT, f))


def dims(svg):
    vb = re.search(r'viewBox="([^"]+)"', svg).group(1).split()
    return float(vb[2]), float(vb[3])


FONTS = '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700&family=Figtree:wght@500;600;700&display=swap" rel="stylesheet">'


def shot(pg, html, w, h, path, transparent=False, jpeg=False):
    pg.set_viewport_size({'width': w, 'height': h})
    bg = 'transparent' if transparent else '#fff'
    pg.set_content(f'<!doctype html><html><head>{FONTS}<style>html,body{{margin:0;width:{w}px;height:{h}px;overflow:hidden;background:{bg}}}</style></head><body>{html}</body></html>')
    pg.wait_for_load_state('networkidle')
    pg.evaluate('document.fonts.ready')
    if jpeg:
        pg.screenshot(path=path, type='jpeg', quality=86, clip={'x': 0, 'y': 0, 'width': w, 'height': h})
    else:
        pg.screenshot(path=path, omit_background=transparent, clip={'x': 0, 'y': 0, 'width': w, 'height': h})


def box(svg, w, h, bg='transparent', pad=0):
    return (f'<div style="width:{w}px;height:{h}px;background:{bg};display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:{pad}px">'
            + svg.replace('<svg ', '<svg style="width:100%;height:100%" ', 1) + '</div>')


sym = open(os.path.join(M, 'attivo-simbolo.svg')).read()
fav = open(os.path.join(M, 'attivo-favicon.svg')).read()
ava = open(os.path.join(M, 'attivo-avatar.svg')).read()
logo = open(os.path.join(M, 'attivo-logo.svg')).read()
logo_neg = open(os.path.join(M, 'attivo-logo-negativo.svg')).read()
lw, lh = dims(logo)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    for s in (16, 32, 48):
        shot(pg, box(sym, s, s), s, s, os.path.join(ST, f'favicon-{s}.png'), transparent=True)
    shot(pg, box(ava, 180, 180), 180, 180, os.path.join(ST, 'apple-touch-icon.png'))
    for s in (192, 512):
        shot(pg, box(fav, s, s), s, s, os.path.join(ST, f'favicon-{s}.png'), transparent=True)
    ims = [Image.open(os.path.join(ST, f'favicon-{s}.png')).convert('RGBA') for s in (16, 32, 48)]
    ims[2].save(os.path.join(ST, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)], append_images=ims[:2])
    W = 800
    H = round(W * lh / lw)
    shot(pg, box(logo, W, H), W, H, os.path.join(A, 'logo-full.png'), transparent=True)
    # kit em alta
    W2 = 2400
    H2 = round(W2 * lh / lw)
    shot(pg, box(logo, W2, H2), W2, H2, os.path.join(KIT, 'attivo-logo.png'), transparent=True)
    shot(pg, box(logo_neg, W2, H2), W2, H2, os.path.join(KIT, 'attivo-logo-negativo.png'), transparent=True)
    shot(pg, box(sym, 1024, 1024), 1024, 1024, os.path.join(KIT, 'attivo-simbolo.png'), transparent=True)
    shot(pg, box(ava, 1080, 1080), 1080, 1080, os.path.join(KIT, 'attivo-avatar-redes.png'))
    # imagem de compartilhamento
    import base64
    hero = 'data:image/jpeg;base64,' + base64.b64encode(open(os.path.join(SCR, 'img-out', 'hero-familia-800.jpg'), 'rb').read()).decode()
    og = f'''<div style="position:relative;width:1200px;height:630px;overflow:hidden;font-family:Figtree,sans-serif;background:#0A2540">
<img src="{hero}" style="position:absolute;right:0;top:0;width:700px;height:630px;object-fit:cover">
<div style="position:absolute;inset:0;background:linear-gradient(90deg,#0A2540 0%,#0A2540 46%,rgba(10,37,64,.55) 62%,rgba(10,37,64,0) 80%)"></div>
<div style="position:absolute;left:72px;top:70px;width:300px">{logo_neg.replace('<svg ', '<svg style="width:100%;height:auto;display:block" ', 1)}</div>
<div style="position:absolute;left:72px;bottom:80px;width:560px;color:#fff">
<div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:58px;line-height:1.02;letter-spacing:-0.035em">Seguro bem escolhido, explicado por quem entende.</div>
<div style="margin-top:22px;font-size:24px;color:#C2D0E4;font-weight:600">Auto, casa, vida, saúde e empresas. Americana/SP e todo o Brasil.</div>
</div></div>'''
    pg.set_viewport_size({'width': 1200, 'height': 630})
    pg.set_content(f'<!doctype html><html><head>{FONTS}<style>html,body{{margin:0}}</style></head><body>{og}</body></html>')
    pg.wait_for_load_state('networkidle')
    pg.evaluate('document.fonts.ready')
    pg.wait_for_timeout(500)
    pg.screenshot(path=os.path.join(A, 'og-image.jpg'), type='jpeg', quality=86, clip={'x': 0, 'y': 0, 'width': 1200, 'height': 630})
    b.close()
shutil.copy(os.path.join(A, 'og-image.jpg'), os.path.join(KIT, 'attivo-compartilhamento.jpg'))
print('ok', lw, lh)
