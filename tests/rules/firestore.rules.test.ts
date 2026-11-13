import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

let env: RulesTestEnvironment;

const ts = () => Timestamp.now();
const user = (uid: string, over: Record<string, unknown> = {}) => ({
  uid, name: uid, email: `${uid}@liberty.com`, role: 'technician', team: 'back-office',
  position: 'Agente N1', active: true, createdAt: ts(), badges: [], structuredPDI: [], ...over,
});
const feedback = (id: string, over: Record<string, unknown> = {}) => ({
  id, technicianId: 'tech1', technicianName: 'tech1', supervisorId: 'sup1', type: 'positive',
  axis: 'Comunicação', description: 'Texto do feedback com tamanho suficiente.', status: 'pending',
  createdAt: ts(), ...over,
});
const auditLog = (id: string, over: Record<string, unknown> = {}) => ({
  id, timestamp: new Date().toISOString(), eventType: 'feedback_signature', entityId: 'fb1',
  technicianId: 'tech1', technicianName: 'tech1', details: 'x',
  hash: 'a'.repeat(64), signature: 'c2ln', publicKey: '{}', signerId: 'tech1', createdAt: serverTimestamp(), ...over,
});

const asSup = () => env.authenticatedContext('sup1', { email: 'sup1@liberty.com' }).firestore();
const asTech = () => env.authenticatedContext('tech1', { email: 'tech1@liberty.com' }).firestore();
const asOther = () => env.authenticatedContext('tech2', { email: 'tech2@liberty.com' }).firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-feed-track',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/sup1'), user('sup1', { role: 'supervisor' }));
    await setDoc(doc(db, 'users/tech1'), user('tech1', {
      structuredPDI: [{ id: 'g1', title: 'g', description: 'd', deadline: '2026-12-01', status: 'pending', createdAt: ts() }],
    }));
    await setDoc(doc(db, 'users/tech2'), user('tech2'));
    // Chaves ancoradas (publicKey '{}' é a usada pelos logs de teste)
    await setDoc(doc(db, 'signingKeys/sup1'), { uid: 'sup1', publicKey: '{}', createdAt: ts() });
    await setDoc(doc(db, 'signingKeys/tech1'), { uid: 'tech1', publicKey: '{}', createdAt: ts() });
    await setDoc(doc(db, 'feedbacks/fb1'), feedback('fb1'));
    await setDoc(doc(db, 'feedbacks/fb2'), feedback('fb2', { status: 'read', readAt: ts(), signedAt: ts() }));
  });
});

describe('users', () => {
  it('C1: técnico NÃO pode se reativar, trocar equipe/cargo/e-mail ou virar supervisor', async () => {
    await env.withSecurityRulesDisabled(async (c) => { await updateDoc(doc(c.firestore(), 'users/tech1'), { active: false }); });
    // desativado → perde qualquer acesso, inclusive de se reativar
    await assertFails(updateDoc(doc(asTech(), 'users/tech1'), { active: true }));
    await env.withSecurityRulesDisabled(async (c) => { await updateDoc(doc(c.firestore(), 'users/tech1'), { active: true }); });
    await assertFails(updateDoc(doc(asTech(), 'users/tech1'), { team: 'teleservice' }));
    await assertFails(updateDoc(doc(asTech(), 'users/tech1'), { position: 'Diretor' }));
    await assertFails(updateDoc(doc(asTech(), 'users/tech1'), { email: 'x@evil.com' }));
    await assertFails(updateDoc(doc(asTech(), 'users/tech1'), { role: 'supervisor' }));
    await assertFails(updateDoc(doc(asTech(), 'users/tech1'), { active: false }));
  });

  it('técnico pode atualizar nome, avançar o PDI e ganhar badge, mas não remover metas', async () => {
    await assertSucceeds(updateDoc(doc(asTech(), 'users/tech1'), { name: 'Novo Nome' }));
    await assertSucceeds(updateDoc(doc(asTech(), 'users/tech1'), {
      structuredPDI: [{ id: 'g1', title: 'g', description: 'd', deadline: '2026-12-01', status: 'completed', createdAt: ts() }],
    }));
    await assertFails(updateDoc(doc(asTech(), 'users/tech1'), { structuredPDI: [] }));
  });

  it('supervisor altera qualquer campo e exclui', async () => {
    await assertSucceeds(updateDoc(doc(asSup(), 'users/tech1'), { active: false, team: 'teleservice' }));
    await assertSucceeds(deleteDoc(doc(asSup(), 'users/tech2')));
  });

  it('auto-cadastro: só técnico, ativo, com o próprio e-mail, sem badges/PDI', async () => {
    const db = env.authenticatedContext('new1', { email: 'new1@liberty.com' }).firestore();
    await assertFails(setDoc(doc(db, 'users/new1'), user('new1', { role: 'supervisor' })));
    await assertFails(setDoc(doc(db, 'users/new1'), user('new1', { active: false })));
    await assertFails(setDoc(doc(db, 'users/new1'), user('new1', { email: 'outro@liberty.com' })));
    await assertFails(setDoc(doc(db, 'users/new1'), user('new1', { badges: [{ id: 'b' }] })));
    await assertFails(setDoc(doc(db, 'users/new1'), { ...user('new1'), isAdmin: true }));
    await assertSucceeds(setDoc(doc(db, 'users/new1'), user('new1')));
  });

  it('leitura: dono e supervisor; outro técnico não', async () => {
    await assertSucceeds(getDoc(doc(asTech(), 'users/tech1')));
    await assertSucceeds(getDoc(doc(asSup(), 'users/tech1')));
    await assertFails(getDoc(doc(asOther(), 'users/tech1')));
  });
});

