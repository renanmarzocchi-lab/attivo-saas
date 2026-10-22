#!/usr/bin/env python3
"""Gera o site estático da ATTIVO a partir dos artboards do canvas."""
import json
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, '..', 'attivo', 'project')
OUT = os.path.join(ROOT, '..', 'site')
SITE = 'https://attivocorretora.com.br'
WA = 'https://wa.me/5519994241018'
WA_DEFAULT = WA + '?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20ATTIVO%20e%20gostaria%20de%20falar%20com%20um%20especialista.'
LASTMOD = '2026-10-22'

LINKS = {
    'Home.dc.html': '/',
    'Sobre.dc.html': '/sobre/',
    'Seguros.dc.html': '/seguros/',
    'Contato.dc.html': '/contato/',
}

ORG = {
    "@type": "InsuranceAgency",
    "@id": SITE + "/#organization",
    "name": "ATTIVO Corretora de Seguros",
    "legalName": "Renan Marzocchi Pereira Corretagem de Seguros Ltda",
    "taxID": "64.758.455/0001-53",
    "url": SITE + "/",
    "telephone": "+55-19-99424-1018",
    "email": "contato@attivocorretora.com.br",
    "image": SITE + "/assets/og-image.png",
    "logo": {"@type": "ImageObject", "url": SITE + "/assets/logo-full.png", "width": 800, "height": 264},
    "address": {"@type": "PostalAddress", "addressLocality": "Americana", "addressRegion": "SP", "postalCode": "13460-000", "addressCountry": "BR"},
    "geo": {"@type": "GeoCoordinates", "latitude": -22.7369, "longitude": -47.3328},
    "openingHoursSpecification": [{"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "08:00", "closes": "17:00"}],
    "areaServed": {"@type": "Country", "name": "Brasil"},
}


def read(name):
    with open(os.path.join(SRC, name), encoding='utf-8') as f:
        return f.read()


def inner(src):
    body = src.split('<x-dc>', 1)[1].split('</x-dc>', 1)[0]
    body = re.sub(r'<helmet>.*?</helmet>', '', body, flags=re.S)
    return body


def relink(html):
    for k, v in LINKS.items():
        html = html.replace('href="%s"' % k, 'href="%s"' % v)
    html = html.replace('href="%s"' % WA, 'href="%s"' % WA_DEFAULT)
    # links do rodapé para as páginas de cada seguro
    for label, slug in [('Seguro Auto', 'seguro-auto'), ('Seguro Residencial', 'seguro-residencial'),
                        ('Seguro Empresarial', 'seguro-empresarial'), ('Seguro de Vida', 'seguro-de-vida')]:
        html = re.sub(r'href="/seguros/"([^>]*)>%s</a>' % label, r'href="/%s/"\1>%s</a>' % (slug, label), html)
    return html


def split(body):
    """Separa header, miolo e footer do artboard."""
    h = re.search(r'<header.*?</header>', body, flags=re.S).group(0)
    f = re.search(r'<footer.*?</footer>', body, flags=re.S).group(0)
    mid = body.split(h, 1)[1].split(f, 1)[0]
    return h, mid.strip(), f


def mark_header(h, current):
    h = h.replace('<header style=', '<header class="site-header" style=', 1)
    h = h.replace('<nav aria-label="Principal" style=', '<nav class="site-nav" aria-label="Principal" style=', 1)
    h = re.sub(r'(<a href="%s" style="display: inline-flex; align-items: center; gap: 8px; height: 46px;)' % re.escape(WA_DEFAULT),
               r'<a class="header-cta" href="%s" style="display: inline-flex; align-items: center; gap: 8px; height: 46px;' % WA_DEFAULT, h)
    # zera o item ativo e marca o atual
    h = h.replace(' aria-current="page"', '')
    h = h.replace('font-weight: 700; font-size: 15px; text-decoration: none; padding: 12px 0; border-bottom: 2px solid #F2A33A',
                  'font-weight: 600; font-size: 15px; text-decoration: none; padding: 12px 0')
    if current:
        h = re.sub(r'<a href="%s" style="color: #0B1F3A; font-weight: 600; font-size: 15px; text-decoration: none; padding: 12px 0">' % re.escape(current),
                   '<a href="%s" aria-current="page" style="color: #0B1F3A; font-weight: 700; font-size: 15px; text-decoration: none; padding: 12px 0; border-bottom: 2px solid #F2A33A">' % current, h, count=1)
    return h


def head(title, desc, path, extra_ld=None, robots='index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1'):
    url = SITE + path
    graph = [ORG, {"@type": "WebSite", "@id": SITE + "/#website", "url": SITE + "/", "name": "ATTIVO Corretora de Seguros",
                   "inLanguage": "pt-BR", "publisher": {"@id": SITE + "/#organization"}}]
    if extra_ld:
        graph += extra_ld
    ld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)
    t = esc(title)
    d = esc(desc)
    return f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t}</title>
