/**
 * Testes: Renewal — idempotência, RenewalRunLog
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma }           from '../lib/prisma.js';
import { runRenewalCheck }  from '../services/renewal.service.js';

const testRunDate = `9999-01-01`; // data futura improvável de conflitar

beforeAll(async () => {
  // Limpa log de execução de teste se existir
  await prisma.renewalRunLog.deleteMany({ where: { runDate: testRunDate } });
});

afterAll(async () => {
  await prisma.renewalRunLog.deleteMany({ where: { runDate: testRunDate } });
});

describe('runRenewalCheck — idempotência', () => {
  it('executa com sucesso na primeira vez', async () => {
    const result = await runRenewalCheck(testRunDate);
    expect(result.skipped).toBeFalsy();
    expect(result.runDate).toBe(testRunDate);
    expect(typeof result.processedCount).toBe('number');
  });

  it('aborta na segunda chamada com mesma runDate', async () => {
    const result = await runRenewalCheck(testRunDate);
    expect(result.skipped).toBe(true);
    expect(result.runDate).toBe(testRunDate);
  });

  it('cria exatamente 1 RenewalRunLog por runDate', async () => {
    const count = await prisma.renewalRunLog.count({ where: { runDate: testRunDate } });
    expect(count).toBe(1);
  });
});
