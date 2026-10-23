#!/usr/bin/env python3
"""Gera o site estático da ATTIVO (versão 2)."""
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from content import *  # noqa
from icons import icon, WHATSAPP

SCR = os.path.join(HERE, '..')
OUT = os.path.join(SCR, 'site2')
SITE = 'https://attivocorretora.com.br'
V = '3'
import re as _re
def _dims(f):
    vb = _re.search(r'viewBox="([^"]+)"', open(os.path.join(HERE, 'static', 'assets', f)).read()).group(1).split()
    return float(vb[2]), float(vb[3])
LW, LH = _dims('logo.svg')
NW, NH = _dims('logo-negativo.svg')
LASTMOD = '2026-10-23'
WA_MSG = 'Olá! Vim pelo site da ATTIVO e gostaria de falar com um especialista.'


def esc(s):
    return s.replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')


from PIL import Image as _Img
_W = {}
def _w(f):
    if f not in _W:
        _W[f] = _Img.open(os.path.join(SCR, 'img-out', f)).size[0]
    return _W[f]


def pic(name, alt, sizes='100vw', eager=False, cls=''):
    """<picture> com WebP e JPG em dois tamanhos."""
    if not name:
        return ''
    a, b2 = _w(name + '-800.jpg'), _w(name + '.jpg')
    load = 'eager" fetchpriority="high' if eager else 'lazy'
    c = f' class="{cls}"' if cls else ''
    return (f'<picture{c}><source type="image/webp" srcset="/assets/img/{name}-800.webp {a}w, /assets/img/{name}.webp {b2}w" sizes="{sizes}">'
            f'<img src="/assets/img/{name}.jpg" srcset="/assets/img/{name}-800.jpg {a}w, /assets/img/{name}.jpg {b2}w" sizes="{sizes}" '
            f'alt="{esc(alt)}" loading="{load}" decoding="async"></picture>')


def wa_btn(text='Cotar pelo WhatsApp', msg=WA_MSG, cls='btn btn-wa'):
    return f'<a class="{cls}" href="https://wa.me/5519994241018" data-wa="{esc(msg)}">{WHATSAPP}{text}</a>'


ORG = {
    "@type": "InsuranceAgency", "@id": SITE + "/#organization", "name": "ATTIVO Corretora de Seguros",
    "legalName": LEGAL, "taxID": CNPJ, "url": SITE + "/", "telephone": "+55-19-99424-1018", "email": EMAIL,
    "image": SITE + "/assets/og-image.jpg",
    "logo": {"@type": "ImageObject", "url": SITE + "/assets/logo-full.png", "width": 800, "height": 300},
    "address": {"@type": "PostalAddress", "addressLocality": "Americana", "addressRegion": "SP", "postalCode": "13460-000", "addressCountry": "BR"},
    "geo": {"@type": "GeoCoordinates", "latitude": -22.7369, "longitude": -47.3328},
    "openingHoursSpecification": [{"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "08:00", "closes": "17:00"}],
    "areaServed": {"@type": "Country", "name": "Brasil"},
    "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Seguros", "itemListElement": [
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": p['name'], "url": f"{SITE}/{p['slug']}/"}} for p in PRODUCTS]},
}


def crumbs_ld(items):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + u} for i, (n, u) in enumerate(items)]}


def faq_ld(qas):
    return {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in qas]}


def head(path, title, desc, ld=None, robots='index,follow,max-image-preview:large', og='/assets/og-image.jpg', preload=None):
    graph = [ORG, {"@type": "WebSite", "@id": SITE + "/#website", "url": SITE + "/", "name": "ATTIVO Corretora de Seguros", "inLanguage": "pt-BR", "publisher": {"@id": SITE + "/#organization"}}]
    graph += ld or []
    pre = f'<link rel="preload" as="image" type="image/webp" href="/assets/img/{preload}-800.webp" media="(max-width:800px)"><link rel="preload" as="image" type="image/webp" href="/assets/img/{preload}.webp" media="(min-width:801px)">' if preload else ''
    t, d = esc(title), esc(desc)
    return f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t}</title>
<meta name="description" content="{d}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{SITE}{path}">
<meta name="theme-color" content="#0A2540">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="ATTIVO Corretora de Seguros">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="{SITE}{path}">
<meta property="og:image" content="{SITE}{og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="google-site-verification" content="5Uj3UcNRbl9lY_f5gJt5685E5yvCQhcyARqfM2nqrVg">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&amp;family=Figtree:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/attivo.css?v={V}">
{pre}
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ZNM2R7XQVC"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}}gtag('js',new Date());gtag('config','G-ZNM2R7XQVC');</script>
<script type="application/ld+json">{json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)}</script>
</head>
<body>
<a class="sr" href="#conteudo">Pular para o conteúdo</a>
'''


def header(active):
    pes = [p for p in PRODUCTS if p['group'] == 'pessoa']
    emp = [p for p in PRODUCTS if p['group'] == 'empresa']
    mega = ''.join(f'<a href="/{p["slug"]}/"><span class="ic">{icon(p["icon"])}</span><span><strong>{p["name"]}</strong><span>{p["short"]}</span></span></a>'
                   for p in PRODUCTS[:8])
    cur = lambda k: ' aria-current="page"' if active == k else ''
    seg_cur = ' current' if active == 'seguros' else ''
    mm_items = lambda lst: ''.join(f'<a href="/{p["slug"]}/"><span class="ic">{icon(p["icon"])}</span>{p["name"]}</a>' for p in lst)
    return f'''<div class="topbar"><div class="wrap">
