import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
export const normalizeEmail = (v) => v?.trim().toLowerCase();
export const normalizeDocument = (v) => v?.replace(/\D/g, '');
