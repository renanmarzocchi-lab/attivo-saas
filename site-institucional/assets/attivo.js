(function () {
  var WA = 'https://wa.me/5519994241018';
  function track(name, params) {
    try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch (e) {}
  }

  // cabeçalho ganha borda ao rolar
  var header = document.querySelector('.header');
  function onScroll() { if (header) header.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // menu "Seguros"
  document.querySelectorAll('.drop').forEach(function (drop) {
    var btn = drop.querySelector('button');
    function set(open) { drop.setAttribute('data-open', open ? 'true' : 'false'); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
    btn.addEventListener('click', function (e) { e.stopPropagation(); set(drop.getAttribute('data-open') !== 'true'); });
    drop.addEventListener('mouseenter', function () { if (window.matchMedia('(hover:hover)').matches) set(true); });
    drop.addEventListener('mouseleave', function () { if (window.matchMedia('(hover:hover)').matches) set(false); });
    document.addEventListener('click', function (e) { if (!drop.contains(e.target)) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { set(false); } });
  });

  // menu mobile
  var mm = document.querySelector('.mobile-menu');
  var openBtn = document.querySelector('.menu-btn');
  var closeBtn = mm && mm.querySelector('.mm-close');
  function setMenu(open) {
    if (!mm) return;
    mm.setAttribute('data-open', open ? 'true' : 'false');
    openBtn && openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open && closeBtn) closeBtn.focus(); else if (!open && openBtn) openBtn.focus();
  }
  openBtn && openBtn.addEventListener('click', function () { setMenu(true); });
  closeBtn && closeBtn.addEventListener('click', function () { setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mm && mm.getAttribute('data-open') === 'true') setMenu(false); });

  // links de WhatsApp com mensagem própria
  document.querySelectorAll('a[data-wa]').forEach(function (a) {
    var msg = a.getAttribute('data-wa') || 'Olá! Vim pelo site da ATTIVO e gostaria de falar com um especialista.';
    a.setAttribute('href', WA + '?text=' + encodeURIComponent(msg));
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener');
  });

  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('wa.me/') !== -1) track('whatsapp_click', { page_path: location.pathname, link_text: (a.textContent || '').trim().slice(0, 60) });
    else if (href.indexOf('tel:') === 0) track('phone_click', { page_path: location.pathname });
    else if (href.indexOf('mailto:') === 0) track('email_click', { page_path: location.pathname });
  });

  // formulários de cotação: montam a mensagem e abrem o WhatsApp
  document.querySelectorAll('form[data-quote]').forEach(function (form) {
    var status = form.querySelector('.form-status');
    function val(n) { var el = form.elements[n]; return el ? String(el.value || '').trim() : ''; }
    form.addEventListener('input', function (e) { e.target.classList && e.target.classList.remove('err'); });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var faltando = [];
      ['nome', 'telefone'].forEach(function (n) { var el = form.elements[n]; if (el && !val(n)) { el.classList.add('err'); faltando.push(el); } });
      var lgpd = form.elements['lgpd'];
      if (faltando.length) { status.textContent = 'Preencha nome e telefone para a gente conseguir retornar.'; faltando[0].focus(); return; }
      if (lgpd && !lgpd.checked) { status.textContent = 'Marque a autorização de uso dos dados para continuar.'; lgpd.focus(); return; }
      var l = ['Olá! Vim pelo site da ATTIVO e gostaria de uma cotação.', ''];
      l.push('Nome: ' + val('nome'));
      l.push('Telefone: ' + val('telefone'));
      if (val('email')) l.push('E-mail: ' + val('email'));
      if (val('cidade')) l.push('Cidade: ' + val('cidade'));
      if (val('tipo')) l.push('Seguro: ' + val('tipo'));
      if (val('horario')) l.push('Melhor horário: ' + val('horario'));
      if (val('mensagem')) { l.push(''); l.push(val('mensagem')); }
      var url = WA + '?text=' + encodeURIComponent(l.join('\n'));
      track('generate_lead', { method: 'formulario_whatsapp', insurance_type: val('tipo') || 'nao_informado' });
      status.innerHTML = 'Abrimos o WhatsApp com seus dados. Se não abriu, <a href="' + url + '" target="_blank" rel="noopener">toque aqui</a>.';
      var w = window.open(url, '_blank');
      if (w) { try { w.opener = null; } catch (e) {} } else { window.location.href = url; }
    });
  });
})();
