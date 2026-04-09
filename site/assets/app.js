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
  const STORAGE_LAST_LEAD = 'attivo_last_lead';
  const STORAGE_PENDING_SUBMISSIONS = 'attivo_pending_submissions';
  const STORAGE_DOC_DOWNLOAD = 'attivo_doc_download';
  const STORAGE_DOC_ACCEPTANCE = 'attivo_doc_acceptance';

  const CONFIG = Object.assign({
    googleScriptUrl: 'COLE_AQUI_A_URL_DO_WEBAPP_DO_GOOGLE_APPS_SCRIPT',
    appsScriptAdminUrl: 'COLE_AQUI_A_URL_DO_PAINEL_MASTER_DO_GOOGLE_APPS_SCRIPT',
    appsScriptAffiliateUrl: 'COLE_AQUI_A_URL_DO_PAINEL_DO_AFILIADO_DO_GOOGLE_APPS_SCRIPT',
    documentVersion: 'SIC-ATTIVO-2026.03-REV4',
    documentHash: '822d8a41f4f03aa0c0e91c3187d91cba40cfe74b85ee26cd7de219a9547971cc',
    documentReleaseDate: '2026-03-24',
    documentUrl: '/documentos/afiliados/programa-afiliados-attivo.pdf',
    documentTitle: 'Programa de Afiliados ATTIVO',
    requireDocAcceptance: 'SIM'
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

  function resolvePanelUrl(view) {
    const explicit = view === 'admin' ? CONFIG.appsScriptAdminUrl : CONFIG.appsScriptAffiliateUrl;
    if (explicit && explicit.indexOf('COLE_AQUI') === -1) return explicit;
    if (CONFIG.googleScriptUrl && CONFIG.googleScriptUrl.indexOf('COLE_AQUI') === -1) {
      return `${CONFIG.googleScriptUrl}${CONFIG.googleScriptUrl.indexOf('?') === -1 ? '?' : '&'}view=${view}`;
    }
    return '#';
  }

  function preserveUrl(href) {
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#') || href.startsWith('javascript:')) return href;
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return href;
    if (ref && !url.searchParams.get('ref')) url.searchParams.set('ref', ref);
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach((key) => {
      if (tracking[key] && !url.searchParams.get(key)) url.searchParams.set(key, tracking[key]);
    });
    return url.pathname + url.search + url.hash;
  }

  function getPendingSubmissions() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_PENDING_SUBMISSIONS) || '[]');
    } catch (e) {
      return [];
    }
  }

  function setPendingSubmissions(items) {
    localStorage.setItem(STORAGE_PENDING_SUBMISSIONS, JSON.stringify(items || []));
  }

  function getDocAcceptance() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_DOC_ACCEPTANCE) || '{}');
    } catch (e) {
      return {};
    }
  }

  function normalizeDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function normalizeBool(value) {
    if (typeof value === 'boolean') return value ? 'SIM' : 'NAO';
    const normalized = String(value || '').trim().toUpperCase();
    return ['SIM', 'TRUE', '1', 'ON', 'YES'].includes(normalized) ? 'SIM' : 'NAO';
  }

  function isRepeatedDigits(value) {
    return /^([0-9])\1+$/.test(value || '');
  }

  function isCpfValid(value) {
    const digits = normalizeDigits(value);
    if (digits.length !== 11 || isRepeatedDigits(digits)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i += 1) sum += Number(digits.charAt(i)) * (10 - i);
    let first = (sum * 10) % 11;
    if (first === 10) first = 0;
    if (first !== Number(digits.charAt(9))) return false;
    sum = 0;
    for (let i = 0; i < 10; i += 1) sum += Number(digits.charAt(i)) * (11 - i);
    let second = (sum * 10) % 11;
    if (second === 10) second = 0;
    return second === Number(digits.charAt(10));
  }

  function isCnpjValid(value) {
    const digits = normalizeDigits(value);
    if (digits.length !== 14 || isRepeatedDigits(digits)) return false;
    const calc = (base, factors) => {
      let total = 0;
      for (let i = 0; i < factors.length; i += 1) total += Number(base.charAt(i)) * factors[i];
      const rest = total % 11;
      return rest < 2 ? 0 : 11 - rest;
    };
    const first = calc(digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    if (first !== Number(digits.charAt(12))) return false;
    const second = calc(digits, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return second === Number(digits.charAt(13));
  }

  function isCpfOrCnpjValid(value) {
    const digits = normalizeDigits(value);
    if (digits.length === 11) return isCpfValid(digits);
    if (digits.length === 14) return isCnpjValid(digits);
    return false;
  }

  function hasCurrentDocAcceptance(formPayload) {
    const acc = getDocAcceptance();
    const payloadDoc = normalizeDigits((formPayload && (formPayload.documento || formPayload.assinatura_documento)) || '');
    const payloadEmail = String((formPayload && formPayload.email) || '').trim().toLowerCase();
    const accDoc = normalizeDigits(acc.assinatura_documento || acc.documento || '');
    const accEmail = String(acc.email || '').trim().toLowerCase();

    const needsCurrentVersion = (CONFIG.enforceCurrentDocForRelease || 'SIM') === 'SIM';
    const sameVersion = !needsCurrentVersion || (!!acc.document_version && acc.document_version === (CONFIG.documentVersion || ''));
    const sameHash = !CONFIG.documentHash || CONFIG.documentHash.indexOf('COLE_AQUI') !== -1 || !acc.document_hash || acc.document_hash === CONFIG.documentHash;
    const accepted = normalizeBool(acc.aceite_documento) === 'SIM';
    const downloaded = normalizeBool(acc.download_confirmado) === 'SIM';
    const identityMatch = (!!payloadDoc && payloadDoc === accDoc) || (!!payloadEmail && payloadEmail === accEmail);
    const requireDownload = (CONFIG.requireDownloadBeforeRelease || 'SIM') === 'SIM';

    return sameVersion && sameHash && accepted && identityMatch && (!requireDownload || downloaded);
  }

  function showConfigWarning() {
    const restrictedPaths = ['/afiliados/cadastro', '/afiliados/documentos', '/afiliados/admin', '/afiliados/painel', '/afiliados/implantacao', '/google-sheets'];
    const shouldShow = restrictedPaths.some((path) => window.location.pathname === path || window.location.pathname.startsWith(path + '/'));
    if (!shouldShow) return;
    const hasPlaceholderUrl = [CONFIG.googleScriptUrl, CONFIG.appsScriptAdminUrl, CONFIG.appsScriptAffiliateUrl].some((value) => !value || String(value).indexOf('COLE_AQUI') !== -1);
    if (!hasPlaceholderUrl) return;
    const host = document.querySelector('main') || document.body;
    if (!host) return;
    const box = document.createElement('div');
    box.className = 'config-warning';
    box.style.cssText = 'max-width:1200px;margin:16px auto 0;padding:14px 16px;border:1px solid #d1b46a;border-radius:12px;background:#fff7e6;color:#5b4a1a;font-size:14px;line-height:1.5';
    box.innerHTML = '<strong>Implantação pendente:</strong> as URLs do Google Apps Script ainda não foram preenchidas. A sincronização automática com planilha e painéis só funcionará após configurar o Web App em <code>assets/config.js</code>.';
    host.insertAdjacentElement('afterbegin', box);
  }



  function initEmbeddedPanels() {
    if ((CONFIG.embedAppsScriptPanels || 'SIM') !== 'SIM') return;
    document.querySelectorAll('[data-embedded-panel]').forEach((host) => {
      const view = host.getAttribute('data-embedded-panel');
      const iframe = host.querySelector('[data-panel-iframe]');
      const placeholder = host.querySelector('[data-panel-placeholder]');
      const url = resolvePanelUrl(view === 'admin' ? 'admin' : 'affiliate');
      if (!iframe || !url || url === '#') return;
      iframe.src = url;
      iframe.hidden = false;
      iframe.addEventListener('error', () => {
        iframe.hidden = true;
        if (placeholder) placeholder.hidden = false;
      });
      if (placeholder) placeholder.hidden = true;
    });
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

  document.querySelectorAll('[data-affiliate-code-link]').forEach((el) => {
    if (ref) el.textContent = visibleRef;
  });

  document.querySelectorAll('[data-admin-url]').forEach((el) => {
    el.setAttribute('href', resolvePanelUrl('admin'));
  });

  document.querySelectorAll('[data-affiliate-url]').forEach((el) => {
    el.setAttribute('href', resolvePanelUrl('affiliate'));
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

  function ensureHidden(form, name, value) {
    let input = form.querySelector(`input[name="${name}"]`);
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      form.appendChild(input);
    }
    input.value = value || '';
  }

  function buildPayload(form) {
    const fd = new FormData(form);
    const payload = {};
    fd.forEach((value, key) => {
      payload[key] = typeof value === 'string' ? value.trim() : value;
    });
    return payload;
  }

  function postToAppsScript(data) {
    const url = CONFIG.googleScriptUrl;
    if (!url || url.indexOf('COLE_AQUI') !== -1) return Promise.resolve({ skipped: true });

    const body = JSON.stringify(data);

    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
        const ok = navigator.sendBeacon(url, blob);
        if (ok) return Promise.resolve({ ok: true, via: 'beacon' });
      } catch (err) {
        console.warn('Falha no sendBeacon:', err);
      }
    }

    return fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      keepalive: true
    }).then(() => ({ ok: true, via: 'fetch' })).catch((err) => {
      console.warn('Falha ao enviar para Google Apps Script:', err);
      return { error: true };
    });
  }

  function queueSubmission(payload) {
    const items = getPendingSubmissions();
    items.push(payload);
    setPendingSubmissions(items.slice(-25));
  }

  function flushPendingSubmissions() {
    const items = getPendingSubmissions();
    if (!items.length) return;
    const nextQueue = [];
    items.forEach((item) => {
      postToAppsScript(item).then((res) => {
        if (!res || res.error) {
          const current = getPendingSubmissions();
          if (!current.find((x) => x.client_submission_id === item.client_submission_id)) {
            current.push(item);
            setPendingSubmissions(current.slice(-25));
          }
        }
      });
    });
    setPendingSubmissions(nextQueue);
  }

  document.querySelectorAll('form[data-affiliate-form]').forEach((form) => {
    ensureHidden(form, 'affiliate_ref', ref || '');
    ensureHidden(form, 'first_ref', tracking.first_ref || '');
    ensureHidden(form, 'landing_page', window.location.href);
    ensureHidden(form, 'page_title', document.title);
    ensureHidden(form, 'utm_source', tracking.utm_source || '');
    ensureHidden(form, 'utm_medium', tracking.utm_medium || '');
    ensureHidden(form, 'utm_campaign', tracking.utm_campaign || '');
    ensureHidden(form, 'utm_content', tracking.utm_content || '');
    ensureHidden(form, 'utm_term', tracking.utm_term || '');
    ensureHidden(form, 'first_landing_page', tracking.first_landing_page || '');
    ensureHidden(form, 'latest_landing_page', tracking.latest_landing_page || '');

    form.addEventListener('submit', function (event) {
      const submitButton = form.querySelector('[type="submit"]');
      if (submitButton?.dataset.submitting === 'SIM') {
        event.preventDefault();
        return;
      }
      ensureHidden(form, 'affiliate_ref', ref || '');
      ensureHidden(form, 'first_ref', tracking.first_ref || '');
      ensureHidden(form, 'landing_page', window.location.href);
      ensureHidden(form, 'page_title', document.title);
      ensureHidden(form, 'utm_source', tracking.utm_source || '');
      ensureHidden(form, 'utm_medium', tracking.utm_medium || '');
      ensureHidden(form, 'utm_campaign', tracking.utm_campaign || '');
      ensureHidden(form, 'utm_content', tracking.utm_content || '');
      ensureHidden(form, 'utm_term', tracking.utm_term || '');
      ensureHidden(form, 'first_landing_page', tracking.first_landing_page || '');
      ensureHidden(form, 'latest_landing_page', tracking.latest_landing_page || '');
      ensureHidden(form, 'document_version', CONFIG.documentVersion || '');
      ensureHidden(form, 'document_hash', CONFIG.documentHash || '');
      ensureHidden(form, 'document_release_date', CONFIG.documentReleaseDate || '');
      ensureHidden(form, 'document_url', CONFIG.documentUrl || '');
      ensureHidden(form, 'document_title', CONFIG.documentTitle || '');
      ensureHidden(form, 'required_for_release', CONFIG.requireDocAcceptance || 'SIM');
      ensureHidden(form, 'client_timestamp', new Date().toISOString());
      ensureHidden(form, 'user_agent', navigator.userAgent || '');
      const docDownload = JSON.parse(localStorage.getItem(STORAGE_DOC_DOWNLOAD) || '{}');
      ensureHidden(form, 'download_confirmado', docDownload.confirmed || 'NAO');
      const formName = form.querySelector('input[name="form-name"]')?.value || form.getAttribute('name') || '';
      let action = 'lead_capture';
      if (formName === 'cadastro-afiliado') action = 'affiliate_signup';
      if (formName === 'aceite-documentos-afiliados') action = 'document_acceptance';
      const payload = buildPayload(form);
      const signupDoc = normalizeDigits(payload.documento || '');
      const signupSignatureDoc = normalizeDigits(payload.assinatura_documento || '');
      const signupPixDoc = normalizeDigits(payload.pix_titular_documento || '');

      if (action === 'document_acceptance') {
        if (!isCpfOrCnpjValid(payload.assinatura_documento || '')) {
          alert('Informe um CPF ou CNPJ válido, com dígitos verificadores corretos, para registrar o aceite eletrônico.');
          return event.preventDefault();
        }
        const docDownloadState = JSON.parse(localStorage.getItem(STORAGE_DOC_DOWNLOAD) || '{}');
        const acceptanceReceipt = {
          assinatura_nome: payload.assinatura_nome || payload.nome || '',
          assinatura_documento: payload.assinatura_documento || payload.documento || '',
          email: payload.email || '',
          document_version: CONFIG.documentVersion || '',
          document_hash: CONFIG.documentHash || '',
          document_release_date: CONFIG.documentReleaseDate || '',
          document_url: CONFIG.documentUrl || '',
          aceite_documento: normalizeBool(payload.aceite_documento),
          download_confirmado: normalizeBool(payload.download_confirmado || docDownloadState.confirmed),
          aceite_lgpd: normalizeBool(payload.aceite_lgpd),
          accepted_at_client: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_DOC_ACCEPTANCE, JSON.stringify(acceptanceReceipt));
      }
      if (action === 'affiliate_signup') {
        if (!isCpfOrCnpjValid(payload.documento || '')) {
          alert('Informe um CPF ou CNPJ válido, com dígitos verificadores corretos, no cadastro.');
          return event.preventDefault();
        }
        if (!isCpfOrCnpjValid(payload.assinatura_documento || '')) {
          alert('Informe um CPF ou CNPJ válido, com dígitos verificadores corretos, para a assinatura eletrônica.');
          return event.preventDefault();
        }
        if (signupDoc && signupSignatureDoc && signupDoc !== signupSignatureDoc) {
          alert('O CPF/CNPJ da assinatura eletrônica deve ser o mesmo documento do cadastro.');
          return event.preventDefault();
        }
        if (normalizeBool(payload.pix_mesmo_titular) === 'SIM' && signupDoc && signupPixDoc && signupDoc !== signupPixDoc) {
          alert('O documento do titular da chave Pix deve ser o mesmo do cadastro quando a opção de mesma titularidade estiver marcada.');
          return event.preventDefault();
        }
      }
      if (action === 'affiliate_signup' && (CONFIG.requireDocAcceptance || 'SIM') === 'SIM' && !hasCurrentDocAcceptance(payload)) {
        alert('Antes de enviar o cadastro, é necessário registrar o aceite válido da versão vigente do documento com o mesmo e-mail ou CPF/CNPJ do cadastro.');
        return event.preventDefault();
      }
      if (submitButton) {
        submitButton.dataset.submitting = 'SIM';
        submitButton.disabled = true;
        submitButton.dataset.originalText = submitButton.dataset.originalText || submitButton.textContent;
        submitButton.textContent = 'Enviando...';
      }
      payload.action = action;
      payload.submitted_at = new Date().toISOString();
      payload.current_page = window.location.pathname;
      payload.source = 'site';
      payload.client_submission_id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('sub-' + Date.now() + '-' + Math.random().toString(16).slice(2));
      localStorage.setItem(STORAGE_LAST_LEAD, JSON.stringify(payload));
      queueSubmission(payload);
      postToAppsScript(payload).then((res) => {
        if (res && !res.error) {
          const items = getPendingSubmissions().filter((x) => x.client_submission_id !== payload.client_submission_id);
          setPendingSubmissions(items);
        }
      }).finally(() => {
        if (submitButton) {
          submitButton.dataset.submitting = 'NAO';
          submitButton.disabled = false;
          submitButton.textContent = submitButton.dataset.originalText || 'Enviar';
        }
      });
    });
  });

  initEmbeddedPanels();
  showConfigWarning();
  window.addEventListener('online', flushPendingSubmissions);
  setTimeout(flushPendingSubmissions, 1200);

  const affiliateLinkInput = document.querySelector('[data-generated-affiliate-link]');
  if (affiliateLinkInput && ref) affiliateLinkInput.value = `${window.location.origin}/?ref=${ref}`;

  document.querySelectorAll('[data-copy-target]').forEach((btn) => {
    btn.addEventListener('click', function () {
      const selector = btn.getAttribute('data-copy-target');
      const target = document.querySelector(selector);
      if (!target) return;
      const value = target.value || target.textContent || '';
      navigator.clipboard?.writeText(value);
      btn.textContent = 'Copiado';
      setTimeout(() => btn.textContent = 'Copiar', 1800);
    });
  });
})();