<span class="hide-sm">Corretora independente em Americana/SP, atendendo todo o Brasil</span>
<span class="topbar-links"><a href="tel:{PHONE_TEL}">{icon('phone')}{PHONE}</a><a class="hide-sm" href="mailto:{EMAIL}">{icon('mail')}{EMAIL}</a></span>
</div></div>
<header class="header"><div class="wrap">
<a class="brand" href="/" aria-label="ATTIVO Corretora de Seguros, página inicial"><img src="/assets/logo.svg" alt="ATTIVO Corretora de Seguros" width="{round(40*LW/LH)}" height="40"></a>
<nav class="nav" aria-label="Principal">
<a href="/"{cur('home')}>Início</a>
<div class="drop" data-open="false"><button type="button" class="{seg_cur.strip()}" aria-expanded="false" aria-haspopup="true">Seguros{icon('chev')}</button>
<div class="mega" role="menu">{mega}<a class="all" href="/seguros/">Ver todos os seguros{icon('arrow', 18)}</a></div></div>
<a href="/seguros/#empresas">Para empresas</a>
<a href="/sobre/"{cur('sobre')}>Sobre</a>
<a href="/contato/"{cur('contato')}>Contato</a>
</nav>
<div class="header-cta">
<a class="btn btn-ghost" href="tel:{PHONE_TEL}">{icon('phone')}{PHONE}</a>
<a class="btn btn-primary" href="/contato/">Fazer cotação</a>
<button class="menu-btn" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="menu-mobile">{icon('menu')}</button>
</div>
</div></header>
<div class="mobile-menu" id="menu-mobile" data-open="false" role="dialog" aria-modal="true" aria-label="Menu">
<div class="mm-head"><img src="/assets/logo.svg" alt="ATTIVO" width="{round(34*LW/LH)}" height="34" style="height:34px;width:auto"><button class="menu-btn mm-close" type="button" aria-label="Fechar menu">{icon('x')}</button></div>
<nav aria-label="Menu mobile">
<a href="/">Início</a><a href="/sobre/">Sobre a ATTIVO</a><a href="/contato/">Contato</a>
<div class="group">Para você</div>{mm_items(pes)}
<div class="group">Para sua empresa</div>{mm_items(emp)}
</nav>
<div class="mm-cta">{wa_btn()}<a class="btn btn-ghost" href="tel:{PHONE_TEL}">{icon('phone')}Ligar {PHONE}</a></div>
</div>
<main id="conteudo">
'''


def footer():
    pes = [p for p in PRODUCTS if p['group'] == 'pessoa'][:6]
    emp = [p for p in PRODUCTS if p['group'] == 'empresa']
    li = lambda lst: ''.join(f'<li><a href="/{p["slug"]}/">{p["name"]}</a></li>' for p in lst)
    return f'''</main>
<footer class="footer"><div class="wrap">
<div class="footer-top">
<div><a class="brand" href="/" aria-label="ATTIVO, página inicial"><img src="/assets/logo-negativo.svg" alt="ATTIVO Corretora de Seguros" width="{round(56*NW/NH)}" height="56"></a>
<p>Corretora de seguros independente. Comparamos as principais seguradoras e cuidamos de você do orçamento ao sinistro.</p>
<span class="susep">{icon('badge')}Corretora registrada na SUSEP nº {SUSEP}</span></div>
<div><h4>Para você</h4><ul>{li(pes)}</ul></div>
<div><h4>Para sua empresa</h4><ul>{li(emp)}<li><a href="/plano-de-saude/">Saúde empresarial</a></li></ul></div>
<div><h4>Fale com a gente</h4><ul>
<li><a href="https://wa.me/5519994241018" data-wa="{esc(WA_MSG)}">WhatsApp {PHONE}</a></li>
<li><a href="tel:{PHONE_TEL}">Telefone {PHONE}</a></li>
<li><a href="mailto:{EMAIL}">{EMAIL}</a></li>
<li>{HOURS}</li>
<li>Americana/SP, atendimento em todo o Brasil</li>
<li><a href="/sobre/">Sobre a ATTIVO</a></li>
</ul></div>
</div>
<div class="footer-bottom">
<span>© 2026 ATTIVO Corretora de Seguros. {LEGAL}. CNPJ {CNPJ}. SUSEP {SUSEP}.</span>
<span>A aceitação do seguro e as condições estão sujeitas às regras de cada seguradora.</span>
</div>
</div></footer>
<a class="wa-float" href="https://wa.me/5519994241018" data-wa="{esc(WA_MSG)}" aria-label="Falar com a ATTIVO no WhatsApp">{WHATSAPP}<span>WhatsApp</span></a>
<script src="/assets/attivo.js?v={V}" defer></script>
</body>
</html>
'''


def faq_block(title, qas, sub=None):
    items = ''.join(f'<details><summary>{q}<span class="pm">{icon("add")}</span></summary><p>{a}</p></details>' for q, a in qas)
    s = f'<p class="lead">{sub}</p>' if sub else ''
    return f'''<section class="section"><div class="wrap faq-wrap">
<div><span class="kicker">Perguntas frequentes</span><h2>{title}</h2>{s}<p style="margin-top:24px"><a class="link-arrow" href="/contato/">Ainda com dúvida? Fale com a gente{icon('arrow')}</a></p></div>
<div class="faq">{items}</div>
</div></section>'''


def quote_form(tipo=None, dark=True, compact=True, fid='q'):
    opts = ''.join(f'<option{" selected" if tipo == p["name"] else ""}>{p["name"]}</option>' for p in PRODUCTS) + '<option>Outro</option>'
    extra = '' if compact else f'''<div class="row"><div class="field"><label for="{fid}-email">E-mail</label><input id="{fid}-email" name="email" type="email" autocomplete="email" placeholder="voce@email.com"></div>
