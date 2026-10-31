#!/usr/bin/env python3
"""Logotipo ATTIVO v3 (caixa alta, tagline, gradiente), texto convertido em curvas."""
import os
import sys
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from logo import text_path, glyph_bounds, shield  # noqa

FONTS = os.path.join(HERE, '..', 'fonts')
NAVY, BLUE, TEAL, SLATE = '#0B2A4A', '#1E6BD6', '#14B3C4', '#4E6380'


def font(name):
    return TTFont(os.path.join(FONTS, name + '.ttf'))


def grad(gid, a, b, horizontal=True):
    x2, y2 = ('1', '0') if horizontal else ('0', '1')
    return (f'<linearGradient id="{gid}" x1="0" y1="0" x2="{x2}" y2="{y2}" gradientUnits="objectBoundingBox">'
            f'<stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient>')


def wordmark_i(f, size=100, tracking=0.0):
    """ATTiVO com i minúsculo sem pingo; devolve path, largura, centro e topo do i, topo das maiúsculas."""
    parts, x, info = [], 0.0, {}
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    s = size / f['head'].unitsPerEm
    for ch in 'ATTiVO':
        g = 'dotlessi' if ch == 'i' and 'dotlessi' in gs else cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[g].draw(TransformPen(pen, (s, 0, 0, -s, x, 0)))
        parts.append(pen.getCommands())
        if ch == 'i':
            bx0, by0, bx1, by1 = glyph_bounds(f, g, size)
            info['i_cx'] = x + (bx0 + bx1) / 2
            info['i_w'] = bx1 - bx0
            info['i_top'] = by0
        x += gs[g].width * s + tracking * size
    info['cap_top'] = glyph_bounds(f, cmap[ord('A')], size)[1]
    return ' '.join(parts), x - tracking * size, info


def tagline(f, text, width, size):
    d, w, _ = text_path(f, text, size)
    n = len(text) - 1
    tr = (width - w) / n / size
    d, w, _ = text_path(f, text, size, tracking=tr)
    return d


def logo_a(out, ink=NAVY, g1=BLUE, g2=NAVY, dot=TEAL, tag_c=SLATE, with_tag=True, mono=None):
    """Opção A: ATTiVO, escudo no lugar do pingo do i, tagline justificada."""
    f = font('Poppins-Bold')
    size = 100
    d, w, info = wordmark_i(f, size, tracking=0.01)
    sw = info['i_w'] * 1.75
    top = info['cap_top']
    sd = shield(info['i_cx'], top, sw)
    pad = 2
    tag_size = 15.5
    tag_gap = 15
    h = -top + (tag_gap + tag_size if with_tag else 0) + pad * 2
    parts = []
    fill_word = mono or 'url(#gw)'
    fill_dot = mono or dot
    if not mono:
        parts.append(f'<defs>{grad("gw", g1, g2)}</defs>')
    parts.append(f'<path d="{d}" fill="{fill_word}"/>')
    parts.append(f'<path d="{sd}" fill="{fill_dot}"/>')
    if with_tag:
        td = tagline(font('Poppins-Medium'), 'CORRETORA DE SEGUROS', w, tag_size)
        parts.append(f'<g transform="translate(0 {tag_gap + tag_size:.2f})"><path d="{td}" fill="{mono or tag_c}"/></g>')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad} {top - pad:.2f} {w + pad * 2:.2f} {h:.2f}" '
           f'width="{w + pad * 2:.0f}" height="{h:.0f}"><title>ATTIVO Corretora de Seguros</title>{"".join(parts)}</svg>')
    open(out, 'w').write(svg)
    return svg


