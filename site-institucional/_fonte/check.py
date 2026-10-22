import os, re, sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
SITE = os.path.abspath(sys.argv[1]); OUTD = sys.argv[2]; os.makedirs(OUTD, exist_ok=True)
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=SITE)
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8765), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
pages = ['/', '/seguros/', '/sobre/', '/contato/', '/seguro-auto/', '/corretora-de-seguros-americana/', '/404.html']
bad = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h, tag in [(1440, 900, 'desk'), (390, 844, 'mob')]:
        pg = b.new_page(viewport={'width': w, 'height': h})
        errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        for u in pages:
            pg.goto('http://127.0.0.1:8765' + u); pg.wait_for_load_state('networkidle')
            sw = pg.evaluate('document.documentElement.scrollWidth')
            if sw > w: bad.append(f'{tag} {u} horizontal scroll {sw}')
            name = (u.strip('/') or 'home').replace('/', '_')
            pg.screenshot(path=f'{OUTD}/{tag}-{name}.png', full_page=(tag=='desk' and u in ['/', '/contato/']) or (tag=='mob' and u=='/'))
        print(tag, 'console errors:', [e for e in errs if 'fonts' not in e and 'googletagmanager' not in e][:5])
    b.close()
# internal links
for root, _, fs in os.walk(SITE):
    for f in fs:
        if not f.endswith('.html'): continue
        s = open(os.path.join(root, f)).read()
        for href in re.findall(r'href="(/[^"#?]*)', s):
            t = os.path.join(SITE, href.lstrip('/'))
            if not (os.path.isfile(t) or os.path.isfile(os.path.join(t, 'index.html'))):
                bad.append(f'broken {href} in {root}/{f}')
        for bad_w in ['.dc.html', 'afiliad', 'nº do registro', '—']:
            if bad_w in s and not f.endswith('afiliados/index.html') and 'afiliados' not in root:
                bad.append(f'"{bad_w}" in {root}/{f}')
print('\n'.join(sorted(set(bad))) or 'no issues')
srv.shutdown()