<meta name="description" content="{d}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#0B1F3A">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="ATTIVO Corretora de Seguros">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{t}">
<meta name="twitter:description" content="{d}">
<meta name="twitter:image" content="{SITE}/assets/og-image.png">
<meta name="google-site-verification" content="5Uj3UcNRbl9lY_f5gJt5685E5yvCQhcyARqfM2nqrVg">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&amp;family=Sora:wght@500;600;700&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css?v=2">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ZNM2R7XQVC"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}}gtag('js',new Date());gtag('config','G-ZNM2R7XQVC');</script>
<script type="application/ld+json">{ld}</script>
</head>
<body>
'''


WA_FLOAT = f'''<a class="wa-float" href="{WA_DEFAULT}" aria-label="Falar com a ATTIVO no WhatsApp" target="_blank" rel="noopener">
<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"></path><path d="M8.5 11h7M8.5 14h4.5"></path></svg>
</a>
'''

TAIL = '<script src="/assets/site.js?v=2" defer></script>\n</body>\n</html>\n'


def esc(s):
    return s.replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;')


def page(path, title, desc, header, main, footer, extra_ld=None, robots=None):
    kw = {'robots': robots} if robots else {}
    return head(title, desc, path, extra_ld, **kw) + header + '\n<main>\n' + main + '\n</main>\n' + footer + '\n' + WA_FLOAT + TAIL


def write(path, html):
    d = os.path.join(OUT, path.strip('/'))
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)


def crumbs(items):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + p} for i, (n, p) in enumerate(items)]}


def faq_ld(qas):
    return {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in qas]}


# ─── páginas principais a partir do canvas ───────────────────────────────────
MAIN = {
    'Home.dc.html': ('/', 'ATTIVO Corretora de Seguros | Auto, Vida, Residencial, Empresarial e Mais',
                     'Corretora de seguros independente em Americana/SP com atendimento consultivo em todo o Brasil. Comparamos seguradoras e explicamos coberturas de auto, vida, residencial, empresarial e mais.'),
    'Seguros.dc.html': ('/seguros/', 'Seguros para Pessoas e Empresas | ATTIVO Corretora',
                        'Seguro auto, residencial, empresarial, vida, saúde, odontológico, viagem, fiança locatícia, responsabilidade civil, condomínio, frota e equipamentos, com comparação entre seguradoras.'),
    'Sobre.dc.html': ('/sobre/', 'Sobre a ATTIVO | Corretora de Seguros Independente e Consultiva',
                      'Conheça a ATTIVO Corretora de Seguros: atendimento consultivo, atuação independente e suporte do primeiro contato ao sinistro, para clientes em todo o Brasil.'),
    'Contato.dc.html': ('/contato/', 'Fale com a ATTIVO | Cotação de Seguro em Americana/SP e todo o Brasil',
                        'Peça sua cotação de seguro com a ATTIVO pelo WhatsApp (19) 99424-1018, e-mail ou formulário. Atendimento consultivo de segunda a sexta, das 08:00 às 17:00.'),
}

HOME_FAQ = [
    ("Como funciona a cotação com a ATTIVO?", "Você conta seu perfil e o que precisa proteger. A ATTIVO compara seguradoras e apresenta as opções explicando coberturas, franquias, limites e diferenças entre elas."),
    ("O atendimento é só em Americana/SP?", "Não. A base da corretora fica em Americana/SP, mas o atendimento é feito para todo o Brasil, conforme a modalidade e a seguradora disponível para o seu caso."),
    ("Vocês atendem pessoa física e jurídica?", "Sim. Atendemos pessoas, famílias, profissionais e empresas, com soluções para auto, residência, vida, empresarial e outras modalidades."),
    ("A ATTIVO ajuda quando preciso acionar o seguro?", "Sim. Seguimos ao seu lado depois da contratação, com apoio em ajustes, renovações e no acionamento da seguradora quando acontece um sinistro."),
]

parts = {}
for name, (path, title, desc) in MAIN.items():
    body = relink(inner(read(name)))
    h, mid, f = split(body)
    parts[name] = (h, mid, f)

    if name == 'Home.dc.html':
        # cards de seguros da home apontam para as páginas de cada modalidade
        for label, slug in [('Seguro Auto', 'seguro-auto'), ('Seguro Residencial', 'seguro-residencial'),
                            ('Seguro Empresarial', 'seguro-empresarial'), ('Seguro de Vida', 'seguro-de-vida')]:
            mid = re.sub(r'<a href="/seguros/"((?:(?!</a>).)*?>%s</div>)' % label, r'<a href="/%s/"\1' % slug, mid, count=1, flags=re.S)
        extra = [faq_ld(HOME_FAQ)]
    elif name == 'Seguros.dc.html':
        for label, slug in [('Seguro Auto', 'seguro-auto'), ('Seguro Residencial', 'seguro-residencial'),
                            ('Seguro Empresarial', 'seguro-empresarial'), ('Seguro de Vida', 'seguro-de-vida')]:
            mid = re.sub(r'(<h3 style="[^"]*">)%s</h3>' % label,
                         r'\1<a href="/%s/" style="color: inherit; text-decoration: none">%s</a></h3>' % (slug, label), mid, count=1)
        extra = [crumbs([("Início", "/"), ("Seguros", "/seguros/")])]
    elif name == 'Contato.dc.html':
        mid = mid.replace('<form aria-labelledby="form-titulo"', '<form id="form-contato" novalidate aria-labelledby="form-titulo"')
        for fid, nm, req in [('f-nome', 'nome', True), ('f-tel', 'telefone', True), ('f-email', 'email', False),
                             ('f-cidade', 'cidade', False), ('f-tipo', 'tipo', False), ('f-horario', 'horario', False),
                             ('f-msg', 'mensagem', False), ('f-lgpd', 'lgpd', True)]:
            mid = re.sub(r'<(input|select|textarea) id="%s"' % fid,
                         r'<\1 id="%s" name="%s"%s' % (fid, nm, ' required' if req else ''), mid, count=1)
        mid = mid.replace('<button type="button"', '<button type="submit"')
        mid = mid.replace('<span style="font-size: 14px; color: #4A5B73">Após o envio, analisamos o seu caso e retornamos pelo canal informado.</span>',
                          '<span id="form-status" role="status" style="font-size: 14px; color: #4A5B73">Ao enviar, abrimos o WhatsApp com seus dados preenchidos. É só tocar em enviar.</span>')
        extra = [crumbs([("Início", "/"), ("Contato", "/contato/")])]
    else:
        extra = [crumbs([("Início", "/"), ("Sobre", "/sobre/")])]

    write(path, page(path, title, desc, mark_header(h, path), mid, f, extra))

H, _, F = parts['Home.dc.html']

# ─── blocos reutilizados nas páginas de SEO ──────────────────────────────────
EYEBROW = '<div style="display: inline-flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #4A5B73"><span style="width: 24px; height: 3px; border-radius: 2px; background: #F2A33A"></span>{}</div>'
H2 = '<h2 style="margin: 0; font-family: Sora, sans-serif; font-weight: 700; font-size: clamp(28px, 3.2vw, 40px); line-height: 1.14; letter-spacing: -0.02em">{}</h2>'
ARROW = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>'
CHECK = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style="flex-shrink: 0"><circle cx="12" cy="12" r="11" fill="#0B1F3A"></circle><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path></svg>'


def hero(crumb_items, h1, lead, cta_text):
    nav = ''.join(
        (f'<a href="{p}" style="color: #DCE4EE; text-decoration: none">{n}</a><span aria-hidden="true">/</span>' if p else f'<span>{n}</span>')
        for n, p in crumb_items)
    return f'''<section style="background: #0B1F3A; color: #FFFFFF">
