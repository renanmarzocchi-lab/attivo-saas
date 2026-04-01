import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { uploadFile, removeFile } from '../../integrations/storage/index.js';

export default async function attachmentRoutes(app) {

  // POST /broker/insurance/:id/attachments — upload de arquivo
  app.post('/broker/insurance/:id/attachments', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const { id } = request.params;
    const user = request.currentUser;

    // Carrega o registro para verificar permissão
    const record = await prisma.insuranceRecord.findUnique({ where: { id } });
    if (!record) return reply.code(404).send({ message: 'Registro não encontrado' });

    // BROKER só faz upload em registros próprios
    if (user.role === 'BROKER' && record.createdByUserId !== user.id) {
      return reply.code(403).send({ message: 'Sem permissão para anexar neste registro' });
    }

    // Lê o multipart
    const data = await request.file();
    if (!data) return reply.code(400).send({ message: 'Nenhum arquivo enviado' });

    const chunks = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    if (buffer.length === 0) {
      return reply.code(400).send({ message: 'Arquivo vazio' });
    }

    try {
      const { storedFileName, fileUrl, mimeType, size, provider } = await uploadFile({
        originalFileName: data.filename,
        buffer,
        mimeType: data.mimetype,
      });

      const attachment = await prisma.insuranceAttachment.create({
        data: {
          insuranceRecordId: id,
          originalFileName:  data.filename,
          storedFileName,
          fileUrl,
          mimeType,
          size,
          storageProvider:   provider,
          uploadedByUserId:  user.id,
        },
      });

      logger.info(
        { attachmentId: attachment.id, insuranceRecordId: id, uploadedBy: user.id },
        'Anexo criado',
      );

      return reply.code(201).send({ attachment });
    } catch (err) {
      if (err.statusCode === 413 || err.statusCode === 415) {
        return reply.code(err.statusCode).send({ message: err.message });
      }
      throw err;
    }
  });

  // DELETE /broker/insurance/:id/attachments/:attachmentId
  app.delete('/broker/insurance/:id/attachments/:attachmentId', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const { id, attachmentId } = request.params;
    const user = request.currentUser;

    const attachment = await prisma.insuranceAttachment.findUnique({
      where: { id: attachmentId },
      include: { insuranceRecord: { select: { createdByUserId: true } } },
    });
    if (!attachment || attachment.insuranceRecordId !== id) {
      return reply.code(404).send({ message: 'Anexo não encontrado' });
    }

    if (user.role === 'BROKER' && attachment.insuranceRecord.createdByUserId !== user.id) {
      return reply.code(403).send({ message: 'Sem permissão' });
    }

    await removeFile(attachment.storedFileName).catch(() => {});
    await prisma.insuranceAttachment.delete({ where: { id: attachmentId } });

    logger.info({ attachmentId, deletedBy: user.id }, 'Anexo removido');
    return { message: 'Anexo removido' };
  });

  // GET /broker/insurance/:id/attachments
  app.get('/broker/insurance/:id/attachments', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const { id } = request.params;
    const attachments = await prisma.insuranceAttachment.findMany({
      where:   { insuranceRecordId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, originalFileName: true, fileUrl: true,
        mimeType: true, size: true, storageProvider: true, createdAt: true,
        uploadedBy: { select: { name: true } },
      },
    });
    return { attachments };
  });
}
