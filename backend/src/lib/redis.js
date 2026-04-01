/**
 * Redis singleton com degradação controlada.
 *
 * Comportamento quando Redis está indisponível:
 *  - Log de aviso ÚNICO (sem flood de ECONNREFUSED)
 *  - checkRedis() retorna false com timeout curto
 *  - isRedisAvailable() retorna false
 *  - Workers e filas não são iniciados (ver server.js)
 *  - /ready retorna status "degraded"
 *
 * Quando Redis volta:
 *  - Reconexão automática com backoff exponencial
 *  - Logs informativos normalizados
 *  - isRedisAvailable() volta a retornar true
 */

import Redis from 'ioredis';
import { logger } from './logger.js';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

let _redis = null;
let _available = null;   // null=desconhecido, true=online, false=offline
let _warnOnce  = false;  // garante que ECONNREFUSED é logado só uma vez por ciclo

export function getRedis() {
  if (!_redis) {
    _redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null, // obrigatório para BullMQ
      enableReadyCheck:     false,
      lazyConnect:          true,

      // Backoff exponencial: 1s → 2s → 4s → ... → 30s
      // Retorna null para parar retries — NÃO fazemos isso pois BullMQ precisa
      // de retries infinitos. Controlamos o flood via flag _warnOnce.
      retryStrategy(times) {
        return Math.min(times * 1000, 30_000);
      },
    });

    _redis.on('connect', () => {
      _available = true;
      _warnOnce  = false;
      logger.info({ url: _redactUrl(REDIS_URL) }, 'Redis conectado');
    });

    _redis.on('ready', () => {
      _available = true;
      logger.info('Redis pronto');
    });

    // Suprimir ECONNREFUSED/ETIMEDOUT após o primeiro — sem flood nos logs
    _redis.on('error', (err) => {
      _available = false;
      const isSilent = err.code === 'ECONNREFUSED'
        || err.code === 'ETIMEDOUT'
        || err.code === 'ENOTFOUND';

      if (isSilent && _warnOnce) return; // silencia repetições

      if (isSilent && !_warnOnce) {
        _warnOnce = true;
        logger.warn(
          { code: err.code, url: _redactUrl(REDIS_URL) },
          'Redis indisponivel — modo degradado ativado. Workers e filas desabilitados ate reconexao.',
        );
        return;
      }

      // Erros genuinamente inesperados (ex: OOM, WRONGPASS) sempre logados
      logger.error({ code: err.code, message: err.message }, 'Redis erro inesperado');
    });

    _redis.on('close', () => {
      _available = false;
      logger.warn('Redis conexao fechada');
    });

    _redis.on('reconnecting', (delay) => {
      logger.debug({ delay }, 'Redis tentando reconectar...');
    });
  }

  return _redis;
}

/**
 * Verifica conectividade Redis com timeout (padrão 3s).
 * Atualiza a flag interna de disponibilidade.
 * Seguro chamar antes de qualquer operação de negócio.
 */
export function checkRedis(timeoutMs = 3000) {
  return new Promise((resolve) => {
    const r = getRedis();
    const timer = setTimeout(() => {
      _available = false;
      resolve(false);
    }, timeoutMs);

    r.ping()
      .then(() => {
        clearTimeout(timer);
        _available = true;
        resolve(true);
      })
      .catch(() => {
        clearTimeout(timer);
        _available = false;
        resolve(false);
      });
  });
}

/**
 * Retorna o último estado de disponibilidade conhecido.
 * true  = Redis está (ou estava) online
 * false = Redis está (ou estava) offline
 * null  = ainda não foi verificado
 */
export function isRedisAvailable() {
  return _available === true;
}

/** Alias para compatibilidade com health routes. */
export async function pingRedis() {
  return checkRedis(2000);
}

export async function closeRedis() {
  if (_redis) {
    try {
      await _redis.quit();
    } catch {
      _redis.disconnect(false);
    }
    _redis     = null;
    _available = null;
    _warnOnce  = false;
  }
}

// Remove credenciais da URL para logs
function _redactUrl(url) {
  try {
    return url.replace(/:\/\/[^@]*@/, '://***@');
  } catch {
    return url;
  }
}
