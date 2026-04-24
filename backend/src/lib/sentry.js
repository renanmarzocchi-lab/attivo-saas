/**
 * Sentry integration — ativado SOMENTE quando SENTRY_DSN estiver configurado.
 *
 * Quando SENTRY_DSN está ausente, TODAS as funções são no-ops silenciosos.
 * Zero impacto em dev/staging sem DSN.
 *
 * Ativação:
 *   1. npm install @sentry/node
 *   2. Definir SENTRY_DSN=https://...@sentry.io/...
 *   3. chamar initSentry() no server.js antes de tudo
 *
 * Segurança:
 *   - Headers Authorization/Cookie NUNCA são enviados ao Sentry
 *   - Dados de request body são incluídos apenas em modo debug
 *   - userId e tenantId são incluídos como contexto (sem PII)
 */

let _sentry = null;

/**
 * Inicializa o Sentry. Chamar uma vez, no início do server.js.
 * É safe chamar sem SENTRY_DSN — simplesmente não faz nada.
 */
export async function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    _sentry = await import('@sentry/node');

    _sentry.init({
      dsn,
      environment:        process.env.NODE_ENV ?? 'development',
      release:            process.env.APP_VERSION ?? 'unknown',
      // Amostragem de traces: 10% em prod, 0 em dev (apenas errors, sem performance)
      tracesSampleRate:   process.env.NODE_ENV === 'production' ? 0.1 : 0,
      // Nunca enviar dados de sessão de usuários finais
      autoSessionTracking: false,

      beforeSend(event) {
        // Remover headers sensíveis antes de enviar
        if (event.request?.headers) {
          const h = event.request.headers;
          delete h['authorization'];
          delete h['cookie'];
          delete h['x-api-key'];
          delete h['x-refresh-token'];
        }
        // Em produção, remover o body completo (pode conter senhas/tokens)
        if (process.env.NODE_ENV === 'production' && event.request) {
          delete event.request.data;
        }
        return event;
      },
    });

    // Usa o logger nativo para não criar dependência circular
    console.info(`[Sentry] Inicializado (env=${process.env.NODE_ENV ?? 'development'})`);
  } catch (err) {
    // @sentry/node não instalado ou DSN inválido — não é fatal
    console.warn('[Sentry] Nao foi possivel inicializar:', err.message);
    _sentry = null;
  }
}

/**
 * Captura uma exceção com contexto estruturado.
 *
 * @param {Error} err
 * @param {Object} context
 * @param {string} [context.requestId]
 * @param {string} [context.userId]
 * @param {string} [context.tenantId]
 * @param {string} [context.worker]    - nome do worker BullMQ
 * @param {string} [context.jobId]     - id do job BullMQ
 * @param {string} [context.url]       - rota que gerou o erro
 */
export function captureException(err, context = {}) {
  if (!_sentry) return;

  _sentry.withScope((scope) => {
    // Tags indexáveis
    if (context.requestId) scope.setTag('request_id', context.requestId);
    if (context.tenantId)  scope.setTag('tenant_id',  context.tenantId);
    if (context.worker)    scope.setTag('worker',     context.worker);
    if (context.jobId)     scope.setTag('job_id',     String(context.jobId));
    if (context.url)       scope.setTag('url',        context.url);

    // Contexto de usuário (sem PII além do id)
    if (context.userId) scope.setUser({ id: context.userId });

    // Extras (tudo que não é tag/user)
    const { requestId, userId, tenantId, worker, jobId, url, ...extras } = context;
    if (Object.keys(extras).length > 0) scope.setExtras(extras);

    _sentry.captureException(err);
  });
}

/**
 * Captura uma mensagem informativa (sem exception).
 */
export function captureMessage(message, level = 'info', context = {}) {
  if (!_sentry) return;
  _sentry.withScope((scope) => {
    if (context.tenantId) scope.setTag('tenant_id', context.tenantId);
    if (context.userId)   scope.setUser({ id: context.userId });
    _sentry.captureMessage(message, level);
  });
}

export function isSentryEnabled() {
  return _sentry !== null;
}
