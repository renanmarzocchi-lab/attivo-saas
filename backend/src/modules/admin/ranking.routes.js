import { z } from 'zod';
import { getBrokerRanking, getPremiumTimeSeries } from '../../services/ranking.service.js';

export default async function rankingRoutes(app) {

  // GET /admin/ranking — ranking de corretores no período
  app.get('/admin/ranking', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const schema = z.object({
      from:  z.string().optional(), // ISO date YYYY-MM-DD
      to:    z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    });
    const { from, to, limit } = schema.parse(request.query);

    // Default: mês corrente
    const now   = new Date();
    const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = to   ? new Date(to)   : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const ranking = await getBrokerRanking({
      from:     start,
      to:       end,
      tenantId: request.tenantId ?? null,
      limit,
    });

    return {
      data:   ranking,
      period: { from: start.toISOString(), to: end.toISOString() },
    };
  });

  // GET /admin/ranking/timeseries — evolução mensal de prêmios
  app.get('/admin/ranking/timeseries', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const { months } = z.object({
      months: z.coerce.number().int().min(1).max(24).default(6),
    }).parse(request.query);

    const series = await getPremiumTimeSeries({
      tenantId: request.tenantId ?? null,
      months,
    });

    return { data: series };
  });
}