<div class="field"><label for="{fid}-cidade">Cidade</label><input id="{fid}-cidade" name="cidade" autocomplete="address-level2" placeholder="Ex.: Americana/SP"></div></div>
<div class="field"><label for="{fid}-horario">Melhor horário para falar</label><select id="{fid}-horario" name="horario"><option value="">Qualquer horário</option><option>Manhã</option><option>Tarde</option><option>Fim do dia</option></select></div>
<div class="field"><label for="{fid}-msg">Conte um pouco do que precisa</label><textarea id="{fid}-msg" name="mensagem" placeholder="Ex.: quero cotar o seguro do meu carro, um Onix 2022."></textarea></div>'''
    return f'''<form class="qform{' on-dark' if dark else ''}" data-quote novalidate>
<div class="row"><div class="field"><label for="{fid}-nome">Nome</label><input id="{fid}-nome" name="nome" autocomplete="name" required placeholder="Seu nome"></div>
<div class="field"><label for="{fid}-tel">WhatsApp</label><input id="{fid}-tel" name="telefone" type="tel" autocomplete="tel" required placeholder="(19) 90000-0000"></div></div>
<div class="field"><label for="{fid}-tipo">Qual seguro?</label><select id="{fid}-tipo" name="tipo"><option value="">Escolha uma opção</option>{opts}</select></div>
{extra}
<label class="consent"><input type="checkbox" name="lgpd" required><span>Autorizo a ATTIVO a usar estes dados para responder minha solicitação, conforme a LGPD.</span></label>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:16px"><button class="btn btn-wa" type="submit">{WHATSAPP}Receber cotação no WhatsApp</button></div>
<p class="form-status" role="status" aria-live="polite"></p>
</form>'''


def cta_final(tipo=None, title='Vamos encontrar o seguro certo para você?', text='Conte o que precisa proteger. Respondemos pelo WhatsApp com as opções comparadas e explicadas, sem compromisso.'):
    return f'''<section class="section tight"><div class="wrap"><div class="cta-final">
<div class="body"><h2>{title}</h2><p class="lead">{text}</p>{quote_form(tipo, fid='cta')}</div>
<div class="media">{pic('atendimento-telefone', 'Cliente sorrindo ao telefone com a corretora', '(max-width:1040px) 100vw, 50vw')}</div>
</div></div></section>'''


def page(path, title, desc, active, body, ld=None, robots=None, preload=None):
    kw = {}
    if robots:
        kw['robots'] = robots
    return head(path, title, desc, ld, preload=preload, **kw) + header(active) + body + footer()


def write(path, html):
    d = os.path.join(OUT, path.strip('/'))
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)


STEPS = f'''<div class="steps">
<div class="step"><h3>Você conta o que precisa</h3><p>Pelo WhatsApp, telefone ou formulário. Algumas perguntas rápidas sobre o seu perfil e o que quer proteger.</p></div>
<div class="step"><h3>A gente compara para você</h3><p>Cotamos nas seguradoras que fazem sentido para o seu caso e organizamos as opções lado a lado.</p></div>
<div class="step"><h3>Você escolhe com segurança</h3><p>Explicamos coberturas, franquias e diferenças. Depois cuidamos da emissão, das renovações e do sinistro.</p></div>
</div>'''


def review_cards():
    stars = ''.join(icon('star') for _ in range(5))
    return '<div class="reviews">' + ''.join(
        f'<figure class="review"><div class="stars" aria-label="5 de 5 estrelas">{stars}</div><blockquote>“{t}”</blockquote>'
        f'<figcaption><span class="avatar">{ini}</span><span><strong>{n}</strong><span>{r}</span></span></figcaption></figure>'
        for n, r, ini, t in REVIEWS) + '</div>'


# ─── HOME ────────────────────────────────────────────────────────────────────
def home():
    picks = [('car', 'Carro', '/seguro-auto/'), ('home', 'Casa', '/seguro-residencial/'), ('heart', 'Vida', '/seguro-de-vida/'),
             ('plus', 'Saúde', '/plano-de-saude/'), ('building', 'Empresa', '/seguro-empresarial/'), ('plane', 'Viagem', '/seguro-viagem/'),
             ('truck', 'Frota', '/seguro-frota/'), ('dots', 'Outros', '/seguros/')]
    pick_html = ''.join(f'<a class="pick" href="{u}">{icon(i)}{n}</a>' for i, n, u in picks)
    tiles = [('t-a', 'casa-moderna', 'Seguro Residencial', 'Casa ou apartamento, com assistência 24h para o dia a dia.'),
             ('t-b', 'seguro-auto', 'Seguro Auto', 'Comparação real entre seguradoras e ajuda no sinistro.'),
             ('t-c', 'seguro-vida', 'Seguro de Vida', 'Proteção financeira para quem depende de você.'),
             ('t-d', 'seguro-saude', 'Plano de Saúde', 'A rede que você usa, pelo melhor custo.'),
             ('t-e', 'seguro-viagem', 'Seguro Viagem', 'Assistência no Brasil e no exterior.')]
    slug_of = {'casa-moderna': 'seguro-residencial', 'seguro-auto': 'seguro-auto', 'seguro-vida': 'seguro-de-vida', 'seguro-saude': 'plano-de-saude', 'seguro-viagem': 'seguro-viagem'}
    tiles_html = ''.join(
        f'<a class="tile {c}{" pos-low" if img == "seguro-saude" else ""}" href="/{slug_of[img]}/">{pic(img, n, "(max-width:640px) 100vw, (max-width:1040px) 50vw, 40vw")}<span class="go">{icon("arrow")}</span>'
        f'<div class="tile-body"><h3>{n}</h3><p>{t}</p></div></a>' for c, img, n, t in tiles)
    tiles_html += f'<a class="tile t-f plain" href="/seguros/"><span class="go">{icon("arrow")}</span><div class="tile-body"><h3>E muito mais</h3><p>Odontológico, equipamentos, fiança locatícia, condomínio e outras proteções.</p></div></a>'
    emp = [p for p in PRODUCTS if p['group'] == 'empresa'] + [BY_SLUG['plano-de-saude']]
    biz_items = ''.join(f'<a class="biz-item" href="/{p["slug"]}/"><span class="ic">{icon(p["icon"])}</span><span><strong>{"Saúde e odonto para equipes" if p["slug"] == "plano-de-saude" else p["name"]}</strong><span>{p["short"]}</span></span></a>' for p in emp)
    body = f'''
