import { doc, setDoc, getDocs, getDoc, collection, query, where, updateDoc } from 'firebase/firestore';
import { db, Timestamp } from '../firebase';
import type { Feedback } from '../types';
import { auditService } from './auditService';
import { offlineSyncService } from './offlineSyncService';
import { isFirebaseMock } from './env';
import { AppError } from './errors';
import { parseDate } from './dateUtils';
import { scope } from './scope';

// ---------------------------------------------------------------------------
// MODO MOCK (somente desenvolvimento): localStorage faz o papel do banco.
// Em modo Firebase NENHUM dado de feedback é copiado para o localStorage.
// ---------------------------------------------------------------------------
const MOCK_FEEDBACKS_KEY = 'feed_track_mock_feedbacks';

const defaultFeedbacks = (): Feedback[] => [
  {
    id: 'fb1', technicianId: 'tech1', technicianName: 'Ana Silva', supervisorId: 'sup1', team: 'back-office',
    type: 'positive', axis: 'Comunicação',
    description: 'Excelente postura na última reunião de alinhamento com a diretoria do Back-office. Conseguiu explicar as métricas com muita clareza.',
    status: 'pending', createdAt: Timestamp.now(),
  },
  {
    id: 'fb2', technicianId: 'tech1', technicianName: 'Ana Silva', supervisorId: 'sup1', team: 'back-office',
    type: 'development', axis: 'Gestão do tempo',
    description: 'Atenção especial aos prazos de fechamento dos chamados de N1. Tivemos alguns atrasos pontuais nesta semana que impactaram o SLA.',
    status: 'read', readAt: Timestamp.now(), signedAt: Timestamp.now(), createdAt: Timestamp.now(),
  },
];

if (isFirebaseMock && !localStorage.getItem(MOCK_FEEDBACKS_KEY)) {
  localStorage.setItem(MOCK_FEEDBACKS_KEY, JSON.stringify(defaultFeedbacks()));
}

const getMockFeedbacks = (): Feedback[] => {
  try {
    const raw = localStorage.getItem(MOCK_FEEDBACKS_KEY);
    return raw ? (JSON.parse(raw) as Feedback[]) : [];
  } catch {
    return [];
  }
};
const saveMockFeedbacks = (fbs: Feedback[]) =>
  localStorage.setItem(MOCK_FEEDBACKS_KEY, JSON.stringify(fbs));

export const feedbackService = {
  async addFeedback(feedback: Feedback): Promise<void> {
    if (isFirebaseMock) {
      saveMockFeedbacks([...getMockFeedbacks(), feedback]);
      return;
    }
    await offlineSyncService.run(() => setDoc(doc(db, 'feedbacks', feedback.id), feedback), 'feedback');
  },

  async getFeedbacks(technicianId?: string): Promise<Feedback[]> {
    if (isFirebaseMock) {
      const fbs = getMockFeedbacks().filter((f) => scope.allows(f.team));
      return technicianId ? fbs.filter((f) => f.technicianId === technicianId) : fbs;
    }
    // getDocs lê do cache persistente do SDK quando offline.
    // Supervisor com escopo de equipe: a consulta PRECISA vir filtrada (as regras negam consultas mais amplas).
    const col = collection(db, 'feedbacks');
    const managed = scope.get();
    const snap = await getDocs(
      technicianId ? query(col, where('technicianId', '==', technicianId))
        : managed ? query(col, where('team', '==', managed))
        : query(col));
    return snap.docs.map((d) => d.data() as Feedback);
  },

  async updateFeedbackStatus(feedbackId: string, status: 'pending' | 'read', signed = false): Promise<void> {
    // Estado atual (nunca confie no objeto vindo da UI para a trilha de auditoria).
    let current: Feedback | undefined;
    if (isFirebaseMock) {
      current = getMockFeedbacks().find((f) => f.id === feedbackId);
    } else {
      const snap = await getDoc(doc(db, 'feedbacks', feedbackId));
      current = snap.exists() ? (snap.data() as Feedback) : undefined;
    }
    if (!current) throw new AppError('Feedback não encontrado.');

    const now = Timestamp.now();
    const updateData: Partial<Feedback> = { status };
    if (status === 'read') updateData.readAt = now;
    // signedAt é imutável depois de gravado (regra do Firestore) — uma nova
    // tentativa só refaz o log de auditoria, sem reescrever a assinatura.
    const alreadySigned = Boolean(current.signedAt);
    if (signed && !alreadySigned) updateData.signedAt = now;

    if (isFirebaseMock) {
      const all = getMockFeedbacks();
      const idx = all.findIndex((f) => f.id === feedbackId);
      all[idx] = { ...all[idx], ...updateData };
      saveMockFeedbacks(all);
    } else if (!(alreadySigned && status === 'read' && current.status === 'read')) {
      await offlineSyncService.run(() => updateDoc(doc(db, 'feedbacks', feedbackId), updateData), 'leitura/assinatura');
    }

    if (signed) {
      // Sem try/catch silencioso: se a trilha de auditoria falhar, o chamador é avisado.
      await auditService.registerLog('feedback_signature', feedbackId, current.technicianId, current.technicianName, current.team, {
        feedbackId,
        technicianId: current.technicianId,
        axis: current.axis,
        type: current.type,
        signedAt: parseDate(updateData.signedAt ?? current.signedAt ?? now).toISOString(),
      });
    }
  },
};
