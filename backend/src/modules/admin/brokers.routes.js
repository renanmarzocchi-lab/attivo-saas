import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma.js';

export default async function adminBrokersRoutes(app) {

  // GET /admin/brokers — lista corretores
  app.get('/admin/brokers', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const schema = z.object({
      page:   z.coerce.number().int().min(1).default(1),
      limit:  z.coerce.number().int().min(1).max(100).default(20),
      search: z.string().optional(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional(),
    });
    const { page, limit, search, status } = schema.parse(request.query);
    const skip = (page - 1) * limit;

    const where = {
      role: { in: ['BROKER', 'MASTER_ADMIN'] },
      ...(status ? { status } : {}),
      ...(search ? { OR: [
        { name:  { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]} : {}),
    };

    const [total, brokers] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, role: true, status: true,
          commissionRate: true, pixKey: true, createdAt: true,
          _count: { select: { ownedInsurances: true, brokerCommissions: true } },
        },
      }),
    ]);

    return { data: brokers, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  });

  // POST /admin/brokers — cria corretor
  app.post('/admin/brokers', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const schema = z.object({
      name:           z.string().min(2).max(200),
      email:          z.string().email(),
      password:       z.string().min(8),
      commissionRate: z.number().min(0).max(1).default(0),
      pixKey:         z.string().optional(),
      status:         z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
    });
    const data = schema.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return reply.code(409).send({ message: 'E-mail já cadastrado' });

    const passwordHash = await bcrypt.hash(data.password, 12);

    const broker = await prisma.user.create({
      data: {
        name:           data.name,
        email:          data.email,
        passwordHash,
        role:           'BROKER',
        status:         data.status,
        commissionRate: data.commissionRate,
        pixKey:         data.pixKey ?? null,
      },
      select: {
        id: true, name: true, email: true, role: true, status: true,
        commissionRate: true, pixKey: true, createdAt: true,
      },
    });

    return reply.code(201).send({ broker });
  });

  // GET /admin/brokers/:id — detalhe do corretor
  app.get('/admin/brokers/:id', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params;
    const broker = await prisma.user.findUnique({
      where:  { id },
      select: {
        id: true, name: true, email: true, role: true, status: true,
        commissionRate: true, pixKey: true, createdAt: true,
        _count: { select: { ownedInsurances: true, brokerCommissions: true } },
      },
    });
    if (!broker || !['BROKER', 'MASTER_ADMIN'].includes(broker.role))
      return reply.code(404).send({ message: 'Corretor não encontrado' });
    return { broker };
  });

  // PATCH /admin/brokers/:id — atualiza corretor
  app.patch('/admin/brokers/:id', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id }  = request.params;
    const schema = z.object({
      name:           z.string().min(2).max(200).optional(),
      commissionRate: z.number().min(0).max(1).optional(),
      pixKey:         z.string().optional().nullable(),
      status:         z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional(),
      password:       z.string().min(8).optional(),
    });
    const data = schema.parse(request.body);

    const broker = await prisma.user.findUnique({ where: { id } });
    if (!broker || !['BROKER', 'MASTER_ADMIN'].includes(broker.role))
      return reply.code(404).send({ message: 'Corretor não encontrado' });

    const updateData = {};
    if (data.name           !== undefined) updateData.name           = data.name;
    if (data.commissionRate !== undefined) updateData.commissionRate = data.commissionRate;
    if (data.pixKey         !== undefined) updateData.pixKey         = data.pixKey;
    if (data.status         !== undefined) updateData.status         = data.status;
    if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 12);

    const updated = await prisma.user.update({
      where:  { id },
      data:   updateData,
      select: {
        id: true, name: true, email: true, role: true, status: true,
        commissionRate: true, pixKey: true,
      },
    });

    return { broker: updated };
  });

  // GET /admin/affiliates/:id/commission-rate — retorna taxa de comissão do afiliado
  app.get('/admin/affiliates/:id/commission-rate', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const { id } = request.params;
    const affiliate = await prisma.affiliate.findUnique({
      where:  { id },
      select: { commissionRate: true, name: true, status: true },
    });
    if (!affiliate) return reply.code(404).send({ message: 'Afiliado não encontrado' });
    return { commissionRate: Number(affiliate.commissionRate), name: affiliate.name, status: affiliate.status };
  });
}
