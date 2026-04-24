/**
 * Helpers de tenant isolation.
 *
 * Estratégia:
 *  - Cada usuário tem request.tenantId (null para admins globais sem tenant)
 *  - tenantWhere()       → adiciona filtro { tenantId } nas queries Prisma
 *  - assertTenantAccess() → valida que um record pertence ao tenant do usuário
 *
 * Regras:
 *  - request.tenantId === null → acesso global (sem filtro) — platform admin
 *  - request.tenantId === 'some-id' → filtrado ao tenant
 *
 * Como o tenantId chega no request:
 *  O middleware auth.js já define request.tenantId = currentUser.tenantId ?? null
 *  (ver middlewares/auth.js)
 */

/**
 * Constrói a cláusula WHERE do Prisma incluindo filtro de tenant se necessário.
 *
 * @param {import('fastify').FastifyRequest} request - request com .tenantId
 * @param {Object} extra - filtros adicionais a mesclar
 * @returns {Object} objeto where para uso no Prisma
 *
 * @example
 * // BROKER com tenantId='abc' → { tenantId: 'abc', stage: 'LEAD' }
 * // MASTER_ADMIN sem tenant  → { stage: 'LEAD' }
 * const where = tenantWhere(request, { stage: 'LEAD' });
 */
export function tenantWhere(request, extra = {}) {
  const { tenantId } = request;
  if (!tenantId) return extra;       // admin global: sem restrição de tenant
  return { ...extra, tenantId };
}

/**
 * Lança erro 403 se o record pertencer a um tenant diferente do usuário.
 * No-op para usuários sem tenant (acesso global).
 *
 * Uso obrigatório em GET/:id, PATCH e DELETE para evitar IDOR.
 *
 * @param {import('fastify').FastifyRequest} request
 * @param {{ tenantId?: string|null }} record - qualquer objeto com campo tenantId
 * @param {import('fastify').FastifyReply}  reply
 * @throws {Error} lança 'TENANT_FORBIDDEN' para abortar o handler
 */
export function assertTenantAccess(request, record, reply) {
  const { tenantId } = request;
  if (!tenantId) return; // admin global: passa sempre

  // Se o record tem tenantId e é diferente do usuário → negar
  if (record.tenantId && record.tenantId !== tenantId) {
    reply.code(403).send({ message: 'Acesso negado — recurso de outro tenant' });
    throw new Error('TENANT_FORBIDDEN');
  }
}

/**
 * Retorna tenantId do request para propagar ao criar novos records.
 * Garante que novos registros sejam sempre criados no tenant correto.
 *
 * @param {import('fastify').FastifyRequest} request
 * @returns {string|null}
 */
export function resolveTenantId(request) {
  return request.tenantId ?? null;
}