<section class="hero"><div class="wrap hero-grid">
<div class="hero-copy">
<h1>Seguro bem escolhido, explicado por quem entende.</h1>
<p class="lead">A ATTIVO é uma corretora independente de Americana. Comparamos as principais seguradoras do país para você, sua família e sua empresa, e seguimos ao seu lado depois da contratação.</p>
<div class="hero-actions">{wa_btn('Cotar pelo WhatsApp')}<a class="btn btn-ghost" href="/seguros/">Conhecer os seguros</a></div>
<div class="hero-proof"><span class="stars" aria-hidden="true">{''.join(icon('star') for _ in range(5))}</span><span><strong>Clientes satisfeitos</strong> em Americana, Campinas e região</span></div>
</div>
<div class="hero-media">{pic('hero-familia', 'Família sorrindo na sala de casa', '(max-width:1040px) 100vw, 50vw', eager=True)}
<div class="hero-badge"><span class="ic">{icon('shield')}</span><span><strong>Do orçamento ao sinistro</strong><span>Uma pessoa que conhece o seu caso</span></span></div></div>
</div></section>

<section class="picker" aria-labelledby="picker-t"><div class="wrap"><div class="picker-box">
<div class="picker-head"><h2 id="picker-t">O que você quer proteger?</h2><p>Escolha e veja como funciona, ou fale direto com a gente.</p></div>
<div class="picker-grid">{pick_html}</div>
</div></div></section>

<section class="facts"><div class="wrap facts-grid">
<div class="fact"><span class="ic">{icon('search')}</span><span><strong>Várias seguradoras, uma conversa</strong><span>Comparamos as principais do mercado para o seu perfil.</span></span></div>
<div class="fact"><span class="ic">{icon('handshake')}</span><span><strong>Independente de verdade</strong><span>Não vendemos uma marca. Recomendamos o que faz sentido para você.</span></span></div>
<div class="fact"><span class="ic">{icon('lifebuoy')}</span><span><strong>Junto no sinistro</strong><span>Orientamos e acompanhamos até a solução.</span></span></div>
<div class="fact"><span class="ic">{icon('badge')}</span><span><strong>Registrada na SUSEP</strong><span>Corretora habilitada, nº {SUSEP}.</span></span></div>
</div></section>

<section class="section"><div class="wrap">
<div class="section-head"><div class="txt"><span class="kicker">Para você e sua família</span><h2>Proteção para a casa, o carro e as pessoas que você ama.</h2></div>
<a class="link-arrow" href="/seguros/">Ver todos os seguros{icon('arrow')}</a></div>
<div class="mosaic">{tiles_html}</div>
</div></section>

<section class="section ink" id="empresas"><div class="wrap biz">
<div><span class="kicker" style="color:#8FB0FF">Para sua empresa</span><h2>Seu negócio protegido para não parar.</h2>
<p class="lead" style="margin-top:16px">Do pequeno comércio à indústria, analisamos a operação e montamos a proteção certa para patrimônio, frota, equipe e responsabilidades.</p>
<div class="biz-list">{biz_items}</div>
{wa_btn('Falar com um especialista', 'Olá! Vim pelo site da ATTIVO e quero cotar um seguro para a minha empresa.')}
</div>
<div class="biz-media">{pic('seguro-empresarial', 'Dona de pequeno negócio sorrindo no balcão da loja', '(max-width:1040px) 100vw, 50vw')}</div>
</div></section>

<section class="section"><div class="wrap">
<div class="section-head"><div class="txt"><span class="kicker">Como funciona</span><h2>Simples para você, trabalho para a gente.</h2></div></div>
{STEPS}
</div></section>