<div style="max-width: 1200px; margin: 0 auto; padding: 64px 24px 72px; display: flex; flex-direction: column; gap: 22px">
<nav aria-label="Você está em" style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 14px; color: #B7C3D4">{nav}</nav>
<h1 style="margin: 0; font-family: Sora, sans-serif; font-weight: 700; font-size: clamp(34px, 4.4vw, 54px); line-height: 1.08; letter-spacing: -0.025em; max-width: 860px">{h1}</h1>
<p style="margin: 0; font-size: 18px; line-height: 1.6; color: #C9D3E0; max-width: 700px">{lead}</p>
<div style="display: flex; flex-wrap: wrap; gap: 14px; padding-top: 6px">
<a href="{WA_DEFAULT}" data-wa-msg="{esc(cta_text)}" style="display: inline-flex; align-items: center; height: 54px; padding: 0 26px; border-radius: 999px; background: #F2A33A; color: #0B1F3A; font-weight: 700; font-size: 16px; text-decoration: none">Cotar pelo WhatsApp</a>
<a href="/contato/" style="display: inline-flex; align-items: center; height: 54px; padding: 0 26px; border-radius: 999px; border: 1.5px solid #FFFFFF; color: #FFFFFF; font-weight: 700; font-size: 16px; text-decoration: none; box-sizing: border-box">Enviar mensagem</a>
</div>
</div>
</section>'''


def intro(eyebrow, h2, text, points, cover_title=None, covers=None):
    pts = ''.join(f'<li style="display: flex; gap: 12px; align-items: flex-start; font-size: 16px; line-height: 1.5; font-weight: 600">{CHECK}<span>{p}</span></li>' for p in points)
    right = f'''<div style="background: #F6F8FB; border: 1px solid #E3E8EF; border-radius: 20px; padding: 30px; display: flex; flex-direction: column; gap: 18px">
