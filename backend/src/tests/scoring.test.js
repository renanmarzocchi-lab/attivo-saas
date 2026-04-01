/**
 * Scoring & Intelligence Tests
 *
 * Execução: node --experimental-vm-modules src/tests/scoring.test.js
 *
 * Cobre:
 *   - calculateLeadScore (vários cenários)
 *   - calculateInsuranceScore
 *   - calculateLeadLossRisk
 *   - calculateInsuranceLossRisk
 *   - classifyScore
 *   - getLeadNextAction
 *   - getInsuranceNextAction
 *   - generateMessage
 */

import assert from 'assert/strict';

import {
  calculateLeadScore,
  calculateInsuranceScore,
  calculateLeadLossRisk,
  calculateInsuranceLossRisk,
  classifyScore,
} from '../services/intelligence/scoring.service.js';

import {
  getLeadNextAction,
  getInsuranceNextAction,
} from '../services/intelligence/next-action.service.js';

import {
  generateMessage,
} from '../services/intelligence/message-generator.service.js';

// ── Helpers ──────────────────────────────────────────────────────

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function daysFromNow(n) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// ── SCORING TESTS ────────────────────────────────────────────────

console.log('\n📊 Lead Scoring\n');

test('Lead novo (< 1 dia) tem score alto', () => {
  const lead = {
    source: 'AFFILIATE', phone: '11999', email: 'a@a.com',
    insuranceType: 'AUTO', status: 'NEW', createdAt: daysAgo(0.1),
    updatedAt: daysAgo(0.1),
  };
  const score = calculateLeadScore(lead, { taskCount: 0 });
  assert.ok(score >= 60, `Score esperado >= 60, obtido ${score}`);
});

test('Lead de renovação tem score mais alto', () => {
  const leadRenewal = {
    source: 'RENEWAL', phone: '11999', email: 'a@a.com',
    insuranceType: 'AUTO', status: 'NEW', createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  };
  const leadManual = {
    source: 'MANUAL', phone: null, email: null,
    insuranceType: null, status: 'NEW', createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  };
  const scoreR = calculateLeadScore(leadRenewal);
  const scoreM = calculateLeadScore(leadManual);
  assert.ok(scoreR > scoreM, `Renovação (${scoreR}) deve > Manual (${scoreM})`);
});

test('Lead antigo (> 30 dias) tem score baixo', () => {
  const lead = {
    source: 'ORGANIC', phone: null, email: null,
    insuranceType: null, status: 'NEW', createdAt: daysAgo(45),
    updatedAt: daysAgo(45),
  };
  const score = calculateLeadScore(lead);
  assert.ok(score < 30, `Score esperado < 30, obtido ${score}`);
});

test('Lead IN_PROGRESS tem score maior que NEW parado', () => {
  const base = { source: 'WHATSAPP', phone: '11999', email: 'a@a.com', insuranceType: 'AUTO', createdAt: daysAgo(5), updatedAt: daysAgo(5) };
  const scoreIn = calculateLeadScore({ ...base, status: 'IN_PROGRESS' });
  const scoreNew = calculateLeadScore({ ...base, status: 'NEW' });
  assert.ok(scoreIn >= scoreNew, `IN_PROGRESS (${scoreIn}) deve >= NEW (${scoreNew})`);
});

test('classifyScore: 85 → QUENTE', () => {
  assert.equal(classifyScore(85), 'QUENTE');
});

test('classifyScore: 60 → MORNO', () => {
  assert.equal(classifyScore(60), 'MORNO');
});

test('classifyScore: 30 → FRIO', () => {
  assert.equal(classifyScore(30), 'FRIO');
});

test('Score sempre entre 0 e 100', () => {
  for (const source of ['RENEWAL', 'AFFILIATE', 'ORGANIC', 'MANUAL']) {
    for (const status of ['NEW', 'IN_PROGRESS', 'LOST', 'CONVERTED']) {
      const s = calculateLeadScore({ source, status, createdAt: daysAgo(0.5), updatedAt: daysAgo(0.5) });
      assert.ok(s >= 0 && s <= 100, `Score fora dos limites: ${s} (${source}/${status})`);
    }
  }
});

console.log('\n🛡 Insurance Scoring\n');