<section class="section mist"><div class="wrap care">
<div class="care-media"><div class="main">{pic('atendimento-corretor', 'Corretor da ATTIVO conversando com um casal de clientes', '(max-width:1040px) 100vw, 50vw')}</div>
<div class="quote"><p>“Quando precisei acionar o seguro, estavam lá para ajudar.”</p><span>Roberto C., cliente de seguro auto</span></div></div>
<div><span class="kicker">Atendimento ATTIVO</span><h2>A gente continua com você depois da assinatura.</h2>
<ul class="checks">
<li><span class="ic">{icon('check')}</span><span><strong>Uma pessoa que conhece o seu caso</strong><span>Nada de central 0800. Você fala com quem cuidou da sua contratação.</span></span></li>
<li><span class="ic">{icon('check')}</span><span><strong>Apoio no sinistro</strong><span>Orientamos sobre documentos e prazos e acompanhamos a seguradora até o fim.</span></span></li>
<li><span class="ic">{icon('check')}</span><span><strong>Renovação revisada todo ano</strong><span>Comparamos de novo antes de renovar, para você não pagar a mais.</span></span></li>
<li><span class="ic">{icon('check')}</span><span><strong>Ajustes quando a vida muda</strong><span>Carro novo, mudança de endereço, novo dependente: a gente atualiza.</span></span></li>
</ul>
<a class="btn btn-primary" href="/sobre/">Conhecer a ATTIVO</a></div>
</div></section>

<section class="section"><div class="wrap">
<div class="section-head"><div class="txt"><span class="kicker">Depoimentos</span><h2>Quem já é cliente recomenda.</h2></div></div>
{review_cards()}
</div></section>

{faq_block('Antes de falar com a gente.', HOME_FAQ)}
{cta_final()}
'''
    write('/', page('/', 'ATTIVO Corretora de Seguros | Seguro auto, vida, residencial, saúde e empresarial',
                    'Corretora de seguros independente em Americana/SP. Comparamos as principais seguradoras para você, sua família e sua empresa, com atendimento do orçamento ao sinistro.',
                    'home', body, [faq_ld(HOME_FAQ)], preload='hero-familia'))


# ─── SEGUROS ─────────────────────────────────────────────────────────────────
def card(p):
    media = f'<div class="img{" pos-low" if p["img"] == "seguro-saude" else ""}">{pic(p["img"], p["name"], "(max-width:640px) 100vw, (max-width:1040px) 50vw, 33vw")}</div>' if p['img'] else f'<div class="noimg">{icon(p["icon"])}</div>'
    chips = ''.join(f'<li>{c}</li>' for c in p['chips'][:3])
    return (f'<a class="card" href="/{p["slug"]}/">{media}<div class="body"><h3>{p["name"]}</h3><p>{p["short"]}</p>'
            f'<ul>{chips}</ul><span class="link-arrow">Saiba mais{icon("arrow")}</span></div></a>')


def seguros():
    pes = ''.join(card(p) for p in PRODUCTS if p['group'] == 'pessoa')
    emp = ''.join(card(p) for p in PRODUCTS if p['group'] == 'empresa')
    body = f'''
<section class="page-hero no-media"><div class="wrap"><div class="grid"><div>
<nav class="crumbs" aria-label="Você está em"><a href="/">Início</a><span aria-hidden="true">/</span><span>Seguros</span></nav>
<h1>Todos os seguros em um só lugar.</h1>
<p class="lead">Escolha o que você quer proteger. Em cada seguro, comparamos as seguradoras para o seu perfil e explicamos as diferenças antes de você decidir.</p>
<div class="hero-actions">{wa_btn()}<a class="btn btn-ghost" href="#empresas">Seguros para empresas</a></div>
</div></div></div></section>
<section class="section"><div class="wrap">
<div class="section-head"><div class="txt"><span class="kicker">Para você e sua família</span><h2>Proteção para o dia a dia.</h2></div></div>
<div class="catalog">{pes}</div></div></section>
<section class="section mist" id="empresas"><div class="wrap">
<div class="section-head"><div class="txt"><span class="kicker">Para sua empresa</span><h2>Proteção para o seu negócio.</h2><p class="lead">Também oferecemos planos de saúde e odontológicos para equipes, a partir de poucas vidas.</p></div></div>
<div class="catalog">{emp}</div></div></section>
{cta_final(title='Não achou o que procura?', text='Atendemos outras modalidades e montamos soluções sob medida. Conte o que você precisa.')}
'''
    write('/seguros/', page('/seguros/', 'Seguros para pessoas e empresas | ATTIVO Corretora',
                            'Seguro auto, residencial, vida, plano de saúde, viagem, odontológico, empresarial, frota, responsabilidade civil, fiança locatícia, condomínio e equipamentos.',
                            'seguros', body, [crumbs_ld([('Início', '/'), ('Seguros', '/seguros/')])]))


# ─── PÁGINA DE CADA SEGURO ───────────────────────────────────────────────────
def product(p):
    path = f'/{p["slug"]}/'
    media = (f'<div class="media{" pos-low" if p["img"] == "seguro-saude" else ""}">{pic(p["img"], p["name"], "(max-width:1040px) 100vw, 45vw", eager=True)}</div>' if p['img']
             else f'<div class="media" style="background:var(--cobalt);display:grid;place-items:center;color:#fff">{icon(p["icon"], 140)}</div>')
    covers = ''.join(f'<div class="cover"><span class="ic">{icon(i)}</span><h3>{t}</h3><p>{d}</p></div>' for i, t, d in p['covers'])
    analyze = ''.join(f'<li><span class="ic">{icon("check")}</span><span><strong>{a}</strong></span></li>' for a in p['analyze'])
    rel = [q for q in PRODUCTS if q['slug'] != p['slug'] and q['group'] == p['group']][:3]
    msg = f'Olá! Vim pelo site da ATTIVO e quero cotar {p["name"]}.'
    body = f'''