<h3 style="margin: 0; font-family: Sora, sans-serif; font-weight: 600; font-size: 20px">O que entra na nossa análise</h3>
<ul style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 14px">{pts}</ul>
</div>'''
    cov = ''
    if covers:
        chips = ''.join(f'<span style="font-size: 14px; font-weight: 700; padding: 8px 14px; border-radius: 999px; background: #EEF2F7; color: #0B1F3A">{c}</span>' for c in covers)
        cov = f'<div style="display: flex; flex-direction: column; gap: 12px; padding-top: 6px"><div style="font-size: 14px; font-weight: 700; color: #4A5B73">{cover_title}</div><div style="display: flex; flex-wrap: wrap; gap: 8px">{chips}</div></div>'
    return f'''<section style="background: #FFFFFF">
<div style="max-width: 1200px; margin: 0 auto; padding: 96px 24px; display: flex; flex-wrap: wrap; gap: 48px; align-items: flex-start">
<div style="flex: 1 1 460px; min-width: 0; display: flex; flex-direction: column; gap: 18px">
{EYEBROW.format(eyebrow)}
{H2.format(h2)}
<p style="margin: 0; font-size: 17px; line-height: 1.7; color: #4A5B73">{text}</p>
{cov}
</div>
<div style="flex: 1 1 400px; min-width: 0">{right}</div>
</div>
</section>'''


STEPS = '''<section style="background: #EEF2F7">
<div style="max-width: 1200px; margin: 0 auto; padding: 88px 24px; display: flex; flex-direction: column; gap: 40px">
<div style="display: flex; flex-direction: column; gap: 16px; max-width: 720px">
''' + EYEBROW.format('Como funciona') + '\n' + H2.format('Do primeiro contato ao sinistro, com a gente.') + '''
</div>
<ol style="margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 20px">
<li style="background: #FFFFFF; border-radius: 20px; padding: 28px; display: flex; flex-direction: column; gap: 10px; border-top: 4px solid #0B1F3A"><div style="font-family: Sora, sans-serif; font-weight: 700; font-size: 15px; color: #4A5B73">01</div><div style="font-family: Sora, sans-serif; font-weight: 600; font-size: 19px">Entendemos o seu perfil</div><div style="font-size: 15px; line-height: 1.6; color: #4A5B73">Necessidades, prioridades, riscos e o tipo de proteção que faz sentido.</div></li>
<li style="background: #FFFFFF; border-radius: 20px; padding: 28px; display: flex; flex-direction: column; gap: 10px; border-top: 4px solid #0B1F3A"><div style="font-family: Sora, sans-serif; font-weight: 700; font-size: 15px; color: #4A5B73">02</div><div style="font-family: Sora, sans-serif; font-weight: 600; font-size: 19px">Comparamos seguradoras</div><div style="font-size: 15px; line-height: 1.6; color: #4A5B73">Analisamos as principais opções do mercado de acordo com o seu caso.</div></li>
<li style="background: #FFFFFF; border-radius: 20px; padding: 28px; display: flex; flex-direction: column; gap: 10px; border-top: 4px solid #0B1F3A"><div style="font-family: Sora, sans-serif; font-weight: 700; font-size: 15px; color: #4A5B73">03</div><div style="font-family: Sora, sans-serif; font-weight: 600; font-size: 19px">Recomendamos com clareza</div><div style="font-size: 15px; line-height: 1.6; color: #4A5B73">Coberturas, condições e diferenças explicadas antes de você decidir.</div></li>
<li style="background: #FFFFFF; border-radius: 20px; padding: 28px; display: flex; flex-direction: column; gap: 10px; border-top: 4px solid #F2A33A"><div style="font-family: Sora, sans-serif; font-weight: 700; font-size: 15px; color: #4A5B73">04</div><div style="font-family: Sora, sans-serif; font-weight: 600; font-size: 19px">Acompanhamos depois</div><div style="font-size: 15px; line-height: 1.6; color: #4A5B73">Emissão, renovação, ajustes e apoio quando você precisar acionar o seguro.</div></li>
</ol>
</div>
</section>'''


def faq(title, qas):
    items = []
    for i, (q, a) in enumerate(qas):
        bb = ' border-bottom: 1px solid #D9E0EA;' if i == len(qas) - 1 else ''
        op = ' open=""' if i == 0 else ''
        items.append(f'<details{op} style="border-top: 1px solid #D9E0EA;{bb} padding: 22px 0"><summary style="cursor: pointer; font-family: Sora, sans-serif; font-weight: 600; font-size: 19px">{q}</summary><p style="margin: 14px 0 0; font-size: 16px; line-height: 1.65; color: #4A5B73">{a}</p></details>')
    return f'''<section style="background: #FFFFFF">
