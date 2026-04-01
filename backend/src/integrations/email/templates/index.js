/**
 * Templates de email do Attivo.
 *
 * Uso:
 *   const { subject, html, text } = renderTemplate('renewal_reminder', {
 *     customerName: 'João Silva',
 *     daysLeft: 15,
 *     endDate: '15/06/2025',
 *     type: 'AUTO',
 *   });
 *
 * Adicionar novos templates: adicionar case no switch e implementar a função.
 */

const BRAND_COLOR = '#2563EB';

const layout = (title, content) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:${BRAND_COLOR};padding:24px 32px;">
              <h1 style="margin:0;color:#FFFFFF;font-size:22px;font-weight:700;">Attivo</h1>
              <p  style="margin:4px 0 0;color:#BFDBFE;font-size:13px;">Sistema de Gestão de Seguros</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#F9FAFB;padding:16px 32px;border-top:1px solid #E5E7EB;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;text-align:center;">
                Este email foi enviado automaticamente pelo sistema Attivo.<br/>
                Não responda a este email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// --- Templates ---

function renewalReminder({ customerName, daysLeft, endDate, type, brokerName }) {
  const plural  = daysLeft !== 1;
  const subject = `Aviso: Seguro vence em ${daysLeft} dia${plural ? 's' : ''}`;
  const urgency = daysLeft <= 7 ? '#DC2626' : daysLeft <= 15 ? '#D97706' : BRAND_COLOR;

  const html = layout(subject, `
    <h2 style="margin:0 0 16px;color:#111827;font-size:18px;">Aviso de Vencimento</h2>
    <p style="color:#374151;">Olá${brokerName ? `, ${brokerName}` : ''},</p>
    <p style="color:#374151;">
      O seguro <strong>${type}</strong> do cliente <strong>${customerName}</strong>
      vence em <strong style="color:${urgency};">${daysLeft} dia${plural ? 's' : ''}</strong>
      (<strong>${endDate}</strong>).
    </p>
    <div style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:12px 16px;margin:20px 0;border-radius:0 4px 4px 0;">
      <p style="margin:0;color:#92400E;font-size:14px;">
        Recomendamos entrar em contato com o cliente para iniciar o processo de renovação.
      </p>
    </div>
    <p style="color:#6B7280;font-size:13px;">
      Acesse o sistema para ver os detalhes e tomar as providências necessárias.
    </p>
  `);

  const text = [
    `Aviso de Vencimento — Attivo`,
    ``,
    `O seguro ${type} do cliente ${customerName} vence em ${daysLeft} dia${plural ? 's' : ''} (${endDate}).`,
    ``,
    `Entre em contato com o cliente para iniciar a renovação.`,
  ].join('\n');

  return { subject, html, text };
}

function welcome({ name }) {
  const subject = 'Bem-vindo ao Attivo';
  const html    = layout(subject, `
    <h2 style="margin:0 0 16px;color:#111827;font-size:18px;">Bem-vindo!</h2>
    <p style="color:#374151;">Olá, <strong>${name}</strong>.</p>
    <p style="color:#374151;">Sua conta no Attivo foi criada com sucesso.</p>
    <p style="color:#374151;">Você já pode acessar o sistema com suas credenciais.</p>
  `);
  const text    = `Bem-vindo ao Attivo!\n\nOlá, ${name}.\nSua conta foi criada com sucesso.`;
  return { subject, html, text };
}

function generic({ title = 'Notificação', message }) {
  const subject = title;
  const html    = layout(title, `
    <h2 style="margin:0 0 16px;color:#111827;font-size:18px;">${title}</h2>
    <p style="color:#374151;">${message}</p>
  `);
  const text    = `${title}\n\n${message}`;
  return { subject, html, text };
}

// --- Export ---

const TEMPLATES = {
  renewal_reminder: renewalReminder,
  welcome:          welcome,
  notification:     generic,
};

/**
 * Renderiza um template pelo key.
 * Retorna { subject, html, text }.
 * Fallback para template genérico se key desconhecido.
 */
export function renderTemplate(templateKey, vars = {}) {
  const fn = TEMPLATES[templateKey] ?? generic;
  return fn(vars);
}

/** Lista de templates disponíveis */
export const TEMPLATE_KEYS = Object.keys(TEMPLATES);
