import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { BADGES, canTransition, evaluateBadges, isGoalStatus, type GoalStatus } from './logic';

initializeApp();
const db = getFirestore();
const auth = getAuth();

interface Goal { id: string; status: GoalStatus; completedAt?: Timestamp; [k: string]: unknown }

async function requireCaller(uid: string | undefined) {
  if (!uid) throw new HttpsError('unauthenticated', 'Faça login.');
  const snap = await db.doc(`users/${uid}`).get();
  const data = snap.data();
  if (!snap.exists || data?.active !== true) throw new HttpsError('permission-denied', 'Conta inativa ou inexistente.');
  return { uid, isSupervisor: data.role === 'supervisor' };
}

/** Avança o status de uma meta do PDI (valida dono, transição e carimba completedAt no servidor). */
export const setPdiGoalStatus = onCall(async (req) => {
  const caller = await requireCaller(req.auth?.uid);
  const { uid = caller.uid, goalId, status } = (req.data ?? {}) as { uid?: string; goalId?: string; status?: unknown };
  if (typeof goalId !== 'string' || !isGoalStatus(status)) throw new HttpsError('invalid-argument', 'Parâmetros inválidos.');
  if (uid !== caller.uid && !caller.isSupervisor) throw new HttpsError('permission-denied', 'Sem permissão.');

  const ref = db.doc(`users/${uid}`);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Usuário não encontrado.');
    const goals = (snap.data()?.structuredPDI ?? []) as Goal[];
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) throw new HttpsError('not-found', 'Meta não encontrada.');
    if (!canTransition(goal.status, status, caller.isSupervisor)) {
      throw new HttpsError('failed-precondition', 'Transição de status não permitida.');
    }
    const next = goals.map((g) => {
      if (g.id !== goalId) return g;
      const { completedAt: _drop, ...rest } = g;
      void _drop;
      return status === 'completed' ? { ...rest, status, completedAt: Timestamp.now() } : { ...rest, status };
    });
    tx.update(ref, { structuredPDI: next });
    return { goalTitle: goal.title as string, userName: snap.data()?.name as string, previous: goal.status };
  });
  return { ok: true, ...result };
});

/** Concede os badges cujas condições o SERVIDOR verifica (o técnico não escolhe quais). */
export const claimBadges = onCall(async (req) => {
  const caller = await requireCaller(req.auth?.uid);
  const uid = caller.uid;
  const ref = db.doc(`users/${uid}`);

  const [feedbackRead, assessments] = await Promise.all([
    db.collection('feedbacks').where('technicianId', '==', uid).where('status', '==', 'read').limit(1).get(),
    db.collection('selfAssessments').where('technicianId', '==', uid).limit(1).get(),
  ]);

  const granted = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    if (!snap.exists || !data) throw new HttpsError('not-found', 'Usuário não encontrado.');
    const owned = new Set(((data.badges ?? []) as { id: string }[]).map((b) => b.id));
    const earnedIds = evaluateBadges({
      hasReadFeedback: !feedbackRead.empty,
      goalStatuses: ((data.structuredPDI ?? []) as Goal[]).map((g) => g.status),
      hasAssessments: !assessments.empty,
      createdAtMs: (data.createdAt as Timestamp | undefined)?.toMillis?.() ?? Date.now(),
      nowMs: Date.now(),
    });
    const fresh = BADGES.filter((b) => earnedIds.includes(b.id) && !owned.has(b.id))
      .map((b) => ({ ...b, earnedAt: Timestamp.now() }));
    if (fresh.length) tx.update(ref, { badges: [...(data.badges ?? []), ...fresh] });
    return fresh;
  });
  return { granted: granted.map((b) => ({ id: b.id, title: b.title })) };
});

/** Exclui definitivamente um colaborador: conta do Auth + perfil + feedbacks + autoavaliações. Logs de auditoria são mantidos. */
export const deleteUserAccount = onCall(async (req) => {
  const caller = await requireCaller(req.auth?.uid);
  if (!caller.isSupervisor) throw new HttpsError('permission-denied', 'Apenas supervisores.');
  const { uid } = (req.data ?? {}) as { uid?: string };
  if (typeof uid !== 'string' || !uid) throw new HttpsError('invalid-argument', 'uid obrigatório.');
  if (uid === caller.uid) throw new HttpsError('failed-precondition', 'Você não pode excluir a própria conta.');

  for (const col of ['feedbacks', 'selfAssessments']) {
    const snap = await db.collection(col).where('technicianId', '==', uid).get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = db.batch();
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  await db.doc(`users/${uid}`).delete();
  await auth.deleteUser(uid).catch((e: { code?: string }) => {
    if (e.code !== 'auth/user-not-found') throw e;
  });
  return { ok: true };
});
