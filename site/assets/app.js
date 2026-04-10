(function () {
  const menuToggle = document.querySelector('.menu-toggle');
  const navWrap = document.querySelector('.nav-wrap');
  function setMenuState(isOpen) {
    navWrap?.classList.toggle('open', !!isOpen);
    if (menuToggle) menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }
  menuToggle?.setAttribute('aria-expanded', 'false');
  menuToggle?.addEventListener('click', () => setMenuState(!navWrap?.classList.contains('open')));
  document.querySelectorAll('.nav a').forEach((link) => {
    link.addEventListener('click', () => setMenuState(false));
  });
  document.addEventListener('click', (event) => {
    if (!navWrap || !menuToggle || !navWrap.classList.contains('open')) return;
    if (navWrap.contains(event.target) || menuToggle.contains(event.target)) return;
    setMenuState(false);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) setMenuState(false);
  });

  const STORAGE_REF = 'attivo_affiliate_ref';
  const STORAGE_TRACKING = 'attivo_tracking';
  const STORAGE_DOC_DOWNLOAD = 'attivo_doc_download';

  const CONFIG = Object.assign({
    siteUrl: 'https://www.attivocorretora.com.br',
    appUrl: 'https://app.attivocorretora.com.br',
    loginUrl: 'https://app.attivocorretora.com.br/login',
    registerUrl: 'https://app.attivocorretora.com.br/register',
    affiliatePanelUrl: 'https://app.attivocorretora.com.br/affiliate/dashboard',
    adminPanelUrl: 'https://app.attivocorretora.com.br/admin/dashboard',
    documentVersion: 'SIC-ATTIVO-2026.03-REV4',
    documentHash: '',
    documentReleaseDate: '',
    documentUrl: '/documentos/afiliados/programa-afiliados-attivo.pdf',
    documentTitle: 'Programa de Afiliados ATTIVO'
  }, window.ATTIVO_CONFIG || {});

  const params = new URLSearchParams(window.location.search);
  const existingTracking = JSON.parse(localStorage.getItem(STORAGE_TRACKING) || '{}');

  const incomingRef = (params.get('ref') || '').trim().replace(/^#/, '');
  if (incomingRef) localStorage.setItem(STORAGE_REF, incomingRef);

  const ref = localStorage.getItem(STORAGE_REF) || '';
  const visibleRef = ref ? `#${ref}` : '';

  const tracking = {
    first_ref: existingTracking.first_ref || ref || '',
    latest_ref: ref || '',
    first_landing_page: existingTracking.first_landing_page || window.location.href,
    latest_landing_page: window.location.href,
    utm_source: params.get('utm_source') || existingTracking.utm_source || '',
    utm_medium: params.get('utm_medium') || existingTracking.utm_medium || '',
    utm_campaign: params.get('utm_campaign') || existingTracking.utm_campaign || '',
    utm_content: params.get('utm_content') || existingTracking.utm_content || '',
    utm_term: params.get('utm_term') || existingTracking.utm_term || ''
  };
  localStorage.setItem(STORAGE_TRACKING, JSON.stringify(tracking));

  const defaultWhatsappMessage = 'Olá! Vim pelo site da ATTIVO e gostaria de falar com um especialista.';
  const affiliateWhatsappMessage = ref
    ? `Olá! Vim pelo parceiro ${visibleRef} e gostaria de falar com um especialista.`
    : defaultWhatsappMessage;

  function appendRefToUrl(baseUrl) {
    if (!baseUrl || !ref) return baseUrl;
    try {
      const u = new URL(baseUrl);
      if (!u.searchParams.get('ref')) u.searchParams.set('ref', ref);
      return u.toString();
    } catch (e) {
      return baseUrl;
    }
  }

  function preserveUrl(href) {
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#') || href.startsWith('javascript:')) return href;
    try {
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return href;
      if (ref && !url.searchParams.get('ref')) url.searchParams.set('ref', ref);
      ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach((key) => {
        if (tracking[key] && !url.searchParams.get(key)) url.searchParams.set(key, tracking[key]);
      });
      return url.pathname + url.search + url.hash;
    } catch (e) {
      return href;
    }
  }

  if (ref) {
    document.querySelectorAll('[data-affiliate-ref]').forEach((el) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) el.value = ref;
      else el.textContent = visibleRef;
    });
    document.querySelectorAll('[data-affiliate-status]').forEach((el) => { el.hidden = false; });
  }

  document.querySelectorAll('a[href][data-preserve-affiliate]').forEach((el) => {
    el.setAttribute('href', preserveUrl(el.getAttribute('href')));
  });

  document.querySelectorAll('[data-whatsapp-affiliate]').forEach((el) => {
    const base = 'https://wa.me/5519994241018';
    const msg = el.getAttribute('data-whatsapp-message') || affiliateWhatsappMessage;
    el.setAttribute('href', `${base}?text=${encodeURIComponent(msg)}`);
  });

  document.querySelectorAll('[data-mail-affiliate]').forEach((el) => {
    const subject = ref ? `Contato pelo parceiro ${visibleRef} | ATTIVO` : 'Contato pelo site | ATTIVO';
    const body = ref ? `Olá, vim pelo parceiro ${visibleRef} e gostaria de receber atendimento.` : 'Olá, gostaria de receber atendimento da ATTIVO.';
    el.setAttribute('href', `mailto:contato@attivocorretora.com.br?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  });

  document.querySelectorAll('[data-admin-url]').forEach((el) => {
    el.setAttribute('href', CONFIG.adminPanelUrl || CONFIG.loginUrl);
  });

  document.querySelectorAll('[data-affiliate-url]').forEach((el) => {
    el.setAttribute('href', appendRefToUrl(CONFIG.affiliatePanelUrl || CONFIG.loginUrl));
  });

  document.querySelectorAll('[data-register-url]').forEach((el) => {
    el.setAttribute('href', appendRefToUrl(CONFIG.registerUrl));
  });

  document.querySelectorAll('[data-login-url]').forEach((el) => {
    el.setAttribute('href', CONFIG.loginUrl);
  });

  document.querySelectorAll('[data-doc-download]').forEach((el) => {
    el.addEventListener('click', () => {
      const payload = {
        confirmed: 'SIM',
        at: new Date().toISOString(),
        href: el.getAttribute('href') || CONFIG.documentUrl || '',
        version: CONFIG.documentVersion || '',
        hash: CONFIG.documentHash || ''
      };
      localStorage.setItem(STORAGE_DOC_DOWNLOAD, JSON.stringify(payload));
    });
  });

  const affiliateLinkInput = document.querySelector('[data-generated-affiliate-link]');
  if (affiliateLinkInput && ref) affiliateLinkInput.value = `${window.location.origin}/?ref=${ref}`;

  document.querySelectorAll('[data-copy-target]').forEach((btn) => {
    btn.addEventListener('click', function () {
      const selector = btn.getAttribute('data-copy-target');
      const target = document.querySelector(selector);
      if (!target) return;
      const value = target.value || target.textContent || '';
      navigator.clipboard?.writeText(value);
      const original = btn.textContent;
      btn.textContent = 'Copiado';
      setTimeout(() => btn.textContent = original || 'Copiar', 1800);
    });
  });
})();