<div style="max-width: 1200px; margin: 0 auto; padding: 88px 24px; display: flex; flex-wrap: wrap; gap: 48px">
<div style="flex: 1 1 320px; min-width: 0; display: flex; flex-direction: column; gap: 16px">
{EYEBROW.format('Perguntas frequentes')}
{H2.format(title)}
</div>
<div style="flex: 2 1 520px; min-width: 0; display: flex; flex-direction: column">{''.join(items)}</div>
</div>
</section>'''


def related(current):
    opts = [('Seguro Auto', '/seguro-auto/'), ('Seguro Residencial', '/seguro-residencial/'), ('Seguro Empresarial', '/seguro-empresarial/'),
            ('Seguro de Vida', '/seguro-de-vida/'), ('Todas as modalidades', '/seguros/')]
    links = ''.join(f'<a href="{p}" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: 999px; border: 1.5px solid #CBD4E1; color: #0B1F3A; font-weight: 700; font-size: 15px; text-decoration: none">{n}{ARROW}</a>'
                    for n, p in opts if p != current)
    return f'''<section style="background: #FFFFFF; border-top: 1px solid #E3E8EF">
<div style="max-width: 1200px; margin: 0 auto; padding: 56px 24px; display: flex; flex-direction: column; gap: 18px">
<div style="font-family: Sora, sans-serif; font-weight: 600; font-size: 20px">Veja também</div>
<div style="display: flex; flex-wrap: wrap; gap: 12px">{links}</div>
</div>
</section>'''


def cta(title, text):
    return f'''<section style="background: #F2A33A">