describe('feedbacks', () => {
  it('C2: técnico NÃO altera conteúdo, destinatário nem assinatura existente', async () => {
    const ref = doc(asTech(), 'feedbacks/fb1');
    await assertFails(updateDoc(ref, { description: 'reescrito' }));
    await assertFails(updateDoc(ref, { type: 'development' }));
    await assertFails(updateDoc(ref, { technicianId: 'tech2' }));
    await assertFails(updateDoc(ref, { supervisorId: 'tech1' }));
    await assertFails(updateDoc(ref, { status: 'pending' }));
    await assertFails(updateDoc(doc(asTech(), 'feedbacks/fb2'), { signedAt: ts() })); // já assinado
  });

  it('técnico pode marcar lido e assinar o PRÓPRIO feedback; outro não', async () => {
    await assertSucceeds(updateDoc(doc(asTech(), 'feedbacks/fb1'), { status: 'read', readAt: ts(), signedAt: ts() }));
    await assertFails(updateDoc(doc(asOther(), 'feedbacks/fb1'), { status: 'read', readAt: ts() }));
  });

  it('criação: só supervisor, pendente, em seu nome e dentro do esquema', async () => {
    await assertSucceeds(setDoc(doc(asSup(), 'feedbacks/n1'), feedback('n1')));
    await assertFails(setDoc(doc(asTech(), 'feedbacks/n2'), feedback('n2', { supervisorId: 'tech1' })));
    await assertFails(setDoc(doc(asSup(), 'feedbacks/n3'), feedback('n3', { supervisorId: 'outro' })));
    await assertFails(setDoc(doc(asSup(), 'feedbacks/n4'), feedback('n4', { status: 'read' })));
    await assertFails(setDoc(doc(asSup(), 'feedbacks/n5'), feedback('n5', { signedAt: ts() })));
    await assertFails(setDoc(doc(asSup(), 'feedbacks/n6'), feedback('n6', { type: 'qualquer' })));
    await assertFails(setDoc(doc(asSup(), 'feedbacks/n7'), feedback('n7', { description: 'x'.repeat(4000) })));
  });

  it('leitura: técnico só os próprios', async () => {
    await assertSucceeds(getDoc(doc(asTech(), 'feedbacks/fb1')));
    await assertFails(getDoc(doc(asOther(), 'feedbacks/fb1')));
  });
});

