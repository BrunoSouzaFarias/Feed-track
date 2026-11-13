import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, type Auth } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions, httpsCallable, type Functions } from 'firebase/functions';
import { initializeApp as adminInit, deleteApp as adminDelete, type App } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { getFirestore as adminFs, Timestamp } from 'firebase-admin/firestore';

// Executa as Cloud Functions REAIS (build em functions/lib) contra os emuladores de Auth+Firestore+Functions.
const PROJECT = 'demo-feed-track';
const FN_HOST = '127.0.0.1';
const FN_PORT = Number(process.env.FUNCTIONS_PORT ?? 5001);
let admin: App; let app: FirebaseApp; let auth: Auth; let fns: Functions;
const uids: Record<string, string> = {};

const call = <T = unknown, R = Record<string, unknown>>(name: string, data?: T) =>
  httpsCallable<T, R>(fns, name)(data).then((r) => r.data);
async function loginAs(email: string) { await signInWithEmailAndPassword(auth, email, 'senha-forte-123'); }

beforeAll(async () => {
  process.env.GCLOUD_PROJECT = PROJECT;
  admin = adminInit({ projectId: PROJECT }, 'test-admin');
  app = initializeApp({ apiKey: 'fake', projectId: PROJECT }, 'test-client');
  auth = getAuth(app);
  connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  fns = getFunctions(app);
  connectFunctionsEmulator(fns, FN_HOST, FN_PORT);

  const db = adminFs(admin);
  const mk = async (key: string, role: 'supervisor' | 'technician', extra: Record<string, unknown> = {}) => {
    const email = `${key}@liberty.com`;
    const cred = await createUserWithEmailAndPassword(auth, email, 'senha-forte-123');
    uids[key] = cred.user.uid;
    await db.doc(`users/${cred.user.uid}`).set({
      uid: cred.user.uid, name: key, email, role, team: 'back-office', position: 'x', active: true,
      createdAt: Timestamp.fromMillis(Date.now() - 40 * 86_400_000), badges: [], structuredPDI: [], ...extra,
    });
  };
  await mk('sup', 'supervisor');
  await mk('tech', 'technician', {
    structuredPDI: [{ id: 'g1', title: 'Meta 1', description: 'd', deadline: '2026-12-01', status: 'pending', createdAt: Timestamp.now() }],
  });
  await mk('other', 'technician');
  await mk('supT', 'supervisor', { team: 'teleservice', managedTeam: 'teleservice' });
  await mk('techT', 'technician', {
    team: 'teleservice',
    structuredPDI: [{ id: 'gT', title: 'Meta T', description: 'd', deadline: '2026-12-01', status: 'pending', createdAt: Timestamp.now() }],
  });
  await db.doc('feedbacks/f1').set({ id: 'f1', technicianId: uids.tech, status: 'read' });
  await db.doc('selfAssessments/s1').set({ id: 's1', technicianId: uids.tech });
});
afterAll(async () => { await deleteApp(app); await adminDelete(admin); });

