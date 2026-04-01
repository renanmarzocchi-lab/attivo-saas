import { prisma } from './prisma.js';

function buildCode(name) {
  const prefix = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .padEnd(2, 'X');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${random}`;
}

export async function generateUniqueRefCode(name) {
  for (let i = 0; i < 10; i++) {
    const refCode = buildCode(name);
    const exists = await prisma.affiliate.findUnique({ where: { refCode } });
    if (!exists) return refCode;
  }
  throw new Error('Não foi possível gerar refCode único');
}
