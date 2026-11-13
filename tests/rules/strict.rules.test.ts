import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';

// Modo estrito: PDI/badges só pelo servidor (Cloud Functions) ou supervisor.
let env: RulesTestEnvironment;
const ts = () => Timestamp.now();
const user = (uid: string, over: Record<string, unknown> = {}) => ({
  uid, name: uid, email: `${uid}@liberty.com`, role: 'technician', team: 'back-office', position: 'Agente N1',
  active: true, createdAt: ts(), badges: [], structuredPDI: [
    { id: 'g1', title: 'g', description: 'd', deadline: '2026-12-01', status: 'pending', createdAt: ts() },
  ], ...over,
});
const asTech = () => env.authenticatedContext('tech1', { email: 'tech1@liberty.com' }).firestore();
const asSup = () => env.authenticatedContext('sup1', { email: 'sup1@liberty.com' }).firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-feed-track-strict', firestore: { rules: readFileSync('firestore.strict.rules', 'utf8') } });
});
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), 'users/sup1'), user('sup1', { role: 'supervisor', structuredPDI: [] }));
    await setDoc(doc(c.firestore(), 'users/tech1'), user('tech1'));
  });
});

describe('regras estritas', () => {
  it('técnico NÃO escreve PDI nem badges (nem se auto-concede conclusão)', async () => {
    await assertFails(updateDoc(doc(asTech(), 'users/tech1'), {
      structuredPDI: [{ id: 'g1', title: 'g', description: 'd', deadline: '2026-12-01', status: 'completed', createdAt: ts() }],
    }));
    await assertFails(updateDoc(doc(asTech(), 'users/tech1'), { badges: [{ id: 'badge_pdi_completed' }] }));
  });
  it('técnico ainda edita dados cadastrais leves', async () => {
    await assertSucceeds(updateDoc(doc(asTech(), 'users/tech1'), { name: 'Novo', phone: '1199999' }));
  });
  it('supervisor continua gerenciando metas', async () => {
    await assertSucceeds(updateDoc(doc(asSup(), 'users/tech1'), { structuredPDI: [] }));
  });
});
