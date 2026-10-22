(function () {
  var WA = 'https://wa.me/5519994241018';

  function track(name, params) {
    try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch (e) {}
  }

  // Links com mensagem própria para o WhatsApp
  document.querySelectorAll('a[data-wa-msg]').forEach(function (a) {
    a.setAttribute('href', WA + '?text=' + encodeURIComponent(a.getAttribute('data-wa-msg')));
  });

  // Todo clique em WhatsApp, telefone ou e-mail vira evento no Analytics
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('wa.me/') !== -1) track('whatsapp_click', { page_path: location.pathname });
    else if (href.indexOf('tel:') === 0) track('phone_click', { page_path: location.pathname });
    else if (href.indexOf('mailto:') === 0) track('email_click', { page_path: location.pathname });
  });

  // Formulário de contato: monta a mensagem e abre o WhatsApp
  var form = document.getElementById('form-contato');
  if (!form) return;
  var status = document.getElementById('form-status');

  function val(name) {
    var el = form.elements[name];
    return el ? String(el.value || '').trim() : '';
  }

  form.addEventListener('input', function (ev) {
    if (ev.target && ev.target.classList) ev.target.classList.remove('field-error');
  });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var missing = [];
    ['nome', 'telefone'].forEach(function (n) {
      var el = form.elements[n];
      if (!val(n)) { missing.push(el); el.classList.add('field-error'); }
    });
    var lgpd = form.elements['lgpd'];
    if (lgpd && !lgpd.checked) missing.push(lgpd);

    if (missing.length) {
      status.textContent = !val('nome') || !val('telefone')
        ? 'Preencha nome e telefone para a gente conseguir retornar.'
        : 'Marque a autorização de uso dos dados para continuar.';
      status.style.color = '#B3261E';
      missing[0].focus();
      return;
    }

    var linhas = ['Olá! Vim pelo site da ATTIVO e gostaria de uma cotação.', ''];
    linhas.push('Nome: ' + val('nome'));
    linhas.push('Telefone: ' + val('telefone'));
    if (val('email')) linhas.push('E-mail: ' + val('email'));
    if (val('cidade')) linhas.push('Cidade: ' + val('cidade'));
    if (val('tipo')) linhas.push('Seguro: ' + val('tipo'));
    if (val('horario')) linhas.push('Melhor horário: ' + val('horario'));
    if (val('mensagem')) { linhas.push(''); linhas.push(val('mensagem')); }

    var url = WA + '?text=' + encodeURIComponent(linhas.join('\n'));
    track('generate_lead', { method: 'formulario_whatsapp', insurance_type: val('tipo') || 'nao_informado' });

    status.style.color = '#0B1F3A';
    status.innerHTML = 'Pronto! Abrimos o WhatsApp com seus dados. Se não abriu, <a href="' + url + '" target="_blank" rel="noopener" style="font-weight:700">toque aqui</a>.';
    var w = window.open(url, '_blank');
    if (w) { try { w.opener = null; } catch (e) {} } else { window.location.href = url; }
  });
})();
