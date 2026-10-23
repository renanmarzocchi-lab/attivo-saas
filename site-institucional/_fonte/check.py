import os, re, sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
SITE=os.path.abspath(sys.argv[1]); OUTD=sys.argv[2]; pages=sys.argv[3].split(','); os.makedirs(OUTD,exist_ok=True)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',8790),functools.partial(Q,directory=SITE)); threading.Thread(target=srv.serve_forever,daemon=True).start()
bad=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    for w,h,tag in [(1440,900,'desk'),(390,844,'mob')]:
        pg=b.new_page(viewport={'width':w,'height':h}); errs=[]
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.on('pageerror',lambda e: errs.append(str(e)))
        for u in pages:
            pg.goto('http://127.0.0.1:8790'+u); pg.wait_for_load_state('networkidle')
            pg.evaluate("async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,80));}window.scrollTo(0,0);}"); pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(600)
            sw=pg.evaluate('document.documentElement.scrollWidth')
            if sw>w: bad.append(f'{tag} {u} scroll {sw}')
            nm=(u.strip('/') or 'home').replace('/','_')
            pg.screenshot(path=f'{OUTD}/{tag}-{nm}.png',full_page=True)
        e=[x for x in errs if 'googletagmanager' not in x and 'fonts.g' not in x]
        if e: bad.append(f'{tag} errors {e[:4]}')
    b.close()
for root,_,fs in os.walk(SITE):
    for f in fs:
        if not f.endswith('.html'): continue
        s=open(os.path.join(root,f)).read()
        for href in re.findall(r'(?:href|src)="(/[^"#?]*)',s):
            t=os.path.join(SITE,href.lstrip('/'))
            if not(os.path.isfile(t) or os.path.isfile(os.path.join(t,'index.html'))): bad.append(f'broken {href} in {root[len(SITE):]}/{f}')
        for ss in re.findall(r'srcset="([^"]+)"',s):
            for part in ss.split(','):
                u=part.strip().split()[0]; t=os.path.join(SITE,u.lstrip('/'))
                if not os.path.isfile(t): bad.append(f'broken srcset {u}')
        if '—' in s: bad.append(f'travessao em {root[len(SITE):]}/{f}')
print('\n'.join(sorted(set(bad))) or 'no issues')
srv.shutdown()
