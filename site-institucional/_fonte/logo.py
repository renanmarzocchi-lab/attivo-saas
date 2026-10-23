#!/usr/bin/env python3
"""Gera o logotipo ATTIVO como vetor puro (texto convertido em curvas)."""
import os
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, '..', 'fonts')


def load(name, axes):
    f = TTFont(os.path.join(FONTS, name + '.ttf'))
    return instantiateVariableFont(f, axes, inplace=False)


def text_path(font, text, size, tracking=0.0, dotless_i=False):
    """Retorna (path_d, largura, lista de (glyph, x)) com y para baixo, baseline em y=0."""
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    upm = font['head'].unitsPerEm
    s = size / upm
    x = 0.0
    parts = []
    placed = []
    for ch in text:
        gname = cmap[ord(ch)]
        if dotless_i and ch == 'i' and 'dotlessi' in gs:
            gname = 'dotlessi'
        g = gs[gname]
        pen = SVGPathPen(gs)
        tp = TransformPen(pen, (s, 0, 0, -s, x, 0))
        g.draw(tp)
        parts.append(pen.getCommands())
        placed.append((gname, x, g.width * s))
        x += g.width * s + tracking * size
    return ' '.join(parts), x - tracking * size, placed


def glyph_bounds(font, gname, size):
    gs = font.getGlyphSet()
    bp = BoundsPen(gs)
    gs[gname].draw(bp)
    s = size / font['head'].unitsPerEm
    xmin, ymin, xmax, ymax = bp.bounds
    return xmin * s, -ymax * s, xmax * s, -ymin * s  # y para baixo


def shield(cx, top, w):
    """Escudo arredondado com topo reto levemente arqueado. Retorna path d."""
    h = w * 1.18
    l, r = cx - w / 2, cx + w / 2
    b = top + h
    k = w * 0.10
    return (f'M{l:.2f} {top + k:.2f} Q{l:.2f} {top:.2f} {l + k:.2f} {top:.2f} '
            f'L{r - k:.2f} {top:.2f} Q{r:.2f} {top:.2f} {r:.2f} {top + k:.2f} '
            f'L{r:.2f} {top + h * 0.48:.2f} '
            f'C{r:.2f} {top + h * 0.78:.2f} {cx + w * 0.22:.2f} {b - h * 0.06:.2f} {cx:.2f} {b:.2f} '
            f'C{cx - w * 0.22:.2f} {b - h * 0.06:.2f} {l:.2f} {top + h * 0.78:.2f} {l:.2f} {top + h * 0.48:.2f} Z')


def build(font_name, axes, ink, accent, tag_color, out, tracking=-0.02, tag=True, size=100):
    f = load(font_name, axes)
    d, width, placed = text_path(f, 'attivo', size, tracking=tracking, dotless_i=True)
    # posição do pingo do i
    ig = [p for p in placed if p[0] == 'dotlessi'][0]
    bx0, by0, bx1, by1 = glyph_bounds(f, 'dotlessi', size)
    stem_cx = ig[1] + (bx0 + bx1) / 2
    stem_w = bx1 - bx0
    xh_top = by0
    sw = stem_w * 1.38
    sh_top = xh_top - sw * 1.18 - size * 0.085
    shield_d = shield(stem_cx, sh_top, sw)
    # caixa
    asc_top = min(sh_top, glyph_bounds(f, f.getBestCmap()[ord('t')], size)[1])
    pad = size * 0.02
    vb_y = asc_top - pad
    base_h = -vb_y + size * 0.03
    svg_parts = [f'<path d="{d}" fill="{ink}"/>', f'<path d="{shield_d}" fill="{accent}"/>']
    total_h = base_h
    vb_w = width + pad * 2
    if tag:
        tf = load('PlusJakartaSans', {'wght': 600})
        tsize = size * 0.158
        td, tw, _ = text_path(tf, 'CORRETORA DE SEGUROS', tsize, tracking=0.0)
        track = (width - tw) / (len('CORRETORA DE SEGUROS') - 1)
        td, tw, _ = text_path(tf, 'CORRETORA DE SEGUROS', tsize, tracking=track / tsize)
        ty = size * 0.22
        svg_parts.append(f'<g transform="translate(0 {ty + tsize:.2f})"><path d="{td}" fill="{tag_color}"/></g>')
        total_h = base_h + ty + tsize + size * 0.02
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad:.2f} {vb_y:.2f} {vb_w:.2f} {total_h:.2f}" '
           f'width="{vb_w:.0f}" height="{total_h:.0f}"><title>ATTIVO Corretora de Seguros</title>{"".join(svg_parts)}</svg>')
    with open(out, 'w') as fh:
        fh.write(svg)
    return svg


