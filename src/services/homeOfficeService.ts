import {
  collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where,
  type QueryConstraint,
} from 'firebase/firestore';
import { db, Timestamp } from '../firebase';
import type {
  HomeOfficeCategory, HomeOfficeConfig, HomeOfficeEvidence, HomeOfficePoint, HomeOfficeWeek, User,
} from '../types';
import { isFirebaseMock } from './env';
import { AppError } from './errors';
import { newId } from './ids';
import { scope } from './scope';
import { getActorId } from './actor';
import { offlineSyncService } from './offlineSyncService';
import { auditService } from './auditService';
import {
  ACK_COMMENT_MAX, DEFAULT_HOME_OFFICE_CONFIG, computeScore, isEligible, validatePointInput,
  weekDocId, weekIdOfDateString,
} from './homeOfficeLogic';

// ---------------------------------------------------------------------------
// MODO MOCK (somente desenvolvimento): localStorage faz o papel do banco.
// ---------------------------------------------------------------------------
const K = {
  points: 'feed_track_mock_ho_points',
  evidence: 'feed_track_mock_ho_evidence',
  weeks: 'feed_track_mock_ho_weeks',
  config: 'feed_track_mock_ho_config',
} as const;

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}
function writeList<T>(key: string, list: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    throw new AppError('Sem espaço local para salvar (modo demonstração). Remova prints antigos.');
  }
}

function requireActor(): string {
  const uid = getActorId();
  if (!uid) throw new AppError('Sua sessão expirou. Entre novamente.');
  return uid;
}

/** Supervisor com escopo de equipe precisa consultar já filtrado (as regras negam consultas mais amplas). */
function teamConstraint(): QueryConstraint[] {
  const managed = scope.get();
  return managed ? [where('team', '==', managed)] : [];
}

const byCreatedDesc = (a: HomeOfficePoint, b: HomeOfficePoint) =>
  (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0);

