import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, Timestamp, updateDoc, where,
} from 'firebase/firestore';

const WEEK = '2026-11-09';
const JPEG = 'data:image/jpeg;base64,' + 'A'.repeat(200);
const ts = () => Timestamp.now();

describe.each(['firestore.rules', 'firestore.strict.rules'])('home office — %s', (rulesFile) => {
  let env: RulesTestEnvironment;
  const user = (uid: string, over: Record<string, unknown> = {}) => ({
    uid, name: uid, email: `${uid}@liberty.com`, role: 'technician', team: 'teleservice', position: 'N1',
    active: true, createdAt: ts(), badges: [], structuredPDI: [], ...over,
  });
  const point = (id: string, over: Record<string, unknown> = {}) => ({
    id, technicianId: 'tech1', technicianName: 'tech1', team: 'teleservice', weekId: WEEK,
    categoryId: 'n2_return', categoryLabel: 'Card devolvido', points: 10, note: 'Card 4821 voltou sem evidência',
    occurredOn: '2026-11-11', hasEvidence: true, status: 'active', createdBy: 'sup1', createdAt: ts(), ...over,
  });
  const evidence = (pointId: string, over: Record<string, unknown> = {}) => ({
    pointId, technicianId: 'tech1', team: 'teleservice', weekId: WEEK, dataUrl: JPEG, createdBy: 'sup1', createdAt: ts(), ...over,
  });
  const week = (techId = 'tech1', over: Record<string, unknown> = {}) => ({
    id: `${WEEK}_${techId}`, technicianId: techId, technicianName: techId, team: 'teleservice', weekId: WEEK,
    score: 60, threshold: 70, eligible: false, closedBy: 'sup1', closedAt: serverTimestamp(), ...over,
  });
  const asSup = () => env.authenticatedContext('sup1', { email: 'sup1@liberty.com' }).firestore();
  const asTech = () => env.authenticatedContext('tech1', { email: 'tech1@liberty.com' }).firestore();
  const asOther = () => env.authenticatedContext('tech2', { email: 'tech2@liberty.com' }).firestore();
  const asBackOfficeSup = () => env.authenticatedContext('supB', { email: 'supB@liberty.com' }).firestore();
  const seed = (fn: (db: ReturnType<typeof asSup>) => Promise<unknown>) =>
    env.withSecurityRulesDisabled(async (c) => { await fn(c.firestore() as unknown as ReturnType<typeof asSup>); });
  const closeWeek = () => seed((db) => setDoc(doc(db, `homeOfficeWeeks/${WEEK}_tech1`), { ...week(), closedAt: ts() }));

  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: `demo-ho-${rulesFile.replace(/\W/g, '-')}`,
      firestore: { rules: readFileSync(rulesFile, 'utf8') },
    });
  });
  afterAll(async () => { await env.cleanup(); });
  beforeEach(async () => {
    await env.clearFirestore();
    await seed(async (db) => {
      await setDoc(doc(db, 'users/sup1'), user('sup1', { role: 'supervisor' }));
      await setDoc(doc(db, 'users/supB'), user('supB', { role: 'supervisor', team: 'back-office', managedTeam: 'back-office' }));
      await setDoc(doc(db, 'users/tech1'), user('tech1'));
      await setDoc(doc(db, 'users/tech2'), user('tech2'));
      await setDoc(doc(db, 'signingKeys/tech1'), { uid: 'tech1', publicKey: '{}', createdAt: ts() });
      await setDoc(doc(db, 'homeOfficePoints/p1'), point('p1'));
      await setDoc(doc(db, 'homeOfficeEvidence/p1'), evidence('p1'));
    });
  });

  it('supervisor lança ponto e evidência; técnico não', async () => {
    await assertSucceeds(setDoc(doc(asSup(), 'homeOfficePoints/n1'), point('n1')));
    await assertSucceeds(setDoc(doc(asSup(), 'homeOfficeEvidence/n1'), evidence('n1')));
    await assertFails(setDoc(doc(asTech(), 'homeOfficePoints/n2'), point('n2', { createdBy: 'tech1' })));
    await assertFails(setDoc(doc(asTech(), 'homeOfficeEvidence/n2'), evidence('n2', { createdBy: 'tech1' })));
  });

  it('valida o lançamento: autor, equipe real, pontos, observação, datas e estado inicial', async () => {
    const bad = (id: string, over: Record<string, unknown>) => assertFails(setDoc(doc(asSup(), `homeOfficePoints/${id}`), point(id, over)));
    await bad('b1', { createdBy: 'outro' });
    await bad('b2', { team: 'back-office' });
    await bad('b3', { points: 0 });
    await bad('b4', { points: 101 });
    await bad('b5', { note: 'curta' });
    await bad('b6', { note: 'x'.repeat(1001) });
    await bad('b7', { weekId: '09/11/2026' });
    await bad('b8', { status: 'cancelled' });
    await assertFails(setDoc(doc(asSup(), 'homeOfficePoints/b9'), { ...point('b9'), extra: 1 }));
  });

  it('evidência: só JPEG em data URL e até 900000 caracteres; imutável', async () => {
    await assertFails(setDoc(doc(asSup(), 'homeOfficeEvidence/e1'), evidence('e1', { dataUrl: 'https://evil.example/x.png' })));
    await assertFails(setDoc(doc(asSup(), 'homeOfficeEvidence/e2'), evidence('e2', { dataUrl: 'data:image/jpeg;base64,' + 'A'.repeat(900_001) })));
    await assertFails(updateDoc(doc(asSup(), 'homeOfficeEvidence/p1'), { dataUrl: JPEG + 'B' }));
    await assertFails(deleteDoc(doc(asSup(), 'homeOfficeEvidence/p1')));
  });

  it('colaborador só lê os próprios dados depois de a semana fechar', async () => {
    const mine = () => query(collection(asTech(), 'homeOfficePoints'), where('technicianId', '==', 'tech1'), where('weekId', '==', WEEK));
    await assertFails(getDoc(doc(asTech(), 'homeOfficePoints/p1')));
    await assertFails(getDoc(doc(asTech(), 'homeOfficeEvidence/p1')));
    await assertFails(getDocs(mine()));
    await closeWeek();
    await assertSucceeds(getDoc(doc(asTech(), 'homeOfficePoints/p1')));
    await assertSucceeds(getDoc(doc(asTech(), 'homeOfficeEvidence/p1')));
    await assertSucceeds(getDocs(mine()));
    await assertSucceeds(getDoc(doc(asTech(), `homeOfficeWeeks/${WEEK}_tech1`)));
    // outro colaborador nunca lê
    await assertFails(getDoc(doc(asOther(), 'homeOfficePoints/p1')));
    await assertFails(getDoc(doc(asOther(), 'homeOfficeEvidence/p1')));
    await assertFails(getDoc(doc(asOther(), `homeOfficeWeeks/${WEEK}_tech1`)));
  });

  it('lançamento nunca é editado nem apagado; cancelar só com a semana aberta', async () => {
    const ref = doc(asSup(), 'homeOfficePoints/p1');
    await assertFails(updateDoc(ref, { points: 1 }));
    await assertFails(updateDoc(ref, { note: 'outra observação qualquer' }));
    await assertFails(deleteDoc(ref));
    await assertFails(updateDoc(ref, { status: 'cancelled', cancelReason: 'x', cancelledBy: 'sup1', cancelledAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(ref, { status: 'cancelled', cancelReason: 'Lançado na pessoa errada', cancelledBy: 'sup1', cancelledAt: serverTimestamp() }));
    await assertFails(updateDoc(ref, { status: 'active' })); // não "descancela"
  });

  it('semana fechada trava tudo: sem novos pontos, evidências ou cancelamentos', async () => {
    await closeWeek();
    await assertFails(setDoc(doc(asSup(), 'homeOfficePoints/late'), point('late')));
    await assertFails(setDoc(doc(asSup(), 'homeOfficeEvidence/late'), evidence('late')));
    await assertFails(updateDoc(doc(asSup(), 'homeOfficePoints/p1'), { status: 'cancelled', cancelReason: 'Tarde demais para isso', cancelledBy: 'sup1', cancelledAt: serverTimestamp() }));
  });

  it('fechar: supervisor da equipe, uma vez, com id e dados coerentes', async () => {
    await assertFails(setDoc(doc(asTech(), `homeOfficeWeeks/${WEEK}_tech1`), week('tech1', { closedBy: 'tech1' })));
    await assertFails(setDoc(doc(asSup(), 'homeOfficeWeeks/qualquer'), week()));
    await assertFails(setDoc(doc(asSup(), `homeOfficeWeeks/${WEEK}_tech1`), week('tech1', { score: 150 })));
    await assertFails(setDoc(doc(asSup(), `homeOfficeWeeks/${WEEK}_tech1`), week('tech1', { ackAt: ts() })));
    await assertSucceeds(setDoc(doc(asSup(), `homeOfficeWeeks/${WEEK}_tech1`), week()));
    await assertFails(setDoc(doc(asSup(), `homeOfficeWeeks/${WEEK}_tech1`), week('tech1', { score: 100 }))); // 2º fechamento
  });

  it('ciência: só o dono, uma vez, sem mexer no resultado; depois disso não reabre', async () => {
    await closeWeek();
    const ref = doc(asTech(), `homeOfficeWeeks/${WEEK}_tech1`);
    await assertFails(updateDoc(doc(asOther(), `homeOfficeWeeks/${WEEK}_tech1`), { ackAt: serverTimestamp(), ackComment: '' }));
    await assertFails(updateDoc(ref, { ackAt: serverTimestamp(), ackComment: '', score: 100 }));
    await assertFails(updateDoc(ref, { ackAt: serverTimestamp(), ackComment: 'x'.repeat(1001) }));
    await assertFails(updateDoc(ref, { ackAt: ts(), ackComment: '' })); // hora do cliente
    await assertSucceeds(updateDoc(ref, { ackAt: serverTimestamp(), ackComment: 'Vou cuidar do status do WhatsApp.' }));
    await assertFails(updateDoc(ref, { ackAt: serverTimestamp(), ackComment: 'mudei de ideia' }));
    await assertFails(deleteDoc(doc(asSup(), `homeOfficeWeeks/${WEEK}_tech1`)));
  });

  it('reabrir (apagar a semana) só supervisor e só sem ciência', async () => {
    await closeWeek();
    await assertFails(deleteDoc(doc(asTech(), `homeOfficeWeeks/${WEEK}_tech1`)));
    await assertSucceeds(deleteDoc(doc(asSup(), `homeOfficeWeeks/${WEEK}_tech1`)));
  });

  it('supervisor com escopo de outra equipe não lê nem escreve', async () => {
    await assertFails(getDoc(doc(asBackOfficeSup(), 'homeOfficePoints/p1')));
    await assertFails(getDoc(doc(asBackOfficeSup(), 'homeOfficeEvidence/p1')));
    await assertFails(setDoc(doc(asBackOfficeSup(), 'homeOfficePoints/x1'), point('x1', { createdBy: 'supB' })));
    await assertFails(setDoc(doc(asBackOfficeSup(), `homeOfficeWeeks/${WEEK}_tech1`), week('tech1', { closedBy: 'supB' })));
    await assertFails(updateDoc(doc(asBackOfficeSup(), 'homeOfficePoints/p1'), { status: 'cancelled', cancelReason: 'Não é da minha equipe', cancelledBy: 'supB', cancelledAt: serverTimestamp() }));
  });

  it('log de auditoria home_office_ack exige ciência real do próprio colaborador', async () => {
    const log = (id: string, over: Record<string, unknown> = {}) => ({
      id, timestamp: new Date().toISOString(), eventType: 'home_office_ack', entityId: `${WEEK}_tech1`,
      technicianId: 'tech1', technicianName: 'tech1', team: 'teleservice', details: 'x',
      hash: 'a'.repeat(64), signature: 'c2ln', publicKey: '{}', signerId: 'tech1', createdAt: serverTimestamp(), ...over,
    });
    await assertFails(setDoc(doc(asTech(), 'auditLogs/h0'), log('h0'))); // semana nem fechada
    await closeWeek();
    await assertFails(setDoc(doc(asTech(), 'auditLogs/h1'), log('h1'))); // fechada, sem ciência
    await seed((db) => updateDoc(doc(db, `homeOfficeWeeks/${WEEK}_tech1`), { ackAt: ts(), ackComment: '' }));
    await assertSucceeds(setDoc(doc(asTech(), 'auditLogs/h2'), log('h2')));
    await assertFails(setDoc(doc(asTech(), 'auditLogs/h3'), log('h3', { entityId: `${WEEK}_tech2` })));
  });

  it('config: qualquer usuário ativo lê; só supervisor sem escopo altera, com valores válidos', async () => {
    const cfg = (over: Record<string, unknown> = {}) => ({
      threshold: 70, categories: [{ id: 'sla', label: 'SLA', points: 10, requiresEvidence: true, active: true }],
      updatedAt: serverTimestamp(), updatedBy: 'sup1', ...over,
    });
    await assertSucceeds(getDoc(doc(asTech(), 'config/homeOffice')));
    await assertFails(setDoc(doc(asTech(), 'config/homeOffice'), cfg({ updatedBy: 'tech1' })));
    await assertFails(setDoc(doc(asBackOfficeSup(), 'config/homeOffice'), cfg({ updatedBy: 'supB' })));
    await assertFails(setDoc(doc(asSup(), 'config/homeOffice'), cfg({ threshold: 150 })));
    await assertFails(setDoc(doc(asSup(), 'config/homeOffice'), cfg({ categories: [] })));
    await assertSucceeds(setDoc(doc(asSup(), 'config/homeOffice'), cfg()));
  });
});