describe('setPdiGoalStatus', () => {
  it('exige autenticação', async () => {
    await auth.signOut();
    await expect(call('setPdiGoalStatus', { goalId: 'g1', status: 'completed' })).rejects.toMatchObject({ code: 'functions/unauthenticated' });
  });
  it('técnico avança a própria meta e o servidor carimba completedAt', async () => {
    await loginAs('tech@liberty.com');
    const r = await call('setPdiGoalStatus', { goalId: 'g1', status: 'in_progress' });
    expect(r).toMatchObject({ ok: true, previous: 'pending' });
    await call('setPdiGoalStatus', { goalId: 'g1', status: 'completed' });
    const doc = await adminFs(admin).doc(`users/${uids.tech}`).get();
    const goal = doc.data()!.structuredPDI[0];
    expect(goal.status).toBe('completed');
    expect(goal.completedAt).toBeDefined();
  });
  it('técnico NÃO retrocede, nem mexe na meta de outro, nem manda status inválido', async () => {
    await loginAs('tech@liberty.com');
    await expect(call('setPdiGoalStatus', { goalId: 'g1', status: 'pending' })).rejects.toMatchObject({ code: 'functions/failed-precondition' });
    await expect(call('setPdiGoalStatus', { uid: uids.other, goalId: 'g1', status: 'completed' })).rejects.toMatchObject({ code: 'functions/permission-denied' });
    await expect(call('setPdiGoalStatus', { goalId: 'g1', status: 'hacked' })).rejects.toMatchObject({ code: 'functions/invalid-argument' });
  });
  it('supervisor pode reabrir a meta', async () => {
    await loginAs('sup@liberty.com');
    await call('setPdiGoalStatus', { uid: uids.tech, goalId: 'g1', status: 'pending' });
    const goal = (await adminFs(admin).doc(`users/${uids.tech}`).get()).data()!.structuredPDI[0];
    expect(goal.status).toBe('pending');
    expect(goal.completedAt).toBeUndefined();
  });
});

describe('claimBadges', () => {
  it('servidor concede só os badges cujas condições são verdadeiras e não duplica', async () => {
    await loginAs('tech@liberty.com');
    const r = (await call('claimBadges')) as { granted: { id: string }[] };
    expect(r.granted.map((b) => b.id).sort()).toEqual(['badge_30_days', 'badge_assessment_done', 'badge_first_read', 'badge_pdi_started']);
    expect(((await call('claimBadges')) as { granted: unknown[] }).granted).toEqual([]);
  });
  it('usuário sem fatos não ganha nada além do que merece', async () => {
    await loginAs('other@liberty.com');
    const r = (await call('claimBadges')) as { granted: { id: string }[] };
    expect(r.granted.map((b) => b.id)).toEqual(['badge_30_days']);
  });
});

describe('deleteUserAccount', () => {
  it('técnico não pode excluir ninguém', async () => {
    await loginAs('tech@liberty.com');
    await expect(call('deleteUserAccount', { uid: uids.other })).rejects.toMatchObject({ code: 'functions/permission-denied' });
  });
  it('supervisor não pode excluir a si mesmo', async () => {
    await loginAs('sup@liberty.com');
    await expect(call('deleteUserAccount', { uid: uids.sup })).rejects.toMatchObject({ code: 'functions/failed-precondition' });
  });
  it('supervisor exclui conta do Auth + perfil + feedbacks + autoavaliações', async () => {
    await loginAs('sup@liberty.com');
    await call('deleteUserAccount', { uid: uids.tech });
    await expect(adminAuth(admin).getUser(uids.tech)).rejects.toMatchObject({ code: 'auth/user-not-found' });
    const db = adminFs(admin);
    expect((await db.doc(`users/${uids.tech}`).get()).exists).toBe(false);
    expect((await db.doc('feedbacks/f1').get()).exists).toBe(false);
    expect((await db.doc('selfAssessments/s1').get()).exists).toBe(false);
  });
});

describe('supervisor com escopo de equipe (managedTeam)', () => {
  it('altera meta/exclui apenas colaboradores da própria equipe', async () => {
    await loginAs('supT@liberty.com');
    await expect(call('setPdiGoalStatus', { uid: uids.other, goalId: 'g1', status: 'completed' })).rejects.toMatchObject({ code: 'functions/permission-denied' });
    await expect(call('deleteUserAccount', { uid: uids.other })).rejects.toMatchObject({ code: 'functions/permission-denied' });
    const r = await call('setPdiGoalStatus', { uid: uids.techT, goalId: 'gT', status: 'in_progress' });
    expect(r).toMatchObject({ ok: true, team: 'teleservice' });
    await call('deleteUserAccount', { uid: uids.techT });
    await expect(adminAuth(admin).getUser(uids.techT)).rejects.toMatchObject({ code: 'auth/user-not-found' });
    expect((await adminAuth(admin).getUser(uids.other)).uid).toBe(uids.other); // outra equipe intacta
  });
});