<section class="page-hero"><div class="wrap"><div class="grid"><div>
<nav class="crumbs" aria-label="Você está em"><a href="/">Início</a><span aria-hidden="true">/</span><a href="/seguros/">Seguros</a><span aria-hidden="true">/</span><span>{p["name"]}</span></nav>
<h1>{p["h1"]}</h1>
<p class="lead">{p["lead"]}</p>
<div class="hero-actions">{wa_btn(f'Cotar {p["name"]}', msg)}<a class="btn btn-ghost" href="#coberturas">Ver coberturas</a></div>
</div>{media}</div></div></section>
<section class="section" id="coberturas"><div class="wrap">
<div class="section-head"><div class="txt"><span class="kicker">{p["name"]}</span><h2>O que pode estar coberto.</h2><p class="lead">Cada seguradora tem regras próprias. Na cotação mostramos exatamente o que entra em cada proposta.</p></div></div>
<div class="covers">{covers}</div>
</div></section>
<section class="section mist"><div class="wrap split">
<div><span class="kicker">Como montamos a sua cotação</span><h2>O que analisamos antes de recomendar.</h2>
<p class="lead" style="margin-top:16px">Preço importa, mas não é tudo. Olhamos para o seu caso para que o seguro funcione quando você precisar.</p>
<div style="margin-top:28px">{wa_btn('Começar minha cotação', msg)}</div></div>
<div class="panel" style="background:#fff"><ul class="checks" style="margin:0">{analyze}</ul></div>
</div></section>
<section class="section"><div class="wrap"><div class="section-head"><div class="txt"><span class="kicker">Como funciona</span><h2>Três passos até a sua apólice.</h2></div></div>{STEPS}</div></section>
{faq_block(f'Dúvidas sobre {p["name"].lower()}.', p['faq'])}
{cta_final(p['name'], f'Vamos cotar o seu {p["name"].lower()}?' if p['name'].split()[0] in ('Seguro', 'Plano') else f'Vamos fazer a sua cotação de {p["name"].lower()}?')}
<section class="section mist tight"><div class="wrap"><div class="section-head"><div class="txt"><h2>Veja também</h2></div><a class="link-arrow" href="/seguros/">Todos os seguros{icon('arrow')}</a></div>
<div class="catalog">{''.join(card(q) for q in rel)}</div></div></section>
'''
    ld = [crumbs_ld([('Início', '/'), ('Seguros', '/seguros/'), (p['name'], path)]), faq_ld(p['faq']),
          {"@type": "Service", "name": p['name'], "serviceType": p['name'], "description": p['desc'], "url": SITE + path,
           "provider": {"@id": SITE + "/#organization"}, "areaServed": {"@type": "Country", "name": "Brasil"}}]
    write(path, page(path, p['title'], p['desc'], 'seguros', body, ld, preload=p['img']))


# ─── SOBRE ───────────────────────────────────────────────────────────────────
def sobre():
    vals = [('search', 'Transparência', 'Explicamos coberturas, franquias e exclusões com clareza, antes de você decidir.'),
            ('handshake', 'Independência', 'Não representamos uma seguradora. Comparamos várias e recomendamos a melhor para você.'),
            ('users', 'Atendimento próximo', 'Você fala com quem conhece o seu caso, do primeiro contato ao sinistro.'),
            ('refresh', 'Cuidado contínuo', 'Revisamos sua proteção a cada renovação e quando a sua vida muda.')]
    vals_html = ''.join(f'<div class="cover"><span class="ic">{icon(i)}</span><h3>{t}</h3><p>{d}</p></div>' for i, t, d in vals)
    body = f'''
<section class="page-hero"><div class="wrap"><div class="grid"><div>
<nav class="crumbs" aria-label="Você está em"><a href="/">Início</a><span aria-hidden="true">/</span><span>Sobre</span></nav>
<h1>Uma corretora de Americana que trata seguro como coisa séria.</h1>
<p class="lead">A ATTIVO nasceu para fazer diferente: entender cada cliente antes de oferecer qualquer produto, comparar as seguradoras de verdade e estar presente quando o seguro é necessário.</p>
<div class="hero-actions">{wa_btn('Falar com a ATTIVO')}<a class="btn btn-ghost" href="/seguros/">Ver seguros</a></div>
</div><div class="media">{pic('consultoria-casal', 'Casal sendo atendido pela corretora', '(max-width:1040px) 100vw, 45vw', eager=True)}</div></div></div></section>
<section class="section"><div class="wrap split">
<div><span class="kicker">Quem somos</span><h2>Independentes, para ficar do seu lado.</h2></div>
<div>
<p class="lead" style="max-width:none;margin-bottom:18px">Somos uma corretora de seguros com base em Americana/SP e atendimento em todo o Brasil. Trabalhamos com pessoas, famílias, profissionais liberais e empresas de todos os portes.</p>
<p class="muted" style="margin-bottom:18px">Como corretora independente, não vendemos uma marca. Cotamos nas seguradoras que fazem sentido para cada caso, colocamos as propostas lado a lado e explicamos as diferenças em linguagem simples. Depois da contratação, seguimos cuidando das renovações, dos ajustes e, principalmente, dos sinistros.</p>
<p class="muted">A ATTIVO é registrada na SUSEP sob o nº {SUSEP} e tem como corretor responsável {BROKER}, habilitado na SUSEP sob o nº {SUSEP_PF}.</p>
</div></div></section>
<section class="section mist"><div class="wrap">
<div class="section-head"><div class="txt"><span class="kicker">Nossos valores</span><h2>O que orienta cada recomendação.</h2></div></div>
<div class="covers" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">{vals_html}</div>
</div></section>
<section class="section"><div class="wrap care">
<div class="care-media"><div class="main">{pic('atendimento-corretor', 'Corretor da ATTIVO com clientes', '(max-width:1040px) 100vw, 50vw')}</div></div>
<div><span class="kicker">Nosso jeito de trabalhar</span><h2>Do orçamento ao sinistro, com a mesma pessoa.</h2>
<div style="margin-top:28px">{STEPS.replace('class="steps"', 'class="steps" style="grid-template-columns:1fr;gap:30px"')}</div></div>
</div></section>
<section class="section mist"><div class="wrap"><div class="section-head"><div class="txt"><span class="kicker">Depoimentos</span><h2>O que dizem nossos clientes.</h2></div></div>{review_cards()}</div></section>
{cta_final()}
'''
    write('/sobre/', page('/sobre/', 'Sobre a ATTIVO | Corretora de seguros independente em Americana/SP',
                          'Conheça a ATTIVO Corretora de Seguros: independente, com base em Americana/SP, registrada na SUSEP e com atendimento do orçamento ao sinistro.',
                          'sobre', body, [crumbs_ld([('Início', '/'), ('Sobre', '/sobre/')])], preload='consultoria-casal'))


# ─── CONTATO ─────────────────────────────────────────────────────────────────
def contato():
    qas = [('Quanto tempo leva para receber a cotação?', 'Na maioria dos casos respondemos no mesmo dia útil. Seguros empresariais e de vida mais complexos podem levar um pouco mais.'),
           ('Posso ser atendido fora de Americana?', 'Sim. Atendemos clientes de todo o Brasil pelo WhatsApp, telefone e e-mail.'),
           ('Preciso enviar documentos agora?', 'Não. Para começar basta conversar. Pedimos documentos só quando você decidir contratar.')]
    body = f'''
