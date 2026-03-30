import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { tenantWhere, assertTenantAccess } from '../../lib/tenant.js';

const createSchema = z.object({
  title:       z.string().min(2).max(200),
  type:        z.enum(['FOLLOWUP','RENEWAL','MANUAL','CALL','EMAIL','MEETING']).default('MANUAL'),
  priority:    z.enum(['LOW','MEDIUM','HIGH']).default('MEDIUM'),
  dueDate:     z.string().datetime(),
  notes:       z.string().max(2000).optional(),
  insuranceId: z.string().optional(),
  leadId:      z.string().optional(),
  userId:      z.string().optional(), // responsável — default: usuário logado
});

const updateSchema = z.object({
  title:       z.string().min(2).max(200).optional(),
  type:        z.enum(['FOLLOWUP','RENEWAL','MANUAL','CALL','EMAIL','MEETING']).optional(),
  priority:    z.enum(['LOW','MEDIUM','HIGH']).optional(),
  dueDate:     z.string().datetime().optional(),
  notes:       z.string().max(2000).optional(),
  completed:   z.boolean().optional(),
  userId:      z.string().optional(),
});

export default async function tasksRoutes(app) {

  // POST /tasks — criar tarefa
  app.post('/tasks', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const user   = request.currentUser;
    const data   = createSchema.parse(request.body);

    // Verifica que insurance/lead pertencem ao tenant
    if (data.insuranceId) {
      const ins = await prisma.insuranceRecord.findUnique({ where: { id: data.insuranceId } });
      if (!ins) return reply.code(404).send({ message: 'Seguro nao encontrado' });
      assertTenantAccess(request, ins, reply);
    }
    if (data.leadId) {
      const lead = await prisma.lead.findUnique({ where: { id: data.leadId } });
      if (!lead) return reply.code(404).send({ message: 'Lead nao encontrado' });
      assertTenantAccess(request, lead, reply);
    }

    const task = await prisma.task.create({
      data: {
        ...data,
        dueDate:  new Date(data.dueDate),
        userId:   data.userId ?? user.id,
        tenantId: request.tenantId ?? null,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return reply.code(201).send({ task });
  });

  // GET /tasks — listar tarefas
  app.get('/tasks', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request) => {
    const schema = z.object({
      page:        z.coerce.number().int().min(1).default(1),
      limit:       z.coerce.number().int().min(1).max(100).default(20),
      completed:   z.coerce.boolean().optional(),
      priority:    z.string().optional(),
      type:        z.string().optional(),
      insuranceId: z.string().optional(),
      leadId:      z.string().optional(),
      overdue:     z.coerce.boolean().optional(),
    });
    const { page, limit, completed, priority, type, insuranceId, leadId, overdue } = schema.parse(request.query);
    const skip = (page - 1) * limit;
    const user = request.currentUser;

    // BROKER só vê suas próprias tarefas
    const userFilter = user.role === 'BROKER' ? { userId: user.id } : {};

    const overdueFilter = overdue
      ? { completed: false, dueDate: { lt: new Date() } }
      : {};

    const where = tenantWhere(request, {
      ...userFilter,
      ...(completed !== undefined && !overdue ? { completed } : {}),
      ...(priority    ? { priority } : {}),
      ...(type        ? { type }     : {}),
      ...(insuranceId ? { insuranceId } : {}),
      ...(leadId      ? { leadId }      : {}),
      ...overdueFilter,
    });

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        skip,
        take:    limit,
        orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }],
        include: {
          user:            { select: { id: true, name: true } },
          insurance:       { select: { id: true, type: true, customerName: true } },
          lead:            { select: { id: true, name: true } },
        },
      }),
    ]);

    return { data: tasks, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  });

  // GET /tasks/summary — resumo para dashboard
  app.get('/tasks/summary', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request) => {
    const user  = request.currentUser;
    const now   = new Date();

    const userFilter = user.role === 'BROKER' ? { userId: user.id } : {};
    const base = tenantWhere(request, { ...userFilter, completed: false });

    const [pending, overdue, byType] = await Promise.all([
      prisma.task.count({ where: base }),
      prisma.task.count({ where: { ...base, dueDate: { lt: now } } }),
      prisma.task.groupBy({
        by:    ['type'],
        where: base,
        _count: { id: true },
      }),
    ]);

    return {
      pending,
      overdue,
      byType: Object.fromEntries(byType.map((t) => [t.type, t._count.id])),
    };
  });

  // GET /tasks/:id — detalhe
  app.get('/tasks/:id', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const { id } = request.params;
    const user   = request.currentUser;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        user:      { select: { id: true, name: true } },
        insurance: { select: { id: true, type: true, customerName: true, stage: true } },
        lead:      { select: { id: true, name: true, status: true } },
      },
    });

    if (!task) return reply.code(404).send({ message: 'Tarefa nao encontrada' });
    assertTenantAccess(request, task, reply);

    if (user.role === 'BROKER' && task.userId !== user.id) {
      return reply.code(403).send({ message: 'Sem permissao para ver esta tarefa' });
    }

    return { task };
  });

  // PATCH /tasks/:id — atualizar
  app.patch('/tasks/:id', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const { id } = request.params;
    const user   = request.currentUser;
    const data   = updateSchema.parse(request.body);

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return reply.code(404).send({ message: 'Tarefa nao encontrada' });
    assertTenantAccess(request, task, reply);

    if (user.role === 'BROKER' && task.userId !== user.id) {
      return reply.code(403).send({ message: 'Sem permissao para editar esta tarefa' });
    }

    const updateData = {
      ...data,
      ...(data.dueDate ? { dueDate: new Date(data.dueDate) } : {}),
      // Registra completedAt ao completar
      ...(data.completed === true  && !task.completed ? { completedAt: new Date() } : {}),
      ...(data.completed === false                    ? { completedAt: null }        : {}),
    };

    const updated = await prisma.task.update({
      where: { id },
      data:  updateData,
      include: { user: { select: { id: true, name: true } } },
    });

    return { task: updated };
  });

  // DELETE /tasks/:id — excluir
  app.delete('/tasks/:id', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const { id } = request.params;
    const user   = request.currentUser;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return reply.code(404).send({ message: 'Tarefa nao encontrada' });
    assertTenantAccess(request, task, reply);

    if (user.role === 'BROKER' && task.userId !== user.id) {
      return reply.code(403).send({ message: 'Sem permissao para excluir esta tarefa' });
    }

    await prisma.task.delete({ where: { id } });
    return reply.code(204).send();
  });
}