export const homeOfficeService = {
  async getConfig(): Promise<HomeOfficeConfig> {
    if (isFirebaseMock) {
      try {
        const raw = localStorage.getItem(K.config);
        return raw ? (JSON.parse(raw) as HomeOfficeConfig) : DEFAULT_HOME_OFFICE_CONFIG;
      } catch {
        return DEFAULT_HOME_OFFICE_CONFIG;
      }
    }
    const snap = await getDoc(doc(db, 'config', 'homeOffice'));
    if (!snap.exists()) return DEFAULT_HOME_OFFICE_CONFIG;
    const data = snap.data();
    return { categories: data.categories as HomeOfficeCategory[], threshold: data.threshold as number };
  },

  async saveConfig(config: HomeOfficeConfig): Promise<void> {
    if (config.threshold < 0 || config.threshold > 100) throw new AppError('A nota de corte deve ficar entre 0 e 100.');
    if (config.categories.some((c) => !Number.isInteger(c.points) || c.points < 1 || c.points > 100)) {
      throw new AppError('Cada categoria deve descontar de 1 a 100 pontos.');
    }
    if (!config.categories.some((c) => c.active)) throw new AppError('Mantenha ao menos uma categoria ativa.');
    if (isFirebaseMock) {
      localStorage.setItem(K.config, JSON.stringify(config));
      return;
    }
    const uid = requireActor();
    await offlineSyncService.run(
      () => setDoc(doc(db, 'config', 'homeOffice'), { ...config, updatedAt: serverTimestamp(), updatedBy: uid }),
      'configuração'
    );
  },

  /** Sem `technicianId`: toda a equipe visível ao supervisor logado. */
  async listPoints(weekId: string, technicianId?: string): Promise<HomeOfficePoint[]> {
    if (isFirebaseMock) {
      return readList<HomeOfficePoint>(K.points)
        .filter((p) => p.weekId === weekId && (technicianId ? p.technicianId === technicianId : scope.allows(p.team)))
        .sort(byCreatedDesc);
    }
    const constraints: QueryConstraint[] = [where('weekId', '==', weekId)];
    if (technicianId) constraints.push(where('technicianId', '==', technicianId));
    const snap = await getDocs(query(collection(db, 'homeOfficePoints'), ...constraints, ...teamConstraint()));
    return snap.docs.map((d) => d.data() as HomeOfficePoint).sort(byCreatedDesc);
  },

  async listWeeks(weekId: string): Promise<HomeOfficeWeek[]> {
    if (isFirebaseMock) {
      return readList<HomeOfficeWeek>(K.weeks).filter((w) => w.weekId === weekId && scope.allows(w.team));
    }
    const snap = await getDocs(query(collection(db, 'homeOfficeWeeks'), where('weekId', '==', weekId), ...teamConstraint()));
    return snap.docs.map((d) => d.data() as HomeOfficeWeek);
  },

  /** Semanas fechadas do colaborador, mais recente primeiro. */
  async listMyWeeks(technicianId: string): Promise<HomeOfficeWeek[]> {
    const sort = (list: HomeOfficeWeek[]) => list.sort((a, b) => b.weekId.localeCompare(a.weekId));
    if (isFirebaseMock) {
      return sort(readList<HomeOfficeWeek>(K.weeks).filter((w) => w.technicianId === technicianId));
    }
    const snap = await getDocs(query(collection(db, 'homeOfficeWeeks'), where('technicianId', '==', technicianId)));
    return sort(snap.docs.map((d) => d.data() as HomeOfficeWeek));
  },

  async getEvidence(pointId: string): Promise<string | null> {
    if (isFirebaseMock) {
      return readList<HomeOfficeEvidence>(K.evidence).find((e) => e.pointId === pointId)?.dataUrl ?? null;
    }
    const snap = await getDoc(doc(db, 'homeOfficeEvidence', pointId));
    return snap.exists() ? (snap.data().dataUrl as string) : null;
  },

  async addPoint(input: {
    technician: User;
    category: HomeOfficeCategory;
    note: string;
    occurredOn: string;
    evidence?: string;
  }): Promise<HomeOfficePoint> {
    const { technician, category, occurredOn, evidence } = input;
    const note = input.note.trim();
    const problem = validatePointInput({ category, note, occurredOn, hasEvidence: Boolean(evidence) });
    if (problem) throw new AppError(problem);
    const uid = requireActor();
    const weekId = weekIdOfDateString(occurredOn);

    const point: HomeOfficePoint = {
      id: newId('ho'),
      technicianId: technician.uid,
      technicianName: technician.name,
      team: technician.team,
      weekId,
      categoryId: category.id,
      categoryLabel: category.label,
      points: category.points,
      note,
      occurredOn,
      hasEvidence: Boolean(evidence),
      status: 'active',
      createdBy: uid,
      createdAt: Timestamp.now(),
    };
    const evidenceDoc: HomeOfficeEvidence | null = evidence
      ? { pointId: point.id, technicianId: technician.uid, team: technician.team, weekId, dataUrl: evidence, createdBy: uid, createdAt: Timestamp.now() }
      : null;

    if (isFirebaseMock) {
      if (readList<HomeOfficeWeek>(K.weeks).some((w) => w.id === weekDocId(weekId, technician.uid))) {
        throw new AppError('Esta semana já foi fechada para este colaborador.');
      }
      if (evidenceDoc) writeList(K.evidence, [...readList<HomeOfficeEvidence>(K.evidence), evidenceDoc]);
      writeList(K.points, [...readList<HomeOfficePoint>(K.points), point]);
      return point;
    }
    // Evidência ANTES do lançamento: um ponto com hasEvidence nunca fica sem o print.
    await offlineSyncService.run(async () => {
      if (evidenceDoc) await setDoc(doc(db, 'homeOfficeEvidence', point.id), evidenceDoc);
      await setDoc(doc(db, 'homeOfficePoints', point.id), point);
    }, 'pontuação');
    return point;
  },

  async cancelPoint(point: HomeOfficePoint, reason: string): Promise<void> {
    const cancelReason = reason.trim();
    if (cancelReason.length < 5) throw new AppError('Explique o motivo do cancelamento (mínimo de 5 caracteres).');
    if (cancelReason.length > 500) throw new AppError('O motivo pode ter no máximo 500 caracteres.');
    const uid = requireActor();
    if (isFirebaseMock) {
      if (readList<HomeOfficeWeek>(K.weeks).some((w) => w.id === weekDocId(point.weekId, point.technicianId))) {
        throw new AppError('A semana já foi fechada; não é possível cancelar.');
      }
      writeList(K.points, readList<HomeOfficePoint>(K.points).map((p) =>
        p.id === point.id ? { ...p, status: 'cancelled' as const, cancelReason, cancelledBy: uid, cancelledAt: Timestamp.now() } : p));
      return;
    }
    await offlineSyncService.run(() => updateDoc(doc(db, 'homeOfficePoints', point.id), {
      status: 'cancelled', cancelReason, cancelledBy: uid, cancelledAt: serverTimestamp(),
    }), 'cancelamento');
  },

  /** Fecha a semana da pessoa: recalcula o saldo a partir dos lançamentos gravados. */
  async closeWeek(technician: User, weekId: string, threshold: number): Promise<HomeOfficeWeek> {
    const uid = requireActor();
    const id = weekDocId(weekId, technician.uid);
    const score = computeScore(await this.listPoints(weekId, technician.uid));
    const week: HomeOfficeWeek = {
      id, technicianId: technician.uid, technicianName: technician.name, team: technician.team, weekId,
      score, threshold, eligible: isEligible(score, threshold), closedBy: uid, closedAt: Timestamp.now(),
    };
    const alreadyClosed = new AppError('Esta semana já foi fechada.');
    if (isFirebaseMock) {
      const weeks = readList<HomeOfficeWeek>(K.weeks);
      if (weeks.some((w) => w.id === id)) throw alreadyClosed;
      writeList(K.weeks, [...weeks, week]);
      return week;
    }
    if ((await this.listWeeks(weekId)).some((w) => w.id === id)) throw alreadyClosed;
    await offlineSyncService.run(() => setDoc(doc(db, 'homeOfficeWeeks', id), { ...week, closedAt: serverTimestamp() }), 'fechamento');
    return week;
  },

  /** Reabre (apaga o fechamento). Só é possível enquanto a pessoa não assinou. */
  async reopenWeek(week: HomeOfficeWeek): Promise<void> {
    if (week.ackAt) throw new AppError('A pessoa já assinou a ciência; a semana não pode ser reaberta.');
    if (isFirebaseMock) {
      const current = readList<HomeOfficeWeek>(K.weeks);
      if (current.find((w) => w.id === week.id)?.ackAt) throw new AppError('A pessoa já assinou a ciência; a semana não pode ser reaberta.');
      writeList(K.weeks, current.filter((w) => w.id !== week.id));
      return;
    }
    await offlineSyncService.run(() => deleteDoc(doc(db, 'homeOfficeWeeks', week.id)), 'reabertura');
  },

  /** Ciência do colaborador (uma única vez), com comentário opcional e log de auditoria assinado. */
  async acknowledge(week: HomeOfficeWeek, comment: string): Promise<void> {
    const ackComment = comment.trim();
    if (ackComment.length > ACK_COMMENT_MAX) throw new AppError(`O comentário pode ter no máximo ${ACK_COMMENT_MAX} caracteres.`);
    if (week.ackAt) throw new AppError('Você já registrou ciência desta semana.');
    if (isFirebaseMock) {
      writeList(K.weeks, readList<HomeOfficeWeek>(K.weeks).map((w) =>
        w.id === week.id ? { ...w, ackAt: Timestamp.now(), ackComment } : w));
    } else {
      await offlineSyncService.run(
        () => updateDoc(doc(db, 'homeOfficeWeeks', week.id), { ackAt: serverTimestamp(), ackComment }),
        'ciência'
      );
    }
    await auditService.registerLog('home_office_ack', week.id, week.technicianId, week.technicianName, week.team, {
      weekId: week.weekId, score: week.score, threshold: week.threshold, eligible: week.eligible,
      hasComment: ackComment.length > 0,
    });
  },
};