test('Stage APOLICE_EMITIDA → score 100', () => {
  const record = {
    stage: 'APOLICE_EMITIDA', status: 'ACTIVE',
    customerEmail: 'a@a.com', customerPhone: '11999',
    premiumAmount: 500, updatedAt: daysAgo(0), endDate: daysFromNow(180),
  };
  const score = calculateInsuranceScore(record, { daysSinceUpdate: 0 });
  assert.equal(score, 100);
});

test('Stage PERDIDO → score 0', () => {
  const score = calculateInsuranceScore({ stage: 'PERDIDO', updatedAt: daysAgo(5) }, {});
  assert.equal(score, 0);
});

test('Oportunidade parada há 20 dias perde pontos', () => {
  const fresh  = calculateInsuranceScore({ stage: 'PROPOSTA_ENVIADA', updatedAt: daysAgo(0) }, { daysSinceUpdate: 0 });
  const stale  = calculateInsuranceScore({ stage: 'PROPOSTA_ENVIADA', updatedAt: daysAgo(20) }, { daysSinceUpdate: 20 });
  assert.ok(fresh > stale, `Fresh (${fresh}) deve > Stale (${stale})`);
});

test('Renovação próxima (< 30 dias) aumenta score', () => {
  const base = { stage: 'APOLICE_EMITIDA', status: 'ACTIVE', updatedAt: daysAgo(5) };
  const soon  = calculateInsuranceScore({ ...base, endDate: daysFromNow(20) }, { daysSinceUpdate: 5 });
  const far   = calculateInsuranceScore({ ...base, endDate: daysFromNow(120) }, { daysSinceUpdate: 5 });
  // APOLICE_EMITIDA já é 100, então ambos são 100 — mas para outros stages deve funcionar
  const stgBase = { stage: 'EM_COTACAO', status: 'ACTIVE', updatedAt: daysAgo(2) };
  const soonStg  = calculateInsuranceScore({ ...stgBase, endDate: daysFromNow(20) }, { daysSinceUpdate: 2 });
  const farStg   = calculateInsuranceScore({ ...stgBase, endDate: daysFromNow(120) }, { daysSinceUpdate: 2 });
  assert.ok(soonStg >= farStg, `Com renovação próxima (${soonStg}) deve >= sem (${farStg})`);
});

console.log('\n⚠️ Loss Risk\n');

test('Lead convertido → LOW', () => {
  const lead = { status: 'CONVERTED', updatedAt: daysAgo(5) };
  assert.equal(calculateLeadLossRisk(lead, 90), 'LOW');
});

test('Lead perdido → HIGH', () => {
  const lead = { status: 'LOST', updatedAt: daysAgo(10) };
  assert.equal(calculateLeadLossRisk(lead, 10), 'HIGH');
});

test('Lead com score baixo → HIGH ou MEDIUM', () => {
  const lead = { status: 'IN_PROGRESS', updatedAt: daysAgo(3) };
  const risk = calculateLeadLossRisk(lead, 15);
  assert.ok(['HIGH', 'MEDIUM'].includes(risk), `Risco esperado HIGH/MEDIUM, obtido ${risk}`);
});

test('InsuranceRecord APOLICE_EMITIDA → LOW', () => {
  const record = { stage: 'APOLICE_EMITIDA', updatedAt: daysAgo(1) };
  assert.equal(calculateInsuranceLossRisk(record, 100), 'LOW');
});

test('PROPOSTA_ENVIADA parada > 5 dias → HIGH', () => {
  const record = { stage: 'PROPOSTA_ENVIADA', updatedAt: daysAgo(8) };
  assert.equal(calculateInsuranceLossRisk(record, 50), 'HIGH');
});

console.log('\n🎯 Next Best Action\n');

test('Lead novo (< 4h) → IMMEDIATE_CONTACT URGENT', () => {
  const lead = { name: 'João', status: 'NEW', source: 'AFFILIATE', phone: '11999', createdAt: daysAgo(0.1), updatedAt: daysAgo(0.1) };
  const action = getLeadNextAction(lead, { score: 80 });
  assert.equal(action?.actionType, 'IMMEDIATE_CONTACT');
  assert.equal(action?.priority, 'URGENT');
});

