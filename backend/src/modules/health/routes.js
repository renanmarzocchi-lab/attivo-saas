import { prisma }                      from '../../lib/prisma.js';
import { pingRedis, isRedisAvailable } from '../../lib/redis.js';
import { env }                         from '../../config/env.js';

export default async function healthRoutes(app) {

  // GET /health — liveness: processo está vivo?
  // Retorna sempre 200. Usado pelo load balancer / uptime monitor.
  app.get('/health', async () => ({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    ts:     new Date().toISOString(),
  }));

  // GET /ready — readiness: todas as dependências estão prontas?
  //
  // Códigos de resposta:
  //   200 — tudo OK
  //   206 — degradado (DB ok, Redis ou outros serviços down)
  //   503 — DB indisponível — recusar tráfego
  //
  // Campos:
  //   status           — 'ready' | 'degraded' | 'unavailable'
  //   db.status        — 'ok' | 'error'
  //   db.latencyMs     — latência da query de ping
  //   redis.status     — 'ok' | 'unavailable'
  //   whatsapp.status  — 'configured' | 'stub' | 'unconfigured'
  //   email.status     — 'configured' | 'stub' | 'unconfigured'
  //   degradedFeatures — lista de features indisponíveis
  app.get('/ready', async (_request, reply) => {
    const [dbResult, redisOk] = await Promise.all([
      _pingDb(),
      pingRedis(),
    ]);

    const whatsapp = _checkWhatsApp();
    const email    = _checkEmail();

    const allOk   = dbResult.ok && redisOk;
    const degraded = dbResult.ok && !redisOk;

    const degradedFeatures = [];
    if (!redisOk)                     degradedFeatures.push('job-queues', 'async-notifications', 'whatsapp-delivery', 'email-delivery', 'renewal-automation');
    if (whatsapp.status === 'stub')   degradedFeatures.push('whatsapp-real-delivery');
    if (email.status    === 'stub')   degradedFeatures.push('email-real-delivery');

    const payload = {
      status: allOk ? 'ready' : degraded ? 'degraded' : 'unavailable',
      db: {
        status:    dbResult.ok ? 'ok' : 'error',
        latencyMs: dbResult.latencyMs,
      },
      redis: {
        status: redisOk ? 'ok' : 'unavailable',
      },
      whatsapp,
      email,
      degradedFeatures,
      ts:      new Date().toISOString(),
      version: env.APP_VERSION,
    };

    const code = allOk ? 200 : degraded ? 206 : 503;
    return reply.code(code).send(payload);
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function _pingDb() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

function _checkWhatsApp() {
  const provider = env.WHATSAPP_PROVIDER ?? 'stub';

  if (provider === 'stub') {
    return { status: 'stub', provider: 'stub', note: 'Envio simulado — configure WHATSAPP_PROVIDER para ativar' };
  }

  const hasUrl = !!(process.env.WHATSAPP_API_URL?.trim());
  const hasKey = !!(process.env.WHATSAPP_API_KEY?.trim());

  if (!hasUrl || !hasKey) {
    return { status: 'unconfigured', provider, note: 'WHATSAPP_API_URL ou WHATSAPP_API_KEY ausentes' };
  }

  return { status: 'configured', provider };
}

function _checkEmail() {
  const provider = env.EMAIL_PROVIDER ?? 'stub';

  if (provider === 'stub') {
    return { status: 'stub', provider: 'stub', note: 'Envio simulado — configure EMAIL_PROVIDER para ativar' };
  }

  if (provider === 'smtp') {
    const hasHost = !!(env.EMAIL_SMTP_HOST?.trim());
    const hasUser = !!(env.EMAIL_SMTP_USER?.trim());
    const hasPass = !!(env.EMAIL_SMTP_PASS?.trim());

    if (!hasHost || !hasUser || !hasPass) {
      return { status: 'unconfigured', provider: 'smtp', note: 'EMAIL_SMTP_HOST/USER/PASS ausentes' };
    }
    return { status: 'configured', provider: 'smtp', host: env.EMAIL_SMTP_HOST };
  }

  if (provider === 'resend') {
    const hasKey = !!(process.env.RESEND_API_KEY?.trim());
    return hasKey
      ? { status: 'configured', provider: 'resend' }
      : { status: 'unconfigured', provider: 'resend', note: 'RESEND_API_KEY ausente' };
  }

  return { status: 'configured', provider };
}
