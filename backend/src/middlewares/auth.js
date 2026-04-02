import { prisma } from '../lib/prisma.js';

/**
 * Verifica JWT, carrega usuário do banco e popula request com contexto.
 *
 * Após authenticate():
 *   request.currentUser → objeto User completo
 *   request.tenantId    → string (tenantId do user) ou null (admin global)
 */
export async function authenticate(request, reply) {
  try {
    await request.jwtVerify();

    const user = await prisma.user.findUnique({ where: { id: request.user.sub } });
    if (!user) return reply.code(401).send({ message: 'Sessão inválida. Faça login novamente.' });
    if (user.status !== 'ACTIVE') return reply.code(403).send({ message: 'Usuário inativo ou bloqueado. Entre em contato com o administrador.' });

    request.currentUser = user;
    // tenantId resolvido uma vez aqui — disponível em todas as rotas via request.tenantId
    request.tenantId    = user.tenantId ?? null;
  } catch {
    return reply.code(401).send({ message: 'Não autenticado. Faça login para continuar.' });
  }
}

/**
 * Autoriza apenas os roles listados.
 * Deve ser encadeado APÓS authenticate().
 */
export function authorize(...roles) {
  return async (request, reply) => {
    if (!request.currentUser || !roles.includes(request.currentUser.role)) {
      return reply.code(403).send({ message: 'Você não tem permissão para acessar este recurso.' });
    }
  };
}