<section class="page-hero"><div class="wrap"><div class="grid"><div>
<nav class="crumbs" aria-label="Você está em"><a href="/">Início</a><span aria-hidden="true">/</span><span>Contato</span></nav>
<h1>Fale com a ATTIVO.</h1>
<p class="lead">Conte o que você quer proteger. Respondemos pelo canal que preferir, com as opções comparadas e explicadas.</p>
<div class="hero-actions">{wa_btn('Chamar no WhatsApp')}<a class="btn btn-ghost" href="tel:{PHONE_TEL}">{icon('phone')}Ligar agora</a></div>
</div><div class="media">{pic('atendimento-telefone', 'Atendente da ATTIVO sorrindo ao telefone', '(max-width:1040px) 100vw, 45vw', eager=True)}</div></div></div></section>
<section class="section tight"><div class="wrap contact-grid">
<div class="form-card"><h2 style="font-size:1.8rem;margin-bottom:8px">Pedir cotação</h2><p class="muted" style="margin-bottom:24px">Ao enviar, abrimos o WhatsApp com seus dados preenchidos. É só tocar em enviar.</p>{quote_form(dark=False, compact=False, fid='ct')}</div>
<div class="channels">
<a class="channel" href="https://wa.me/5519994241018" data-wa="{esc(WA_MSG)}"><span class="ic" style="color:var(--wa)">{WHATSAPP}</span><span><small>WhatsApp</small><strong>{PHONE}</strong></span></a>
<a class="channel" href="tel:{PHONE_TEL}"><span class="ic">{icon('phone')}</span><span><small>Telefone</small><strong>{PHONE}</strong></span></a>
<a class="channel" href="mailto:{EMAIL}"><span class="ic">{icon('mail')}</span><span><small>E-mail</small><strong>{EMAIL}</strong></span></a>
<div class="channel"><span class="ic">{icon('clock')}</span><span><small>Horário</small><strong>{HOURS}</strong></span></div>
<div class="channel"><span class="ic">{icon('pin')}</span><span><small>Base</small><strong>Americana/SP, atendimento em todo o Brasil</strong></span></div>
</div></div></section>
{faq_block('Dúvidas sobre o atendimento.', qas)}
'''
    write('/contato/', page('/contato/', 'Contato | Cotação de seguro com a ATTIVO em Americana/SP',
                            f'Peça sua cotação de seguro com a ATTIVO pelo WhatsApp {PHONE}, e-mail ou formulário. {HOURS}.',
                            'contato', body, [crumbs_ld([('Início', '/'), ('Contato', '/contato/')]), faq_ld(qas)]))


# ─── PÁGINAS LOCAIS ──────────────────────────────────────────────────────────
LOCAL_FAQ = [('A ATTIVO tem atendimento em Americana?', 'Sim. Nossa base é em Americana/SP e atendemos clientes da cidade, da região de Campinas e de todo o Brasil.'),
             ('Como peço uma cotação?', f'Pelo WhatsApp {PHONE}, pelo e-mail {EMAIL} ou pelo formulário do site. Respondemos de segunda a sexta, das 08:00 às 17:00.'),
             ('Vocês comparam várias seguradoras?', 'Sim. Somos uma corretora independente e cotamos nas seguradoras que fazem sentido para o seu caso.')]


def local(l):
    path = f'/{l["slug"]}/'
    foc = BY_SLUG.get(l['focus']) if l['focus'] else None
    if foc:
        covers = ''.join(f'<div class="cover"><span class="ic">{icon(i)}</span><h3>{t}</h3><p>{d}</p></div>' for i, t, d in foc['covers'][:6])
        mid = f'<section class="section"><div class="wrap"><div class="section-head"><div class="txt"><span class="kicker">{foc["name"]}</span><h2>O que pode estar coberto.</h2></div><a class="link-arrow" href="/{foc["slug"]}/">Saiba mais sobre {foc["name"]}{icon("arrow")}</a></div><div class="covers">{covers}</div></div></section>'
        tipo = foc['name']
        msg = f'Olá! Sou de Americana e quero cotar {foc["name"]}.'
    else:
        mid = f'<section class="section"><div class="wrap"><div class="section-head"><div class="txt"><span class="kicker">Seguros em Americana</span><h2>Tudo o que você precisa proteger.</h2></div></div><div class="catalog">{"".join(card(p) for p in PRODUCTS[:6])}</div></div></section>'
        tipo = None
        msg = 'Olá! Sou de Americana e gostaria de uma cotação.'
    body = f'''
