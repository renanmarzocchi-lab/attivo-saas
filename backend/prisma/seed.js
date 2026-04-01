import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const email = process.env.MASTER_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.MASTER_ADMIN_PASSWORD;
  const name = process.env.MASTER_ADMIN_NAME || 'Administrador ATTIVO';
  const document = (process.env.MASTER_ADMIN_DOCUMENT || '').replace(/\D/g, '');
  if (!email || !password) throw new Error('Defina MASTER_ADMIN_EMAIL e MASTER_ADMIN_PASSWORD');
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, document, role: 'MASTER_ADMIN', status: 'ACTIVE' },
    create: { name, email, passwordHash, document, role: 'MASTER_ADMIN', status: 'ACTIVE' }
  });
  console.log('Seed concluído');
}
main().finally(async () => prisma.$disconnect());