describe('auditLogs', () => {
  it('C3: log de assinatura exige feedback real, do técnico, já assinado', async () => {
    await assertFails(setDoc(doc(asTech(), 'auditLogs/a1'), auditLog('a1', { entityId: 'fb1' })));      // fb1 não assinado
    await assertSucceeds(setDoc(doc(asTech(), 'auditLogs/a2'), auditLog('a2', { entityId: 'fb2' })));    // fb2 assinado
    await assertFails(setDoc(doc(asTech(), 'auditLogs/a3'), auditLog('a3', { entityId: 'inexistente' })));
    await assertFails(setDoc(doc(asOther(), 'auditLogs/a4'), auditLog('a4', { entityId: 'fb2', technicianId: 'tech2' }))); // fb2 é de tech1
    await assertFails(setDoc(doc(asOther(), 'auditLogs/a5'), auditLog('a5', { entityId: 'fb2' })));      // em nome de outro
  });

  it('exige createdAt do servidor, hash SHA-256 hex e campos conhecidos', async () => {
    await assertFails(setDoc(doc(asTech(), 'auditLogs/b1'), auditLog('b1', { entityId: 'fb2', createdAt: ts() })));
    await assertFails(setDoc(doc(asTech(), 'auditLogs/b2'), auditLog('b2', { entityId: 'fb2', hash: 'curto' })));
    await assertFails(setDoc(doc(asTech(), 'auditLogs/b3'), auditLog('b3', { entityId: 'fb2', signature: '' })));
    await assertFails(setDoc(doc(asTech(), 'auditLogs/b4'), { ...auditLog('b4', { entityId: 'fb2' }), extra: 1 }));
  });

  it('são imutáveis (nem supervisor atualiza/apaga)', async () => {
    await assertSucceeds(setDoc(doc(asTech(), 'auditLogs/c1'), auditLog('c1', { entityId: 'fb2' })));
    await assertFails(updateDoc(doc(asSup(), 'auditLogs/c1'), { details: 'adulterado' }));
    await assertFails(deleteDoc(doc(asSup(), 'auditLogs/c1')));
    await assertFails(deleteDoc(doc(asTech(), 'auditLogs/c1')));
  });

  it('âncora: a chave do log TEM de ser a registrada; signerId = quem está logado', async () => {
    await assertFails(setDoc(doc(asTech(), 'auditLogs/k1'), auditLog('k1', { entityId: 'fb2', publicKey: '{"outra":"chave"}' })));
    await assertFails(setDoc(doc(asTech(), 'auditLogs/k2'), auditLog('k2', { entityId: 'fb2', signerId: 'sup1' })));
    await assertSucceeds(setDoc(doc(asTech(), 'auditLogs/k3'), auditLog('k3', { entityId: 'fb2' })));
    // sem chave ancorada → sem log
    await env.withSecurityRulesDisabled(async (c) => { await deleteDoc(doc(c.firestore(), 'signingKeys/tech1')); });
    await assertFails(setDoc(doc(asTech(), 'auditLogs/k4'), auditLog('k4', { entityId: 'fb2' })));
  });

  it('conclusão de PDI: o próprio técnico ou supervisor', async () => {
    await assertSucceeds(setDoc(doc(asTech(), 'auditLogs/d1'), auditLog('d1', { eventType: 'pdi_goal_completion', entityId: 'g1' })));
    await assertSucceeds(setDoc(doc(asSup(), 'auditLogs/d2'), auditLog('d2', { eventType: 'pdi_goal_completion', entityId: 'g1', signerId: 'sup1' })));
    await assertFails(setDoc(doc(asOther(), 'auditLogs/d3'), auditLog('d3', { eventType: 'pdi_goal_completion', entityId: 'g1' })));
  });
});

describe('signingKeys (âncora de chaves)', () => {
  const key = (uid: string, over: Record<string, unknown> = {}) => ({ uid, publicKey: '{"k":1}', createdAt: serverTimestamp(), ...over });
  it('cria uma vez, só para si, com hora do servidor; é imutável', async () => {
    await assertSucceeds(setDoc(doc(asOther(), 'signingKeys/tech2'), key('tech2')));
    await assertFails(setDoc(doc(asOther(), 'signingKeys/tech2'), key('tech2', { publicKey: '{"k":2}' }))); // sobrescrever
    await assertFails(updateDoc(doc(asOther(), 'signingKeys/tech2'), { publicKey: '{"k":3}' }));
    await assertFails(setDoc(doc(asOther(), 'signingKeys/tech1x'), key('tech1x')));                          // em nome de outro
    await assertFails(setDoc(doc(asOther(), 'signingKeys/tech2b'), key('tech2b', { createdAt: ts() })));
  });
  it('leitura: dono e supervisor; reset só por supervisor', async () => {
    await assertSucceeds(getDoc(doc(asTech(), 'signingKeys/tech1')));
    await assertSucceeds(getDoc(doc(asSup(), 'signingKeys/tech1')));
    await assertFails(getDoc(doc(asOther(), 'signingKeys/tech1')));
    await assertFails(deleteDoc(doc(asTech(), 'signingKeys/tech1')));
    await assertSucceeds(deleteDoc(doc(asSup(), 'signingKeys/tech1')));
  });
});

describe('selfAssessments', () => {
  const sa = (id: string, over: Record<string, unknown> = {}) => ({
    id, technicianId: 'tech1', period: '2026-Q4', comments: 'ok', createdAt: ts(),
    scores: { communication: 4, teamwork: 4, technical: 4, proactivity: 4, attendance: 4 }, ...over,
  });
  it('cria a própria, valida notas e período, e não é editável pelo técnico', async () => {
    await assertSucceeds(setDoc(doc(asTech(), 'selfAssessments/s1'), sa('s1')));
    await assertFails(setDoc(doc(asTech(), 'selfAssessments/s2'), sa('s2', { technicianId: 'tech2' })));
    await assertFails(setDoc(doc(asTech(), 'selfAssessments/s3'), sa('s3', { scores: { communication: 9, teamwork: 4, technical: 4, proactivity: 4, attendance: 4 } })));
    await assertFails(setDoc(doc(asTech(), 'selfAssessments/s4'), sa('s4', { period: 'qualquer' })));
    await assertFails(updateDoc(doc(asTech(), 'selfAssessments/s1'), { comments: 'editado' }));
  });
});

describe('default deny', () => {
  it('coleções não declaradas e usuário anônimo', async () => {
    await assertFails(setDoc(doc(asSup(), 'outra/x'), { a: 1 }));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/tech1')));
  });
});