def symbol(out, bg_grad=(BLUE, NAVY), fg='#FFFFFF', dot=TEAL, square=None, radius=22):
    """Símbolo: escudo em gradiente com o i minúsculo e o pingo-escudo."""
    W = 100.0
    parts = [f'<defs>{grad("gs", bg_grad[0], bg_grad[1], horizontal=False)}</defs>']
    if square:
        parts.append(f'<rect width="100" height="100" rx="{radius}" fill="{square}"/>')
        sw = 74.0
    else:
        sw = 84.0
    top = (W - sw * 1.18) / 2
    parts.append(f'<path d="{shield(50, top, sw)}" fill="url(#gs)"/>')
    f = font('Poppins-Bold')
    gs = f.getGlyphSet()
    x0, y0, x1, y1 = glyph_bounds(f, 'dotlessi', 100)
    d, _, _ = text_path(f, 'ı', 100) if 'ı' in ''.join(chr(c) for c in f.getBestCmap()) else (None, None, None)
    # haste do i e pingo-escudo, desenhados à mão para ficarem centrados
    stem_w = sw * 0.17
    stem_h = sw * 0.42
    cx = 50
    stem_top = top + sw * 1.18 * 0.40
    parts.append(f'<rect x="{cx - stem_w / 2:.2f}" y="{stem_top:.2f}" width="{stem_w:.2f}" height="{stem_h:.2f}" rx="{stem_w * 0.12:.2f}" fill="{fg}"/>')
    dw = stem_w * 1.45
    parts.append(f'<path d="{shield(cx, stem_top - dw * 1.18 - sw * 0.07, dw)}" fill="{dot}"/>')
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><title>ATTIVO</title>{"".join(parts)}</svg>'
    open(out, 'w').write(svg)
    return svg


def logo_b(out):
    """Opção B: símbolo + ATTIVO + tagline à direita (assinatura horizontal)."""
    f = font('Poppins-SemiBold')
    size = 100
    d, w, _ = text_path(f, 'ATTIVO', size, tracking=0.02)
    cap_top = glyph_bounds(f, f.getBestCmap()[ord('A')], size)[1]
    td = tagline(font('Poppins-Medium'), 'CORRETORA DE SEGUROS', w, 15.5)
    sym = open(os.path.join(os.path.dirname(out), 'opt-symbol.svg')).read()
    inner = sym.split('>', 1)[1].rsplit('</svg>', 1)[0].replace('<title>ATTIVO</title>', '').replace('id="gs"', 'id="gs2"').replace('url(#gs)', 'url(#gs2)')
    H = -cap_top + 30.5
    sc = (H + 10) / 100
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 {cap_top - 6:.2f} {w + 140:.2f} {H + 12:.2f}"><title>ATTIVO</title>'
           f'<g transform="translate(0 {cap_top - 6:.2f}) scale({sc:.3f})">{inner}</g>'
           f'<g transform="translate({H + 26:.2f} 0)"><path d="{d}" fill="{NAVY}"/><g transform="translate(0 30.5)"><path d="{td}" fill="{SLATE}"/></g></g></svg>')
    open(out, 'w').write(svg)


if __name__ == '__main__':
    o = sys.argv[1]
    os.makedirs(o, exist_ok=True)
    mode = sys.argv[2] if len(sys.argv) > 2 else 'opts'
    if mode == 'opts':
        logo_a(os.path.join(o, 'opt-a.svg'))
        symbol(os.path.join(o, 'opt-symbol.svg'))
        logo_b(os.path.join(o, 'opt-b.svg'))
        symbol(os.path.join(o, 'opt-fav.svg'), square='#FFFFFF')
    else:
        logo_a(os.path.join(o, 'attivo-logo.svg'))
        logo_a(os.path.join(o, 'attivo-logo-negativo.svg'), g1='#FFFFFF', g2='#CFE0FA', dot=TEAL, tag_c='#B9CBE3')
        logo_a(os.path.join(o, 'attivo-assinatura.svg'), with_tag=False)
        logo_a(os.path.join(o, 'attivo-assinatura-negativo.svg'), g1='#FFFFFF', g2='#CFE0FA', with_tag=False)
        logo_a(os.path.join(o, 'attivo-logo-mono.svg'), mono='#111111')
        symbol(os.path.join(o, 'attivo-simbolo.svg'))
        symbol(os.path.join(o, 'attivo-favicon.svg'), square='#FFFFFF')
        symbol(os.path.join(o, 'attivo-avatar.svg'), square=NAVY, radius=0, bg_grad=(BLUE, '#1557B8'))
    print('ok')