<section class="page-hero"><div class="wrap"><div class="grid"><div>
<nav class="crumbs" aria-label="Você está em"><a href="/">Início</a><span aria-hidden="true">/</span><span>{l["name"]}</span></nav>
<h1>{l["h1"]}</h1>
<p class="lead">{l["lead"]}</p>
<div class="hero-actions">{wa_btn('Cotar pelo WhatsApp', msg)}<a class="btn btn-ghost" href="/contato/">Outros contatos</a></div>
</div><div class="media">{pic(l["img"], l["name"], "(max-width:1040px) 100vw, 45vw", eager=True)}</div></div></div></section>
<section class="facts"><div class="wrap facts-grid">
<div class="fact"><span class="ic">{icon('pin')}</span><span><strong>Base em Americana</strong><span>Atendimento de quem conhece a cidade e a região.</span></span></div>
<div class="fact"><span class="ic">{icon('search')}</span><span><strong>Várias seguradoras</strong><span>Comparação real para o seu perfil.</span></span></div>
<div class="fact"><span class="ic">{icon('lifebuoy')}</span><span><strong>Junto no sinistro</strong><span>Acompanhamos até a solução.</span></span></div>
<div class="fact"><span class="ic">{icon('badge')}</span><span><strong>SUSEP {SUSEP}</strong><span>Corretora registrada e habilitada.</span></span></div>
</div></section>
{mid}
{faq_block('Dúvidas de quem é de Americana.', LOCAL_FAQ)}
{cta_final(tipo)}
'''
    ld = [crumbs_ld([('Início', '/'), (l['name'], path)]), faq_ld(LOCAL_FAQ)]
    write(path, page(path, l['title'], l['desc'], None, body, ld, preload=l['img']))


def notfound():
    body = f'''<section class="page-hero no-media" style="padding:96px 0"><div class="wrap"><div class="grid"><div>
<h1>Essa página não existe mais.</h1><p class="lead">Mas a gente continua aqui. Escolha um seguro ou fale direto com um especialista.</p>
<div class="hero-actions"><a class="btn btn-primary" href="/">Ir para o início</a>{wa_btn()}</div></div></div></div></section>
<section class="section"><div class="wrap"><div class="catalog">{''.join(card(p) for p in PRODUCTS[:3])}</div></div></section>'''
    with open(os.path.join(OUT, '404.html'), 'w', encoding='utf-8') as f:
        f.write(page('/404.html', 'Página não encontrada | ATTIVO', 'Página não encontrada.', None, body, robots='noindex,follow'))


def extras():
    os.makedirs(os.path.join(OUT, 'afiliados'), exist_ok=True)
    with open(os.path.join(OUT, 'afiliados', 'index.html'), 'w', encoding='utf-8') as f:
        f.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>ATTIVO</title><meta name="robots" content="noindex,follow">'
                '<link rel="canonical" href="https://attivocorretora.com.br/"><meta http-equiv="refresh" content="0; url=/"><script>location.replace("/")</script>'
                '</head><body><a href="/">Ir para a página inicial da ATTIVO</a></body></html>\n')
    urls = [('/', '1.0'), ('/seguros/', '0.9'), ('/sobre/', '0.6'), ('/contato/', '0.7')]
    urls += [(f'/{p["slug"]}/', '0.9') for p in PRODUCTS] + [(f'/{l["slug"]}/', '0.8') for l in LOCAL]
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sm += [f'  <url><loc>{SITE}{u}</loc><lastmod>{LASTMOD}</lastmod><priority>{pr}</priority></url>' for u, pr in urls]
    sm.append('</urlset>')
    open(os.path.join(OUT, 'sitemap.xml'), 'w').write('\n'.join(sm) + '\n')
    open(os.path.join(OUT, 'robots.txt'), 'w').write(f'User-agent: *\nAllow: /\nDisallow: /afiliados/\n\nSitemap: {SITE}/sitemap.xml\n')
    json.dump({"name": "ATTIVO Corretora de Seguros", "short_name": "ATTIVO", "start_url": "/", "display": "browser",
               "background_color": "#FFFFFF", "theme_color": "#0A2540",
               "icons": [{"src": "/favicon-192.png", "sizes": "192x192", "type": "image/png"},
                         {"src": "/favicon-512.png", "sizes": "512x512", "type": "image/png"}]},
              open(os.path.join(OUT, 'site.webmanifest'), 'w'), ensure_ascii=False)
    return len(urls)


if __name__ == '__main__':
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    shutil.copytree(os.path.join(HERE, 'static'), OUT)
    shutil.copytree(os.path.join(SCR, 'img-out'), os.path.join(OUT, 'assets', 'img'))
    home(); seguros(); sobre(); contato()
    for p in PRODUCTS:
        product(p)
    for l in LOCAL:
        local(l)
    notfound()
    n = extras()
    print('ok', n, 'urls')
