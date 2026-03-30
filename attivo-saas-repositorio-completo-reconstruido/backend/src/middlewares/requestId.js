import { randomUUID } from 'crypto';

/**
 * Plugin Fastify: injeta requestId em cada request.
 * Usa o header X-Request-Id se fornecido, ou gera um UUID.
 */
export async function requestIdPlugin(app) {
  app.addHook('onRequest', async (request) => {
    request.id = request.headers['x-request-id'] ?? randomUUID();
    request.headers['x-request-id'] = request.id;
  });

  app.addHook('onSend', async (request, reply) => {
    reply.header('X-Request-Id', request.id);
  });
}