def symbol(out, bg='#1F5BFF', fg='#FFFFFF', radius=0.0, square_bg=None, font=('BricolageGrotesque', {'wght': 750, 'wdth': 100, 'opsz': 48})):
    """Escudo com o 'a' minúsculo da marca em negativo."""
    f = load(*font)
    size = 100
    gname = f.getBestCmap()[ord('a')]
    x0, y0, x1, y1 = glyph_bounds(f, gname, size)
    gw, gh = x1 - x0, y1 - y0
    W = 100.0
    sw = 72.0
    top = (W - sw * 1.18) / 2
    sd = shield(W / 2, top, sw)
    scale = (sw * 0.60) / gw
    cx = W / 2 - (x0 + gw / 2) * scale
    cy = top + sw * 1.18 * 0.43 - (y0 + gh / 2) * scale
    d, _, _ = text_path(f, 'a', size)
    parts = []
    if square_bg:
        parts.append(f'<rect width="100" height="100" rx="{radius}" fill="{square_bg}"/>')
    parts.append(f'<path d="{sd}" fill="{bg}"/>')
    parts.append(f'<g transform="translate({cx:.2f} {cy:.2f}) scale({scale:.4f})"><path d="{d}" fill="{fg}"/></g>')
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><title>ATTIVO</title>{"".join(parts)}</svg>'
    open(out, 'w').write(svg)
    return svg


if __name__ == '__main__':
    outdir = sys.argv[1]
    os.makedirs(outdir, exist_ok=True)
    opts = {
        'jakarta': ('PlusJakartaSans', {'wght': 800}),
        'bricolage': ('BricolageGrotesque', {'wght': 750, 'wdth': 100, 'opsz': 48}),
        'onest': ('Onest', {'wght': 800}),
        'instrument': ('InstrumentSans', {'wght': 700, 'wdth': 100}),
        'figtree': ('Figtree', {'wght': 800}),
    }
    if len(sys.argv) > 2 and sys.argv[2] == 'final':
        fn, ax = opts['bricolage']
        build(fn, ax, '#0A2540', '#1F5BFF', '#55657D', os.path.join(outdir, 'attivo-logo.svg'))
        build(fn, ax, '#FFFFFF', '#5B8CFF', '#B4C4DC', os.path.join(outdir, 'attivo-logo-negativo.svg'))
        build(fn, ax, '#0A2540', '#1F5BFF', '#55657D', os.path.join(outdir, 'attivo-assinatura.svg'), tag=False)
        build(fn, ax, '#FFFFFF', '#5B8CFF', '#B4C4DC', os.path.join(outdir, 'attivo-assinatura-negativo.svg'), tag=False)
        build(fn, ax, '#111111', '#111111', '#111111', os.path.join(outdir, 'attivo-logo-mono.svg'))
        symbol(os.path.join(outdir, 'attivo-simbolo.svg'))
        symbol(os.path.join(outdir, 'attivo-favicon.svg'), bg='#FFFFFF', fg='#0A2540', radius=22, square_bg='#1F5BFF')
        symbol(os.path.join(outdir, 'attivo-avatar.svg'), bg='#1F5BFF', fg='#FFFFFF', radius=0, square_bg='#0A2540')
    else:
        for k, (fn, ax) in opts.items():
            build(fn, ax, '#0A2540', '#1F5BFF', '#5B6B82', os.path.join(outdir, f'opt-{k}.svg'))
    print('ok')