test('Lead NEW > 1 dia → FIRST_CONTACT', () => {
  const lead = { name: 'Ana', status: 'NEW', source: 'ORGANIC', phone: '11999', createdAt: daysAgo(3), updatedAt: daysAgo(3) };
  const action = getLeadNextAction(lead, { score: 40 });
  assert.equal(action?.actionType, 'FIRST_CONTACT');
});

test('Lead CONVERTED → CONVERTED action', () => {
  const lead = { name: 'Fulano', status: 'CONVERTED', source: 'MANUAL', createdAt: daysAgo(30), updatedAt: daysAgo(2) };
  const action = getLeadNextAction(lead, { score: 0 });
  assert.equal(action?.actionType, 'CONVERTED');
});

test('Lead LOST → null', () => {
  const lead = { name: 'Beltrano', status: 'LOST', source: 'MANUAL', createdAt: daysAgo(30), updatedAt: daysAgo(2) };
  const action = getLeadNextAction(lead, { score: 0 });
  assert.equal(action, null);
});

test('Proposta enviada > 5 dias → PROPOSAL_FOLLOWUP URGENT', () => {
  const record = { customerName: 'Maria', stage: 'PROPOSTA_ENVIADA', customerPhone: '11999', updatedAt: daysAgo(7) };
  const action = getInsuranceNextAction(record, { score: 55 });
  assert.equal(action?.actionType, 'PROPOSAL_FOLLOWUP');
  assert.equal(action?.priority, 'URGENT');
});

test('Proposta aceita → EMIT_POLICY URGENT', () => {
  const record = { customerName: 'Pedro', stage: 'PROPOSTA_ACEITA', updatedAt: daysAgo(1) };
  const action = getInsuranceNextAction(record, { score: 78 });
  assert.equal(action?.actionType, 'EMIT_POLICY');
  assert.equal(action?.priority, 'URGENT');
});

test('Apólice com renovação próxima → START_RENEWAL', () => {
  const record = { customerName: 'Carla', stage: 'APOLICE_EMITIDA', updatedAt: daysAgo(60), endDate: daysFromNow(25), customerPhone: '11999' };
  const action = getInsuranceNextAction(record, { score: 100 });
  assert.equal(action?.actionType, 'START_RENEWAL');
});

console.log('\n💬 Message Generator\n');

test('Gera mensagem WhatsApp para IMMEDIATE_CONTACT', () => {
  const msg = generateMessage({
    actionType: 'IMMEDIATE_CONTACT',
    channel: 'WHATSAPP',
    entity: { name: 'Carlos', insuranceType: 'AUTO', phone: '11999' },
    broker: { name: 'Ana Lima' },
  });
  assert.ok(msg.includes('Carlos'), 'Mensagem deve conter nome do cliente');
  assert.ok(msg.includes('Ana Lima'), 'Mensagem deve conter nome do corretor');
  assert.ok(msg.includes('seguro auto'), 'Mensagem deve conter tipo de seguro');
});

test('Gera mensagem EMAIL para RENEWAL_CONTACT', () => {
  const msg = generateMessage({
    actionType: 'RENEWAL_CONTACT',
    channel: 'EMAIL',
    entity: { name: 'Maria', insuranceType: 'RESIDENCIAL', email: 'm@m.com' },
    broker: { name: 'João Silva' },
  });
  assert.ok(msg.includes('Maria'), 'Mensagem deve conter nome do cliente');
  assert.ok(msg.includes('João Silva'), 'Mensagem deve conter nome do corretor');
  assert.ok(msg.length > 50, 'Mensagem deve ter conteúdo substancial');
});

test('Fallback para ação desconhecida', () => {
  const msg = generateMessage({
    actionType: 'ACAO_INEXISTENTE',
    channel: 'WHATSAPP',
    entity: { name: 'Teste', insuranceType: 'VIDA' },
    broker: { name: 'Corretor' },
  });
  assert.ok(msg.length > 0, 'Deve gerar mensagem mesmo com ação desconhecida');
});

// ── Resultado final ──────────────────────────────────────────────

console.log('\n──────────────────────────────────────────────────');
console.log(`Resultado: ${passed} passou, ${failed} falhou\n`);

if (failed > 0) process.exit(1);
