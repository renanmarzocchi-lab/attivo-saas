import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';

export default async function referralRoutes(app) {

  // POST /referrals/track — registra clique (público, falha silenciosa)
  app.post('/referrals/track', async (request, reply) => {
    try {
      const schema = z.object({
        ref:         z.string().min(1),
        url:         z.string().optional(),
        utmSource:   z.string().optional(),
        utmMedium:   z.string().optional(),
        utmCampaign: z.string().optional(),
      });

      const data = schema.parse(request.body);
      const affiliate = await prisma.affiliate.findUnique({ where: { refCode: data.ref } });

      if (affiliate && affiliate.status === 'ACTIVE') {
        await prisma.affiliateClick.create({
          data: {
            affiliateId: affiliate.id,
            refCode:     data.ref,
            url:         data.url,
            ipAddress:   request.ip,
            userAgent:   request.headers['user-agent'],
            utmSource:   data.utmSource,
            utmMedium:   data.utmMedium,
            utmCampaign: data.utmCampaign,
          },
        });
      }
    } catch {
      // falha silenciosa: tracking nunca quebra o frontend
    }
    return reply.code(204).send();
  });

  // POST /referrals/lead — registra lead (público, falha silenciosa)
  app.post('/referrals/lead', async (request, reply) => {
    try {
      const schema = z.object({
        ref:    z.string().min(1),
        name:   z.string().optional(),
        email:  z.string().email().optional(),
        phone:  z.string().optional(),
        source: z.string().optional(),
      });

      const data = schema.parse(request.body);
      const affiliate = await prisma.affiliate.findUnique({ where: { refCode: data.ref } });

      if (affiliate && affiliate.status === 'ACTIVE') {
        await prisma.affiliateLead.create({
          data: {
            affiliateId: affiliate.id,
            refCode:     data.ref,
            name:        data.name,
            email:       data.email,
            phone:       data.phone,
            source:      data.source,
          },
        });
      }
    } catch {
      // falha silenciosa
    }
    return reply.code(204).send();
  });
}