<div style="max-width: 1200px; margin: 0 auto; padding: 72px 24px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 32px">
<div style="flex: 1 1 480px; min-width: 0; display: flex; flex-direction: column; gap: 12px">
<h2 style="margin: 0; font-family: Sora, sans-serif; font-weight: 700; font-size: clamp(28px, 3.4vw, 42px); line-height: 1.12; letter-spacing: -0.02em; color: #0B1F3A">{title}</h2>
<p style="margin: 0; font-size: 18px; line-height: 1.6; color: #0B1F3A">{text}</p>
</div>
<div style="display: flex; flex-wrap: wrap; gap: 14px">
<a href="{WA_DEFAULT}" style="display: inline-flex; align-items: center; height: 54px; padding: 0 26px; border-radius: 999px; background: #0B1F3A; color: #FFFFFF; font-weight: 700; font-size: 16px; text-decoration: none">Falar no WhatsApp</a>
<a href="/contato/" style="display: inline-flex; align-items: center; height: 54px; padding: 0 26px; border-radius: 999px; border: 1.5px solid #0B1F3A; color: #0B1F3A; font-weight: 700; font-size: 16px; text-decoration: none; box-sizing: border-box">Enviar mensagem</a>
</div>
</div>
</section>'''


COMMON_FAQ = [
    ("Como funciona a cotação?", "Coletamos as informações essenciais, analisamos seguradoras e apresentamos as opções que se encaixam no seu perfil, com orientação consultiva."),
    ("O atendimento é só para Americana?", "Não. A ATTIVO atende clientes em todo o Brasil, com atendimento digital e suporte especializado."),
    ("Posso tirar dúvidas antes de contratar?", "Sim. Explicamos coberturas, franquias, limites e diferenças entre propostas para que você decida com segurança."),
]

PRODUCTS = [
    dict(slug='seguro-auto', name='Seguro Auto',
         title='Seguro Auto | Cotação com Comparação de Seguradoras | ATTIVO',
         desc='Cotação de seguro auto com a ATTIVO: comparamos seguradoras, explicamos coberturas e franquias com clareza e acompanhamos você no sinistro. Atendimento em todo o Brasil.',
         h1='Proteção veicular com análise consultiva.',
         lead='Seguro auto com comparação entre seguradoras e orientação clara para escolher coberturas, assistências e franquias de acordo com o seu perfil.',
         h2='Atendimento consultivo para contratar com mais segurança.',
         text='Seu carro precisa de uma solução adequada ao perfil de uso, à região e ao histórico. Por isso analisamos opções de mercado e apresentamos uma recomendação clara, equilibrando proteção e custo-benefício.',
         points=['Cobertura compreensiva, terceiros e assistência 24h', 'Franquia, perfil do condutor e custo-benefício', 'Apoio em renovações, troca de veículo e sinistros'],
         covers=['Casco e terceiros', 'Assistência 24h', 'Carro reserva', 'Vidros e adicionais']),
    dict(slug='seguro-residencial', name='Seguro Residencial',
         title='Seguro Residencial para Casa e Apartamento | ATTIVO',
         desc='Cotação de seguro residencial com atendimento consultivo da ATTIVO. Proteção para casa e apartamento com coberturas de incêndio, danos elétricos, roubo, assistência e mais.',
         h1='Proteção para casa ou apartamento.',
         lead='Análise consultiva para proteger o imóvel, os bens e a rotina da família com coberturas adequadas ao seu dia a dia.',
         h2='Seguro residencial vai além da cobertura básica.',
         text='A escolha certa considera o tipo do imóvel, as assistências que você realmente vai usar e o nível de proteção necessário para reduzir o impacto de um imprevisto no seu cotidiano.',
         points=['Incêndio, danos elétricos e vendaval', 'Assistência residencial e proteção para bens', 'Soluções para casa, apartamento e imóvel alugado'],
         covers=['Incêndio e danos elétricos', 'Assistência residencial', 'Roubo e furto', 'Vidros e extras']),
    dict(slug='seguro-empresarial', name='Seguro Empresarial',
         title='Seguro Empresarial para Negócios e Empresas | ATTIVO',
         desc='Seguro empresarial com atendimento consultivo da ATTIVO. Proteção para estrutura, equipamentos, responsabilidade civil e continuidade da operação de negócios de todos os portes.',
         h1='Proteção para a operação do seu negócio.',
         lead='Analisamos riscos, estrutura e rotina da empresa para indicar o seguro empresarial mais adequado.',
         h2='O seguro precisa refletir a realidade da empresa.',
         text='Nosso trabalho é entender a operação, avaliar os riscos e recomendar as coberturas que de fato protegem patrimônio, continuidade e responsabilidades do negócio.',
         points=['Proteção patrimonial e para equipamentos', 'Lucros cessantes e responsabilidade civil', 'Soluções para comércio, escritórios e indústria'],
         covers=['Patrimônio e equipamentos', 'Lucros cessantes', 'Responsabilidade civil', 'Assistência empresarial']),
    dict(slug='seguro-de-vida', name='Seguro de Vida',
         title='Seguro de Vida para Você, sua Família e Sócios | ATTIVO',
         desc='Cotação de seguro de vida com a ATTIVO. Análise personalizada para pessoas, famílias e sócios de empresas, com coberturas de morte, invalidez e doenças graves.',
         h1='Planejamento e proteção para quem importa.',
         lead='Seguro de vida pensado a partir do seu momento, da sua renda, dos seus dependentes e dos seus objetivos de proteção.',
         h2='Uma recomendação clara e personalizada.',
         text='Contratar seguro de vida exige olhar para a realidade financeira, as responsabilidades com a família e os planos de longo prazo. É isso que avaliamos antes de indicar qualquer proposta.',
         points=['Morte, invalidez e doenças graves', 'Planejamento para família, sócios e executivos', 'Capitais e assistências explicados com clareza'],
         covers=['Morte e invalidez', 'Doenças graves', 'Diárias por incapacidade', 'Seguro para sócios']),
]

LOCAL = [
    dict(slug='corretora-de-seguros-americana', name='Corretora de seguros em Americana SP', rel='/seguros/',
         title='Corretora de Seguros em Americana SP | ATTIVO',
         desc='ATTIVO, corretora de seguros em Americana/SP. Atendimento consultivo para auto, residencial, empresarial, vida e mais, com comparação entre seguradoras e atendimento em todo o Brasil.',
         h1='Corretora de seguros em Americana/SP.',
         lead='Se você procura uma corretora de seguros em Americana, a ATTIVO oferece atendimento consultivo, análise de perfil e comparação entre seguradoras para indicar a solução mais adequada.'),
    dict(slug='seguro-auto-americana', name='Seguro Auto em Americana SP', rel='/seguro-auto/',
         title='Seguro Auto em Americana SP | ATTIVO Corretora',
         desc='Cotação de seguro auto em Americana/SP com comparação entre seguradoras e atendimento consultivo da ATTIVO.',
         h1='Seguro auto em Americana/SP.',
         lead='A ATTIVO ajuda motoristas de Americana a comparar opções de seguro auto com mais clareza, analisando coberturas, franquias e custo-benefício.'),
    dict(slug='seguro-empresarial-americana', name='Seguro Empresarial em Americana SP', rel='/seguro-empresarial/',
         title='Seguro Empresarial em Americana SP | ATTIVO Corretora',
         desc='Seguro empresarial em Americana/SP com atendimento consultivo e análise de riscos para empresas de todos os portes.',
         h1='Seguro empresarial em Americana/SP.',
         lead='Para empresas de Americana e região, a ATTIVO oferece consultoria em seguro empresarial com foco em proteção patrimonial e continuidade da operação.'),
    dict(slug='seguro-residencial-americana', name='Seguro Residencial em Americana SP', rel='/seguro-residencial/',
         title='Seguro Residencial em Americana SP | ATTIVO Corretora',
         desc='Seguro residencial em Americana/SP com atendimento consultivo e comparação entre seguradoras para casa e apartamento.',
         h1='Seguro residencial em Americana/SP.',
         lead='A ATTIVO atende moradores de Americana que buscam seguro residencial com análise personalizada para casa ou apartamento.'),
]

for p in PRODUCTS:
    path = '/%s/' % p['slug']
    main = '\n'.join([
        hero([('Início', '/'), ('Seguros', '/seguros/'), (p['name'], None)], p['h1'], p['lead'], 'Olá! Vim pelo site da ATTIVO e quero cotar %s.' % p['name']),
        intro(p['name'], p['h2'], p['text'], p['points'], 'Coberturas mais procuradas', p['covers']),
        STEPS,
        faq('Dúvidas comuns sobre %s.' % p['name'].lower().replace('seguro', 'seguro', 1), COMMON_FAQ),
        cta('Quer analisar seu %s com mais clareza?' % p['name'].lower(), 'Fale com um especialista e receba uma orientação objetiva sobre coberturas e contratação.'),
        related(path),
    ])
    ld = [crumbs([('Início', '/'), ('Seguros', '/seguros/'), (p['name'], path)]), faq_ld(COMMON_FAQ),
          {"@type": "Service", "name": p['name'], "serviceType": p['name'], "description": p['desc'], "url": SITE + path,
           "provider": {"@id": SITE + "/#organization"}, "areaServed": {"@type": "Country", "name": "Brasil"}}]
    write(path, page(path, p['title'], p['desc'], mark_header(H, '/seguros/'), main, F, ld))

LOCAL_FAQ = [
    ("A ATTIVO tem atendimento em Americana?", "Sim. A base da corretora fica em Americana/SP e atendemos clientes da cidade e da região de Campinas, além de todo o Brasil pelo atendimento digital."),
    ("Como peço uma cotação?", "Pelo WhatsApp (19) 99424-1018, pelo e-mail contato@attivocorretora.com.br ou pelo formulário de contato. Retornamos de segunda a sexta, das 08:00 às 17:00."),
    ("Vocês comparam várias seguradoras?", "Sim. Somos uma corretora independente e analisamos diferentes seguradoras para indicar a cobertura com melhor aderência ao seu caso."),
]

for p in LOCAL:
    path = '/%s/' % p['slug']
    main = '\n'.join([
        hero([('Início', '/'), (p['name'], None)], p['h1'], p['lead'], 'Olá! Sou de Americana e vim pelo site da ATTIVO. Gostaria de uma cotação.'),
        intro('Americana/SP', 'Atendimento especializado em Americana.',
              'Com base em Americana/SP, a ATTIVO atende clientes da cidade e da região e também realiza atendimento em todo o Brasil. O diferencial está na consultoria independente, na comparação de mercado e na recomendação clara.',
              ['Entendimento do seu perfil antes de qualquer proposta', 'Comparação entre seguradoras para indicar a melhor cobertura', 'Apoio na contratação, na renovação e no sinistro']),
        STEPS,
        faq('Dúvidas de quem é de Americana.', LOCAL_FAQ),
        cta('Quer falar sobre a sua necessidade?', 'Entre em contato com a ATTIVO e receba orientação especializada para contratar com mais segurança.'),
        related(p['rel']),
    ])
    ld = [crumbs([('Início', '/'), (p['name'], path)]), faq_ld(LOCAL_FAQ)]
    write(path, page(path, p['title'], p['desc'], mark_header(H, None), main, F, ld))

# ─── /afiliados/ desativado: redireciona para a home ─────────────────────────
os.makedirs(os.path.join(OUT, 'afiliados'), exist_ok=True)
with open(os.path.join(OUT, 'afiliados', 'index.html'), 'w', encoding='utf-8') as f:
    f.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>ATTIVO Corretora de Seguros</title>'
            '<meta name="robots" content="noindex,follow"><link rel="canonical" href="https://attivocorretora.com.br/">'
            '<meta http-equiv="refresh" content="0; url=/"><script>location.replace("/")</script></head>'
            '<body><p><a href="/">Ir para a página inicial da ATTIVO</a></p></body></html>\n')

# ─── 404 ─────────────────────────────────────────────────────────────────────
nf_main = f'''<section style="background: #0B1F3A; color: #FFFFFF">
<div style="max-width: 1200px; margin: 0 auto; padding: 120px 24px; display: flex; flex-direction: column; gap: 22px; align-items: flex-start">
<div style="font-family: Sora, sans-serif; font-weight: 700; font-size: 18px; color: #F2A33A">Erro 404</div>
<h1 style="margin: 0; font-family: Sora, sans-serif; font-weight: 700; font-size: clamp(34px, 4.4vw, 54px); line-height: 1.08; letter-spacing: -0.025em">Essa página não existe mais.</h1>
<p style="margin: 0; font-size: 18px; line-height: 1.6; color: #C9D3E0; max-width: 620px">Mas a gente continua aqui. Volte para o início ou fale direto com um especialista.</p>
<div style="display: flex; flex-wrap: wrap; gap: 14px">
<a href="/" style="display: inline-flex; align-items: center; height: 54px; padding: 0 26px; border-radius: 999px; background: #F2A33A; color: #0B1F3A; font-weight: 700; font-size: 16px; text-decoration: none">Ir para o início</a>
<a href="{WA_DEFAULT}" style="display: inline-flex; align-items: center; height: 54px; padding: 0 26px; border-radius: 999px; border: 1.5px solid #FFFFFF; color: #FFFFFF; font-weight: 700; font-size: 16px; text-decoration: none; box-sizing: border-box">Falar no WhatsApp</a>
</div>
</div>
</section>'''
with open(os.path.join(OUT, '404.html'), 'w', encoding='utf-8') as f:
    f.write(page('/404.html', 'Página não encontrada | ATTIVO Corretora de Seguros', 'Página não encontrada.', mark_header(H, None), nf_main, F, robots='noindex,follow'))

# ─── sitemap e robots ────────────────────────────────────────────────────────
urls = [('/', '1.0', 'weekly'), ('/seguros/', '0.9', 'monthly'), ('/sobre/', '0.7', 'monthly'), ('/contato/', '0.8', 'monthly')]
urls += [('/%s/' % p['slug'], '0.9', 'monthly') for p in PRODUCTS]
urls += [('/%s/' % p['slug'], '0.8', 'monthly') for p in LOCAL]
sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for u, pr, cf in urls:
    sm.append(f'  <url><loc>{SITE}{u}</loc><lastmod>{LASTMOD}</lastmod><changefreq>{cf}</changefreq><priority>{pr}</priority></url>')
sm.append('</urlset>')
with open(os.path.join(OUT, 'sitemap.xml'), 'w') as f:
    f.write('\n'.join(sm) + '\n')
with open(os.path.join(OUT, 'robots.txt'), 'w') as f:
    f.write('User-agent: *\nAllow: /\nDisallow: /afiliados/\n\nSitemap: %s/sitemap.xml\n' % SITE)
with open(os.path.join(OUT, 'site.webmanifest'), 'w') as f:
    json.dump({"name": "ATTIVO Corretora de Seguros", "short_name": "ATTIVO", "start_url": "/", "display": "browser",
               "background_color": "#0B1F3A", "theme_color": "#0B1F3A",
               "icons": [{"src": "/favicon-192.png", "sizes": "192x192", "type": "image/png"},
                         {"src": "/favicon-512.png", "sizes": "512x512", "type": "image/png"}]}, f, ensure_ascii=False)

print('ok', len(urls), 'urls')
